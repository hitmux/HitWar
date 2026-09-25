import { describe, expect, it } from 'vitest';

import {
  belongsTo,
  filterEnemies,
  filterFriendlies,
  isEnemy,
  isFriendly,
  isNeutral,
  type OwnedEntity,
} from './ownership.js';

const playerOne: OwnedEntity = { ownerId: 'player-1' };
const playerTwo: OwnedEntity = { ownerId: 'player-2' };
const neutralNull: OwnedEntity = { ownerId: null };
const neutralEmpty: OwnedEntity = { ownerId: '' };

describe('ownership relationship helpers', () => {
  it('treats same non-neutral owner as friendly and not enemy', () => {
    expect(isFriendly(playerOne, { ownerId: 'player-1' })).toBe(true);
    expect(isEnemy(playerOne, { ownerId: 'player-1' })).toBe(false);
  });

  it('treats different owners as enemies and not friendly', () => {
    expect(isEnemy(playerOne, playerTwo)).toBe(true);
    expect(isFriendly(playerOne, playerTwo)).toBe(false);
  });

  it('treats null and empty owner IDs as neutral enemies to everyone', () => {
    expect(isNeutral(neutralNull)).toBe(true);
    expect(isNeutral(neutralEmpty)).toBe(true);
    expect(isEnemy(playerOne, neutralNull)).toBe(true);
    expect(isEnemy(playerOne, neutralEmpty)).toBe(true);
    expect(isEnemy(neutralNull, neutralEmpty)).toBe(true);
    expect(isFriendly(neutralNull, neutralEmpty)).toBe(false);
  });

  it('checks direct player ownership without treating neutral as a wildcard', () => {
    expect(belongsTo(playerOne, 'player-1')).toBe(true);
    expect(belongsTo(playerOne, 'player-2')).toBe(false);
    expect(belongsTo(neutralNull, 'player-1')).toBe(false);
    expect(belongsTo(neutralEmpty, '')).toBe(true);
  });

  it('filters enemies and friendlies while preserving original entity objects', () => {
    const entities = [
      playerOne,
      playerTwo,
      neutralNull,
      neutralEmpty,
      { ownerId: 'player-1' },
    ];

    expect(filterEnemies(entities, playerOne)).toEqual([playerTwo, neutralNull, neutralEmpty]);
    expect(filterFriendlies(entities, playerOne)).toEqual([playerOne, { ownerId: 'player-1' }]);
  });
});
