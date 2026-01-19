/**
 * TowerRay - Ray/beam attack tower
 *
 * Fires continuous ray beams that can be used for various attack patterns.
 */
import { Vector } from '../../core/math/vector';
import { Line } from '../../core/math/line';
import { Circle } from '../../core/math/circle';
import { MyColor, ReadonlyColor } from '../../entities/myColor';
import { LineObject } from '../../entities/base/lineObject';
import { Tower } from './tower';
import { TowerRegistry } from '../towerRegistry';
import { scaleSpeed } from '../../core/speedScale';

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
    duration: number;
    initLineStyle(color: ReadonlyColor, width: number): void;
    initDamage(world: unknown, damage: number): void;
}

interface MonsterLike {
    pos: Vector;
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

type RayAttackFunc = (cachedMonsters?: MonsterLike[]) => void;

export class TowerRay extends Tower {
    target: MonsterLike | null;
    rayLen: number;
    damage: number;
    targetLiveTime: number;
    scanningSpeed: number;
    rayMoveSpeed: number;
    rayNum: number;
    rayDeviationRotate: number;
    rayDeviation: number;
    rayMaxRange: number;
    rayClock: number;
    rayBullys: Set<LineObject>;
    rayThrowAble: boolean;
    rayRepel: number;
    rayColor: ReadonlyColor;
    rayWidth: number;

    declare attackFunc: RayAttackFunc;

    // Cached query results for the current frame
    private _cachedMonstersInRange: MonsterLike[] | null = null;
    private _cachedQueryRange: number = 0;

    constructor(x: number, y: number, world: any) {
        super(x, y, world);
        this.name = "射线塔";
        this.clock = 1.1;

        this.target = null;
        this.rangeR = 200;
        this.hpInit(5000);
        this.price = 1000;

        this.rayLen = 1000;
        this.damage = 1;

        this.targetLiveTime = 0;

        this.attackFunc = this.attack;
        // 注意：scanningSpeed 是视觉旋转角速度，不使用 scaleSpeed
        // 旋转速度的感知不需要随游戏速度缩放
        this.scanningSpeed = 0.01;

        this.rayMoveSpeed = 0;
        this.rayNum = 1;
        this.rayDeviationRotate = 0;
        this.rayDeviation = 0;
        this.rayMaxRange = 1000;
        this.rayClock = 1;
        this.rayBullys = new Set();
        this.rayThrowAble = true;
        this.rayRepel = 0;
        this.rayColor = MyColor.GRAY();
        this.rayWidth = 3;
    }

    refreshTarget(cachedMonsters?: MonsterLike[]): void {
        const target = this.findFirstTarget(cachedMonsters as any);
        if (target) {
            this.target = target as MonsterLike;
            this.dirction = this.target.pos.sub(this.pos).to1();
        }
    }

    loseTarget(): void {
        this.target = null;
    }

    shoot(cachedMonsters?: MonsterLike[]): void {
        if (this.liveTime % this.rayClock === 0) {
            let line = new Line(this.pos, this.pos.plus(this.dirction.mul(this.rayLen)));
            let nearbyMonsters: MonsterLike[];
            
            // Use cached results if available and range matches
            if (cachedMonsters && this._cachedQueryRange >= this.rayLen) {
                nearbyMonsters = cachedMonsters;
            } else {
                nearbyMonsters = this.world.getMonstersInRange(this.pos.x, this.pos.y, this.rayLen);
            }
            
            let actualDamage = this.damage * this.getDamageMultiplier();
            for (let m of nearbyMonsters) {
                // Check fog first, using circle visibility for edge detection
                const mc = m.getBodyCircle();
                if (this.world.fog?.enabled && !this.world.fog.isCircleVisible(mc.x, mc.y, mc.r)) {
                    continue;
                }
                if (line.intersectWithCircle(mc as any)) {
                    m.hpChange(-actualDamage);
                }
            }
            if (typeof EffectLine !== 'undefined') {
                let e = EffectLine.acquire(line.PosStart, line.PosEnd);
                e.initLineStyle(this.rayColor, this.rayWidth);
                e.duration = 50;
                if (this.attackFunc === this.scanningAttack) {
                    e.initDamage(this.world, actualDamage);
                }
                this.world.addEffect?.(e);
            }
        }
    }

    attack(cachedMonsters?: MonsterLike[]): void {
        this.refreshTarget(cachedMonsters);
        if (this.target === null || this.target === undefined || this.target.isDead()) {
            return;
        }
        this.shoot(cachedMonsters);
        if (this.target.isDead()) {
            this.loseTarget();
        }
    }

    scanningAttack(cachedMonsters?: MonsterLike[]): void {
        const theta = this.scanningSpeed * this.liveTime;
        this.dirction.x = Math.sin(theta);
        this.dirction.y = Math.cos(theta);
        this.shoot(cachedMonsters);
    }

    shootingAttack(cachedMonsters?: MonsterLike[]): void {
        this.refreshTarget(cachedMonsters);
        if (this.target === null || this.target === undefined || this.target.isDead()) {
            return;
        }
        // Target already found by refreshTarget(), use cached monsters for view circle check
        let nearbyMonsters = cachedMonsters || this._cachedMonstersInRange || [];
        let viewCircle = this.getViewCircle();
        // Since refreshTarget() already found the target, we can directly use it
        // But we still need to check view circle for consistency
        for (let m of nearbyMonsters) {
            const mc = m.getBodyCircle();
            if (m === this.target && Circle.collides(viewCircle.x, viewCircle.y, viewCircle.r, mc.x, mc.y, mc.r)) {
                this.dirction = this.target.pos.sub(this.pos).to1();

                if (this.liveTime % this.rayClock === 0) {
                    for (let i = 0; i < this.rayNum; i++) {
                        let bDir = this.dirction.copy().deviation(this.rayDeviationRotate).to1();
                        let line = new Line(this.pos.copy(), this.pos.plus(bDir.mul(this.rayLen)));
                        let rayBully = new LineObject(line, this.world as any);
                        rayBully.speed = bDir.mul(this.rayMoveSpeed);
                        rayBully.strokeColor.setRGBA(this.rayColor.r, this.rayColor.g, this.rayColor.b, this.rayColor.a);
                        rayBully.strokeWidth = this.rayWidth;
                        this.rayBullys.add(rayBully);
                    }
                }
                return;
            }
        }
    }

    gerAttack(cachedMonsters?: MonsterLike[]): void {
        this.refreshTarget(cachedMonsters);
        if (this.target === null || this.target === undefined || this.target.isDead()) {
            return;
        }
        // Target already found by refreshTarget(), use cached monsters for view circle check
        let nearbyMonsters = cachedMonsters || this._cachedMonstersInRange || [];
        let viewCircle = this.getViewCircle();
        // Since refreshTarget() already found the target, we can directly use it
        // But we still need to check view circle for consistency
        for (let m of nearbyMonsters) {
            const mc = m.getBodyCircle();
            if (m === this.target && Circle.collides(viewCircle.x, viewCircle.y, viewCircle.r, mc.x, mc.y, mc.r)) {
                this.dirction = this.target.pos.sub(this.pos).to1();
                if (this.liveTime % this.rayClock === 0) {
                    for (let i = 0; i < this.rayNum; i++) {
                        let bDir = this.dirction.copy().deviation(this.rayDeviationRotate).to1();
                        let x1 = bDir.rotate90().mul(this.rayLen / 2);
                        let x2 = x1.copy().rotate90().rotate90();
                        let line = new Line(this.pos.plus(x1), this.pos.plus(x2));
                        let rayBully = new LineObject(line, this.world as any);
                        rayBully.speed = bDir.mul(this.rayMoveSpeed);
                        rayBully.strokeColor.setRGBA(this.rayColor.r, this.rayColor.g, this.rayColor.b, this.rayColor.a);
                        rayBully.strokeWidth = this.rayWidth;
                        this.rayBullys.add(rayBully);
                    }
                }
                return;
            }
        }
    }

    goStep(): void {
        // 保持向后兼容：执行完整的更新逻辑
        this.goStepMove();
        this.goStepCollide();
    }

    /**
     * 移动阶段：处理射线子弹的移动
     */
    goStepMove(): void {
        super.goStepMove();
        
        // 射线子弹移动
        for (let br of this.rayBullys) {
            br.lineGoStep();
        }
    }

    /**
     * 碰撞阶段：处理攻击和射线子弹碰撞
     */
    goStepCollide(): void {
        // Cache query results at the start of the frame for reuse
        const effectiveRange = this.getEffectiveRangeR();
        const maxQueryRange = Math.max(effectiveRange, this.rayLen);
        
        // Query once and cache the results
        this._cachedMonstersInRange = this.world.getMonstersInRange(this.pos.x, this.pos.y, maxQueryRange);
        this._cachedQueryRange = maxQueryRange;

        // 移除超出范围的子弹
        this.removeOutRangeBullet();
        for (let b of this.bullys) {
            b.collide(this.world);
            b.split();
        }

        if (this.isDead()) {
            return;
        }

        // 执行攻击（带缓存的怪物查询）
        this.attackFunc(this._cachedMonstersInRange);

        // 射线子弹碰撞检测
        const toDelete: LineObject[] = [];
        const doCollision = this.liveTime % 2 === 0;
        const actualDamage = doCollision ? this.damage * 2 : 0;
        const maxRangeSq = this.rayMaxRange * this.rayMaxRange;

        for (let br of this.rayBullys) {
            if (br.PosEnd.disSq(this.pos) > maxRangeSq) {
                toDelete.push(br);
                continue;
            }
            if (doCollision) {
                let nearbyMonsters = this.world.getMonstersInRange(br.PosEnd.x, br.PosEnd.y, this.rayLen);
                for (let m of nearbyMonsters) {
                    // Check fog first, using circle visibility for edge detection
                    const mc = m.getBodyCircle();
                    if (this.world.fog?.enabled && !this.world.fog.isCircleVisible(mc.x, mc.y, mc.r)) {
                        continue;
                    }
                    if (br.intersectWithCircle(mc as any)) {
                        m.hpChange(-actualDamage);
                        if (!this.rayThrowAble) {
                            toDelete.push(br);
                            break;
                        }
                        if (this.rayRepel !== 0) {
                            m.pos = m.pos.copy().plus(br.speed.mul(this.rayRepel));
                        }
                    }
                }
            }
        }
        for (let br of toDelete) {
            this.rayBullys.delete(br);
        }
    }

    render(ctx: CanvasRenderingContext2D): void {
        if (this.isDead()) {
            return;
        }
        this.renderBody(ctx);
        this.renderBars(ctx);
    }

    /**
     * 渲染塔主体（不含状态条）
     */
    renderBody(ctx: CanvasRenderingContext2D): void {
        super.renderBody(ctx);
        for (let b of this.rayBullys) {
            b.render(ctx);
        }
    }
}

// Register class type for save system
TowerRegistry.registerClassType('TowerRay', () => TowerRay);
