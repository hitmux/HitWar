/**
 * TowerLaser - Laser-type defensive tower
 *
 * Base class for laser, thunder, and earthquake towers that
 * use charging mechanics and continuous beam attacks.
 */
import { Circle } from '../../core/math/circle';
import { MyColor } from '../../entities/myColor';
import {
    renderStatusBar,
    createStatusBarCache,
    BAR_OFFSET,
    BAR_COLORS,
    type StatusBarCache
} from '../../entities/statusBar';
import { Tower } from './tower';
import { TowerRegistry } from '../towerRegistry';
import { scalePeriod } from '../../core/speedScale';

// Declare globals for non-migrated modules
declare const EffectLine: {
    acquire(start: VectorLike, end: VectorLike): EffectLineLike;
} | undefined;

declare const EffectCircle: {
    acquire(pos: VectorLike): EffectCircleLike;
} | undefined;

interface VectorLike {
    x: number;
    y: number;
    copy(): VectorLike;
    sub(other: VectorLike): VectorLike;
}

interface CircleLike {
    x: number;
    y: number;
    r: number;
    impact(other: CircleLike): boolean;
}

interface EffectLineLike {
    duration: number;
    initLineStyle(color: MyColor, width: number): void;
    animationFunc: () => void;
    laserAnimation: () => void;
}

interface EffectCircleLike {
    circle: { r: number; fillColor: { setRGBA(r: number, g: number, b: number, a: number): void } };
    duration: number;
    animationFunc: () => void;
    bombAnimation: () => void;
    flashBrownAnimation: () => void;
    initCircleStyle(fillColor: MyColor, strokeColor: MyColor, strokeWidth: number): void;
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
    fog?: { enabled: boolean; isPositionVisible(x: number, y: number): boolean; isCircleVisible(x: number, y: number, radius: number): boolean };
    user: { money: number };
    getMonstersInRange(x: number, y: number, range: number): MonsterLike[];
    addBully(bully: unknown): void;
    removeBully(bully: unknown): void;
    addEffect(effect: unknown): void;
}

type LaserAttackFunc = () => void;

export class TowerLaser extends Tower {
    target: MonsterLike | null;
    laserBaseDamage: number;
    laserFreezeMax: number;
    laserFreezeNow: number;
    laserMaxDamage: number;
    laserDamageAdd: number;
    laserDamagePreAdd: number;
    laserColor: MyColor;

    // Zap chain lightning properties
    zapCount: number;
    damageMultipleRate: number;
    zapLen: number;
    zapInitColor: MyColor;

    // Cached status bar caches
    protected _cooldownBarCache: StatusBarCache;
    protected _chargeBarCache: StatusBarCache;

    declare attackFunc: LaserAttackFunc;

    constructor(x: number, y: number, world: any) {
        super(x, y, world);
        this.name = "特殊类型炮塔";
        this.clock = 1.1;

        this.target = null;
        this.attackFunc = this.laserAttack;

        this.hpInit(5000);
        this.price = 1000;

        this.laserBaseDamage = 100;
        this.laserFreezeMax = scalePeriod(10);
        this.laserFreezeNow = 0;
        this.laserMaxDamage = 10000;
        this.laserDamageAdd = 0;
        this.laserDamagePreAdd = 5;
        this.laserColor = new MyColor(0, 100, 255, 0.7);

        this.zapCount = 10;
        this.damageMultipleRate = 3;
        this.zapLen = 100;
        this.zapInitColor = new MyColor(0, 200, 255, 0.9);

        this._cooldownBarCache = createStatusBarCache();
        this._chargeBarCache = createStatusBarCache();
    }

    goStep(): void {
        // 保持向后兼容：执行完整的更新逻辑
        this.goStepMove();
        this.goStepCollide();
    }

    /**
     * 移动阶段：处理激光塔状态更新
     */
    goStepMove(): void {
        // Clear dead target reference to allow GC
        if (this.target && this.target.isDead()) {
            this.target = null;
        }
        super.goStepMove();
        this.laserFreezeChange(1);
        this.addDamage();
    }

    /**
     * 碰撞阶段：处理激光塔攻击
     */
    goStepCollide(): void {
        super.goStepCollide();
        this.attackFunc();
    }

    zapAttack(): void {
        if (this.laserFreezeNow === this.laserFreezeMax) {
            let monsterSet = new Set<MonsterLike>();
            let len = this.zapLen;
            let maxCount = this.zapCount;
            let damageMultipleRate = this.damageMultipleRate;
            let zapDamage = this.laserBaseDamage + this.laserDamageAdd;
            zapDamage = zapDamage * this.getDamageMultiplier();
            let attacked = false;
            let effectiveRange = this.getEffectiveRangeR();

            // Cache fog reference and check if fog is enabled once
            const fog = this.world.fog;
            const fogEnabled = fog?.enabled ?? false;

            // Iterative implementation using queue instead of recursion
            interface ZapNode {
                pos: VectorLike;
                remainingCount: number;
                attackIndex: number; // Track which attack this is (0-based)
            }

            // Use array with index to avoid O(n) shift() operation
            const queue: ZapNode[] = [{ pos: this.pos.copy(), remainingCount: maxCount, attackIndex: 0 }];
            let queueIndex = 0;

            while (queueIndex < queue.length) {
                const node = queue[queueIndex++];
                if (node.remainingCount <= 0) {
                    continue;
                }

                const searchRadius = (node.remainingCount === maxCount) ? effectiveRange : len;
                const searchRadiusSq = searchRadius * searchRadius;

                // Query monsters only within the current search radius (not the entire chain range)
                const nearbyMonsters = this.world.getMonstersInRange(node.pos.x, node.pos.y, searchRadius);

                // Calculate damage for this attack: base damage * (damageMultipleRate ^ attackIndex)
                const currentDamage = zapDamage * Math.pow(damageMultipleRate, node.attackIndex);

                // Find the first unvisited monster within range
                for (const m of nearbyMonsters) {
                    if (monsterSet.has(m)) {
                        continue;
                    }

                    // Check fog visibility
                    if (fogEnabled) {
                        const mc = m.getBodyCircle();
                        if (!fog!.isCircleVisible(mc.x, mc.y, mc.r)) {
                            continue;
                        }
                    }

                    // Calculate distance squared
                    const dx = m.pos.x - node.pos.x;
                    const dy = m.pos.y - node.pos.y;
                    const distSq = dx * dx + dy * dy;

                    if (distSq <= searchRadiusSq) {
                        // Check collision with circle
                        const mc = m.getBodyCircle() as Circle;
                        if (Circle.collides(node.pos.x, node.pos.y, searchRadius, mc.x, mc.y, mc.r)) {
                            m.hpChange(-currentDamage);
                            monsterSet.add(m);
                            attacked = true;

                            // Create effect line
                            if (typeof EffectLine !== 'undefined') {
                                let e = EffectLine.acquire(node.pos, m.pos);
                                e.duration = 20;
                                let blue = this.zapInitColor;
                                blue.change(+30 * (maxCount - node.remainingCount + 1), -20 * (maxCount - node.remainingCount + 1), 10, 0);
                                e.initLineStyle(blue, 20);
                                e.animationFunc = e.laserAnimation;
                                this.world.addEffect?.(e);
                            }

                            // Create effect circle at monster position
                            if (typeof EffectCircle !== 'undefined') {
                                let ec = EffectCircle.acquire(m.pos);
                                ec.duration = 15;
                                ec.initCircleStyle(new MyColor(255, 150, 255, 1),
                                    this.zapInitColor, 1);
                                ec.animationFunc = ec.bombAnimation;
                                this.world.addEffect?.(ec);
                            }

                            // Add next node to queue
                            if (node.remainingCount > 1) {
                                queue.push({ 
                                    pos: m.pos.copy(), 
                                    remainingCount: node.remainingCount - 1,
                                    attackIndex: node.attackIndex + 1
                                });
                            }
                            break;
                        }
                    }
                }
            }

            if (attacked) {
                this.laserFreezeNow = 0;
                this.laserDamageAdd = 0;
            }
        }
    }

    earthquakeAttack(): void {
        let isAttacked = false;
        let effectiveRange = this.getEffectiveRangeR();
        let nearbyMonsters = this.world.getMonstersInRange(this.pos.x, this.pos.y, effectiveRange);
        let viewCircle = this.getViewCircle();
        for (let m of nearbyMonsters) {
            const mc = m.getBodyCircle() as Circle;
            if (Circle.collides(viewCircle.x, viewCircle.y, viewCircle.r, mc.x, mc.y, mc.r)) {
                if (this.laserFreezeNow === this.laserFreezeMax) {
                    let d = this.laserBaseDamage + this.laserDamageAdd;
                    d = d * this.getDamageMultiplier();
                    m.hpChange(-d);
                    isAttacked = true;
                }
            }
        }
        if (isAttacked) {
            this.laserFreezeNow = 0;
            this.laserDamageAdd = 0;
        }
    }

    addDamage(): void {
        if (this.laserFreezeNow === this.laserFreezeMax) {
            this.laserDamageAdd += this.laserDamagePreAdd;
            if (this.laserDamageAdd > this.laserMaxDamage) {
                this.laserDamageAdd = this.laserMaxDamage;
            }
        }
    }

    getTarget(): void {
        const target = this.findFirstTarget();
        if (target) {
            this.target = target;
        }
    }

    haveTarget(): boolean {
        return !(this.target === null || this.target === undefined || this.target.isDead());
    }

    laserAttack(): void {
        this.getTarget();

        if (!this.haveTarget()) {
            return;
        }
        if (this.laserFreezeNow === this.laserFreezeMax && this.target) {
            let d = this.laserBaseDamage + this.laserDamageAdd;
            d = d * this.getDamageMultiplier();
            this.laserFreezeNow = 0;
            this.laserDamageAdd = 0;
            this.target.hpChange(-d);

            if (typeof EffectLine !== 'undefined') {
                let e = EffectLine.acquire(this.pos, this.target.pos);
                e.initLineStyle(this.laserColor, 50);
                e.animationFunc = e.laserAnimation;
                e.duration = 10;
                this.world.addEffect?.(e);
            }
        }
    }

    render(ctx: CanvasRenderingContext2D): void {
        super.render(ctx);

        const barH = this.hpBarHeight;
        const barX = this.pos.x - this.r;
        const barW = this.r * 2;

        // Render cooldown bar
        const cooldownY = this.pos.y + this.r + BAR_OFFSET.BOTTOM_1 * barH;
        const cooldownRate = this.laserFreezeNow / this.laserFreezeMax;

        renderStatusBar(ctx, {
            x: barX,
            y: cooldownY,
            width: barW,
            height: barH,
            fillRate: cooldownRate,
            fillColor: BAR_COLORS.COOLDOWN,
            cache: this._cooldownBarCache
        });

        // Render charge bar
        const chargeY = this.pos.y + this.r + BAR_OFFSET.BOTTOM_2 * barH;
        const chargeRate = this.laserDamageAdd / this.laserMaxDamage;

        renderStatusBar(ctx, {
            x: barX,
            y: chargeY,
            width: barW,
            height: barH,
            fillRate: chargeRate,
            fillColor: BAR_COLORS.CHARGE,
            cache: this._chargeBarCache
        });
    }

    laserFreezeChange(df: number): void {
        this.laserFreezeNow += df;
        if (this.laserFreezeNow > this.laserFreezeMax) {
            this.laserFreezeNow = this.laserFreezeMax;
        }
        if (this.laserFreezeNow < 0) {
            this.laserFreezeNow = 0;
        }
    }
}

// Register class type for save system
TowerRegistry.registerClassType('TowerLaser', () => TowerLaser);
