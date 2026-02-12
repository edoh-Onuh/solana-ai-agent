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
  'FACqsS19VScz8oo2YhdMg35EsAy6xsCZ9Y58eJXGv8QJ', // Lantern
  '8Nvaxzif1NrdvxNkRetjT8xJvd33EHkKVrfL8EDkgaNy', // Validator 2
  'SyndicAgdEphcy5xhAKZAomTYhcF8xhC7za2UD9xeug', // Validator 5
  'spcti6GQVvinbtHU9UAkbXhjTcBJaba1NVx4tmK4M5F', // Validator 8
  'AqyRvpjjSN6jWYPxijoJwhmKwJFk6fRYDh9fQZHcJ2o7', // Validator 10
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
  'FACqsS19VScz8oo2YhdMg35EsAy6xsCZ9Y58eJXGv8QJ': {
    pubkey: 'FACqsS19VScz8oo2YhdMg35EsAy6xsCZ9Y58eJXGv8QJ',
    name: 'Lantern',
    region: 'Rotterdam, Netherlands',
    specialty: 'High Performance & Decentralization',
    joinedDate: '2024-03',
    website: 'https://www.lantern.one/',
  },
  '8Nvaxzif1NrdvxNkRetjT8xJvd33EHkKVrfL8EDkgaNy': {
    pubkey: '8Nvaxzif1NrdvxNkRetjT8xJvd33EHkKVrfL8EDkgaNy',
    name: 'Superteam Validator 2',
    specialty: 'High Stake - 216K SOL',
    joinedDate: '2024-01',
  },
  'SyndicAgdEphcy5xhAKZAomTYhcF8xhC7za2UD9xeug': {
    pubkey: 'SyndicAgdEphcy5xhAKZAomTYhcF8xhC7za2UD9xeug',
    name: 'Superteam Validator 5',
    specialty: 'High Stake - 270K SOL',
    joinedDate: '2024-02',
  },
  'spcti6GQVvinbtHU9UAkbXhjTcBJaba1NVx4tmK4M5F': {
    pubkey: 'spcti6GQVvinbtHU9UAkbXhjTcBJaba1NVx4tmK4M5F',
    name: 'Superteam Validator 8',
    specialty: 'High Stake - 254K SOL',
    joinedDate: '2024-03',
  },
  'AqyRvpjjSN6jWYPxijoJwhmKwJFk6fRYDh9fQZHcJ2o7': {
    pubkey: 'AqyRvpjjSN6jWYPxijoJwhmKwJFk6fRYDh9fQZHcJ2o7',
    name: 'Superteam Validator 10',
    specialty: 'High Stake - 454K SOL',
    joinedDate: '2024-04',
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
