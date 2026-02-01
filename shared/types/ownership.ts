/**
 * Ownership utility types and functions for multiplayer support
 * Shared between client and server
 *
 * Determines friend/enemy relationships between entities.
 *
 * NOTE: Neutral entities use `null` as the canonical value.
 * For Colyseus compatibility, empty string `''` is also treated as neutral.
 */

/**
 * Interface for entities with ownership
 * ownerId is null or '' for neutral entities ('' for Colyseus compatibility)
 */
export interface OwnedEntity {
  ownerId: string | null;
}

/**
 * Looser interface for Colyseus schemas where ownerId is always string
 */
export interface OwnedEntityString {
  ownerId: string;
}

/**
 * Check if an ownerId represents a neutral entity
 * Handles both null and '' (Colyseus compatibility)
 */
function isNeutralId(ownerId: string | null): boolean {
  return ownerId === null || ownerId === '';
}

/**
 * Check if two entities are enemies
 *
 * Rules:
 * - Neutral entities (ownerId === null or '') are enemies to everyone
 * - Different owners are enemies
 * - Same owner (both non-null/non-empty) = not enemies
 *
 * @param a First entity
 * @param b Second entity
 * @returns true if entities are enemies
 */
export function isEnemy(a: OwnedEntity | OwnedEntityString, b: OwnedEntity | OwnedEntityString): boolean {
  // Neutral entities are enemies to everyone
  if (isNeutralId(a.ownerId) || isNeutralId(b.ownerId)) {
    return true;
  }
  // Different owners are enemies
  return a.ownerId !== b.ownerId;
}

/**
 * Check if two entities are friendly (same team)
 *
 * @param a First entity
 * @param b Second entity
 * @returns true if entities are friendly
 */
export function isFriendly(a: OwnedEntity | OwnedEntityString, b: OwnedEntity | OwnedEntityString): boolean {
  // Neutral entities are never friendly
  if (isNeutralId(a.ownerId) || isNeutralId(b.ownerId)) {
    return false;
  }
  // Same owner = friendly
  return a.ownerId === b.ownerId;
}

/**
 * Check if an entity belongs to a specific player
 */
export function belongsTo(entity: OwnedEntity | OwnedEntityString, playerId: string): boolean {
  return entity.ownerId === playerId;
}

/**
 * Check if an entity is neutral (no owner)
 * Handles both null and '' (Colyseus compatibility)
 */
export function isNeutral(entity: OwnedEntity | OwnedEntityString): boolean {
  return isNeutralId(entity.ownerId);
}

/**
 * Filter entities to get only enemies of the given entity
 */
export function filterEnemies<T extends OwnedEntity | OwnedEntityString>(entities: T[], self: OwnedEntity | OwnedEntityString): T[] {
  return entities.filter((e) => isEnemy(self, e));
}

/**
 * Filter entities to get only friendlies of the given entity
 */
export function filterFriendlies<T extends OwnedEntity | OwnedEntityString>(entities: T[], self: OwnedEntity | OwnedEntityString): T[] {
  return entities.filter((e) => isFriendly(self, e));
}
