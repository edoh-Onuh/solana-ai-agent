#!/usr/bin/env python3

"""
Collect granular stake account data for specific Solana validator identities.

Approach:
1. Resolve each validator identity -> vote account via getVoteAccounts.
2. Query stake accounts delegated to that vote account via getProgramAccounts,
   using stake-program layout filters:
   - dataSize: 200
   - memcmp: offset 124 == vote account pubkey
3. Emit JSON and CSV files for downstream analysis.
"""

from __future__ import annotations

import csv
import json
import sys
import time
import urllib.error
import urllib.request
from dataclasses import dataclass
from typing import Any, Dict, Iterable, List, Optional, Tuple


RPC_URL = "https://api.mainnet-beta.solana.com"
STAKE_PROGRAM_ID = "Stake11111111111111111111111111111111111111"

# The two validator identity pubkeys provided by the user.
VALIDATOR_IDENTITIES = [
    "LeDbQ99QT342j9S5YdyXLrsq2Gu3T3dMGajExdAuE3V",
    "q9XWcZ7T1wP4bW9SB4XgNNwjnFEJ982nE8aVbbNuwot",
]

# Stake account layout constants:
# - Stake accounts are typically 200 bytes.
# - The delegated vote pubkey starts at byte offset 124.
STAKE_ACCOUNT_DATA_SIZE = 200
VOTER_PUBKEY_OFFSET = 124


@dataclass
class VoteAccount:
    identity: str
    vote_pubkey: str
    activated_stake_lamports: int
    commission: int
    epoch_credits: Optional[List[Any]]


def _post_json_rpc(method: str, params: List[Any]) -> Dict[str, Any]:
    payload = {
        "jsonrpc": "2.0",
        "id": 1,
        "method": method,
        "params": params,
    }
    body = json.dumps(payload).encode("utf-8")

    req = urllib.request.Request(
        RPC_URL,
        data=body,
        headers={"Content-Type": "application/json"},
        method="POST",
    )

    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            raw = resp.read()
    except urllib.error.HTTPError as e:
        raise RuntimeError(f"HTTP error calling {method}: {e.code} {e.reason}") from e
    except urllib.error.URLError as e:
        raise RuntimeError(f"Network error calling {method}: {e.reason}") from e

    try:
        parsed = json.loads(raw)
    except json.JSONDecodeError as e:
        raise RuntimeError(f"Invalid JSON from {method}: {raw[:200]!r}") from e

    if "error" in parsed:
        raise RuntimeError(f"RPC error calling {method}: {parsed['error']}")

    return parsed["result"]


def resolve_vote_accounts(identities: Iterable[str]) -> Dict[str, VoteAccount]:
    result = _post_json_rpc("getVoteAccounts", [{"commitment": "finalized"}])

    by_identity: Dict[str, VoteAccount] = {}
    wanted = set(identities)

    def _ingest(entries: Iterable[Dict[str, Any]]) -> None:
        for entry in entries:
            identity = entry.get("nodePubkey")
            if identity not in wanted:
                continue
            by_identity[identity] = VoteAccount(
                identity=identity,
                vote_pubkey=entry["votePubkey"],
                activated_stake_lamports=int(entry.get("activatedStake", 0)),
                commission=int(entry.get("commission", 0)),
                epoch_credits=entry.get("epochCredits"),
            )

    _ingest(result.get("current", []))
    _ingest(result.get("delinquent", []))

    missing = wanted.difference(by_identity.keys())
    if missing:
        raise RuntimeError(
            "Could not resolve vote accounts for identities: "
            + ", ".join(sorted(missing))
        )

    return by_identity


def get_stake_accounts_for_vote(vote_pubkey: str) -> List[Dict[str, Any]]:
    filters = [
        {"dataSize": STAKE_ACCOUNT_DATA_SIZE},
        {"memcmp": {"offset": VOTER_PUBKEY_OFFSET, "bytes": vote_pubkey}},
    ]

    config = {
        "commitment": "finalized",
        "encoding": "jsonParsed",
        "filters": filters,
    }

    result = _post_json_rpc("getProgramAccounts", [STAKE_PROGRAM_ID, config])
    if not isinstance(result, list):
        raise RuntimeError(f"Unexpected getProgramAccounts result type: {type(result)}")
    return result


def _lamports_to_sol(lamports: int) -> float:
    return lamports / 1_000_000_000


def extract_rows(
    identity: str, vote_pubkey: str, accounts: Iterable[Dict[str, Any]]
) -> List[Dict[str, Any]]:
    rows: List[Dict[str, Any]] = []

    for entry in accounts:
        stake_account = entry.get("pubkey")
        account = entry.get("account", {})
        lamports = int(account.get("lamports", 0))

        parsed = account.get("data", {}).get("parsed", {})
        info = parsed.get("info", {})

        meta = info.get("meta", {})
        authorized = meta.get("authorized", {})
        staker = authorized.get("staker")
        withdrawer = authorized.get("withdrawer")

        stake = info.get("stake", {})
        delegation = stake.get("delegation", {})

        delegated_vote = delegation.get("voter")
        delegated_stake_lamports = int(delegation.get("stake", 0))
        activation_epoch = delegation.get("activationEpoch")
        deactivation_epoch = delegation.get("deactivationEpoch")

        row = {
            "validator_identity": identity,
            "validator_vote_account": vote_pubkey,
            "stake_account": stake_account,
            "account_lamports": lamports,
            "account_sol": _lamports_to_sol(lamports),
            "delegated_vote_account": delegated_vote,
            "delegated_stake_lamports": delegated_stake_lamports,
            "delegated_stake_sol": _lamports_to_sol(delegated_stake_lamports),
            "staker_authority": staker,
            "withdraw_authority": withdrawer,
            "activation_epoch": activation_epoch,
            "deactivation_epoch": deactivation_epoch,
        }
        rows.append(row)

    return rows


def _ensure_output_dir() -> None:
    try:
        # Lazily create output directory.
        import os

        os.makedirs("output", exist_ok=True)
    except OSError as e:
        raise RuntimeError(f"Failed to create output directory: {e}") from e


def write_outputs(identity: str, rows: List[Dict[str, Any]]) -> Tuple[str, str]:
    _ensure_output_dir()

    json_path = f"output/{identity}.stake_accounts.json"
    csv_path = f"output/{identity}.stake_accounts.csv"

    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(rows, f, indent=2, sort_keys=True)

    fieldnames = [
        "validator_identity",
        "validator_vote_account",
        "stake_account",
        "account_lamports",
        "account_sol",
        "delegated_vote_account",
        "delegated_stake_lamports",
        "delegated_stake_sol",
        "staker_authority",
        "withdraw_authority",
        "activation_epoch",
        "deactivation_epoch",
    ]

    with open(csv_path, "w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)

    return json_path, csv_path


def summarize(identity: str, vote: VoteAccount, rows: List[Dict[str, Any]]) -> str:
    total_accounts = len(rows)
    total_delegated_lamports = sum(r["delegated_stake_lamports"] for r in rows)
    total_delegated_sol = _lamports_to_sol(total_delegated_lamports)

    return (
        f"{identity}\n"
        f"  vote account: {vote.vote_pubkey}\n"
        f"  stake accounts: {total_accounts}\n"
        f"  delegated stake (sum): {total_delegated_sol:,.2f} SOL\n"
    )


def main() -> int:
    identities = VALIDATOR_IDENTITIES
    print("Resolving vote accounts for validator identities...")
    votes_by_identity = resolve_vote_accounts(identities)

    for identity in identities:
        vote = votes_by_identity[identity]
        print(f"\nCollecting stake accounts delegated to {identity}...")
        print(f"Resolved vote account: {vote.vote_pubkey}")

        accounts = get_stake_accounts_for_vote(vote.vote_pubkey)
        rows = extract_rows(identity, vote.vote_pubkey, accounts)

        json_path, csv_path = write_outputs(identity, rows)
        print(summarize(identity, vote, rows))
        print(f"  wrote: {json_path}")
        print(f"  wrote: {csv_path}")

        # Be polite to the RPC.
        time.sleep(0.5)

    print("\nDone.")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except KeyboardInterrupt:
        print("\nInterrupted.", file=sys.stderr)
        raise SystemExit(130)

