#!/usr/bin/env python3

"""
Profile stake-participating wallets for balances and swap activity.

This script:
1. Reads stake CSVs produced by collect_validator_stake.py
2. Aggregates staker/withdrawer authorities
3. Profiles top-N wallets via Solana JSON-RPC:
   - SOL balance (unstaked SOL proxy)
   - Token holdings (SPL + Token-2022)
   - Recent transaction history
   - Swap activity heuristics based on program IDs

Outputs:
- output/profiles/wallet_profiles.json
- output/profiles/wallet_profiles.csv
"""

from __future__ import annotations

import argparse
import csv
import json
import os
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any, Dict, Iterable, List, Optional, Sequence, Tuple


RPC_URL = "https://api.mainnet-beta.solana.com"
HELIUS_RPC_BASE = "https://mainnet.helius-rpc.com/"
HELIUS_PARSE_TX_URL_BASE = "https://api-mainnet.helius-rpc.com/v0/transactions/"
INPUT_DIR = "output"
OUT_DIR = os.path.join(INPUT_DIR, "profiles")
CACHE_DIR = os.path.join(OUT_DIR, "cache")
MANIFEST_PATH = os.path.join(OUT_DIR, "checkpoint_manifest.json")
JSONL_PATH = os.path.join(OUT_DIR, "wallet_profiles.jsonl")

LAMPORTS_PER_SOL = 1_000_000_000
TOKEN_PROGRAM_ID = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
TOKEN_2022_PROGRAM_ID = "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"

# Swap program IDs:
# - Orca Whirlpools official deployment: whirLb... (from Orca docs)
# - Jupiter program IDs are fetched dynamically via Jupiter's public map when available.
ORCA_WHIRLPOOLS_PROGRAM_ID = "whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc"
JUPITER_PROGRAM_ID_LABELS_URL = "https://lite-api.jup.ag/swap/v1/program-id-to-label"


def lamports_to_sol(lamports: int) -> float:
    return lamports / LAMPORTS_PER_SOL


def _iso(ts: Optional[int]) -> Optional[str]:
    if ts is None:
        return None
    return datetime.fromtimestamp(ts, tz=timezone.utc).isoformat()


def _post_json_rpc(method: str, params: Sequence[Any]) -> Any:
    payload = {"jsonrpc": "2.0", "id": 1, "method": method, "params": list(params)}
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


def _rpc_url(helius_api_key: Optional[str]) -> str:
    if helius_api_key:
        return f"{HELIUS_RPC_BASE}?api-key={urllib.parse.quote(helius_api_key)}"
    return RPC_URL


def _parse_api_key(value: Optional[str]) -> Optional[str]:
    """
    Accept either a raw API key or a full Helius RPC URL and return the key.
    """
    if not value:
        return None
    v = value.strip()
    if not v:
        return None
    if "api-key=" not in v:
        return v
    try:
        parsed = urllib.parse.urlparse(v)
        qs = urllib.parse.parse_qs(parsed.query)
        key = (qs.get("api-key") or qs.get("api_key") or [""])[0].strip()
        return key or None
    except Exception:
        return None


def _post_json_rpc_url(url: str, method: str, params: Sequence[Any]) -> Any:
    payload = {"jsonrpc": "2.0", "id": 1, "method": method, "params": list(params)}
    body = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=body,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=90) as resp:
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


def _get_json(url: str) -> Any:
    req = urllib.request.Request(url, method="GET")
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            raw = resp.read()
    except urllib.error.URLError:
        return None
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        return None


def load_jupiter_program_ids() -> Dict[str, str]:
    """
    Returns a map of program_id -> label from Jupiter when reachable.
    Falls back to an empty map if the endpoint is unavailable.
    """
    data = _get_json(JUPITER_PROGRAM_ID_LABELS_URL)
    if isinstance(data, dict):
        # Expecting {program_id: label}
        return {str(k): str(v) for k, v in data.items()}
    return {}


def discover_csvs(input_dir: str) -> List[str]:
    if not os.path.isdir(input_dir):
        raise RuntimeError(f"Input directory not found: {input_dir}")
    paths: List[str] = []
    for name in sorted(os.listdir(input_dir)):
        if name.endswith(".stake_accounts.csv"):
            paths.append(os.path.join(input_dir, name))
    if not paths:
        raise RuntimeError(
            f"No stake CSVs found in {input_dir}. Run collect_validator_stake.py first."
        )
    return paths


def aggregate_authorities(
    csv_paths: Iterable[str], *, mode: str
) -> Dict[str, Dict[str, int]]:
    """
    Returns:
      wallet -> {
        "delegated_lamports": int,
        "stake_accounts": int,
      }
    """
    agg: Dict[str, Dict[str, int]] = {}

    for path in csv_paths:
        with open(path, "r", encoding="utf-8", newline="") as f:
            reader = csv.DictReader(f)
            for row in reader:
                delegated = int(row.get("delegated_stake_lamports") or 0)

                wallets: List[str] = []
                if mode in ("staker", "both"):
                    wallets.append(row.get("staker_authority") or "UNKNOWN")
                if mode in ("withdrawer", "both"):
                    wallets.append(row.get("withdraw_authority") or "UNKNOWN")

                for wallet in wallets:
                    entry = agg.setdefault(
                        wallet, {"delegated_lamports": 0, "stake_accounts": 0}
                    )
                    entry["delegated_lamports"] += delegated
                    entry["stake_accounts"] += 1

    # Drop UNKNOWN if present.
    agg.pop("UNKNOWN", None)
    return agg


def top_wallets(
    authority_agg: Dict[str, Dict[str, int]], *, top_n: int
) -> List[Tuple[str, Dict[str, int]]]:
    items = sorted(
        authority_agg.items(),
        key=lambda kv: (kv[1]["delegated_lamports"], kv[1]["stake_accounts"]),
        reverse=True,
    )
    return items[:top_n]


def rpc_get_balance(wallet: str, *, helius_api_key: Optional[str]) -> int:
    url = _rpc_url(helius_api_key)
    result = _post_json_rpc_url(url, "getBalance", [wallet, {"commitment": "finalized"}])
    return int(result["value"])


def rpc_get_token_accounts_by_owner(
    wallet: str, program_id: str, *, helius_api_key: Optional[str]
) -> List[Dict[str, Any]]:
    url = _rpc_url(helius_api_key)
    result = _post_json_rpc_url(
        url,
        "getTokenAccountsByOwner",
        [
            wallet,
            {"programId": program_id},
            {"commitment": "finalized", "encoding": "jsonParsed"},
        ],
    )
    return result.get("value", []) if isinstance(result, dict) else []


def extract_token_holdings(accounts: Iterable[Dict[str, Any]]) -> List[Dict[str, Any]]:
    holdings: List[Dict[str, Any]] = []
    for entry in accounts:
        pubkey = entry.get("pubkey")
        account = entry.get("account", {})
        parsed = account.get("data", {}).get("parsed", {})
        info = parsed.get("info", {})
        mint = info.get("mint")
        token_amount = info.get("tokenAmount", {})

        ui_amount = token_amount.get("uiAmount")
        ui_amount_string = token_amount.get("uiAmountString")
        decimals = token_amount.get("decimals")

        try:
            amount_float = float(ui_amount) if ui_amount is not None else float(ui_amount_string or 0)
        except (TypeError, ValueError):
            amount_float = 0.0

        if amount_float <= 0:
            continue

        holdings.append(
            {
                "token_account": pubkey,
                "mint": mint,
                "amount_ui": amount_float,
                "amount_ui_str": ui_amount_string,
                "decimals": decimals,
            }
        )
    holdings.sort(key=lambda h: h["amount_ui"], reverse=True)
    return holdings


def rpc_get_signatures(
    wallet: str, *, limit: int, helius_api_key: Optional[str]
) -> List[Dict[str, Any]]:
    url = _rpc_url(helius_api_key)
    result = _post_json_rpc_url(
        url,
        "getSignaturesForAddress",
        [wallet, {"limit": limit, "commitment": "finalized"}],
    )
    return result if isinstance(result, list) else []


def rpc_get_transaction(signature: str, *, helius_api_key: Optional[str]) -> Optional[Dict[str, Any]]:
    try:
        url = _rpc_url(helius_api_key)
        return _post_json_rpc_url(
            url,
            "getTransaction",
            [
                signature,
                {
                    "commitment": "finalized",
                    "encoding": "jsonParsed",
                    "maxSupportedTransactionVersion": 0,
                },
            ],
        )
    except RuntimeError:
        return None


def extract_program_ids_from_tx(tx: Dict[str, Any]) -> List[str]:
    """
    Collect program IDs referenced by the transaction message.
    """
    msg = (
        tx.get("transaction", {})
        .get("message", {})
    )
    account_keys = msg.get("accountKeys") or []
    program_ids: List[str] = []
    for entry in account_keys:
        # jsonParsed may provide dicts with pubkey fields.
        if isinstance(entry, str):
            program_ids.append(entry)
        elif isinstance(entry, dict) and "pubkey" in entry:
            program_ids.append(str(entry["pubkey"]))
    return program_ids


@dataclass
class SwapStats:
    recent_signatures: int
    recent_swaps: int
    lookback_days: float
    swaps_per_day: float
    last_swap_time: Optional[int]


def helius_get_transactions_for_address(
    wallet: str,
    *,
    helius_api_key: str,
    limit: int,
    lookback_days: int,
    token_accounts: str,
) -> List[Dict[str, Any]]:
    """
    Helius-exclusive method that can include token account activity in one call.

    We keep this intentionally focused:
    - transactionDetails: "full" (limit must be <= 100)
    - filters.status: "succeeded"
    - filters.blockTime.gte: now - lookback_days
    - filters.tokenAccounts: "balanceChanged" (default)
    """
    now_ts = int(time.time())
    gte_ts = max(0, now_ts - lookback_days * 86400)

    params = [
        wallet,
        {
            "transactionDetails": "full",
            "encoding": "jsonParsed",
            "maxSupportedTransactionVersion": 0,
            "sortOrder": "desc",
            "limit": min(limit, 100),
            "commitment": "finalized",
            "filters": {
                "status": "succeeded",
                "blockTime": {"gte": gte_ts},
                "tokenAccounts": token_accounts,
            },
        },
    ]

    url = _rpc_url(helius_api_key)
    result = _post_json_rpc_url(url, "getTransactionsForAddress", params)
    if not isinstance(result, dict):
        return []
    data = result.get("data")
    return data if isinstance(data, list) else []


def helius_get_signatures_for_address(
    wallet: str,
    *,
    helius_api_key: str,
    limit: int,
    lookback_days: int,
    token_accounts: str,
    strict_last_n: bool,
) -> List[Dict[str, Any]]:
    """
    Use Helius getTransactionsForAddress in signatures mode.

    Important behavior:
    - If strict_last_n is True, we omit the blockTime filter so we truly get
      the most recent N signatures regardless of age.
    - If lookback_days <= 0, we also omit the blockTime filter.
    """
    filters: Dict[str, Any] = {"status": "succeeded", "tokenAccounts": token_accounts}
    if not strict_last_n and lookback_days > 0:
        now_ts = int(time.time())
        gte_ts = max(0, now_ts - lookback_days * 86400)
        filters["blockTime"] = {"gte": gte_ts}
    params = [
        wallet,
        {
            "transactionDetails": "signatures",
            "sortOrder": "desc",
            "limit": min(limit, 1000),
            "commitment": "finalized",
            "filters": filters,
        },
    ]
    url = _rpc_url(helius_api_key)
    result = _post_json_rpc_url(url, "getTransactionsForAddress", params)
    if not isinstance(result, dict):
        return []
    data = result.get("data")
    return data if isinstance(data, list) else []


def helius_parse_transactions(
    signatures: Sequence[str], *, helius_api_key: str
) -> List[Dict[str, Any]]:
    """
    Parse transactions into human-readable structures using Helius Enhanced API.
    """
    if not signatures:
        return []
    url = f"{HELIUS_PARSE_TX_URL_BASE}?api-key={urllib.parse.quote(helius_api_key)}"
    payload = {"transactions": list(signatures)}
    body = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=body,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=90) as resp:
            raw = resp.read()
    except urllib.error.HTTPError as e:
        raise RuntimeError(
            f"HTTP error calling Helius parseTransactions: {e.code} {e.reason}"
        ) from e
    except urllib.error.URLError as e:
        raise RuntimeError(f"Network error calling Helius parseTransactions: {e.reason}") from e

    try:
        parsed = json.loads(raw)
    except json.JSONDecodeError as e:
        raise RuntimeError(f"Invalid JSON from Helius parseTransactions: {raw[:200]!r}") from e
    return parsed if isinstance(parsed, list) else []


def filter_wallet_signed_transactions(
    parsed_txs: Sequence[Dict[str, Any]], wallet: str
) -> List[Dict[str, Any]]:
    """
    Keep only transactions that appear to be initiated/signed by the wallet.

    Heuristics:
    - feePayer == wallet (most reliable for user actions)
    - wallet is present in a 'signers' list when provided
    """
    wallet = wallet.strip()
    if not wallet:
        return []

    filtered: List[Dict[str, Any]] = []
    for tx in parsed_txs:
        fee_payer = str(tx.get("feePayer") or "")
        if fee_payer == wallet:
            filtered.append(tx)
            continue
        signers = tx.get("signers")
        if isinstance(signers, list) and wallet in [str(s) for s in signers]:
            filtered.append(tx)
            continue
    return filtered


def analyze_swaps_from_transactions(
    transactions: Sequence[Dict[str, Any]],
    *,
    swap_program_ids: Dict[str, str],
) -> Tuple[SwapStats, List[str]]:
    if not transactions:
        return SwapStats(0, 0, 0.0, 0.0, None), []

    times = [t.get("blockTime") for t in transactions if t.get("blockTime") is not None]
    if times:
        lookback_seconds = max(times) - min(times)
        lookback_days = max(lookback_seconds / 86400, 1 / 24)
    else:
        lookback_days = 0.0

    recent_swaps = 0
    last_swap_time: Optional[int] = None
    matched_programs: List[str] = []

    for tx_item in transactions:
        program_ids = extract_program_ids_from_tx(tx_item)
        matched = [pid for pid in program_ids if pid in swap_program_ids]
        if matched:
            recent_swaps += 1
            matched_programs.extend(matched)
            bt = tx_item.get("blockTime")
            if bt is not None:
                last_swap_time = max(last_swap_time or bt, bt)

    swaps_per_day = (recent_swaps / lookback_days) if lookback_days > 0 else 0.0
    stats = SwapStats(
        recent_signatures=len(transactions),
        recent_swaps=recent_swaps,
        lookback_days=lookback_days,
        swaps_per_day=swaps_per_day,
        last_swap_time=last_swap_time,
    )
    return stats, matched_programs


def analyze_swaps_from_parsed_transactions(
    parsed_txs: Sequence[Dict[str, Any]],
) -> Tuple[SwapStats, List[str]]:
    if not parsed_txs:
        return SwapStats(0, 0, 0.0, 0.0, None), []

    times = [t.get("timestamp") for t in parsed_txs if t.get("timestamp") is not None]
    if times:
        lookback_seconds = max(times) - min(times)
        lookback_days = max(lookback_seconds / 86400, 1 / 24)
    else:
        lookback_days = 0.0

    recent_swaps = 0
    last_swap_time: Optional[int] = None
    swap_sources: List[str] = []

    for tx in parsed_txs:
        tx_type = str(tx.get("type") or "").upper()
        description = str(tx.get("description") or "").lower()
        is_swap = tx_type == "SWAP" or " swap " in f" {description} "
        if is_swap:
            recent_swaps += 1
            ts = tx.get("timestamp")
            if ts is not None:
                last_swap_time = max(last_swap_time or ts, ts)
            source = tx.get("source")
            if source:
                swap_sources.append(str(source))

    swaps_per_day = (recent_swaps / lookback_days) if lookback_days > 0 else 0.0
    stats = SwapStats(
        recent_signatures=len(parsed_txs),
        recent_swaps=recent_swaps,
        lookback_days=lookback_days,
        swaps_per_day=swaps_per_day,
        last_swap_time=last_swap_time,
    )
    return stats, swap_sources


def summarize_parsed_transactions(
    parsed_txs: Sequence[Dict[str, Any]], *, limit: int = 25
) -> Tuple[Dict[str, int], Dict[str, int], List[Dict[str, Any]]]:
    """
    Build human-readable transaction summaries and type/source counts.
    """
    type_counts: Dict[str, int] = {}
    source_counts: Dict[str, int] = {}
    recent: List[Dict[str, Any]] = []

    def _iso_from_ts(ts: Optional[int]) -> str:
        return _iso(ts) or ""

    # Sort newest-first when timestamps exist.
    txs = list(parsed_txs)
    txs.sort(key=lambda t: (t.get("timestamp") or 0), reverse=True)

    for tx in txs:
        tx_type = str(tx.get("type") or "UNKNOWN")
        source = str(tx.get("source") or "UNKNOWN")
        type_counts[tx_type] = type_counts.get(tx_type, 0) + 1
        source_counts[source] = source_counts.get(source, 0) + 1

        if len(recent) >= limit:
            continue

        ts = tx.get("timestamp")
        recent.append(
            {
                "signature": tx.get("signature"),
                "timestamp": ts,
                "timestamp_iso": _iso_from_ts(ts if isinstance(ts, int) else None),
                "slot": tx.get("slot"),
                "type": tx_type,
                "source": source,
                "description": tx.get("description"),
                "fee": tx.get("fee"),
            }
        )

    return type_counts, source_counts, recent


def aggregate_native_transfers(
    parsed_txs: Sequence[Dict[str, Any]], wallet: str
) -> Tuple[int, int, Dict[str, int], Dict[str, int]]:
    """
    Aggregate SOL flows for a wallet using parsed nativeTransfers.

    Note: funding often occurs in transactions not signed by the wallet.
    We therefore compute flows across all parsed transactions in the lookback window.
    """
    wallet = wallet.strip()
    incoming = 0
    outgoing = 0
    in_by: Dict[str, int] = {}
    out_by: Dict[str, int] = {}

    for tx in parsed_txs:
        transfers = tx.get("nativeTransfers")
        if not isinstance(transfers, list):
            continue
        for tr in transfers:
            if not isinstance(tr, dict):
                continue
            from_acct = str(tr.get("fromUserAccount") or "")
            to_acct = str(tr.get("toUserAccount") or "")
            try:
                amount = int(tr.get("amount") or 0)
            except (TypeError, ValueError):
                amount = 0
            if amount <= 0:
                continue

            if to_acct == wallet and from_acct and from_acct != wallet:
                incoming += amount
                in_by[from_acct] = in_by.get(from_acct, 0) + amount
            if from_acct == wallet and to_acct and to_acct != wallet:
                outgoing += amount
                out_by[to_acct] = out_by.get(to_acct, 0) + amount

    return incoming, outgoing, in_by, out_by


def top_counterparties(mapping: Dict[str, int], *, n: int = 12) -> List[Dict[str, Any]]:
    items = sorted(mapping.items(), key=lambda kv: kv[1], reverse=True)[:n]
    return [
        {
            "address": addr,
            "lamports": lamports,
            "sol": lamports_to_sol(lamports),
        }
        for addr, lamports in items
    ]


def analyze_swaps(
    signatures: Sequence[Dict[str, Any]],
    *,
    swap_program_ids: Dict[str, str],
    tx_fetch_limit: int,
    helius_api_key: Optional[str],
) -> SwapStats:
    if not signatures:
        return SwapStats(0, 0, 0.0, 0.0, None)

    # Use the available blockTimes to establish a lookback window.
    times = [s.get("blockTime") for s in signatures if s.get("blockTime") is not None]
    if times:
        lookback_seconds = max(times) - min(times)
        lookback_days = max(lookback_seconds / 86400, 1 / 24)  # minimum 1 hour window
    else:
        lookback_days = 0.0

    recent_swaps = 0
    last_swap_time: Optional[int] = None

    # Only fetch transactions for a subset to control RPC cost.
    for sig_info in signatures[:tx_fetch_limit]:
        sig = sig_info.get("signature")
        if not sig:
            continue
        tx = rpc_get_transaction(sig, helius_api_key=helius_api_key)
        if not tx:
            continue
        program_ids = extract_program_ids_from_tx(tx)
        matched = [pid for pid in program_ids if pid in swap_program_ids]
        if matched:
            recent_swaps += 1
            bt = sig_info.get("blockTime")
            if bt is not None:
                last_swap_time = max(last_swap_time or bt, bt)

    swaps_per_day = (recent_swaps / lookback_days) if lookback_days > 0 else 0.0
    return SwapStats(
        recent_signatures=len(signatures),
        recent_swaps=recent_swaps,
        lookback_days=lookback_days,
        swaps_per_day=swaps_per_day,
        last_swap_time=last_swap_time,
    )


def ensure_out_dir() -> None:
    os.makedirs(OUT_DIR, exist_ok=True)
    os.makedirs(CACHE_DIR, exist_ok=True)


def _cache_path(wallet: str) -> str:
    # Wallet pubkeys are safe as filenames.
    return os.path.join(CACHE_DIR, f"{wallet}.json")


def load_cached_profile(wallet: str) -> Optional[Dict[str, Any]]:
    path = _cache_path(wallet)
    if not os.path.exists(path):
        return None
    try:
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
        return data if isinstance(data, dict) else None
    except (OSError, json.JSONDecodeError):
        return None


def cache_is_fresh(profile: Dict[str, Any], *, ttl_hours: float) -> bool:
    try:
        cached_at = float(profile.get("cached_at") or 0.0)
    except (TypeError, ValueError):
        cached_at = 0.0
    if cached_at <= 0:
        return False
    age_seconds = max(0.0, time.time() - cached_at)
    return age_seconds <= ttl_hours * 3600.0


def write_cached_profile(profile: Dict[str, Any]) -> None:
    wallet = str(profile.get("wallet") or "")
    if not wallet:
        return
    path = _cache_path(wallet)
    try:
        with open(path, "w", encoding="utf-8") as f:
            json.dump(profile, f, indent=2, sort_keys=True)
    except OSError:
        # Best-effort cache write.
        return


def load_manifest() -> Dict[str, Any]:
    if not os.path.exists(MANIFEST_PATH):
        return {"processed_wallets": {}, "updated_at": int(time.time())}
    try:
        with open(MANIFEST_PATH, "r", encoding="utf-8") as f:
            data = json.load(f)
        if isinstance(data, dict):
            data.setdefault("processed_wallets", {})
            data.setdefault("updated_at", int(time.time()))
            return data
    except (OSError, json.JSONDecodeError):
        pass
    return {"processed_wallets": {}, "updated_at": int(time.time())}


def update_manifest(manifest: Dict[str, Any], wallet: str, cached_at: float) -> None:
    processed = manifest.setdefault("processed_wallets", {})
    if isinstance(processed, dict):
        processed[wallet] = int(cached_at)
    manifest["updated_at"] = int(time.time())


def write_manifest(manifest: Dict[str, Any]) -> None:
    try:
        with open(MANIFEST_PATH, "w", encoding="utf-8") as f:
            json.dump(manifest, f, indent=2, sort_keys=True)
    except OSError:
        return


def append_jsonl(profile: Dict[str, Any]) -> None:
    """
    Append a single wallet profile to a JSONL log for resumable, append-only runs.
    """
    try:
        with open(JSONL_PATH, "a", encoding="utf-8") as f:
            f.write(json.dumps(profile, sort_keys=True))
            f.write("\n")
    except OSError:
        return


def write_profiles_json(profiles: List[Dict[str, Any]]) -> str:
    ensure_out_dir()
    path = os.path.join(OUT_DIR, "wallet_profiles.json")
    with open(path, "w", encoding="utf-8") as f:
        json.dump(profiles, f, indent=2, sort_keys=True)
    return path


def write_profiles_csv(profiles: List[Dict[str, Any]]) -> str:
    ensure_out_dir()
    path = os.path.join(OUT_DIR, "wallet_profiles.csv")
    fieldnames = [
        "wallet",
        "mode",
        "helius_used",
        "delegated_lamports",
        "delegated_sol",
        "stake_accounts",
        "balance_lamports",
        "balance_sol",
        "token_accounts_nonzero",
        "recent_signatures",
        "recent_swaps_detected",
        "lookback_days",
        "swaps_per_day",
        "last_swap_time",
        "last_swap_time_iso",
        "swap_programs_used",
        "top_token_mints",
        "tx_type_counts_json",
        "tx_source_counts_json",
        "recent_tx_summaries_json",
        "funding_in_lamports",
        "funding_in_sol",
        "funding_out_lamports",
        "funding_out_sol",
        "funding_sources_top_json",
        "funding_destinations_top_json",
    ]
    with open(path, "w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        for p in profiles:
            row = {k: p.get(k) for k in fieldnames}
            # Serialize nested structures for CSV consumption.
            row["tx_type_counts_json"] = json.dumps(p.get("tx_type_counts", {}), sort_keys=True)
            row["tx_source_counts_json"] = json.dumps(
                p.get("tx_source_counts", {}), sort_keys=True
            )
            row["recent_tx_summaries_json"] = json.dumps(
                p.get("recent_tx_summaries", []), sort_keys=True
            )
            row["funding_sources_top_json"] = json.dumps(
                p.get("funding_sources_top", []), sort_keys=True
            )
            row["funding_destinations_top_json"] = json.dumps(
                p.get("funding_destinations_top", []), sort_keys=True
            )
            writer.writerow(row)
    return path


def summarize_swap_programs(matches: Sequence[str], labels: Dict[str, str]) -> str:
    if not matches:
        return ""
    unique = sorted(set(matches))
    parts = []
    for pid in unique:
        label = labels.get(pid)
        parts.append(f"{label or 'program'}:{pid}")
    return " | ".join(parts)


def summarize_swap_sources(sources: Sequence[str]) -> str:
    if not sources:
        return ""
    counts: Dict[str, int] = {}
    for s in sources:
        counts[s] = counts.get(s, 0) + 1
    top = sorted(counts.items(), key=lambda kv: kv[1], reverse=True)[:8]
    return " | ".join(f"{src}:{cnt}" for src, cnt in top)


def collect_wallet_profile(
    wallet: str,
    *,
    mode: str,
    delegated_lamports: int,
    stake_accounts: int,
    swap_program_ids: Dict[str, str],
    signatures_limit: int,
    tx_fetch_limit: int,
    helius_api_key: Optional[str],
    helius_tx_limit: int,
    helius_lookback_days: int,
    helius_token_accounts: str,
    helius_strict_last_n: bool,
) -> Dict[str, Any]:
    balance_lamports = rpc_get_balance(wallet, helius_api_key=helius_api_key)
    balance_sol = lamports_to_sol(balance_lamports)

    spl_accounts = rpc_get_token_accounts_by_owner(
        wallet, TOKEN_PROGRAM_ID, helius_api_key=helius_api_key
    )
    t22_accounts = rpc_get_token_accounts_by_owner(
        wallet, TOKEN_2022_PROGRAM_ID, helius_api_key=helius_api_key
    )
    holdings = extract_token_holdings([*spl_accounts, *t22_accounts])

    matched_programs: List[str] = []
    swap_stats: SwapStats
    tx_type_counts: Dict[str, int] = {}
    tx_source_counts: Dict[str, int] = {}
    recent_tx_summaries: List[Dict[str, Any]] = []
    funding_in_lamports = 0
    funding_out_lamports = 0
    funding_sources_top: List[Dict[str, Any]] = []
    funding_destinations_top: List[Dict[str, Any]] = []

    helius_used = bool(helius_api_key)
    if helius_api_key:
        # 1) Get recent signatures with token-account awareness.
        sig_infos = helius_get_signatures_for_address(
            wallet,
            helius_api_key=helius_api_key,
            limit=min(helius_tx_limit, 100),
            lookback_days=helius_lookback_days,
            token_accounts=helius_token_accounts,
            strict_last_n=helius_strict_last_n,
        )
        signatures = [s.get("signature") for s in sig_infos if s.get("signature")]
        # 2) Parse the most recent transactions into human-readable form.
        parsed = helius_parse_transactions(signatures[:100], helius_api_key=helius_api_key)
        # Funding flows are computed across all parsed transactions in-window.
        (
            funding_in_lamports,
            funding_out_lamports,
            in_by,
            out_by,
        ) = aggregate_native_transfers(parsed, wallet)
        funding_sources_top = top_counterparties(in_by, n=12)
        funding_destinations_top = top_counterparties(out_by, n=12)

        signed_parsed = filter_wallet_signed_transactions(parsed, wallet)
        swap_stats, swap_sources = analyze_swaps_from_parsed_transactions(signed_parsed)
        matched_programs = swap_sources
        tx_type_counts, tx_source_counts, recent_tx_summaries = summarize_parsed_transactions(
            signed_parsed, limit=25
        )
    else:
        signatures = rpc_get_signatures(
            wallet, limit=signatures_limit, helius_api_key=helius_api_key
        )
        swap_stats = analyze_swaps(
            signatures,
            swap_program_ids=swap_program_ids,
            tx_fetch_limit=tx_fetch_limit,
            helius_api_key=helius_api_key,
        )
        # Collect which swap programs were actually matched by scanning the same subset.
        for sig_info in signatures[:tx_fetch_limit]:
            sig = sig_info.get("signature")
            if not sig:
                continue
            tx = rpc_get_transaction(sig, helius_api_key=helius_api_key)
            if not tx:
                continue
            program_ids = extract_program_ids_from_tx(tx)
            matched_programs.extend([pid for pid in program_ids if pid in swap_program_ids])

    top_token_mints = ",".join(h["mint"] for h in holdings[:6] if h.get("mint"))

    profile: Dict[str, Any] = {
        "wallet": wallet,
        "mode": mode,
        "helius_used": helius_used,
        "cached_at": time.time(),
        "delegated_lamports": delegated_lamports,
        "delegated_sol": lamports_to_sol(delegated_lamports),
        "stake_accounts": stake_accounts,
        "balance_lamports": balance_lamports,
        "balance_sol": balance_sol,
        "token_accounts_nonzero": len(holdings),
        "tokens": holdings,
        "recent_signatures": swap_stats.recent_signatures,
        "recent_swaps_detected": swap_stats.recent_swaps,
        "lookback_days": swap_stats.lookback_days,
        "swaps_per_day": swap_stats.swaps_per_day,
        "last_swap_time": swap_stats.last_swap_time,
        "last_swap_time_iso": _iso(swap_stats.last_swap_time),
        "swap_programs_used": (
            summarize_swap_sources(matched_programs)
            if helius_api_key
            else summarize_swap_programs(matched_programs, swap_program_ids)
        ),
        "top_token_mints": top_token_mints,
        "tx_type_counts": tx_type_counts,
        "tx_source_counts": tx_source_counts,
        "recent_tx_summaries": recent_tx_summaries,
        "funding_in_lamports": funding_in_lamports,
        "funding_in_sol": lamports_to_sol(funding_in_lamports),
        "funding_out_lamports": funding_out_lamports,
        "funding_out_sol": lamports_to_sol(funding_out_lamports),
        "funding_sources_top": funding_sources_top,
        "funding_destinations_top": funding_destinations_top,
    }
    return profile


def build_swap_program_map() -> Dict[str, str]:
    """
    Build a swap program ID -> label map.

    Includes:
    - Orca Whirlpools (static)
    - Jupiter's program map (dynamic, when reachable)
    """
    mapping: Dict[str, str] = {ORCA_WHIRLPOOLS_PROGRAM_ID: "Orca Whirlpools"}
    jup_map = load_jupiter_program_ids()
    mapping.update(jup_map)
    return mapping


def parse_args(argv: Sequence[str]) -> argparse.Namespace:
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument(
        "--mode",
        choices=("staker", "withdrawer", "both"),
        default="staker",
        help="Which authorities to aggregate from stake data (default: staker).",
    )
    p.add_argument(
        "--top-n",
        type=int,
        default=25,
        help="Number of top wallets (by delegated stake) to profile.",
    )
    p.add_argument(
        "--all-wallets",
        action="store_true",
        help="Profile all unique wallets found in the stake dataset (can be very large).",
    )
    p.add_argument(
        "--cache-ttl-hours",
        type=float,
        default=24.0,
        help="Reuse cached wallet profiles newer than this TTL in hours (default: 24).",
    )
    p.add_argument(
        "--force-refresh",
        action="store_true",
        help="Ignore cache TTL and refetch all selected wallets.",
    )
    p.add_argument(
        "--cache-only",
        action="store_true",
        help="Do not query RPC; only use cached profiles for selected wallets.",
    )
    p.add_argument(
        "--no-materialize-output",
        action="store_true",
        help="Skip writing wallet_profiles.json/csv (useful for large append-only runs).",
    )
    p.add_argument(
        "--manifest-every",
        type=int,
        default=25,
        help="Write the checkpoint manifest every N wallets (default: 25).",
    )
    p.add_argument(
        "--signatures-limit",
        type=int,
        default=200,
        help="How many recent signatures to fetch per wallet.",
    )
    p.add_argument(
        "--tx-fetch-limit",
        type=int,
        default=80,
        help="How many recent transactions to fetch per wallet for swap detection.",
    )
    p.add_argument(
        "--helius-api-key",
        type=str,
        default=os.environ.get("HELIUS_API_KEY", ""),
        help="Helius API key. If provided (or HELIUS_API_KEY is set), uses getTransactionsForAddress.",
    )
    p.add_argument(
        "--helius-tx-limit",
        type=int,
        default=100,
        help="Transactions to fetch per wallet via Helius (max 100 in full mode).",
    )
    p.add_argument(
        "--helius-lookback-days",
        type=int,
        default=30,
        help="Lookback window in days for Helius blockTime filter.",
    )
    p.add_argument(
        "--helius-strict-last-n",
        action="store_true",
        help=(
            "Ignore lookback days and fetch the true most recent N signatures. "
            "Use this to avoid dropping older activity."
        ),
    )
    p.add_argument(
        "--helius-token-accounts",
        choices=("none", "balanceChanged", "all"),
        default="balanceChanged",
        help="Helius tokenAccounts filter (default: balanceChanged).",
    )
    p.add_argument(
        "--sleep-ms",
        type=int,
        default=150,
        help="Sleep between wallet profiles to be polite to the RPC.",
    )
    return p.parse_args(argv)


def main(argv: Sequence[str]) -> int:
    args = parse_args(argv)
    ensure_out_dir()
    manifest = load_manifest()

    csv_paths = discover_csvs(INPUT_DIR)
    authority_agg = aggregate_authorities(csv_paths, mode=args.mode)
    if args.all_wallets:
        top = sorted(
            authority_agg.items(),
            key=lambda kv: (kv[1]["delegated_lamports"], kv[1]["stake_accounts"]),
            reverse=True,
        )
    else:
        top = top_wallets(authority_agg, top_n=args.top_n)

    swap_program_ids = build_swap_program_map()
    helius_api_key = _parse_api_key(args.helius_api_key)
    print(
        f"Loaded {len(swap_program_ids)} swap program IDs "
        f"(Jupiter reachable: {'yes' if len(swap_program_ids) > 1 else 'no'})"
    )
    print(
        "Transaction source: "
        + (
            "Helius getTransactionsForAddress + parseTransactions"
            if helius_api_key
            else "standard RPC (getSignaturesForAddress + getTransaction)"
        )
    )
    print(f"Wallets selected for profiling: {len(top):,}")
    print(
        "Cache: "
        + ("force refresh" if args.force_refresh else f"TTL {args.cache_ttl_hours:.1f}h")
    )
    if args.cache_only:
        print("Cache-only mode: RPC calls are disabled.")
    if args.helius_strict_last_n:
        print("Helius strict-last-n mode: blockTime lookback filter is disabled.")

    profiles: List[Dict[str, Any]] = []
    for i, (wallet, stats) in enumerate(top, start=1):
        cached = None if args.force_refresh else load_cached_profile(wallet)
        if cached and cache_is_fresh(cached, ttl_hours=args.cache_ttl_hours):
            profiles.append(cached)
            update_manifest(manifest, wallet, float(cached.get("cached_at") or time.time()))
            if args.manifest_every > 0 and i % args.manifest_every == 0:
                write_manifest(manifest)
            print(f"[{i}/{len(top)}] Using cache for {wallet}")
            continue

        if args.cache_only:
            print(f"[{i}/{len(top)}] Cache miss for {wallet} (skipping in cache-only mode)")
            continue

        print(
            f"[{i}/{len(top)}] Profiling {wallet} "
            f"({lamports_to_sol(stats['delegated_lamports']):,.2f} SOL delegated)"
        )
        try:
            profile = collect_wallet_profile(
                wallet,
                mode=args.mode,
                delegated_lamports=stats["delegated_lamports"],
                stake_accounts=stats["stake_accounts"],
                swap_program_ids=swap_program_ids,
                signatures_limit=args.signatures_limit,
                tx_fetch_limit=args.tx_fetch_limit,
                helius_api_key=helius_api_key,
                helius_tx_limit=args.helius_tx_limit,
                helius_lookback_days=args.helius_lookback_days,
                helius_token_accounts=args.helius_token_accounts,
                helius_strict_last_n=args.helius_strict_last_n,
            )
            profiles.append(profile)
            write_cached_profile(profile)
            update_manifest(manifest, wallet, float(profile.get("cached_at") or time.time()))
            append_jsonl(profile)
        except RuntimeError as e:
            print(f"  RPC error: {e}", file=sys.stderr)
        if args.manifest_every > 0 and i % args.manifest_every == 0:
            write_manifest(manifest)
        time.sleep(args.sleep_ms / 1000.0)

    write_manifest(manifest)
    if args.no_materialize_output:
        print("Skipped materializing wallet_profiles.json/csv (--no-materialize-output).")
        print(f"Append-only log -> {JSONL_PATH}")
        return 0

    json_path = write_profiles_json(profiles)
    csv_path = write_profiles_csv(profiles)
    print(f"Wrote profiles JSON -> {json_path}")
    print(f"Wrote profiles CSV  -> {csv_path}")
    print(f"Append-only log -> {JSONL_PATH}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
