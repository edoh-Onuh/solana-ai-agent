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
  'ABREUtpzkkMiPHrBebpsYDU3mubtSohjDKZbyRoTJLae', // Abreu
  'unRgBLTLNXdBmenHXNPAg3AMn3KWcV3Mk4eoZBmTrdk', // Unruggable
  'FACqsS19VScz8oo2YhdMg35EsAy6xsCZ9Y58eJXGv8QJ', // Lantern
  'BULKEEKf9Hjy4nwCthjzheEk4joH23LLXttAHjqEZmB2', // BULK
  'EARNynHRWg6GfyJCmrrizcZxARB3HVzcaasvNa8kBS72', // EARN
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
  logoUrl?: string;
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
    logoUrl: 'https://ui-avatars.com/api/?name=Abreu&background=7c3aed&color=fff&bold=true',
    specialty: 'Community Validator',
    joinedDate: '2024-06',
    website: 'https://stakewiz.com/validator/ABREUtpzkkMiPHrBebpsYDU3mubtSohjDKZbyRoTJLae',
  },
  'unRgBLTLNXdBmenHXNPAg3AMn3KWcV3Mk4eoZBmTrdk': {
    pubkey: 'unRgBLTLNXdBmenHXNPAg3AMn3KWcV3Mk4eoZBmTrdk',
    name: 'Unruggable',
    logoUrl: 'https://ui-avatars.com/api/?name=Unruggable&background=ec4899&color=fff&bold=true',
    specialty: 'Community Validator',
    joinedDate: '2024-06',
    website: 'https://solanacompass.com/validators/unRgBLTLNXdBmenHXNPAg3AMn3KWcV3Mk4eoZBmTrdk',
  },
  'FACqsS19VScz8oo2YhdMg35EsAy6xsCZ9Y58eJXGv8QJ': {
    pubkey: 'FACqsS19VScz8oo2YhdMg35EsAy6xsCZ9Y58eJXGv8QJ',
    name: 'Lantern',
    logoUrl: 'https://ui-avatars.com/api/?name=Lantern&background=f97316&color=fff&bold=true',
    region: 'Rotterdam, Netherlands',
    specialty: 'High Performance & Decentralization',
    joinedDate: '2024-03',
    website: 'https://www.lantern.one/',
  },
  'BULKEEKf9Hjy4nwCthjzheEk4joH23LLXttAHjqEZmB2': {
    pubkey: 'BULKEEKf9Hjy4nwCthjzheEk4joH23LLXttAHjqEZmB2',
    name: 'BULK',
    logoUrl: 'https://ui-avatars.com/api/?name=BULK&background=22c55e&color=fff&bold=true',
    specialty: 'Community Validator',
    joinedDate: '2024-06',
    website: 'https://stakewiz.com/validator/BULKEEKf9Hjy4nwCthjzheEk4joH23LLXttAHjqEZmB2',
  },
  'EARNynHRWg6GfyJCmrrizcZxARB3HVzcaasvNa8kBS72': {
    pubkey: 'EARNynHRWg6GfyJCmrrizcZxARB3HVzcaasvNa8kBS72',
    name: 'EARN',
    logoUrl: 'https://ui-avatars.com/api/?name=EARN&background=0ea5e9&color=fff&bold=true',
    specialty: 'Community Validator',
    joinedDate: '2024-06',
    website: 'https://stakewiz.com/validator/EARNynHRWg6GfyJCmrrizcZxARB3HVzcaasvNa8kBS72',
  },
  '8Nvaxzif1NrdvxNkRetjT8xJvd33EHkKVrfL8EDkgaNy': {
    pubkey: '8Nvaxzif1NrdvxNkRetjT8xJvd33EHkKVrfL8EDkgaNy',
    name: 'Superteam Validator 2',
    logoUrl: 'https://ui-avatars.com/api/?name=STV2&background=6366f1&color=fff&bold=true',
    specialty: 'High Stake - 216K SOL',
    joinedDate: '2024-01',
  },
  'SyndicAgdEphcy5xhAKZAomTYhcF8xhC7za2UD9xeug': {
    pubkey: 'SyndicAgdEphcy5xhAKZAomTYhcF8xhC7za2UD9xeug',
    name: 'Superteam Validator 5',
    logoUrl: 'https://ui-avatars.com/api/?name=STV5&background=8b5cf6&color=fff&bold=true',
    specialty: 'High Stake - 270K SOL',
    joinedDate: '2024-02',
  },
  'spcti6GQVvinbtHU9UAkbXhjTcBJaba1NVx4tmK4M5F': {
    pubkey: 'spcti6GQVvinbtHU9UAkbXhjTcBJaba1NVx4tmK4M5F',
    name: 'Superteam Validator 8',
    logoUrl: 'https://ui-avatars.com/api/?name=STV8&background=7c3aed&color=fff&bold=true',
    specialty: 'High Stake - 254K SOL',
    joinedDate: '2024-03',
  },
  'AqyRvpjjSN6jWYPxijoJwhmKwJFk6fRYDh9fQZHcJ2o7': {
    pubkey: 'AqyRvpjjSN6jWYPxijoJwhmKwJFk6fRYDh9fQZHcJ2o7',
    name: 'Superteam Validator 10',
    logoUrl: 'https://ui-avatars.com/api/?name=STV10&background=9333ea&color=fff&bold=true',
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
