/**
 * Superteam Community Validators
 * 
 * This list contains validator public keys that are part of the Superteam community.
 * These validators receive special highlighting and prioritization in the UI.
 * 
 * To add a validator:
 * 1. Verify the validator is operated by a Superteam community member
 * 2. Add the public key to the SUPERTEAM_VALIDATORS array
 * 3. Update the validator info in SUPERTEAM_VALIDATOR_INFO (optional)
 */

export const SUPERTEAM_VALIDATORS: string[] = [
  // Superteam community validators - actual validator pubkeys
  'ABREUtpzkkMiPHrBebpsYDU3mubtSohjDKZbyRoTJLae', // Abreu
  'unRgBLTLNXdBmenHXNPAg3AMn3KWcV3Mk4eoZBmTrdk', // Unruggable
  'FACqsS19VScz8oo2YhdMg35EsAy6xsCZ9Y58eJXGv8QJ', // Lantern
  'EGUg4nrfkXmqb14jdpdczHDe3SgDNYJmxSmvr5CP7k8R', // Stronghold
  'BULKEEKf9Hjy4nwCthjzheEk4joH23LLXttAHjqEZmB2', // BULK
  'EARNynHRWg6GfyJCmrrizcZxARB3HVzcaasvNa8kBS72', // EARN
];

/**
 * Additional information about Superteam validators
 * This can include validator names, regions, specialties, etc.
 */
export interface SuperteamValidatorInfo {
  pubkey: string;
  name: string;
  logo?: string;
  region?: string;
  specialty?: string;
  joinedDate?: string;
  twitterHandle?: string;
  website?: string;
}

export const SUPERTEAM_VALIDATOR_INFO: Record<string, SuperteamValidatorInfo> = {
  'ABREUtpzkkMiPHrBebpsYDU3mubtSohjDKZbyRoTJLae': {
    pubkey: 'ABREUtpzkkMiPHrBebpsYDU3mubtSohjDKZbyRoTJLae',
    name: 'Abreu',
    logo: '🏆',
    region: 'Global',
    specialty: 'Superteam Priority Validator',
    joinedDate: '2026-02',
    website: 'https://stakewiz.com/validator/ABREUtpzkkMiPHrBebpsYDU3mubtSohjDKZbyRoTJLae',
  },
  'unRgBLTLNXdBmenHXNPAg3AMn3KWcV3Mk4eoZBmTrdk': {
    pubkey: 'unRgBLTLNXdBmenHXNPAg3AMn3KWcV3Mk4eoZBmTrdk',
    name: 'Unruggable',
    logo: '⛓️',
    region: 'Global',
    specialty: 'Secure & Reliable Validation',
    joinedDate: '2026-02',
    website: 'https://solanacompass.com/validators/unRgBLTLNXdBmenHXNPAg3AMn3KWcV3Mk4eoZBmTrdk',
  },
  'FACqsS19VScz8oo2YhdMg35EsAy6xsCZ9Y58eJXGv8QJ': {
    pubkey: 'FACqsS19VScz8oo2YhdMg35EsAy6xsCZ9Y58eJXGv8QJ',
    name: 'Lantern',
    logo: '🏮',
    region: 'Rotterdam, Netherlands',
    specialty: 'High Performance & Decentralization',
    joinedDate: '2024-03',
    website: 'https://www.lantern.one/',
  },
  'EGUg4nrfkXmqb14jdpdczHDe3SgDNYJmxSmvr5CP7k8R': {
    pubkey: 'EGUg4nrfkXmqb14jdpdczHDe3SgDNYJmxSmvr5CP7k8R',
    name: 'Stronghold',
    logo: '🛡️',
    region: 'Global',
    specialty: 'Enterprise-Grade Infrastructure',
    joinedDate: '2026-02',
    website: 'https://stronghold-metrics.vercel.app/',
  },
  'BULKEEKf9Hjy4nwCthjzheEk4joH23LLXttAHjqEZmB2': {
    pubkey: 'BULKEEKf9Hjy4nwCthjzheEk4joH23LLXttAHjqEZmB2',
    name: 'BULK',
    logo: '📦',
    region: 'Global',
    specialty: 'High-Volume Validation',
    joinedDate: '2026-02',
    website: 'https://stakewiz.com/validator/BULKEEKf9Hjy4nwCthjzheEk4joH23LLXttAHjqEZmB2',
  },
  'EARNynHRWg6GfyJCmrrizcZxARB3HVzcaasvNa8kBS72': {
    pubkey: 'EARNynHRWg6GfyJCmrrizcZxARB3HVzcaasvNa8kBS72',
    name: 'EARN',
    logo: '💰',
    region: 'Global',
    specialty: 'Rewards Optimization',
    joinedDate: '2026-02',
    website: 'https://stakewiz.com/validator/EARNynHRWg6GfyJCmrrizcZxARB3HVzcaasvNa8kBS72',
  },
};

/**
 * Check if a validator is part of Superteam community
 */
export function isSuperteamValidator(pubkey: string): boolean {
  return SUPERTEAM_VALIDATORS.includes(pubkey);
}

/**
 * Get Superteam validator info
 */
export function getSuperteamValidatorInfo(pubkey: string): SuperteamValidatorInfo | null {
  return SUPERTEAM_VALIDATOR_INFO[pubkey] || null;
}

/**
 * Get all Superteam validators with their info
 */
export function getAllSuperteamValidators(): SuperteamValidatorInfo[] {
  return SUPERTEAM_VALIDATORS.map(pubkey => 
    SUPERTEAM_VALIDATOR_INFO[pubkey] || { pubkey, name: 'Superteam Validator' }
  );
}

/**
 * Superteam bonus points for AI algorithm
 * These validators get a boost in the recommendation scoring
 */
export const SUPERTEAM_SCORE_BOOST = 10; // +10 points bonus

/**
 * Minimum percentage of Superteam validators in recommendations
 */
export const SUPERTEAM_MIN_PERCENTAGE = 20; // At least 20% of recommendations
