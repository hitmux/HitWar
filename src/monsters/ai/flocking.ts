/**
 * 群体协作AI模块 (Boids Algorithm)
 *
 * 让怪物像鱼群一样协调行动：
 * - 分离 (Separation)：避免与邻居拥挤
 * - 对齐 (Alignment)：与邻居保持方向一致
 * - 聚合 (Cohesion)：向群体中心靠拢
 */

import { Vector } from '@/core/math';
import { scalePeriod } from '@/core/speedScale';

export interface FlockingConfig {
    /** 感知半径（能感知多远的邻居） */
    perceptionRadius: number;
    /** 分离半径（更近才推开） */
    separationRadius: number;
    /** 更新间隔帧数 */
    updateInterval: number;
    /** 权重配置 */
    weights: {
        /** 分离权重（避免拥挤） */
        separation: number;
        /** 对齐权重（方向一致） */
        alignment: number;
        /** 聚合权重（保持群体） */
        cohesion: number;
    };
    /** 最大作用力 */
    maxForce: number;
}

export const DEFAULT_FLOCKING_CONFIG: FlockingConfig = {
    perceptionRadius: 100,
    separationRadius: 40,
    updateInterval: scalePeriod(4),
    weights: {
        separation: 1.8,
        alignment: 1.0,
        cohesion: 0.6
    },
    maxForce: 5
};

/** 怪物接口 */
interface MonsterLike {
    pos: { x: number; y: number };
    speed: { x: number; y: number };
    liveTime: number;
    gameType: string;
    world: {
        getMonstersInRange(x: number, y: number, range: number): MonsterLike[];
    };
}

// 复用向量，避免GC
const _steering = new Vector(0, 0);
const _diff = new Vector(0, 0);
const _avgVelocity = new Vector(0, 0);
const _centerOfMass = new Vector(0, 0);
const _force = new Vector(0, 0);

/**
 * 计算分离力 - 远离太近的邻居
 */
function calcSeparation(
    monster: MonsterLike,
    neighbors: MonsterLike[],
    separationRadius: number,
    result: Vector
): void {
    result.x = 0;
    result.y = 0;
    let count = 0;

    for (const other of neighbors) {
        const dx = monster.pos.x - other.pos.x;
        const dy = monster.pos.y - other.pos.y;
        const distSq = dx * dx + dy * dy;

        if (distSq > 0 && distSq < separationRadius * separationRadius) {
            const dist = Math.sqrt(distSq);
            // 指向远离邻居的方向，距离越近力越大
            const factor = 1 / dist;
            result.x += (dx / dist) * factor;
            result.y += (dy / dist) * factor;
            count++;
        }
    }

    if (count > 0) {
        result.x /= count;
        result.y /= count;
    }
}

/**
 * 计算对齐力 - 与邻居速度方向一致
 */
function calcAlignment(
    monster: MonsterLike,
    neighbors: MonsterLike[],
    result: Vector
): void {
    result.x = 0;
    result.y = 0;

    if (neighbors.length === 0) return;

    // 计算平均速度
    _avgVelocity.x = 0;
    _avgVelocity.y = 0;
    for (const other of neighbors) {
        _avgVelocity.x += other.speed.x;
        _avgVelocity.y += other.speed.y;
    }
    _avgVelocity.x /= neighbors.length;
    _avgVelocity.y /= neighbors.length;

    // 转为朝向平均速度的转向力
    result.x = _avgVelocity.x - monster.speed.x;
    result.y = _avgVelocity.y - monster.speed.y;
}

/**
 * 计算聚合力 - 向群体中心移动
 */
function calcCohesion(
    monster: MonsterLike,
    neighbors: MonsterLike[],
    result: Vector
): void {
    result.x = 0;
    result.y = 0;

    if (neighbors.length === 0) return;

    // 计算群体中心
    _centerOfMass.x = 0;
    _centerOfMass.y = 0;
    for (const other of neighbors) {
        _centerOfMass.x += other.pos.x;
        _centerOfMass.y += other.pos.y;
    }
    _centerOfMass.x /= neighbors.length;
    _centerOfMass.y /= neighbors.length;

    // 指向群体中心
    const dx = _centerOfMass.x - monster.pos.x;
    const dy = _centerOfMass.y - monster.pos.y;
    const len = Math.sqrt(dx * dx + dy * dy);

    if (len > 0) {
        result.x = dx / len;
        result.y = dy / len;
    }
}

/**
 * 限制向量大小
 */
function limitVector(vec: Vector, max: number): void {
    const magSq = vec.x * vec.x + vec.y * vec.y;
    if (magSq > max * max) {
        const mag = Math.sqrt(magSq);
        vec.x = (vec.x / mag) * max;
        vec.y = (vec.y / mag) * max;
    }
}

/**
 * 计算群体协作力
 * @param monster 当前怪物
 * @param config 配置
 * @param result 输出向量（复用避免GC）
 */
export function calcFlockingForce(
    monster: MonsterLike,
    config: FlockingConfig,
    result: Vector
): void {
    result.x = 0;
    result.y = 0;

    // 性能优化：间隔计算
    if (monster.liveTime % config.updateInterval !== 0) {
        return;
    }

    // 查询邻近怪物
    const nearbyEntities = monster.world.getMonstersInRange(
        monster.pos.x,
        monster.pos.y,
        config.perceptionRadius
    );

    // 过滤掉自己，只保留同类怪物
    const neighbors: MonsterLike[] = [];
    for (const e of nearbyEntities) {
        if (e !== monster && e.gameType === monster.gameType) {
            neighbors.push(e);
        }
    }

    if (neighbors.length === 0) {
        return;
    }

    // 计算分离力
    calcSeparation(monster, neighbors, config.separationRadius, _steering);
    _force.x = _steering.x * config.weights.separation;
    _force.y = _steering.y * config.weights.separation;

    // 计算对齐力
    calcAlignment(monster, neighbors, _steering);
    _force.x += _steering.x * config.weights.alignment;
    _force.y += _steering.y * config.weights.alignment;

    // 计算聚合力
    calcCohesion(monster, neighbors, _steering);
    _force.x += _steering.x * config.weights.cohesion;
    _force.y += _steering.y * config.weights.cohesion;

    // 限制最大力
    limitVector(_force, config.maxForce);

    result.x = _force.x;
    result.y = _force.y;
}

/**
 * 计算包围战术力 - 分散到目标周围（可选功能）
 * 让怪物群组形成包围圈进攻目标
 */
export function calcSurroundForce(
    monster: MonsterLike,
    neighbors: MonsterLike[],
    targetX: number,
    targetY: number,
    spreadAngle: number,
    result: Vector
): void {
    result.x = 0;
    result.y = 0;

    if (neighbors.length === 0) {
        // 无邻居时直接朝向目标
        const dx = targetX - monster.pos.x;
        const dy = targetY - monster.pos.y;
        const len = Math.sqrt(dx * dx + dy * dy);
        if (len > 0) {
            result.x = dx / len;
            result.y = dy / len;
        }
        return;
    }

    // 用 liveTime 作为稳定的排序键，计算自己在群体中的位置
    const allMonsters = [...neighbors, monster];
    allMonsters.sort((a, b) => a.liveTime - b.liveTime);
    const myIndex = allMonsters.indexOf(monster);
    const totalCount = allMonsters.length;

    // 计算目标方向
    const dx = targetX - monster.pos.x;
    const dy = targetY - monster.pos.y;
    const baseAngle = Math.atan2(dy, dx);

    // 根据索引分配偏移角度（扇形展开）
    const angleOffset = (myIndex - totalCount / 2) * spreadAngle;
    const finalAngle = baseAngle + angleOffset;

    result.x = Math.cos(finalAngle);
    result.y = Math.sin(finalAngle);
}
