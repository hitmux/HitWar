import { describe, expect, it } from 'vitest';
import { GameState } from '../../schema/GameState.js';
import { MineState } from '../../schema/MineState.js';
import { PlayerState } from '../../schema/PlayerState.js';
import { MineManager } from './mineManager.js';
import { MINE_CONFIG, MineStateType } from '../../../../shared/config/mineMeta.js';

function createDirtyTracker() {
  return {
    dirtyCount: 0,
    markDirty() {
      this.dirtyCount++;
    },
  };
}

function createEnergyTracker() {
  return {
    dirtyCount: 0,
    clearCount: 0,
    registrations: [] as Array<{ id: string; ownerId: string; production: number }>,
    markDirty() {
      this.dirtyCount++;
    },
    clearMines() {
      this.clearCount++;
      this.registrations = [];
    },
    registerMine(id: string, ownerId: string, production: number) {
      this.registrations.push({ id, ownerId, production });
    },
  };
}

function createState(): GameState {
  const state = new GameState();
  const player = new PlayerState('p1', 'Player 1');
  player.money = 1000;
  state.players.set(player.id, player);
  return state;
}

function addMine(state: GameState, id: string, mineState: string = MineStateType.NORMAL): MineState {
  const mine = new MineState();
  mine.id = id;
  mine.mineState = mineState;
  state.mines.set(id, mine);
  return mine;
}

describe('MineManager', () => {
  it('upgrades a normal mine into an owned power plant and marks dependent systems dirty', () => {
    const state = createState();
    const mine = addMine(state, 'm1');
    const energy = createEnergyTracker();
    const territory = createDirtyTracker();
    const manager = new MineManager(state, energy as any, territory as any);

    const result = manager.upgradeMine('m1', 'p1');

    expect(result).toEqual({ ok: true, cost: MINE_CONFIG.upgradePrices[0] });
    expect(state.getPlayer('p1')?.money).toBe(1000 - MINE_CONFIG.upgradePrices[0]);
    expect(mine.mineState).toBe(MineStateType.POWER_PLANT);
    expect(mine.level).toBe(1);
    expect(mine.hp).toBe(MINE_CONFIG.upgradeHp[0]);
    expect(mine.maxHp).toBe(MINE_CONFIG.upgradeHp[0]);
    expect(mine.ownerId).toBe('p1');
    expect(mine.radius).toBe(MINE_CONFIG.powerPlantRadius);
    expect(energy.dirtyCount).toBe(1);
    expect(territory.dirtyCount).toBe(1);
  });

  it('rejects invalid upgrade requests without mutating money', () => {
    const state = createState();
    const player = state.getPlayer('p1')!;
    player.money = 10;
    addMine(state, 'normal');

    const damaged = addMine(state, 'damaged', MineStateType.DAMAGED);
    damaged.ownerId = 'p1';

    const maxed = addMine(state, 'maxed', MineStateType.POWER_PLANT);
    maxed.ownerId = 'p1';
    maxed.level = MINE_CONFIG.maxLevel;

    const foreign = addMine(state, 'foreign', MineStateType.POWER_PLANT);
    foreign.ownerId = 'p2';
    foreign.level = 1;

    const manager = new MineManager(state, createEnergyTracker() as any, createDirtyTracker() as any);

    expect(manager.upgradeMine('missing', 'p1')).toEqual({ ok: false, error: 'Mine not found' });
    expect(manager.upgradeMine('damaged', 'p1')).toEqual({ ok: false, error: 'Cannot upgrade damaged mine' });
    expect(manager.upgradeMine('maxed', 'p1')).toEqual({ ok: false, error: 'Already max level' });
    expect(manager.upgradeMine('foreign', 'p1')).toEqual({ ok: false, error: 'Not your power plant' });
    expect(manager.upgradeMine('normal', 'p1')).toEqual({ ok: false, error: 'Insufficient funds' });
    expect(player.money).toBe(10);
  });

  it('downgrades, sells, damages, and repairs power plants through expected state transitions', () => {
    const state = createState();
    const mine = addMine(state, 'm1', MineStateType.POWER_PLANT);
    mine.ownerId = 'p1';
    mine.level = 2;
    mine.hp = MINE_CONFIG.upgradeHp[1];
    mine.maxHp = MINE_CONFIG.upgradeHp[1];
    mine.radius = MINE_CONFIG.powerPlantRadius;
    const manager = new MineManager(state, createEnergyTracker() as any, createDirtyTracker() as any);
    const initialMoney = state.getPlayer('p1')!.money;

    expect(manager.downgradeMine('m1', 'p1')).toEqual({
      ok: true,
      refund: Math.floor(MINE_CONFIG.upgradePrices[1] * MINE_CONFIG.downgradeRefundRatio),
    });
    expect(mine.level).toBe(1);
    expect(mine.hp).toBe(MINE_CONFIG.upgradeHp[0]);

    const destroyed = manager.damageMine('m1', MINE_CONFIG.upgradeHp[0], 'monster');
    expect(destroyed).toBe(true);
    expect(mine.mineState).toBe(MineStateType.DAMAGED);
    expect(mine.ownerId).toBe('p1');
    expect(mine.radius).toBe(MINE_CONFIG.normalRadius);

    expect(manager.repairMine('m1', 'p1')).toEqual({ ok: true, cost: MINE_CONFIG.repairCost });
    expect(mine.repairing).toBe(true);
    mine.repairProgress = MINE_CONFIG.repairTicks - 1;
    manager.updateRepairs();
    expect(mine.mineState).toBe(MineStateType.NORMAL);
    expect(mine.ownerId).toBe('');
    expect(mine.repairing).toBe(false);

    mine.mineState = MineStateType.POWER_PLANT;
    mine.ownerId = 'p1';
    mine.level = 2;
    const sellResult = manager.sellMine('m1', 'p1');
    expect(sellResult).toEqual({
      ok: true,
      refund: Math.floor((MINE_CONFIG.upgradePrices[0] + MINE_CONFIG.upgradePrices[1]) * MINE_CONFIG.sellRefundRatio),
    });
    expect(mine.mineState).toBe(MineStateType.NORMAL);
    expect(state.getPlayer('p1')!.money).toBeGreaterThan(initialMoney - MINE_CONFIG.repairCost);
  });

  it('syncs only power plants to energy and marks territory validity on mines', () => {
    const state = createState();
    const valid = addMine(state, 'valid', MineStateType.POWER_PLANT);
    valid.ownerId = 'p1';
    valid.level = 2;
    const invalid = addMine(state, 'invalid', MineStateType.POWER_PLANT);
    invalid.ownerId = 'p1';
    invalid.level = 3;
    addMine(state, 'normal', MineStateType.NORMAL);

    const energy = createEnergyTracker();
    const manager = new MineManager(state, energy as any, createDirtyTracker() as any);
    manager.syncToEnergyCalc(new Map([['p1', new Set(['valid'])]]));

    expect(energy.clearCount).toBe(1);
    expect(energy.registrations).toEqual([
      { id: 'valid', ownerId: 'p1', production: 2 * MINE_CONFIG.productionPerLevel },
      { id: 'invalid', ownerId: 'p1', production: 0 },
    ]);
    expect(valid.inValidTerritory).toBe(true);
    expect(invalid.inValidTerritory).toBe(false);
  });
});
