/**
 * 子弹躲避AI模块
 *
 * 检测飞向怪物的子弹并计算躲避向量
 */

import { Vector } from '@/core/math';
import { scalePeriod } from '@/core/speedScale';

// 躲避配置
export interface DodgeConfig {
    /** 检测半径 */
    detectRadius: number;
    /** 躲避强度 */
    dodgeStrength: number;
    /** 反应间隔帧数 */
    reactionTime: number;
}

export const DEFAULT_DODGE_CONFIG: DodgeConfig = {
    detectRadius: 120,
    dodgeStrength: 8,
    reactionTime: scalePeriod(3)
};

/** 子弹接口 */
interface BulletLike {
    pos: { x: number; y: number };
    speed: { x: number; y: number };
    r: number;
}

/** 怪物接口 */
interface MonsterLike {
    pos: Vector;
    speed: Vector;
    liveTime: number;
    world: {
        getBullysInRange(x: number, y: number, radius: number): BulletLike[];
    };
}

// 复用向量，避免GC
const _toMonster = new Vector(0, 0);
const _bulletDir = new Vector(0, 0);
const _perpA = new Vector(0, 0);
const _perpB = new Vector(0, 0);
const _dodgeSum = new Vector(0, 0);

/**
 * 判断子弹是否正在接近怪物
 * 使用向量点积：bullet.speed · (monster.pos - bullet.pos) > 0 表示接近
 */
export function isBulletApproaching(
    bulletPos: { x: number; y: number },
    bulletSpeed: { x: number; y: number },
    monsterPos: { x: number; y: number }
): boolean {
    _toMonster.x = monsterPos.x - bulletPos.x;
    _toMonster.y = monsterPos.y - bulletPos.y;
    const dot = bulletSpeed.x * _toMonster.x + bulletSpeed.y * _toMonster.y;
    return dot > 0;
}

/**
 * 计算单个子弹的躲避向量
 * 返回垂直于子弹方向的向量，选择与怪物当前运动方向夹角更小的一侧
 */
export function calcDodgeVector(
    bulletPos: { x: number; y: number },
    bulletSpeed: { x: number; y: number },
    monsterPos: { x: number; y: number },
    monsterSpeed: { x: number; y: number },
    strength: number,
    result: Vector
): void {
    // 子弹方向的单位向量
    const speedLen = Math.sqrt(bulletSpeed.x * bulletSpeed.x + bulletSpeed.y * bulletSpeed.y);
    if (speedLen < 0.001) {
        result.x = 0;
        result.y = 0;
        return;
    }

    _bulletDir.x = bulletSpeed.x / speedLen;
    _bulletDir.y = bulletSpeed.y / speedLen;

    // 两个垂直方向
    _perpA.x = -_bulletDir.y;
    _perpA.y = _bulletDir.x;
    _perpB.x = _bulletDir.y;
    _perpB.y = -_bulletDir.x;

    // 选择与怪物当前运动方向夹角更小的方向（更自然）
    const dotA = _perpA.x * monsterSpeed.x + _perpA.y * monsterSpeed.y;
    const dotB = _perpB.x * monsterSpeed.x + _perpB.y * monsterSpeed.y;

    const chosen = dotA >= dotB ? _perpA : _perpB;

    // 根据距离衰减强度
    const dx = bulletPos.x - monsterPos.x;
    const dy = bulletPos.y - monsterPos.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const distFactor = Math.max(0.2, 1 - dist / 150);

    result.x = chosen.x * strength * distFactor;
    result.y = chosen.y * strength * distFactor;
}

/**
 * 计算怪物的综合躲避向量
 */
export function calcBulletDodge(
    monster: MonsterLike,
    config: DodgeConfig,
    result: Vector
): void {
    result.x = 0;
    result.y = 0;

    // 性能优化：间隔帧计算
    if (monster.liveTime % config.reactionTime !== 0) {
        return;
    }

    const bullets = monster.world.getBullysInRange(
        monster.pos.x,
        monster.pos.y,
        config.detectRadius
    );

    if (bullets.length === 0) {
        return;
    }

    _dodgeSum.x = 0;
    _dodgeSum.y = 0;
    let threatCount = 0;

    for (const bullet of bullets) {
        if (isBulletApproaching(bullet.pos, bullet.speed, monster.pos)) {
            calcDodgeVector(
                bullet.pos,
                bullet.speed,
                monster.pos,
                monster.speed,
                config.dodgeStrength,
                result
            );
            _dodgeSum.x += result.x;
            _dodgeSum.y += result.y;
            threatCount++;
        }
    }

    // 多个威胁时取平均
    if (threatCount > 0) {
        result.x = _dodgeSum.x / threatCount;
        result.y = _dodgeSum.y / threatCount;
    }
}
