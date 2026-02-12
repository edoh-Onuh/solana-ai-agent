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
  // Superteam community validators
  'FACqsS19VScz8oo2YhdMg35EsAy6xsCZ9Y58eJXGv8QJ',
];

/**
 * Additional information about Superteam validators
 * This can include validator names, regions, specialties, etc.
 */
export interface SuperteamValidatorInfo {
  pubkey: string;
  name: string;
  region?: string;
  specialty?: string;
  joinedDate?: string;
  twitterHandle?: string;
  website?: string;
}

export const SUPERTEAM_VALIDATOR_INFO: Record<string, SuperteamValidatorInfo> = {
  // Add detailed info for each Superteam validator
  // Example:
  // '7Np41oeYqPefeNQEHSv1UDhYrehxin3NStELsSKCT4K2': {
  //   pubkey: '7Np41oeYqPefeNQEHSv1UDhYrehxin3NStELsSKCT4K2',
  //   name: 'Superteam Validator UK',
  //   region: 'United Kingdom',
  //   specialty: 'High Performance',
  //   joinedDate: '2024-01',
  //   twitterHandle: '@superteam',
  //   website: 'https://superteam.fun',
  // },
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
