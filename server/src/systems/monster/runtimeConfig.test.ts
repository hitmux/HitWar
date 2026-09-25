import { describe, expect, it } from 'vitest';
import type { AnyMonsterDefinition } from '../../../../shared/config/monsterDefinitionTypes.js';
import { scalePeriod, scaleSpeed } from '../../../../shared/constants/speedScale.js';
import {
  DEFAULT_TARGET_WEIGHTS,
  DEFAULT_TERMINATOR_DAMAGE_RULES,
  deriveMonsterRuntimeConfig,
  deriveMonsterRuntimeConfigById,
  getMonsterRuntimeConfig,
  getRequiredMonsterRuntimeConfig,
  hasMonsterRuntimeConfig,
} from './runtimeConfig.js';

describe('deriveMonsterRuntimeConfig', () => {
  it('derives scaled stats and standard monster abilities from raw definitions', () => {
    const definition: AnyMonsterDefinition = {
      id: 'Custom',
      baseClass: 'Monster',
      name: 'Custom Monster',
      imgIndex: 1,
      comment: 'test',
      addPrice: 12,
      params: {
        hp: 321,
        r: 22,
        speedNumb: 2,
        accelerationV: 0.5,
        maxSpeedN: 9,
        colishDamage: 44,
        movementType: 'swing',
        teleportingAble: true,
        teleportingRange: 250,
        teleportingCount: 4,
        throwAble: true,
        bombSelf: {
          bombSelfAble: true,
          bombSelfRange: 80,
          bombSelfDamage: 200,
        },
        summon: {
          summonAble: true,
          summonCount: 3,
          summonDistance: 45,
          summonMonsterName: 'Normal',
        },
        gain: {
          haveGain: true,
          gainRadius: 90,
          gainFrequency: 6,
          gainSpeedNAddNum: 2,
        },
        bulletChange: {
          haveBulletChangeArea: true,
          r: 70,
          f: 9,
          bulletDR: -1,
          bulletAN: 2,
        },
        targetSelection: {
          targetSelectionAble: true,
          strategy: 'weakest',
          scanRadius: 222,
          updateInterval: 15,
        },
      },
    };

    const config = deriveMonsterRuntimeConfig(definition);

    expect(config.monsterId).toBe('Custom');
    expect(config.stats).toMatchObject({
      rawSpeed: 2,
      speed: scaleSpeed(2),
      rawAcceleration: 0.5,
      acceleration: scaleSpeed(0.5),
      rawMaxSpeed: 9,
      maxSpeed: scaleSpeed(9),
      baseHp: 321,
      radius: 22,
      colishDamage: 44,
      reward: 22,
    });
    expect(config.movementType).toBe('swing');
    expect(config.teleportingAble).toBe(true);
    expect(config.teleportingRange).toBe(250);
    expect(config.teleportingCount).toBe(4);
    expect(config.throwAble).toBe(true);
    expect(config.abilities.bombSelf).toMatchObject({
      enabled: true,
      range: 80,
      damage: 200,
      triggerOnDeath: true,
      triggerOnCollision: true,
    });
    expect(config.abilities.summon).toMatchObject({
      enabled: true,
      summonWhileAlive: true,
      count: 3,
      distance: 45,
      summonMonsterType: 'Normal',
    });
    expect(config.abilities.gain).toMatchObject({
      enabled: true,
      radius: 90,
      intervalTicks: scalePeriod(6),
      rawSpeedAdd: 2,
      speedAdd: scaleSpeed(2),
    });
    expect(config.abilities.bulletChange).toMatchObject({
      enabled: true,
      radius: 70,
      intervalTicks: scalePeriod(9),
      bulletDR: -1,
      bulletAN: 2,
      bulletDD: 0,
    });
    expect(config.abilities.targetSelection).toEqual({
      enabled: true,
      strategy: 'weakest',
      scanRadius: 222,
      updateIntervalTicks: scalePeriod(15),
      weights: DEFAULT_TARGET_WEIGHTS,
    });
  });

  it('applies base-class defaults and specialized runtime ability bundles', () => {
    const mortis: AnyMonsterDefinition = {
      id: 'Mortis',
      baseClass: 'MonsterMortis',
      name: 'Mortis',
      imgIndex: 2,
      comment: 'test',
      params: {
        viewRadius: 180,
        bumpDamage: 9,
        bumpDis: 60,
      },
    };
    const terminator: AnyMonsterDefinition = {
      id: 'Terminator',
      baseClass: 'MonsterTerminator',
      name: 'Terminator',
      imgIndex: 3,
      comment: 'test',
    };

    const mortisConfig = deriveMonsterRuntimeConfig(mortis);
    expect(mortisConfig.throwAble).toBe(true);
    expect(mortisConfig.abilities.mortis).toMatchObject({
      enabled: true,
      viewRadius: 180,
      bumpDamage: 9,
      bumpDistance: 60,
      rawBumpSpeed: 12,
      bumpSpeed: scaleSpeed(12),
    });
    expect(mortisConfig.abilities.shooter.enabled).toBe(false);

    const terminatorConfig = deriveMonsterRuntimeConfig(terminator);
    expect(terminatorConfig.stats.rawSpeed).toBe(0.3);
    expect(terminatorConfig.abilities.terminator).toEqual({
      enabled: true,
      meleeStopsMovement: true,
      damageRules: DEFAULT_TERMINATOR_DAMAGE_RULES,
    });
  });
});

describe('monster runtime config registry helpers', () => {
  it('reads existing generated configs and throws for required missing configs', () => {
    expect(hasMonsterRuntimeConfig('Normal')).toBe(true);
    expect(getMonsterRuntimeConfig('Normal')?.monsterId).toBe('Normal');
    expect(getRequiredMonsterRuntimeConfig('Normal').monsterId).toBe('Normal');
    expect(deriveMonsterRuntimeConfigById('Normal').monsterId).toBe('Normal');
    expect(() => getRequiredMonsterRuntimeConfig('missing')).toThrow(
      '[monsterRuntimeConfig] Missing runtime config for monster: missing'
    );
    expect(() => deriveMonsterRuntimeConfigById('missing')).toThrow(
      '[monsterRuntimeConfig] Missing shared monster definition: missing'
    );
  });
});
