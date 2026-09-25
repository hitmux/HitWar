import { describe, expect, it } from 'vitest';

import {
  MAX_TARGET_SCORING_MONSTER_SPEED,
  SPAWNABLE_MONSTER_META,
  getMonsterMeta,
  getMonsterThreatSpeed,
  getMonstersForWave,
  isMonsterTypeValid,
} from './monsterMeta.js';
import { MONSTER_DEFINITIONS } from './monsterDefinitions.js';

describe('spawnable monster metadata', () => {
  it('keeps monster metadata keys, ids, and core numeric fields valid', () => {
    for (const [monsterType, meta] of Object.entries(SPAWNABLE_MONSTER_META)) {
      expect(meta.monsterId).toBe(monsterType);
      expect(MONSTER_DEFINITIONS[monsterType as keyof typeof MONSTER_DEFINITIONS]).toBeDefined();
      expect(meta.name.length).toBeGreaterThan(0);
      expect(meta.cost).toBeGreaterThan(0);
      expect(meta.cooldownTicks).toBeGreaterThan(0);
      expect(meta.unlockWave).toBeGreaterThanOrEqual(1);
      expect(meta.reward).toBeGreaterThan(0);
      expect(meta.baseHp).toBeGreaterThan(0);
      expect(meta.speed).toBeGreaterThan(0);
      expect(meta.radius).toBeGreaterThan(0);
    }
  });

  it.each(['Normal', 'Runner', 'T800'])('looks up valid monster type %s', (monsterType) => {
    expect(getMonsterMeta(monsterType)?.monsterId).toBe(monsterType);
    expect(isMonsterTypeValid(monsterType)).toBe(true);
  });

  it.each(['', 'UnknownMonster', 'normal'])('rejects invalid monster type %s', (monsterType) => {
    expect(getMonsterMeta(monsterType)).toBeUndefined();
    expect(isMonsterTypeValid(monsterType)).toBe(false);
  });

  it('uses threatSpeed override when present and speed otherwise', () => {
    expect(getMonsterThreatSpeed(SPAWNABLE_MONSTER_META.Ox3)).toBe(SPAWNABLE_MONSTER_META.Ox3.threatSpeed);
    expect(getMonsterThreatSpeed(SPAWNABLE_MONSTER_META.Normal)).toBe(SPAWNABLE_MONSTER_META.Normal.speed);
  });

  it('computes target scoring speed cap from all monster threat speeds', () => {
    const maxThreatSpeed = Math.max(
      ...Object.values(SPAWNABLE_MONSTER_META).map((meta) => getMonsterThreatSpeed(meta)),
    );

    expect(MAX_TARGET_SCORING_MONSTER_SPEED).toBe(maxThreatSpeed);
    expect(MAX_TARGET_SCORING_MONSTER_SPEED).toBeGreaterThan(0);
  });

  it.each([
    [0, []],
    [1, ['Normal']],
    [3, ['Normal', 'Runner']],
    [15, ['Normal', 'Runner', 'T800']],
  ])('returns monsters unlocked by wave %#', (wave, expectedMonsterIds) => {
    const monsterIds = getMonstersForWave(wave).map((meta) => meta.monsterId);

    for (const monsterId of expectedMonsterIds) {
      expect(monsterIds).toContain(monsterId);
    }
  });

  it('never returns monsters above the requested wave', () => {
    for (const wave of [0, 1, 5, 10, 15]) {
      for (const meta of getMonstersForWave(wave)) {
        expect(meta.unlockWave).toBeLessThanOrEqual(wave);
      }
    }
  });
});
