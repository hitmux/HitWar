/**
 * TowerHell - Continuous damage tower
 *
 * Deals increasing damage the longer it focuses on a single target.
 */
import { MyColor } from '../../entities/myColor';
import { Circle } from '../../core/math/circle';
import { Tower } from './tower';
import { TowerRegistry } from '../towerRegistry';

// Declare globals for non-migrated modules
declare const EffectLine: {
    acquire(start: VectorLike, end: VectorLike): EffectLineLike;
} | undefined;

interface VectorLike {
    x: number;
    y: number;
}

interface CircleLike {
    x: number;
    y: number;
    r: number;
    impact(other: CircleLike): boolean;
}

interface EffectLineLike {
    initLineStyle(color: MyColor, width: number): void;
}

interface MonsterLike {
    pos: VectorLike;
    getBodyCircle(): CircleLike;
    hpChange(delta: number): void;
    isDead(): boolean;
}

interface WorldLike {
    width: number;
    height: number;
    batterys: Tower[];
    territory?: { markDirty(): void };
    fog?: { enabled: boolean; isPositionVisible(x: number, y: number): boolean };
    user: { money: number };
    getMonstersInRange(x: number, y: number, range: number): MonsterLike[];
    addBully(bully: unknown): void;
    removeBully(bully: unknown): void;
    addEffect(effect: unknown): void;
}

export class TowerHell extends Tower {
    target: MonsterLike | null;
    nowDamage: number;
    damageRate: number;
    targetLiveTime: number;
    laserFreezeNow: number;
    laserFreezeMax: number;

    constructor(x: number, y: number, world: any) {
        super(x, y, world);
        this.name = "地狱塔";
        this.clock = 1.1;

        this.target = null;
        this.rangeR = 200;
        this.hpInit(5000);
        this.price = 1000;

        this.nowDamage = 1;
        this.damageRate = 5000;
        this.targetLiveTime = 0;

        // Inherit laser properties for compatibility
        this.laserFreezeNow = 0;
        this.laserFreezeMax = 0;
    }

    getTarget(): void {
        if (this.target === null || this.target.isDead() || this.target === undefined) {
            let effectiveRange = this.getEffectiveRangeR();
            let nearbyMonsters = this.world.getMonstersInRange(this.pos.x, this.pos.y, effectiveRange);
            let viewCircle = this.getViewCircle();
            for (let m of nearbyMonsters) {
                // Check fog first (fast rejection)
                if (this.world.fog?.enabled && !this.world.fog.isPositionVisible(m.pos.x, m.pos.y)) {
                    continue;
                }
                const mc = m.getBodyCircle();
                if (Circle.collides(viewCircle.x, viewCircle.y, viewCircle.r, mc.x, mc.y, mc.r)) {
                    this.target = m;
                    return;
                }
            }
        }
    }

    attack(): void {
        if (this.target === null || this.target === undefined || this.target.isDead()) {
            this.targetLiveTime = 0;
            return;
        }
        if (this.laserFreezeNow === this.laserFreezeMax) {
            let damage = Math.pow(this.targetLiveTime, 2) / this.damageRate;
            damage = damage * this.getDamageMultiplier();
            this.target.hpChange(-damage);
            this.targetLiveTime++;

            if (typeof EffectLine !== 'undefined') {
                let e = EffectLine.acquire(this.pos, this.target.pos);
                e.initLineStyle(new MyColor(255, 0, 0, 0.5), 15);
                this.world.addEffect?.(e);
                e = EffectLine.acquire(this.pos, this.target.pos);
                e.initLineStyle(new MyColor(255, 0, 255, 0.5), 10);
                this.world.addEffect?.(e);
                e = EffectLine.acquire(this.pos, this.target.pos);
                e.initLineStyle(new MyColor(255, 255, 19, 1), 5);
                this.world.addEffect?.(e);
            }
        }
        if (this.target.isDead()) {
            this.targetLiveTime = 0;
            this.target = null;
        }
    }

    goStep(): void {
        super.goStep();
        this.getTarget();
        this.attack();
    }
}

// Register class type for save system
TowerRegistry.registerClassType('TowerHell', () => TowerHell);
