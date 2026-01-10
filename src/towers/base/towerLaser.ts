/**
 * TowerLaser - Laser-type defensive tower
 *
 * Base class for laser, thunder, and earthquake towers that
 * use charging mechanics and continuous beam attacks.
 */
import { Circle } from '../../core/math/circle';
import { Rectangle } from '../../core/math/rectangle';
import { MyColor } from '../../entities/myColor';
import { Tower } from './tower';
import { TowerRegistry } from '../towerRegistry';

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
    fog?: { enabled: boolean; isPositionVisible(x: number, y: number): boolean };
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

    // Cached render rectangles
    protected _cooldownBarBorder: Rectangle | null;
    protected _cooldownBarFill: Rectangle | null;
    protected _chargeBarBorder: Rectangle | null;
    protected _chargeBarFill: Rectangle | null;

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
        this.laserFreezeMax = 10;
        this.laserFreezeNow = 0;
        this.laserMaxDamage = 10000;
        this.laserDamageAdd = 0;
        this.laserDamagePreAdd = 5;
        this.laserColor = new MyColor(0, 100, 255, 0.7);

        this.zapCount = 10;
        this.damageMultipleRate = 3;
        this.zapLen = 100;
        this.zapInitColor = new MyColor(0, 200, 255, 0.9);

        this._cooldownBarBorder = null;
        this._cooldownBarFill = null;
        this._chargeBarBorder = null;
        this._chargeBarFill = null;
    }

    goStep(): void {
        super.goStep();
        this.attackFunc();
        this.laserFreezeChange(1);
        this.addDamage();
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

            // Pre-query a larger range to reduce query count
            // Maximum possible range: effectiveRange + zapLen * zapCount
            const maxPossibleRange = effectiveRange + len * maxCount;
            const allNearbyMonsters = this.world.getMonstersInRange(this.pos.x, this.pos.y, maxPossibleRange);

            // Filter monsters by fog visibility
            const visibleMonsters: MonsterLike[] = [];
            for (const m of allNearbyMonsters) {
                if (!this.world.fog?.enabled || this.world.fog.isPositionVisible(m.pos.x, m.pos.y)) {
                    visibleMonsters.push(m);
                }
            }

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

                // Calculate damage for this attack: base damage * (damageMultipleRate ^ attackIndex)
                const currentDamage = zapDamage * Math.pow(damageMultipleRate, node.attackIndex);

                // Find the first unvisited monster within range
                let found = false;
                for (const m of visibleMonsters) {
                    if (monsterSet.has(m)) {
                        continue;
                    }

                    // Calculate distance squared
                    const dx = m.pos.x - node.pos.x;
                    const dy = m.pos.y - node.pos.y;
                    const distSq = dx * dx + dy * dy;

                    if (distSq <= searchRadiusSq) {
                        // Check collision with circle
                        const cc = new Circle(node.pos.x, node.pos.y, searchRadius);
                        if (cc.impact(m.getBodyCircle() as Circle)) {
                            found = true;
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
            if (viewCircle.impact(m.getBodyCircle() as Circle)) {
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
            if (typeof EffectCircle !== 'undefined') {
                let c = EffectCircle.acquire(this.pos);
                c.circle.r = effectiveRange;
                c.duration = 10;
                c.animationFunc = c.flashBrownAnimation;
                this.world.addEffect?.(c);
            }
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
        let effectiveRange = this.getEffectiveRangeR();
        let nearbyMonsters = this.world.getMonstersInRange(this.pos.x, this.pos.y, effectiveRange);
        let viewCircle = this.getViewCircle();
        for (let m of nearbyMonsters) {
            // Check fog first (fast rejection)
            if (this.world.fog?.enabled && !this.world.fog.isPositionVisible(m.pos.x, m.pos.y)) {
                continue;
            }
            if (viewCircle.impact(m.getBodyCircle() as Circle)) {
                this.target = m;
                return;
            }
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

        let barH = this.hpBarHeight;
        let barX = this.pos.x - this.r;
        let barW = this.r * 2;

        // Render cooldown bar
        let cooldownY = this.pos.y + this.r + 2.5 * barH;
        let cooldownRate = this.laserFreezeNow / this.laserFreezeMax;

        if (!this._cooldownBarBorder) {
            this._cooldownBarBorder = new Rectangle(barX, cooldownY, barW, barH);
            this._cooldownBarBorder.setStrokeWidth(1);
            this._cooldownBarBorder.setFillColor(0, 0, 0, 0);
            this._cooldownBarBorder.setStrokeColor(1, 1, 1);
        } else {
            this._cooldownBarBorder.pos.x = barX;
            this._cooldownBarBorder.pos.y = cooldownY;
            this._cooldownBarBorder.width = barW;
            this._cooldownBarBorder.height = barH;
        }
        this._cooldownBarBorder.render(ctx);

        if (!this._cooldownBarFill) {
            this._cooldownBarFill = new Rectangle(barX, cooldownY, barW * cooldownRate, barH);
            this._cooldownBarFill.setStrokeWidth(0);
            this._cooldownBarFill.setFillColor(0, 12, 200, 0.5);
        } else {
            this._cooldownBarFill.pos.x = barX;
            this._cooldownBarFill.pos.y = cooldownY;
            this._cooldownBarFill.width = barW * cooldownRate;
            this._cooldownBarFill.height = barH;
        }
        this._cooldownBarFill.render(ctx);

        // Render charge bar
        let chargeY = this.pos.y + this.r + 3.8 * barH;
        let chargeRate = this.laserDamageAdd / this.laserMaxDamage;

        if (!this._chargeBarBorder) {
            this._chargeBarBorder = new Rectangle(barX, chargeY, barW, barH);
            this._chargeBarBorder.setStrokeWidth(1);
            this._chargeBarBorder.setFillColor(0, 0, 0, 0);
            this._chargeBarBorder.setStrokeColor(1, 1, 1);
        } else {
            this._chargeBarBorder.pos.x = barX;
            this._chargeBarBorder.pos.y = chargeY;
            this._chargeBarBorder.width = barW;
            this._chargeBarBorder.height = barH;
        }
        this._chargeBarBorder.render(ctx);

        if (!this._chargeBarFill) {
            this._chargeBarFill = new Rectangle(barX, chargeY, barW * chargeRate, barH);
            this._chargeBarFill.setStrokeWidth(0);
            this._chargeBarFill.setFillColor(255, 1, 255, 0.5);
        } else {
            this._chargeBarFill.pos.x = barX;
            this._chargeBarFill.pos.y = chargeY;
            this._chargeBarFill.width = barW * chargeRate;
            this._chargeBarFill.height = barH;
        }
        this._chargeBarFill.render(ctx);
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
