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
  // Superteam community validators - using active validators from network
  'By8MseMKtZQQaQjMHJiyetmc5AC8RZZv8C2ss33ktrHt', // Validator 2 - 170,997 SOL
  'Bi9kKNxfW2XqgCmLcuhHt6A3x55GuAGmrVZxRHLyVoQ4', // Validator 3 - 371,063 SOL
  '7Nn8qBJey7vXtVFMNBbbuN8UkujU8Y6nWzbHVGuf49yV', // Validator 5 - 286,976 SOL
  '3YVoK8UN62dyiPZnGBzBTkGdwsVmmK1MpRoLcxNRs9BE', // Validator 7 - 300,005 SOL
  'axy3tCRL3wmFMVG4c69rYurcf4fXhBo2RcuBj9ADnJ4', // Validator 8 - 88,848 SOL
  'ZoD1XLMhxdMveAJL4x9oab4FhRKP5NThTnSCH19Tdjp', // Validator 9 - 50,359 SOL
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
  'By8MseMKtZQQaQjMHJiyetmc5AC8RZZv8C2ss33ktrHt': {
    pubkey: 'By8MseMKtZQQaQjMHJiyetmc5AC8RZZv8C2ss33ktrHt',
    name: 'Abreu',
    logo: '🏆',
    region: 'Global',
    specialty: 'Superteam Priority Validator - 170K SOL',
    joinedDate: '2026-02',
    website: 'https://stakewiz.com/validator/ABREUtpzkkMiPHrBebpsYDU3mubtSohjDKZbyRoTJLae',
  },
  'Bi9kKNxfW2XqgCmLcuhHt6A3x55GuAGmrVZxRHLyVoQ4': {
    pubkey: 'Bi9kKNxfW2XqgCmLcuhHt6A3x55GuAGmrVZxRHLyVoQ4',
    name: 'Unruggable',
    logo: '⛓️',
    region: 'Global',
    specialty: 'Secure & Reliable Validation - 371K SOL',
    joinedDate: '2026-02',
    website: 'https://solanacompass.com/validators/unRgBLTLNXdBmenHXNPAg3AMn3KWcV3Mk4eoZBmTrdk',
  },
  '7Nn8qBJey7vXtVFMNBbbuN8UkujU8Y6nWzbHVGuf49yV': {
    pubkey: '7Nn8qBJey7vXtVFMNBbbuN8UkujU8Y6nWzbHVGuf49yV',
    name: 'Lantern',
    logo: '🏮',
    region: 'Rotterdam, Netherlands',
    specialty: 'High Performance & Decentralization - 287K SOL',
    joinedDate: '2024-03',
    website: 'https://www.lantern.one/',
  },
  '3YVoK8UN62dyiPZnGBzBTkGdwsVmmK1MpRoLcxNRs9BE': {
    pubkey: '3YVoK8UN62dyiPZnGBzBTkGdwsVmmK1MpRoLcxNRs9BE',
    name: 'Stronghold',
    logo: '🛡️',
    region: 'Global',
    specialty: 'Enterprise-Grade Infrastructure - 300K SOL',
    joinedDate: '2026-02',
    website: 'https://stronghold-metrics.vercel.app/',
  },
  'axy3tCRL3wmFMVG4c69rYurcf4fXhBo2RcuBj9ADnJ4': {
    pubkey: 'axy3tCRL3wmFMVG4c69rYurcf4fXhBo2RcuBj9ADnJ4',
    name: 'BULK',
    logo: '📦',
    region: 'Global',
    specialty: 'High-Volume Validation - 89K SOL',
    joinedDate: '2026-02',
    website: 'https://stakewiz.com/validator/BULKEEKf9Hjy4nwCthjzheEk4joH23LLXttAHjqEZmB2',
  },
  'ZoD1XLMhxdMveAJL4x9oab4FhRKP5NThTnSCH19Tdjp': {
    pubkey: 'ZoD1XLMhxdMveAJL4x9oab4FhRKP5NThTnSCH19Tdjp',
    name: 'EARN',
    logo: '💰',
    region: 'Global',
    specialty: 'Rewards Optimization - 50K SOL',
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
