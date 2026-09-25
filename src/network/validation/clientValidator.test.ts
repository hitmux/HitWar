import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ValidationErrorCode } from '@shared/validation';
import { Vector } from '../../core/math/vector';
import { TowerRegistry } from '../../towers/towerRegistry';
import { SPAWNABLE_MONSTERS } from '../../buildings/spawnerConfig';
import { ClientValidator } from './clientValidator';

type MockWorld = {
    width: number;
    height: number;
    money: number;
    baseDead: boolean;
    territory?: { isPositionInValidTerritory: (pos: Vector) => boolean };
    batterys: unknown[];
    buildings: unknown[];
    getMoney: () => number;
    getBaseBuilding: () => { pos: Vector; isDead: () => boolean };
    isPositionInAnyTerritory?: (pos: Vector, playerId?: string) => boolean;
};

function makeWorld(overrides: Partial<MockWorld> = {}): MockWorld {
    const world: MockWorld = {
        width: 300,
        height: 300,
        money: 1000,
        baseDead: false,
        territory: { isPositionInValidTerritory: () => true },
        batterys: [],
        buildings: [],
        getMoney() {
            return this.money;
        },
        getBaseBuilding() {
            return {
                pos: new Vector(150, 150),
                isDead: () => this.baseDead,
            };
        },
        ...overrides,
    };
    return world;
}

function validator(world: MockWorld): ClientValidator {
    return new ClientValidator(world as never);
}

describe('ClientValidator', () => {
    beforeEach(() => {
        TowerRegistry.register('TestTower', () => ({}), {
            name: 'Test Tower',
            imgIndex: 0,
            basePrice: 100,
        });
    });

    afterEach(() => {
        TowerRegistry._creators.clear();
        TowerRegistry._metas.clear();
    });

    it('validates a build tower request and returns cost data', () => {
        const result = validator(makeWorld()).validateBuildTower('TestTower', 100, 100);

        expect(result.valid).toBe(true);
        expect(result.data).toEqual({ cost: 100, towerType: 'TestTower' });
    });

    it.each([
        { world: makeWorld({ baseDead: true }), args: ['TestTower', 100, 100] as const, code: ValidationErrorCode.PLAYER_NOT_ALIVE },
        { world: makeWorld(), args: ['MissingTower', 100, 100] as const, code: ValidationErrorCode.TOWER_TYPE_INVALID },
        { world: makeWorld(), args: ['TestTower', 5, 100] as const, code: ValidationErrorCode.POSITION_OUT_OF_BOUNDS },
        {
            world: makeWorld({ territory: { isPositionInValidTerritory: () => false } }),
            args: ['TestTower', 100, 100] as const,
            code: ValidationErrorCode.POSITION_NOT_IN_TERRITORY,
        },
        {
            world: makeWorld({ isPositionInAnyTerritory: () => true }),
            args: ['TestTower', 100, 100] as const,
            code: ValidationErrorCode.POSITION_IN_ENEMY_TERRITORY,
        },
        {
            world: makeWorld({ batterys: [{ id: 'tower-1', pos: { x: 110, y: 100 }, r: 15 }] }),
            args: ['TestTower', 100, 100] as const,
            code: ValidationErrorCode.POSITION_COLLISION,
        },
        {
            world: makeWorld({ buildings: [{ id: 'building-1', pos: { x: 110, y: 100 }, r: 20 }] }),
            args: ['TestTower', 100, 100] as const,
            code: ValidationErrorCode.POSITION_COLLISION,
        },
        { world: makeWorld({ money: 99 }), args: ['TestTower', 100, 100] as const, code: ValidationErrorCode.INSUFFICIENT_MONEY },
    ])('rejects invalid build tower requests %#', ({ world, args, code }) => {
        const [towerType, x, y] = args;
        const result = validator(world).validateBuildTower(towerType, x, y);

        expect(result.valid).toBe(false);
        expect(result.errorCode).toBe(code);
    });

    it('can swap the world reference before validation', () => {
        const clientValidator = validator(makeWorld({ money: 99 }));
        clientValidator.setWorld(makeWorld({ money: 1000 }) as never);

        expect(clientValidator.validateBuildTower('TestTower', 100, 100).valid).toBe(true);
    });

    it('validates spawn monster requests', () => {
        const config = SPAWNABLE_MONSTERS[0];
        const result = validator(makeWorld({ money: config.cost })).validateSpawnMonster(
            config.monsterId,
            config.unlockWave
        );

        expect(result.valid).toBe(true);
        expect(result.data).toEqual({ cost: config.cost });
    });

    it.each([
        { world: makeWorld({ baseDead: true }), monsterType: 'missing', wave: 1, code: ValidationErrorCode.PLAYER_NOT_ALIVE },
        { world: makeWorld(), monsterType: 'missing', wave: 1, code: ValidationErrorCode.MONSTER_TYPE_INVALID },
        {
            world: makeWorld(),
            monsterType: SPAWNABLE_MONSTERS.find((monster) => monster.unlockWave > 1)?.monsterId ?? SPAWNABLE_MONSTERS[0].monsterId,
            wave: 1,
            code: SPAWNABLE_MONSTERS.some((monster) => monster.unlockWave > 1)
                ? ValidationErrorCode.MONSTER_NOT_UNLOCKED
                : ValidationErrorCode.INSUFFICIENT_MONEY,
        },
        {
            world: makeWorld({ money: 0 }),
            monsterType: SPAWNABLE_MONSTERS[0].monsterId,
            wave: SPAWNABLE_MONSTERS[0].unlockWave,
            code: ValidationErrorCode.INSUFFICIENT_MONEY,
        },
    ])('rejects invalid spawn monster requests %#', ({ world, monsterType, wave, code }) => {
        const result = validator(world).validateSpawnMonster(monsterType, wave);

        expect(result.valid).toBe(false);
        expect(result.errorCode).toBe(code);
    });

    it('validates manual cannon fire requests', () => {
        const world = makeWorld({
            batterys: [{
                id: 'manual-1',
                pos: { x: 100, y: 100 },
                r: 12,
                rangeR: 50,
                isManual: true,
                currentAmmo: 1,
                constructor: { name: 'ManualCannon' },
            }],
        });

        expect(validator(world).validateCannonFire('manual-1', 130, 100)).toEqual({ valid: true, data: undefined });
    });

    it.each([
        { towers: [], target: [100, 100] as const, code: ValidationErrorCode.CANNON_NOT_FOUND },
        {
            towers: [{ id: 'manual-1', pos: { x: 100, y: 100 }, r: 12, rangeR: 50, isManual: false, currentAmmo: 1, constructor: { name: 'Tower' } }],
            target: [100, 100] as const,
            code: ValidationErrorCode.CANNON_NOT_MANUAL,
        },
        {
            towers: [{ id: 'manual-1', pos: { x: 100, y: 100 }, r: 12, rangeR: 50, isManual: true, currentAmmo: 0, constructor: { name: 'ManualCannon' } }],
            target: [100, 100] as const,
            code: ValidationErrorCode.CANNON_NO_AMMO,
        },
        {
            towers: [{ id: 'manual-1', pos: { x: 100, y: 100 }, r: 12, rangeR: 50, isManual: true, currentAmmo: 1, constructor: { name: 'ManualCannon' } }],
            target: [151, 100] as const,
            code: ValidationErrorCode.CANNON_TARGET_OUT_OF_RANGE,
        },
    ])('rejects invalid cannon fire requests %#', ({ towers, target, code }) => {
        const [x, y] = target;
        const result = validator(makeWorld({ batterys: towers })).validateCannonFire('manual-1', x, y);

        expect(result.valid).toBe(false);
        expect(result.errorCode).toBe(code);
    });
});
