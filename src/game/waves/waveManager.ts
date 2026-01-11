/**
 * WaveManager - 波次管理器
 * 负责管理怪物波次生成和预计算
 */

import { Vector } from '../../core/math/vector';
import { Functions } from '../../core/functions';
import {
    MonsterGroup,
    MonsterFinallyCompat,
    MonsterAllArr,
    MonsterEasyArr,
    Monster10BeforeArr
} from '../../monsters/index';
import { EffectText } from '../../effects/effect';
import { Sounds } from '../../systems/sound/sounds';
import type { MonsterLike, EffectLike } from '../entities';

// 怪物流接口
export interface MonsterFlow {
    level: number;
    delayTick: number;
    state: string;
    couldBegin: () => boolean;
    addToWorld: (mode: string) => void;
    copySelf: () => MonsterFlow;
    toString: () => string;
}

// 预计算的怪物属性
export interface PrecomputedMonsterAttrs {
    hpBonus: number;           // HP 增量
    collideDamageBonus: number; // 碰撞伤害增量
    priceBonus: number;        // 奖励增量
}

// 预计算的波次数据
export interface PrecomputedWave {
    batchIndex: number;           // 批次索引 (time / monsterAddFreezeTick)
    monsterCount: number;         // 这个批次生成的怪物数量
    monsterTypes: string[];       // 怪物类型名称数组
    attrs: PrecomputedMonsterAttrs; // 共享的属性增量 (同一批次的怪物属性相同)
    isT800Wave: boolean;          // 是否是 T800 特殊波次
    t800Count: number;            // T800 数量 (仅 isT800Wave=true 时有效)
}

// 波次管理器需要的上下文接口
export interface WaveManagerContext {
    width: number;
    height: number;
    mode: string;
    time: number;
}

// 实体添加回调
export interface WaveEntityCallbacks {
    addMonster: (monster: MonsterLike) => void;
    addEffect: (effect: EffectLike) => void;
}

/**
 * 波次管理器
 * 管理怪物波次的生成逻辑和预计算系统
 */
export class WaveManager {
    // Monster flow (flow mode)
    monsterFlow: MonsterFlow;
    monsterFlowNext: MonsterFlow;

    // Non-flow mode settings
    haveFlow: boolean = true;
    monsterAddFreezeTick: number = 200;
    monsterPreAdd: number = 3;
    maxMonsterNum: number = 250;

    // Wave precomputation system (non-flow mode)
    private _precomputedWaves: Map<number, PrecomputedWave> = new Map();
    private _precomputeBatchSize: number = 50;     // 每次预计算的批次数
    private _precomputeAheadBatches: number = 20;  // 提前预计算的批次数

    // References
    private readonly _context: WaveManagerContext;
    private readonly _callbacks: WaveEntityCallbacks;
    private readonly _world: any; // Reference to World for MonsterGroup

    constructor(
        context: WaveManagerContext,
        callbacks: WaveEntityCallbacks,
        world: any
    ) {
        this._context = context;
        this._callbacks = callbacks;
        this._world = world;

        // Initialize monster flows
        this.monsterFlow = MonsterGroup.getMonsterFlow(world, 1, context.mode as any) as unknown as MonsterFlow;
        this.monsterFlowNext = MonsterGroup.getMonsterFlow(world, 2, context.mode as any) as unknown as MonsterFlow;
    }

    /**
     * Get current wave level
     */
    getCurrentWaveLevel(): number {
        return this.monsterFlow.level;
    }

    /**
     * Get current flow delay tick
     */
    getCurrentDelayTick(): number {
        return this.monsterFlow.delayTick;
    }

    /**
     * Add monsters based on world state
     */
    worldAddMonster(): void {
        if (this.haveFlow) {
            this._addMonsterFlowMode();
        } else {
            this._addMonsterNonFlowMode();
        }
    }

    /**
     * Add monsters via monster flow (flow mode)
     */
    private _addMonsterFlowMode(): void {
        if (this.monsterFlow.couldBegin()) {
            this.monsterFlow.addToWorld(this._context.mode);

            this.monsterFlow = this.monsterFlowNext.copySelf();
            this.monsterFlowNext = MonsterGroup.getMonsterFlow(
                this._world,
                this.monsterFlowNext.level + 1,
                this._context.mode as any
            ) as unknown as MonsterFlow;
        }

        if (this.monsterFlow.delayTick === 200 - 1) {
            const et = new EffectText(`第 ${this.monsterFlow.level} 波即将到来！`);
            et.textSize = 40;
            et.duration = 100;
            et.pos = new Vector(this._context.width / 2, this._context.height / 2);
            this._callbacks.addEffect(et as unknown as EffectLike);
            Sounds.playNewMonsterFlow();
        }
    }

    /**
     * Add monsters using precomputed wave data (non-flow mode)
     */
    private _addMonsterNonFlowMode(): void {
        if (this._context.time % this.monsterAddFreezeTick !== 0) {
            return;
        }

        // Ensure we have enough precomputed data
        this._ensurePrecomputedWaves();

        const batchIndex = Math.floor(this._context.time / this.monsterAddFreezeTick);
        const wave = this._precomputedWaves.get(batchIndex);

        if (!wave) {
            // If precomputed data doesn't exist, this shouldn't happen
            console.warn(`[WaveManager] Missing precomputed wave for batch ${batchIndex}`);
            return;
        }

        if (wave.isT800Wave) {
            // T800 special wave
            for (let i = 0; i < wave.t800Count; i++) {
                const m = MonsterFinallyCompat.T800!(this._world);
                this._callbacks.addMonster(m as MonsterLike);
            }
        } else {
            // Normal wave: use precomputed monster types and attributes
            for (const typeName of wave.monsterTypes) {
                // Use registry to create monster
                const createFn = (MonsterFinallyCompat as any)[typeName];
                if (!createFn) continue;

                const m = createFn(this._world) as MonsterLike;
                m.hpInit(m.maxHp + wave.attrs.hpBonus);
                m.colishDamage += wave.attrs.collideDamageBonus;
                m.addPrice += wave.attrs.priceBonus;
                this._callbacks.addMonster(m);
            }
        }
    }

    /**
     * Precompute wave data (non-flow mode)
     * @param startBatch - Starting batch index
     * @param count - Number of batches to precompute
     */
    private _precomputeWaves(startBatch: number, count: number): void {
        const choice = (arr: string[]): string => {
            return arr[Math.floor(Math.random() * arr.length)];
        };

        for (let i = 0; i < count; i++) {
            const batchIndex = startBatch + i;
            if (this._precomputedWaves.has(batchIndex)) continue;

            const time = batchIndex * this.monsterAddFreezeTick;
            const level = time / 500;

            // Check if this is a T800 special wave
            const isT800Wave = time % 5000 === 0 && time !== 0;

            let wave: PrecomputedWave;

            if (isT800Wave) {
                wave = {
                    batchIndex,
                    monsterCount: 0,
                    monsterTypes: [],
                    attrs: { hpBonus: 0, collideDamageBonus: 0, priceBonus: 0 },
                    isT800Wave: true,
                    t800Count: Functions.levelT800Count(level),
                };
            } else {
                // Calculate monster count
                let monsterPreAddAdd: number;
                if (this._context.mode === "easy") {
                    monsterPreAddAdd = Functions.tickAddMonsterNumEasy(time);
                } else {
                    monsterPreAddAdd = Functions.tickAddMonsterNumHard(time);
                }
                const monsterCount = this.monsterPreAdd + monsterPreAddAdd;

                // Determine monster pool
                let monsterPool: string[];
                if (this._context.mode === "easy") {
                    monsterPool = MonsterEasyArr as unknown as string[];
                } else if (this._context.mode === "hard" && time < 5000) {
                    monsterPool = Monster10BeforeArr as unknown as string[];
                } else {
                    monsterPool = MonsterAllArr as unknown as string[];
                }

                // Pre-generate monster types
                const monsterTypes: string[] = [];
                for (let j = 0; j < monsterCount; j++) {
                    monsterTypes.push(choice(monsterPool));
                }

                // Calculate attribute bonuses (shared within same batch)
                let attrs: PrecomputedMonsterAttrs;
                if (this._context.mode === "easy") {
                    attrs = {
                        hpBonus: Functions.tickMonsterHpAddedEasy(time),
                        collideDamageBonus: 0,
                        priceBonus: Functions.levelAddPrice(1 + level),
                    };
                } else if (this._context.mode === "normal") {
                    attrs = {
                        hpBonus: Functions.levelMonsterHpAddedNormal(level),
                        collideDamageBonus: Functions.levelCollideAdded(level),
                        priceBonus: Functions.levelAddPriceNormal(level),
                    };
                } else {
                    // hard mode
                    attrs = {
                        hpBonus: Functions.tickMonsterHpAddedHard(time),
                        collideDamageBonus: Functions.levelCollideAddedHard(level),
                        priceBonus: Functions.levelAddPriceHard(1 + level),
                    };
                }

                wave = {
                    batchIndex,
                    monsterCount,
                    monsterTypes,
                    attrs,
                    isT800Wave: false,
                    t800Count: 0,
                };
            }

            this._precomputedWaves.set(batchIndex, wave);
        }
    }

    /**
     * Ensure we have enough precomputed wave data
     */
    private _ensurePrecomputedWaves(): void {
        if (this.haveFlow) return;

        const currentBatch = Math.floor(this._context.time / this.monsterAddFreezeTick);
        const targetBatch = currentBatch + this._precomputeAheadBatches;

        // Find max precomputed batch
        let maxPrecomputed = -1;
        for (const key of this._precomputedWaves.keys()) {
            if (key > maxPrecomputed) maxPrecomputed = key;
        }

        // Precompute more if needed
        if (maxPrecomputed < targetBatch) {
            const startBatch = maxPrecomputed + 1;
            const count = Math.min(this._precomputeBatchSize, targetBatch - maxPrecomputed);
            this._precomputeWaves(startBatch, count);
        }

        // Clean up old precomputed data (keep some history for potential rollback)
        const minKeepBatch = currentBatch - 10;
        for (const key of this._precomputedWaves.keys()) {
            if (key < minKeepBatch) {
                this._precomputedWaves.delete(key);
            }
        }
    }
}
