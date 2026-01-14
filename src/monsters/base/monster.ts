/**
 * Monster base class
 * by littlefean
 */
import { Vector } from '../../core/math/vector';
import { Circle } from '../../core/math/circle';
import { MyColor } from '../../entities/myColor';
import { CircleObject } from '../../entities/base/circleObject';
import {
    renderStatusBar,
    createStatusBarCache,
    BAR_OFFSET,
    BAR_COLORS,
    type StatusBarCache
} from '../../entities/statusBar';
import { MonsterRegistry } from '../monsterRegistry';
import { MONSTER_IMG_PRE_WIDTH, MONSTER_IMG_PRE_HEIGHT, getMonstersImg } from '../monsterConstants';
import { World } from '../../game/world';
import { scaleSpeed, scalePeriod } from '../../core/speedScale';

// Declare globals for non-migrated modules
declare const EffectLine: {
    acquire(start: VectorLike, end: VectorLike): EffectLineLike;
} | undefined;

declare const EffectCircle: {
    acquire(pos: VectorLike): EffectCircleLike;
} | undefined;

declare const Functions: {
    levelMonsterHpAddedHard(level: number): number;
    levelCollideAddedHard(level: number): number;
    levelAddPrice(level: number): number;
} | undefined;

interface VectorLike {
    x: number;
    y: number;
    copy(): VectorLike;
    sub(other: VectorLike): VectorLike;
    abs(): number;
    add(other: VectorLike): void;
}

interface CircleLike {
    x: number;
    y: number;
    r: number;
    impact(other: CircleLike): boolean;
    pointIn?(x: number, y: number): boolean;
}

interface EffectLineLike {
    initLineStyle(color: MyColor, width: number): void;
}

interface EffectCircleLike {
    circle: { r: number; fillColor: { setRGBA(r: number, g: number, b: number, a: number): void } };
    animationFunc: () => void;
    flashRedAnimation: () => void;
}

interface BulletLike {
    pos: VectorLike;
    r: number;
    laserDestoryAble?: boolean;
    bodyRadiusChange(dr: number): void;
    acceleration: VectorLike;
    damageChange(delta: number): void;
    remove(): void;
}

interface BuildingLike {
    pos: VectorLike;
    getBodyCircle(): CircleLike;
    hpChange(delta: number): void;
    isDead(): boolean;
}

interface TerritoryLike {
    markDirty(): void;
}

interface UserLike {
    money: number;
}

interface RootBuildingLike {
    pos: Vector;
}

interface WorldLike {
    width: number;
    height: number;
    // Precomputed world constants (from World class)
    worldCenterX: number;
    worldCenterY: number;
    minMonsterRadius: number;
    monsterRadiusRange: number;
    monsters: Set<Monster>;
    allBullys: Iterable<BulletLike>;
    rootBuilding: RootBuildingLike;
    user: UserLike;
    territory?: TerritoryLike;
    cheatMode?: { enabled: boolean; infiniteHp: boolean };
    getMonstersInRange(x: number, y: number, range: number): Monster[];
    getBullysInRange(x: number, y: number, range: number): BulletLike[];
    getBuildingsInRange(x: number, y: number, range: number): BuildingLike[];
    getAllBuildingArr(): BuildingLike[];
    addMonster(monster: Monster): void;
    removeMonster(monster: Monster): void;
    addEffect(effect: unknown): void;
}

interface GainDetails {
    gainRadius: number;
    gainFrequency: number;
    gainR: number;
    gainCollideDamageAddNum: number;
    gainHpAddedNum: number;
    gainSpeedNAddNum: number;
    gainHpAddedRate: number;
    gainMaxHpAddedNum: number;
}

interface BullyChangeDetails {
    r: number;
    f: number;
    bullyDR: number;
    bullyAN: number;
    bullyDD: number;
}

type ChangeSpeedFunc = () => void;
type SummonMonsterFunc = (world: WorldLike) => Monster | null;

export class Monster extends CircleObject {
    // Shared Circle object for rendering, avoid creating temporary objects
    static _renderCircle: Circle | null = null;
    // Static Circle for bombSelf collision detection (reused to avoid allocations)
    private static _bombCircle: Circle = new Circle(0, 0, 0);

    static getRenderCircle(x: number, y: number, r: number): Circle {
        if (!Monster._renderCircle) {
            Monster._renderCircle = new Circle(x, y, r);
        } else {
            Monster._renderCircle.x = x;
            Monster._renderCircle.y = y;
            Monster._renderCircle.r = r;
        }
        return Monster._renderCircle;
    }

    // Cached font strings to avoid repeated string creation
    static FONT_12 = "12px Microsoft YaHei";
    static FONT_9 = "9px Microsoft YaHei";

    // 静态变量：缓存的网格尺寸（避免每帧重复计算）
    static _gridWidth: number = 0;
    static _gridHeight: number = 0;

    /**
     * 初始化网格尺寸（在图片加载完成后调用）
     */
    static initGrid(): void {
        const MONSTERS_IMG = getMonstersImg();
        if (MONSTERS_IMG && MONSTERS_IMG.complete && MONSTERS_IMG.naturalWidth > 0) {
            Monster._gridWidth = Math.floor(MONSTERS_IMG.naturalWidth / MONSTER_IMG_PRE_WIDTH);
            Monster._gridHeight = Math.floor(MONSTERS_IMG.naturalHeight / MONSTER_IMG_PRE_HEIGHT);
        }
    }

    name: string;
    gameType: string;
    speedNumb: number;
    speedFreezeNumb: number;
    minFreezeNum: number;
    changedSpeed: Vector;
    changeSpeedFunc: ChangeSpeedFunc;
    maxSpeedN: number;
    burnMaxSpeedN: number;
    burnRate: number;
    maxBurnRate: number;
    colishDamage: number;
    addPrice: number;
    destination: Vector;

    // Pre-allocated vectors for move calculations
    protected _moveVec: Vector;
    protected _tempVec: Vector;

    // Death explosion properties
    bombSelfAble: boolean;
    bombSelfRange: number;
    bombSelfDamage: number;

    // Pass-through ability
    throwAble: boolean;

    // Gravity field
    haveGArea: boolean;
    gAreaR: number;
    gAreaNum: number;

    // Bullet manipulation field
    haveBullyChangeArea: boolean;
    bullyChangeDetails: BullyChangeDetails;

    // Ally buff field
    haveGain: boolean;
    gainDetails: GainDetails;

    // Laser defense ability
    haveLaserDefence: boolean;
    laserFreeze: number;
    laserdefendPreNum: number;
    maxLaserNum: number;
    laserDefendNum: number;
    laserRecoverFreeze: number;
    laserRecoverNum: number;
    laserRadius: number;
    protected _laserBarCache: StatusBarCache;

    // Death summon ability
    deadSummonAble: boolean;
    summonAble: boolean;
    summonFreezeTime: number;
    summonCount: number;
    summonDistance: number;
    summonMonsterFunc: SummonMonsterFunc;

    // Teleporting ability
    teleportingAble: boolean;
    teleportingRange: number;
    teleportingCount: number;

    imgIndex: number;

    declare world: WorldLike;

    constructor(pos: Vector, world: WorldLike) {
        super(pos, world);
        this.gameType = "Monster";
        this.name = "默认怪物";

        this.speedNumb = scaleSpeed(1);
        this.speedFreezeNumb = 1;
        this.minFreezeNum = 0.2;

        this.changedSpeed = Vector.zero();
        this.changeSpeedFunc = () => {};
        this.maxSpeedN = scaleSpeed(15);
        this.burnMaxSpeedN = 2;
        this.burnRate = 0;
        this.maxBurnRate = 0.005;

        this.hpInit(100);
        this.colishDamage = 100;
        this.r = 15;
        this.addPrice = 5;
        this.destination = new Vector(this.world.worldCenterX, this.world.worldCenterY);
        this.bodyColor = MyColor.arrTo([25, 25, 25, 0.8]);
        this.hpColor = MyColor.arrTo([200, 20, 20, 0.5]);

        this._moveVec = new Vector(0, 0);
        this._tempVec = new Vector(0, 0);

        this.bombSelfAble = false;
        this.bombSelfRange = 100;
        this.bombSelfDamage = 500;

        this.throwAble = false;

        this.haveGArea = false;
        this.gAreaR = 0;
        this.gAreaNum = 0;

        this.haveBullyChangeArea = false;
        this.bullyChangeDetails = {
            r: 100,
            f: 5,
            bullyDR: -0,
            bullyAN: 0,
            bullyDD: -0,
        };

        this.haveGain = false;
        this.gainDetails = {
            gainRadius: 250,
            gainFrequency: 10,
            gainR: 0,
            gainCollideDamageAddNum: 0,
            gainHpAddedNum: 0,
            gainSpeedNAddNum: 0,
            gainHpAddedRate: 0.0,
            gainMaxHpAddedNum: 0,
        };

        this.haveLaserDefence = false;
        this.laserFreeze = scalePeriod(1);
        this.laserdefendPreNum = 10;
        this.maxLaserNum = 1000;
        this.laserDefendNum = 1000;
        this.laserRecoverFreeze = scalePeriod(10);
        this.laserRecoverNum = 10;
        this.laserRadius = 100;
        this._laserBarCache = createStatusBarCache();

        this.deadSummonAble = false;
        this.summonAble = false;
        this.summonFreezeTime = scalePeriod(100);
        this.summonCount = 4;
        this.summonDistance = 30;
        this.summonMonsterFunc = (world) => MonsterRegistry.create('Normal', world) as Monster | null;

        this.teleportingAble = false;
        this.teleportingRange = 100;
        this.teleportingCount = 3;

        this.imgIndex = 0;
    }

    static randInit(world: WorldLike): Monster {
        let rootPos = world.rootBuilding.pos;
        let minRadius = Math.min(world.width, world.height) * 0.5;
        let maxRadius = Math.max(world.width, world.height) * 0.6;

        let pos = Vector.randCircleOutside(
            rootPos.x, rootPos.y,
            minRadius, maxRadius,
            world.width, world.height
        );

        let res = new this(pos, world);
        res.bodyStrokeColor = MyColor.arrTo([0, 0, 0, 1]);
        return res;
    }

    dataInit(flowNum: number): void {
        if (typeof Functions !== 'undefined') {
            this.hpInit(this.maxHp + Functions.levelMonsterHpAddedHard(flowNum));
            this.colishDamage += Functions.levelCollideAddedHard(flowNum);
            this.addPrice += Functions.levelAddPrice(flowNum);
        }
    }

    teleporting(): void {
        if (this.teleportingAble) {
            this.pos.add(Vector.randCircle().mul(this.teleportingRange));
            this.teleportingCount--;
            if (this.teleportingCount < 0) {
                this.teleportingCount = 0;
            }
        }
    }

    selfSwingMove(): void {
        // Use instance temp vectors to avoid GC pressure
        Vector.subTo(this.destination, this.pos, this._moveVec);
        this._moveVec.normalizeInPlace();
        Vector.rotate90To(this._moveVec, this._tempVec);
        this._tempVec.mulInPlace(Math.sin(this.liveTime / scalePeriod(10)) * 10);
        this.changedSpeed.copyFrom(this._tempVec);
    }

    selfSuddenlyMove(): void {
        // Use instance temp vectors to avoid GC pressure
        Vector.subTo(this.destination, this.pos, this._moveVec);
        this._moveVec.normalizeInPlace();
        Vector.mulTo(this._moveVec, (Math.sin(this.liveTime / scalePeriod(10)) + 1) * 2, this._tempVec);
        this.changedSpeed.copyFrom(this._tempVec);
    }

    selfExcitingMove(): void {
        // Use instance temp vectors to avoid GC pressure
        Vector.subTo(this.destination, this.pos, this._moveVec);
        this._moveVec.normalizeInPlace();
        Vector.mulTo(this._moveVec, (Math.sin(this.liveTime / scalePeriod(4)) + 0.3) * 6, this._tempVec);
        this.changedSpeed.copyFrom(this._tempVec);
    }

    selfDoubleSwingMove(): void {
        // Use instance temp vectors to avoid GC pressure
        Vector.subTo(this.destination, this.pos, this._moveVec);
        this._moveVec.normalizeInPlace();
        Vector.rotate90To(this._moveVec, this._tempVec);
        this._tempVec.mulInPlace(Math.sin(Math.pow(this.liveTime / scalePeriod(10), 0.5)) * 10);
        this.changedSpeed.copyFrom(this._tempVec);
        // Add second component
        const cos = Math.cos(Math.pow(this.liveTime / scalePeriod(10), 2)) * 20;
        this.changedSpeed.x += this._moveVec.x * cos;
        this.changedSpeed.y += this._moveVec.y * cos;
    }

    move(): void {
        this._moveVec.x = this.destination.x - this.pos.x;
        this._moveVec.y = this.destination.y - this.pos.y;
        const len = Math.sqrt(this._moveVec.x * this._moveVec.x + this._moveVec.y * this._moveVec.y);
        if (len > 0) {
            this._moveVec.x /= len;
            this._moveVec.y /= len;
        }

        if (this.minFreezeNum > this.speedFreezeNumb) {
            this.speedFreezeNumb = this.minFreezeNum;
        }
        if (this.speedFreezeNumb > this.burnMaxSpeedN) {
            this.speedFreezeNumb = this.burnMaxSpeedN;
        }

        let distanceSpeedMul = 1;
        if (len > this.world.minMonsterRadius) {
            const t = Math.min((len - this.world.minMonsterRadius) / this.world.monsterRadiusRange, 1);
            distanceSpeedMul = 1 + 9 * Math.log(1 + t * Math.E) / World._LOG_1_PLUS_E;
        }

        const speedMul = this.speedNumb * this.speedFreezeNumb * distanceSpeedMul;
        this.speed.x = this._moveVec.x * speedMul;
        this.speed.y = this._moveVec.y * speedMul;
        this.acceleration.x = this._moveVec.x * this.accelerationV;
        this.acceleration.y = this._moveVec.y * this.accelerationV;
        this.speed.add(this.changedSpeed);
        this.changeSpeedFunc();
        this.changedSpeed.add(this.acceleration);
        super.move();
    }

    laserDefend(): void {
        const laserRadiusSq = this.laserRadius * this.laserRadius;
        const inRange = (bully: BulletLike): boolean => {
            // Use manual distance squared calculation to avoid temporary Vector objects
            const dx = bully.pos.x - this.pos.x;
            const dy = bully.pos.y - this.pos.y;
            return dx * dx + dy * dy < laserRadiusSq;
        };

        const defend = (bully: BulletLike): void => {
            if (inRange(bully)) {
                let startPos = this.pos.copy();
                startPos.add(Vector.randCircle());
                if (typeof EffectLine !== 'undefined' && EffectLine.acquire) {
                    let e = EffectLine.acquire(startPos, bully.pos.copy());
                    e.initLineStyle(new MyColor(255, 0, 0, 0.1), 1);
                    this.world.addEffect(e);
                }
                if (typeof EffectCircle !== 'undefined' && EffectCircle.acquire) {
                    let ec = EffectCircle.acquire(bully.pos.copy());
                    ec.circle.fillColor.setRGBA(255, 0, 0, 0.1);
                    this.world.addEffect(ec);
                }
                bully.remove();
            }
        };

        const laserNumChange = (dN: number): void => {
            this.laserDefendNum += dN;
            if (this.laserDefendNum < 0) this.laserDefendNum = 0;
            if (this.laserDefendNum > this.maxLaserNum) this.laserDefendNum = this.maxLaserNum;
        };

        if (this.haveLaserDefence) {
            if (this.liveTime % this.laserFreeze === 0) {
                let nearbyBullys = this.world.getBullysInRange(this.pos.x, this.pos.y, this.laserRadius);
                let count = 0;
                for (let bully of nearbyBullys) {
                    if (bully.laserDestoryAble === false) continue;
                    if (count >= this.laserdefendPreNum || this.laserDefendNum <= 0) break;
                    if (inRange(bully)) {
                        defend(bully);
                        count++;
                        laserNumChange(-1);
                    }
                }
            }
            if (this.liveTime % this.laserRecoverFreeze === 0) {
                laserNumChange(this.laserRecoverNum);
            }
        }
    }

    gainOther(): void {
        if (this.haveGain) {
            if (this.liveTime % this.gainDetails.gainFrequency === 0) {
                let nearbyMonsters = this.world.getMonstersInRange(this.pos.x, this.pos.y, this.gainDetails.gainRadius + 50);
                const showEffect = this.liveTime % 10 === 0;
                const gainRadiusSq = this.gainDetails.gainRadius * this.gainDetails.gainRadius;
                for (let m of nearbyMonsters) {
                    if (m !== this) {
                        if (m.pos.disSq(this.pos) < gainRadiusSq) {
                            m.colishDamage += this.gainDetails.gainCollideDamageAddNum;
                            m.hpChange(m.maxHp * this.gainDetails.gainHpAddedRate);
                            m.hpChange(this.gainDetails.gainHpAddedNum);
                            m.maxHp += this.gainDetails.gainMaxHpAddedNum;
                            if (m.r < 100 || m.r > 0) {
                                m.r += this.gainDetails.gainR;
                            }
                            if (m.speedNumb < 2.5) {
                                m.speedNumb += this.gainDetails.gainSpeedNAddNum;
                            }
                            if (showEffect && typeof EffectLine !== 'undefined' && EffectLine.acquire) {
                                let e = EffectLine.acquire(this.pos, m.pos);
                                e.initLineStyle(new MyColor(0, 200, 0, 0.5), 3);
                                this.world.addEffect(e);
                            }
                        }
                    }
                }
            }
        }
    }

    bullyChange(): void {
        if (this.haveBullyChangeArea) {
            if (this.liveTime % this.bullyChangeDetails.f === 0) {
                // 使用空间查询优化，避免全局遍历所有子弹
                // 添加 50 的安全边距以覆盖子弹半径
                const bullysInRange = this.world.getBullysInRange(
                    this.pos.x,
                    this.pos.y,
                    this.bullyChangeDetails.r + 50
                );
                for (let b of bullysInRange) {
                    const combinedR = this.bullyChangeDetails.r + b.r;
                    if ((b.pos as Vector).disSq(this.pos) < combinedR * combinedR) {
                        b.bodyRadiusChange(this.bullyChangeDetails.bullyDR);
                        let diffVec = (b.pos as Vector).sub(this.pos);
                        let av = diffVec.to1().mul(this.bullyChangeDetails.bullyAN);
                        let q = 1 - diffVec.abs() / this.bullyChangeDetails.r;
                        av = av.mul(q);
                        b.acceleration = av as any;
                        b.damageChange(this.bullyChangeDetails.bullyDD);
                    }
                }
            }
        }
    }

    gravyPower(): void {
        if (this.haveGArea) {
            let nearbyBuildings = this.world.getBuildingsInRange(this.pos.x, this.pos.y, this.gAreaR + 50);
            const gAreaRSq = this.gAreaR * this.gAreaR;
            for (let b of nearbyBuildings) {
                if (this.pos.disSq(b.pos as Vector) < gAreaRSq) {
                    // Use instance temp vector to avoid GC pressure
                    Vector.subTo(this.pos, b.pos as Vector, this._tempVec);
                    this._tempVec.normalizeInPlace().mulInPlace(this.gAreaNum);
                    (b.pos as Vector).add(this._tempVec);
                }
            }
        }
    }

    bombSelf(): void {
        if (this.bombSelfAble) {
            // Reuse static Circle to avoid allocation
            const bC = Monster._bombCircle;
            bC.x = this.pos.x;
            bC.y = this.pos.y;
            bC.r = this.bombSelfRange;
            
            let nearbyBuildings = this.world.getBuildingsInRange(this.pos.x, this.pos.y, this.bombSelfRange + 50);
            for (let b of nearbyBuildings) {
                if (b.getBodyCircle().impact(bC as any)) {
                    // Use disSq for distance calculation, only sqrt when needed for damage
                    let disSq = this.pos.disSq(b.pos as Vector);
                    let dis = Math.sqrt(disSq);
                    let damage = (1 - (dis / this.bombSelfRange)) * this.bombSelfDamage;
                    b.hpChange(-Math.abs(damage));
                }
            }
            if (typeof EffectCircle !== 'undefined' && EffectCircle.acquire) {
                let e = EffectCircle.acquire(this.pos.copy());
                e.animationFunc = e.flashRedAnimation;
                e.circle.r = this.bombSelfRange;
                this.world.addEffect(e);
            }
        }
    }

    deadSummon(): void {
        if (this.deadSummonAble) {
            this.summonFunc();
        }
    }

    summonFunc(): void {
        for (let i = 0; i < this.summonCount; i++) {
            let m = this.summonMonsterFunc(this.world);
            if (m) {
                m.pos = this.pos.plus(Vector.randCircle().mul(this.summonDistance));
                this.world.addMonster(m);
            }
        }
    }

    summon(): void {
        if (this.summonAble) {
            if (this.liveTime % this.summonFreezeTime === 0) {
                this.summonFunc();
            }
        }
    }

    hpChange(dh: number): void {
        return super.hpChange(dh);
    }

    remove(): void {
        this.deadSummon();
        super.remove();
        this.hpSet(0);
        this.world.removeMonster(this);
        this.world.user.money += this.addPrice;
    }

    clash(): void {
        let nearbyBuildings = this.world.getBuildingsInRange(this.pos.x, this.pos.y, this.r + 50);
        const myCircle = this.getBodyCircle();
        for (let b of nearbyBuildings) {
            const bc = b.getBodyCircle();
            if (Circle.collides(myCircle.x, myCircle.y, myCircle.r, bc.x, bc.y, bc.r)) {
                this.bombSelf();
                b.hpChange(-this.colishDamage);
                if (!this.throwAble) {
                    this.remove();
                    break;
                }
            }
        }
    }

    goStep(): void {
        // 保持向后兼容：执行完整的更新逻辑
        this.updateState();
        this.moveOnly();
        this.clashOnly();
    }

    /**
     * 状态更新阶段：处理非移动/碰撞的逻辑
     * 包括：liveTime增加、激光防御、召唤、获取、子弹变化、死亡检查、重力
     */
    updateState(): void {
        super.goStep();
        this.laserDefend();
        this.summon();
        this.gainOther();
        this.bullyChange();
        if (this.isDead()) {
            this.bombSelf();
            this.remove();
        }
        this.gravyPower();
    }

    /**
     * 移动阶段：只执行移动逻辑
     * 用于分离移动和碰撞检测的两阶段更新
     */
    moveOnly(): void {
        if (this.burnRate > this.maxBurnRate) {
            this.burnRate = this.maxBurnRate;
        }
        if (this.burnRate !== 0) {
            this.hpChange(-this.burnRate * this.maxHp);
        }
        this.move();
    }

    /**
     * 碰撞检测阶段：只执行碰撞检测逻辑
     * 用于分离移动和碰撞检测的两阶段更新
     * 使用扫掠检测以处理高速移动的穿透问题
     */
    clashOnly(): void {
        let nearbyBuildings = this.world.getBuildingsInRange(this.pos.x, this.pos.y, this.r + 100);
        for (let b of nearbyBuildings) {
            const bc = b.getBodyCircle();
            // 使用扫掠检测（建筑不移动，所以用基础扫掠检测）
            if (Circle.sweepCollides(
                this.prevX, this.prevY, this.pos.x, this.pos.y, this.r,
                bc.x, bc.y, bc.r
            )) {
                this.bombSelf();
                b.hpChange(-this.colishDamage);
                if (!this.throwAble) {
                    this.remove();
                    break;
                }
            }
        }
    }

    render(ctx: CanvasRenderingContext2D): void {
        super.render(ctx);
        const MONSTERS_IMG = getMonstersImg();
        if (MONSTERS_IMG && MONSTERS_IMG.complete && MONSTERS_IMG.naturalWidth > 0) {
            let imgStartPos = this.getImgStartPosByIndex(this.imgIndex);
            ctx.drawImage(
                MONSTERS_IMG,
                imgStartPos.x,
                imgStartPos.y,
                MONSTER_IMG_PRE_WIDTH,
                MONSTER_IMG_PRE_HEIGHT,
                this.pos.x - this.r,
                this.pos.y - this.r,
                this.r * 2,
                this.r * 2
            );
        }

        ctx.fillStyle = "black";
        ctx.font = Monster.FONT_12;
        ctx.textAlign = "center";
        ctx.fillText(this.name, this.pos.x, this.pos.y + this.r * 1.5);

        if (this.bombSelfAble) {
            Monster.getRenderCircle(this.pos.x, this.pos.y, this.bombSelfRange).renderView(ctx);
        }
        if (this.haveGArea) {
            Monster.getRenderCircle(this.pos.x, this.pos.y, this.gAreaR).renderView(ctx);
        }
        if (this.haveBullyChangeArea) {
            Monster.getRenderCircle(this.pos.x, this.pos.y, this.bullyChangeDetails.r).renderView(ctx);
        }
        if (this.haveGain) {
            Monster.getRenderCircle(this.pos.x, this.pos.y, this.gainDetails.gainRadius).renderView(ctx);
        }
        if (this.haveLaserDefence) {
            Monster.getRenderCircle(this.pos.x, this.pos.y, this.laserRadius).renderView(ctx);
            
            const barH = this.hpBarHeight;
            const barX = this.pos.x - this.r;
            const barY = this.pos.y - this.r + BAR_OFFSET.LASER_DEFENSE * barH;
            const barW = this.r * 2;
            const laserRate = this.laserDefendNum / this.maxLaserNum;

            renderStatusBar(ctx, {
                x: barX,
                y: barY,
                width: barW,
                height: barH,
                fillRate: laserRate,
                fillColor: BAR_COLORS.LASER_DEFENSE,
                showText: true,
                textValue: this.laserDefendNum,
                cache: this._laserBarCache
            });
        }
    }

    getImgStartPosByIndex(n: number): Vector {
        const MONSTERS_IMG = getMonstersImg();
        if (!MONSTERS_IMG || !MONSTERS_IMG.complete || MONSTERS_IMG.naturalWidth === 0) {
            return new Vector(0, 0);
        }
        // 如果网格尺寸未初始化，则初始化（向后兼容）
        if (Monster._gridWidth === 0 || Monster._gridHeight === 0) {
            Monster.initGrid();
        }
        let x = n % Monster._gridWidth;
        let y = Math.floor(n / Monster._gridWidth);
        return new Vector(x * MONSTER_IMG_PRE_WIDTH, y * MONSTER_IMG_PRE_HEIGHT);
    }
}

// Register class type for save system
MonsterRegistry.registerClassType('Monster', () => Monster);
