/**
 * 动态目标选择AI模块
 *
 * 让怪物智能选择攻击目标
 */

import { Vector } from '@/core/math';
import { scalePeriod } from '@/core/speedScale';

// 目标选择策略
export type TargetStrategy = 'nearest' | 'weakest' | 'threat' | 'balanced';

export interface TargetConfig {
    /** 选择策略 */
    strategy: TargetStrategy;
    /** 扫描半径 */
    scanRadius: number;
    /** 更新间隔帧数 */
    updateInterval: number;
    /** BALANCED策略的权重 */
    weights: {
        distance: number;
        hp: number;
        threat: number;
    };
}

export const DEFAULT_TARGET_CONFIG: TargetConfig = {
    strategy: 'balanced',
    scanRadius: 300,
    updateInterval: scalePeriod(30),
    weights: { distance: 0.4, hp: 0.3, threat: 0.3 }
};

/** 建筑接口 */
interface BuildingLike {
    pos: { x: number; y: number };
    hp: number;
    maxHp: number;
    getBodyCircle(): { x: number; y: number; r: number };
    // 塔特有属性（可选）
    damage?: number;
    clock?: number;
}

/** 怪物接口 */
interface MonsterLike {
    pos: Vector;
    liveTime: number;
    world: {
        getBuildingsInRange(x: number, y: number, radius: number): BuildingLike[];
    };
}

/**
 * 计算建筑的威胁值（DPS估算）
 */
function calcThreatScore(building: BuildingLike): number {
    const damage = building.damage ?? 10;
    const clock = building.clock ?? 30;
    return damage / Math.max(clock, 1);
}

/**
 * 计算建筑的综合评分（越高越优先攻击）
 */
function calcBuildingScore(
    building: BuildingLike,
    monsterX: number,
    monsterY: number,
    weights: { distance: number; hp: number; threat: number }
): number {
    const dx = building.pos.x - monsterX;
    const dy = building.pos.y - monsterY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    const distScore = 1 / Math.max(dist, 1);
    const hpScore = 1 / Math.max(building.hp, 1);
    const threatScore = calcThreatScore(building);

    return (
        weights.distance * distScore * 100 +
        weights.hp * hpScore * 1000 +
        weights.threat * threatScore
    );
}

/**
 * 选择最佳目标
 * @returns 新目标位置，如果为null则保持当前目标
 */
export function selectTarget(
    monster: MonsterLike,
    config: TargetConfig,
    result: Vector | null
): Vector | null {
    // 性能优化：间隔更新
    if (monster.liveTime % config.updateInterval !== 0) {
        return null; // 保持当前目标
    }

    const buildings = monster.world.getBuildingsInRange(
        monster.pos.x,
        monster.pos.y,
        config.scanRadius
    );

    if (buildings.length === 0) {
        return null; // 无目标，使用默认destination
    }

    let bestTarget: BuildingLike | null = null;

    switch (config.strategy) {
        case 'nearest': {
            let minDist = Infinity;
            for (const b of buildings) {
                const dx = b.pos.x - monster.pos.x;
                const dy = b.pos.y - monster.pos.y;
                const dist = dx * dx + dy * dy; // 不需要开方，只比较大小
                if (dist < minDist) {
                    minDist = dist;
                    bestTarget = b;
                }
            }
            break;
        }

        case 'weakest': {
            let minHp = Infinity;
            for (const b of buildings) {
                if (b.hp < minHp) {
                    minHp = b.hp;
                    bestTarget = b;
                }
            }
            break;
        }

        case 'threat': {
            let maxThreat = -Infinity;
            for (const b of buildings) {
                const threat = calcThreatScore(b);
                if (threat > maxThreat) {
                    maxThreat = threat;
                    bestTarget = b;
                }
            }
            break;
        }

        case 'balanced':
        default: {
            let bestScore = -Infinity;
            for (const b of buildings) {
                const score = calcBuildingScore(
                    b,
                    monster.pos.x,
                    monster.pos.y,
                    config.weights
                );
                if (score > bestScore) {
                    bestScore = score;
                    bestTarget = b;
                }
            }
            break;
        }
    }

    if (bestTarget) {
        if (result) {
            result.x = bestTarget.pos.x;
            result.y = bestTarget.pos.y;
            return result;
        }
        return new Vector(bestTarget.pos.x, bestTarget.pos.y);
    }

    return null;
}
