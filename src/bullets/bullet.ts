/**
 * Bully - Base bullet class
 * by littlefean
 */
import { Vector } from '../core/math/vector';
import { Circle } from '../core/math/circle';
import { MyColor } from '../entities/myColor';
import { CircleObject } from '../entities/base/circleObject';
import { BulletRegistry } from './bulletRegistry';

// Declare globals for non-migrated modules
declare const EffectCircle: {
    acquire(pos: VectorLike): EffectCircleLike;
} | undefined;

declare const SoundManager: {
    play(sound: string): void;
} | undefined;

interface VectorLike {
    x: number;
    y: number;
    copy(): VectorLike;
    sub(other: VectorLike): VectorWithMethods;
    dis(other: VectorLike): number;
    add(other: VectorLike): void;
    mul(n: number): VectorLike;
}

interface VectorWithMethods extends VectorLike {
    to1(): VectorLike;
}

interface CircleLike {
    x: number;
    y: number;
    r: number;
    impact(other: CircleLike): boolean;
}

interface EffectCircleLike {
    circle: { r: number };
    animationFunc: () => void;
    flashBlueAnimation: () => void;
}

interface EntityLike {
    pos: VectorLike;
    getBodyCircle(): CircleLike;
    hpChange(delta: number): void;
    isDead(): boolean;
    teleportingAble?: boolean;
    teleporting?(): void;
    speedFreezeNumb?: number;
    burnRate?: number;
    bodyColor?: { change(dr: number, dg: number, db: number, da: number): void };
    changedSpeed?: VectorLike;
}

interface TowerLike {
    world: WorldLike;
    rangeR: number;
    bullys: Set<Bully>;
}

interface WorldLike {
    width: number;
    height: number;
    monsters: Iterable<EntityLike>;
    othersBullys: Bully[];
    fog?: { enabled: boolean; isPositionVisible(x: number, y: number): boolean };
    removeBully(bully: Bully): void;
    addBully(bully: Bully): void;
    getMonstersInRange(x: number, y: number, range: number): EntityLike[];
    getBuildingsInRange(x: number, y: number, range: number): EntityLike[];
    getAllBuildingArr(): EntityLike[];
    addEffect(effect: unknown): void;
}

type BombFunc = () => void;
type SplitBullyFunc = () => Bully | null;

export class Bully extends CircleObject {
    // Static reusable Circle for rendering view radius
    static _viewCircle: Circle | null = null;
    // Static Circle for bomb collision detection (reused to avoid allocations)
    private static _bombCircle: Circle = new Circle(0, 0, 0);

    static getViewCircle(x: number, y: number, r: number): Circle {
        if (!Bully._viewCircle) {
            Bully._viewCircle = new Circle(x, y, r);
        } else {
            Bully._viewCircle.x = x;
            Bully._viewCircle.y = y;
            Bully._viewCircle.r = r;
        }
        return Bully._viewCircle;
    }

    originalPos: Vector;
    father: TowerLike | null;
    damage: number;
    dDamage: number;
    slideRate: number;
    dr: number;

    // Explosive bullet properties
    haveBomb: boolean;
    bombDamage: number;
    bombRange: number;
    bombFunc: BombFunc;

    // Armor-piercing bullet properties
    throughable: boolean;
    throughCutNum: number;

    // Single attack slow property
    freezeCutDown: number;

    // Split bullet properties
    splitAble: boolean;
    splitNum: number;
    splitRandomV: number;
    splitV: number;
    splitRotate: number;
    splitBully: SplitBullyFunc;
    splitRangeRate: number;
    isSliptedBully: boolean;
    splitRate: number;

    repel: number;

    // Smoke bullet properties
    dRGB: [number, number, number, number];
    burnRateAdd: number;

    laserDestoryAble: boolean;

    // Tracking bullet properties
    targetAble: boolean;
    viewRadius: number;
    target: EntityLike | null;
    speedToTargetN: number;

    collideSound: string | null;

    // Target is tower instead of monster
    targetTower: boolean;

    declare world: WorldLike;

    constructor(pos: Vector, speed: Vector, father: TowerLike | null, damage: number, r: number) {
        super(pos, null as any);
        if (father !== null) {
            this.world = father.world;
        }
        this.hpInit(-1);

        this.speed = speed;
        this.r = r;

        this.dr = 0;  // radius change per tick
        this.originalPos = new Vector(this.pos.x, this.pos.y); // original launch position
        this.father = father;
        this.damage = damage;  // hit damage
        this.dDamage = 0;  // damage increase per tick
        this.slideRate = 2;  // how far bullet can slide beyond tower range

        // Explosive bullet properties
        this.haveBomb = false;
        this.bombDamage = 0;  // explosion center damage
        this.bombRange = 0;
        this.bombFunc = this.bombFire;  // default fire explosion

        // Armor-piercing bullet properties
        this.throughable = false;
        this.throughCutNum = 0;  // reduction amount per hit

        // Bullet color
        this.bodyColor = new MyColor(100, 23, 1, 1);
        this.bodyStrokeWidth = 1;

        // Single attack slow property
        this.freezeCutDown = 1;  // closer to 1 = less slow effect

        // Split bullet properties
        this.splitAble = false;
        this.splitNum = 5;  // number of split bullets
        this.splitRandomV = 1;
        this.splitV = 0;  // normal rotation speed after split
        this.splitRotate = 0;  // expansion angle relative to original direction
        this.splitBully = () => BulletRegistry.create('Normal') as Bully | null;  // use registry for split bullet
        this.splitRangeRate = 100;  // split bullet max range in px
        this.isSliptedBully = false;  // is this a split bullet
        this.splitRate = 1;  // probability of continued splitting

        this.repel = 0;  // knockback ability

        // Smoke bullet properties
        this.dRGB = [0, 0, 0, 0];  // color change per iteration
        this.burnRateAdd = 0;  // burn rate increase per hit

        this.laserDestoryAble = true;  // can be destroyed by laser

        // Tracking bullet properties
        this.targetAble = false;  // tracking ability
        this.viewRadius = 100;  // tracking view range
        this.target = null;  // current target
        this.speedToTargetN = 5;  // speed when tracking target

        this.collideSound = null;  // sound when hitting monster

        // Target is tower instead of monster
        this.targetTower = false;
    }

    goStep(): void {
        super.goStep();
        this.move();
        this.rChange();
        this.damageChange(this.dDamage);
        this.bodyColor.change(...this.dRGB);
        if (this.dRGB.some(v => v !== 0)) {
            this._markBodyDirty();
        }
        // Tracking bullet gets target
        this.getTarget();

        this.collide(this.world);
        if (this.isSliptedBully) {
            const splitRangeSq = this.splitRangeRate * this.splitRangeRate;
            if (this.pos.disSq(this.originalPos) > splitRangeSq) {
                if (this.splitAble) {
                    // Can this split bullet continue splitting
                    if (Math.random() < this.splitRate) {
                        this.split();
                    }
                }
                this.remove();
            }
        }
    }

    /**
     * Remove bullet, sync remove from global cache and parent tower
     */
    remove(): void {
        // Remove from global bullet cache
        if (this.world) {
            this.world.removeBully(this);
        }
        // Remove from parent tower's bullet set
        if (this.father && this.father.bullys) {
            this.father.bullys.delete(this);
        }
        super.remove();
    }

    move(): void {
        const prevX = this.pos.x;
        const prevY = this.pos.y;
        if (this.targetAble && this.haveTarget()) {
            const dV = (this.target!.pos as Vector).sub(this.pos).to1().mul(this.speedToTargetN);
            this.pos.add(dV);
            this._markMovement(prevX, prevY);
        } else {
            super.move();
        }
    }

    haveTarget(): boolean {
        return !(this.target === null || this.target === undefined || this.target.isDead());
    }

    /**
     * Tracking bullet acquires target
     * Optimized: uses spatial query instead of full iteration
     */
    getTarget(): void {
        if (this.targetAble && !this.haveTarget()) {
            // Use spatial query for range-based target acquisition
            const arr = this.targetTower
                ? this.world.getBuildingsInRange(this.pos.x, this.pos.y, this.viewRadius)
                : this.world.getMonstersInRange(this.pos.x, this.pos.y, this.viewRadius);

            for (const m of arr) {
                // Check fog visibility first
                if (this.world.fog?.enabled && !this.world.fog.isPositionVisible(m.pos.x, m.pos.y)) {
                    continue;
                }
                // Use distance squared comparison (same semantics as Circle.impact)
                const dx = m.pos.x - this.pos.x;
                const dy = m.pos.y - this.pos.y;
                const distSq = dx * dx + dy * dy;
                const targetR = m.getBodyCircle().r;
                const combinedR = this.viewRadius + targetR;
                if (distSq <= combinedR * combinedR) {
                    this.target = m;
                    break;
                }
            }
        }
    }

    /**
     * Bullet collision detection with monsters
     */
    collide(world: WorldLike): void {
        let arr: EntityLike[];
        if (this.targetTower) {
            // Use quadtree for building collision detection
            arr = this.world.getBuildingsInRange(this.pos.x, this.pos.y, this.r + 100);
        } else {
            // Use quadtree for monster collision detection
            arr = this.world.getMonstersInRange(this.pos.x, this.pos.y, this.r + 50);
        }
        for (const m of arr) {
            const mc = m.getBodyCircle();
            if (Circle.collides(this.pos.x, this.pos.y, this.r, mc.x, mc.y, mc.r)) {
                // If target has teleport ability
                if (m.teleportingAble && m.teleporting) {
                    m.teleporting();
                }
                // Direct hit damage
                m.hpChange(-this.damage);
                // Direct hit slow effect
                if (m.speedFreezeNumb !== undefined) {
                    m.speedFreezeNumb *= this.freezeCutDown;  // slow stacks
                }
                // Burn attribute
                if (this.burnRateAdd > 0) {
                    if (m.burnRate !== undefined) {
                        m.burnRate += this.burnRateAdd;
                    }
                    if (m.speedFreezeNumb !== undefined && m.speedFreezeNumb < 1) {
                        // Clear freeze attribute
                        m.speedFreezeNumb = 1;
                    }
                    if (m.bodyColor) {
                        m.bodyColor.change(+20, -1, -1, 0);
                    }
                }

                // Can pass through
                if (this.throughable) {
                    // Was reduced
                    if (this.r <= 0) {
                        this.remove();
                        break;
                    }
                    this.bodyRadiusChange(-this.throughCutNum);
                    continue;
                }
                // Explode
                this.boom();
                // Knockback
                if (!this.targetTower && m.changedSpeed) {
                    m.changedSpeed.add(this.speed.mul(this.repel));
                }
                // Play sound effect
                if (this.collideSound !== null && typeof SoundManager !== 'undefined') {
                    SoundManager.play(this.collideSound);
                }
                // Split
                this.split();
                // Remove bullet
                this.remove();

                break;
            }
        }
    }

    /**
     * Bullet radius change per step
     */
    rChange(): void {
        this.r += this.dr;
        if (this.r < 0) {
            this.r = 0;
        }
    }

    /**
     * Change bullet damage
     */
    damageChange(dn: number): void {
        this.damage += dn;
        if (this.damage < 0) {
            this.damage = 0;
        }
    }

    /**
     * Bullet explosion direct damage effect
     */
    boom(): void {
        if (!this.haveBomb) {
            return;
        }
        this.bombFunc();
    }

    /**
     * Bullet split
     */
    split(): void {
        if (this.splitAble) {
            const fatherV = this.speed.copy();  // parent velocity direction
            for (let i = 0; i < this.splitNum; i++) {
                const b = this.splitBully();
                if (!b) continue;
                b.isSliptedBully = true;
                b.world = this.world;
                b.pos = this.pos.copy();
                b.originalPos = this.pos.copy();
                b.speed = Vector.randCircle().mul(this.splitRandomV);
                let newDir = fatherV.copy();
                newDir = Vector.rotatePoint(Vector.zero(), newDir, this.splitRotate * (i / this.splitNum));
                newDir = Vector.rotatePoint(Vector.zero(), newDir, -this.splitRotate / 2);
                b.speed.add(newDir.mul(this.splitV));
                b.splitRangeRate = this.splitRangeRate;
                b.targetTower = this.targetTower;
                // Add to world
                this.world.othersBullys.push(b);
                // Sync to global bullet cache
                this.world.addBully(b);
            }
        }
    }

    /**
     * Fire explosion
     */
    bombFire(): void {
        // Reuse static Circle to avoid allocation
        const bC = Bully._bombCircle;
        bC.x = this.pos.x;
        bC.y = this.pos.y;
        bC.r = this.bombRange;
        
        let arr: EntityLike[];
        if (this.targetTower) {
            arr = this.world.getBuildingsInRange(this.pos.x, this.pos.y, this.bombRange + 50);
        } else {
            arr = this.world.getMonstersInRange(this.pos.x, this.pos.y, this.bombRange + 50);
        }
        for (const m of arr) {
            if (m.getBodyCircle().impact(bC as any)) {
                // Use disSq for distance calculation, only sqrt when needed for damage
                const disSq = this.pos.disSq(m.pos as Vector);
                const dis = Math.sqrt(disSq);
                const damage = (1 - (dis / this.bombRange)) * this.bombDamage;
                m.hpChange(-Math.abs(damage));
            }
        }
        // Add explosion effect circle
        if (typeof EffectCircle !== 'undefined') {
            const e = EffectCircle.acquire(this.pos.copy());
            e.circle.r = this.bombRange;
            this.world.addEffect(e);
        }
    }

    /**
     * Freeze explosion like ice watermelon
     * Creates a freeze area, slows monsters,
     * changes monster body color, adds effect circle.
     */
    bombFreeze(): void {
        // Reuse static Circle to avoid allocation
        const bC = Bully._bombCircle;
        bC.x = this.pos.x;
        bC.y = this.pos.y;
        bC.r = this.bombRange;
        
        let arr: EntityLike[];
        if (this.targetTower) {
            arr = this.world.getBuildingsInRange(this.pos.x, this.pos.y, this.bombRange + 50);
        } else {
            arr = this.world.getMonstersInRange(this.pos.x, this.pos.y, this.bombRange + 50);
        }
        for (const m of arr) {
            if (m.getBodyCircle().impact(bC as any)) {
                // Spread damage
                m.hpChange(-this.bombDamage);
                if (m.speedFreezeNumb !== undefined) {
                    m.speedFreezeNumb *= this.freezeCutDown;  // slow stacks
                }
                if (m.bodyColor) {
                    m.bodyColor.change(-1, -1, 20, 0);
                }
                // Clear burn attribute
                if (m.burnRate !== undefined) {
                    m.burnRate = 0;
                }
            }
        }
        // Add explosion effect circle
        if (typeof EffectCircle !== 'undefined') {
            const e = EffectCircle.acquire(this.pos.copy());
            e.circle.r = this.bombRange;
            e.animationFunc = e.flashBlueAnimation;
            this.world.addEffect(e);
        }
    }

    /**
     * Check if bullet is out of range
     */
    outTowerViewRange(): boolean {
        // Use disSq for distance comparison
        const diffSq = this.pos.disSq(this.originalPos);
        if (this.father !== null) {
            const maxDistSq = this.father.rangeR * this.father.rangeR;
            return diffSq > maxDistSq;
        }
        return false;
    }

    render(ctx: CanvasRenderingContext2D): void {
        const c = this.getBodyCircle();
        c.fillColor = this.bodyColor;
        c.setStrokeWidth(this.bodyStrokeWidth);
        c.render(ctx);
        // Tracking bullet renders view range (use static reusable Circle)
        if (this.targetAble) {
            Bully.getViewCircle(this.pos.x, this.pos.y, this.viewRadius).renderView(ctx);
        }
    }
}

// Register class type
BulletRegistry.registerClassType('Bully', () => Bully);
