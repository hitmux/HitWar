/**
 * Tower - Base class for all tower types
 * by littlefean
 */
import { Vector } from '../../core/math/vector';
import { Circle } from '../../core/math/circle';
import { MyColor } from '../../entities/myColor';
import { CircleObject } from '../../entities/base/circleObject';
import { TowerRegistry } from '../towerRegistry';
import { TOWER_IMG_PRE_WIDTH, TOWER_IMG_PRE_HEIGHT, getTowersImg } from '../towerConstants';
import { VisionType, VISION_CONFIG } from '@/systems/fog/visionConfig';

// Declare globals for non-migrated modules
declare const BullyFinally: { Normal: () => BulletLike } | undefined;
declare const SoundManager: { play(src: string): void } | undefined;
declare const UP_LEVEL_ICON: HTMLImageElement | undefined;

interface BulletLike {
    originalPos: Vector;
    father: Tower;
    world: WorldLike;
    pos: Vector;
    speed: Vector;
    slideRate: number;
    damage: number;
    goStep(): void;
    render(ctx: CanvasRenderingContext2D): void;
    boom(): void;
    split(): void;
    outTowerViewRange(): boolean;
    remove(): void;
}

interface MonsterLike {
    pos: Vector;
    getBodyCircle(): Circle;
    hpChange(delta: number): void;
    isDead(): boolean;
}

interface TerritoryLike {
    markDirty(): void;
}

interface FogOfWarLike {
    enabled: boolean;
    isPositionVisible(x: number, y: number): boolean;
    markDirty(): void;
}

interface UserLike {
    money: number;
}

interface WorldLike {
    width: number;
    height: number;
    batterys: Tower[];
    territory?: TerritoryLike;
    fog?: FogOfWarLike;
    user: UserLike;
    energy: { getSatisfactionRatio(): number };
    getMonstersInRange(x: number, y: number, range: number): MonsterLike[];
    addBully(bully: BulletLike): void;
    removeBully(bully: BulletLike): void;
    addEffect?(effect: unknown): void;
}

type AttackFunc = () => void;

export class Tower extends CircleObject {
    name: string;
    gameType: string;
    rangeR: number;
    dirction: Vector;
    clock: number;
    bullys: Set<BulletLike>;
    getmMainBullyFunc: (() => BulletLike) | null;
    bullySpeed: number;
    bullySpeedAddMax: number;
    bullyDeviationRotate: number;
    bullyDeviation: number;
    bullyRotate: number;
    attackBullyNum: number;
    bullySlideRate: number;
    attackFunc: AttackFunc;
    price: number;
    levelUpArr: string[];           // Tower names for upgrade options
    levelDownGetter: string | null; // Tower name for downgrade option
    imgIndex: number;
    audioSrcString: string;
    towerLevel: number;
    // Vision properties
    visionType: VisionType;
    visionLevel: number;
    radarAngle: number;
    declare world: WorldLike;

    // Cached vector for upgrade icon
    protected _upIconOffset: Vector | null;

    // 静态变量：缓存的网格尺寸（避免每帧重复计算）
    private static _gridWidth: number = 0;
    private static _gridHeight: number = 0;

    /**
     * 初始化网格尺寸（在图片加载完成后调用）
     */
    static initGrid(): void {
        const IMG = getTowersImg();
        if (IMG) {
            Tower._gridWidth = Math.floor(IMG.width / TOWER_IMG_PRE_WIDTH);
            Tower._gridHeight = Math.floor(IMG.height / TOWER_IMG_PRE_HEIGHT);
        }
    }
    constructor(x: number, y: number, world: WorldLike) {
        super(new Vector(x, y), world);
        this.name = "普通炮塔";
        this.gameType = "Tower";
        this.r = 15;
        this.rangeR = 100;
        this.dirction = new Vector(1, 2).to1();
        this.clock = 5;

        this.bullys = new Set();

        this.getmMainBullyFunc = typeof BullyFinally !== 'undefined' ? BullyFinally.Normal : null;

        this.bullySpeed = 8;
        this.bullySpeedAddMax = 0;
        this.bullyDeviationRotate = 0;
        this.bullyDeviation = 0;
        this.bullyRotate = 0;
        this.attackBullyNum = 1;
        this.bullySlideRate = 1;
        this.attackFunc = this.normalAttack;

        this.hpInit(1000);

        this.price = 10;

        this.levelUpArr = [];
        this.levelDownGetter = null;

        this.bodyColor = MyColor.arrTo([100, 100, 100, 1]);
        this.hpColor = MyColor.arrTo([2, 230, 13, 0.8]);
        this.bodyStrokeWidth = 1;
        this.bodyStrokeColor = MyColor.Transparent();
        this.hpBarHeight = 5;

        this.imgIndex = 0;
        this.audioSrcString = "/sound/发射音效/默认发射音效.mp3";

        this.towerLevel = 1;

        // Initialize vision properties
        this.visionType = VisionType.NONE;
        this.visionLevel = 0;
        this.radarAngle = 0;

        this._upIconOffset = null;
    }

    getTowerLevel(): number {
        return this.towerLevel;
    }

    goStep(): void {
        super.goStep();
        super.move();

        this.removeOutRangeBullet();
        for (let b of this.bullys) {
            b.goStep();
        }
        if (this.isDead()) {
            return;
        }
        this.attackFunc();

        // Radar rotation
        if (this.visionType === VisionType.RADAR && this.visionLevel > 0) {
            this.radarAngle += VISION_CONFIG.radar.sweepSpeed;
            if (this.radarAngle > Math.PI * 2) {
                this.radarAngle -= Math.PI * 2;
            }
        }
    }

    remove(): void {
        this.hpSet(0);
        // Clear all bullets launched by this tower
        for (const bullet of this.bullys) {
            bullet.remove();
        }
        this.bullys.clear();
        
        const index = this.world.batterys.indexOf(this);
        if (index > -1) {
            this.world.batterys.splice(index, 1);
        }
        if (this.world.territory) {
            this.world.territory.markDirty();
        }
        super.remove();
    }

    removeOutRangeBullet(): void {
        if (this.bullys.size === 0) {
            return;
        }
        for (let b of this.bullys) {
            if (b.outTowerViewRange()) {
                b.boom();
                b.split();
                this.bullys.delete(b);
                this.world.removeBully(b);
            }
        }
    }

    normalAttack(): void {
        if (this.liveTime % this.clock !== 0) {
            return;
        }

        let nearbyMonsters = this.world.getMonstersInRange(this.pos.x, this.pos.y, this.rangeR + 50);
        for (let m of nearbyMonsters) {
            // Check fog first (fast rejection), then check view range
            if (this.world.fog?.enabled && !this.world.fog.isPositionVisible(m.pos.x, m.pos.y)) {
                continue;
            }
            if (this.getViewCircle().impact(m.getBodyCircle())) {
                this.dirction = m.pos.sub(this.pos).to1();
                for (let i = 0; i < this.attackBullyNum; i++) {
                    this.fire();
                }
                if (typeof SoundManager !== 'undefined') {
                    SoundManager.play(this.audioSrcString);
                }
                break;
            }
        }
    }

    shrapnelAttack(): void {
        if (this.liveTime % this.clock !== 0) {
            return;
        }

        let nearbyMonsters = this.world.getMonstersInRange(this.pos.x, this.pos.y, this.rangeR + 50);
        for (let m of nearbyMonsters) {
            // Check fog first (fast rejection), then check view range
            if (this.world.fog?.enabled && !this.world.fog.isPositionVisible(m.pos.x, m.pos.y)) {
                continue;
            }
            if (this.getViewCircle().impact(m.getBodyCircle())) {
                let targetDir = m.pos.sub(this.pos).to1();
                for (let i = 0; i < this.attackBullyNum; i++) {
                    this.dirction = Vector.rotatePoint(Vector.zero(), targetDir,
                        2 * this.bullyRotate * (i / this.attackBullyNum));
                    this.dirction = Vector.rotatePoint(Vector.zero(), this.dirction,
                        -this.bullyRotate);
                    this.fire();
                }
                if (typeof SoundManager !== 'undefined') {
                    SoundManager.play(this.audioSrcString);
                }
                break;
            }
        }
    }

    getRunningBully(): BulletLike | undefined {
        if (!this.getmMainBullyFunc) {
            return undefined;
        }
        let res = this.getmMainBullyFunc();
        if (res === undefined) {
            console.log("??????? getmMainBullyFunc returned undefined");
            return undefined;
        }
        res.originalPos = new Vector(this.pos.x, this.pos.y);
        res.father = this;
        res.world = this.world;
        res.pos = new Vector(this.pos.x, this.pos.y).deviation(this.bullyDeviation);
        let bDir = this.dirction.mul(Math.random() * this.bullySpeedAddMax + this.bullySpeed);
        bDir = bDir.deviation(this.bullyDeviationRotate);
        res.speed = bDir;
        res.slideRate = this.bullySlideRate;
        res.damage = res.damage * this.getDamageMultiplier();
        return res;
    }

    fire(): void {
        let b = this.getRunningBully();
        if (b) {
            this.bullys.add(b);
            this.world.addBully(b);
        }
    }

    getImgStartPosByIndex(n: number): Vector {
        const IMG = getTowersImg();
        if (!IMG) {
            return new Vector(0, 0);
        }
        // 如果网格尺寸未初始化，则初始化（向后兼容）
        if (Tower._gridWidth === 0 || Tower._gridHeight === 0) {
            Tower.initGrid();
        }
        let x = n % Tower._gridWidth;
        let y = Math.floor(n / Tower._gridWidth);
        return new Vector(x * TOWER_IMG_PRE_WIDTH, y * TOWER_IMG_PRE_HEIGHT);
    }

    render(ctx: CanvasRenderingContext2D): void {
        if (this.isDead()) {
            return;
        }
        super.render(ctx);

        const TOWERS_IMG = getTowersImg();
        let imgStartPos = this.getImgStartPosByIndex(this.imgIndex);
        if (TOWERS_IMG) {
            ctx.drawImage(
                TOWERS_IMG,
                imgStartPos.x,
                imgStartPos.y,
                TOWER_IMG_PRE_WIDTH,
                TOWER_IMG_PRE_HEIGHT,
                this.pos.x - this.r,
                this.pos.y - this.r,
                this.r * 2,
                this.r * 2,
            );
        }
        if (!this.isDead() && this.selected) {
            this.getViewCircle().renderView(ctx);
        }
        for (let b of this.bullys) {
            b.render(ctx);
        }
        if (this.isUpLevelAble()) {
            if (!this._upIconOffset) {
                this._upIconOffset = new Vector(0, 0);
            }
            this._upIconOffset.x = this.pos.x + this.r * 0.2;
            this._upIconOffset.y = this.pos.y - this.r * 1.5 + Math.sin(this.liveTime / 5) * 5;
            if (typeof UP_LEVEL_ICON !== 'undefined') {
                ctx.drawImage(
                    UP_LEVEL_ICON,
                    0,
                    0,
                    100,
                    100,
                    this._upIconOffset.x,
                    this._upIconOffset.y,
                    20,
                    20
                );
            }
        }
    }

    getViewCircle(): Circle {
        return new Circle(this.pos.x, this.pos.y, this.getEffectiveRangeR());
    }

    getDamageMultiplier(): number {
        let multiplier = this.inValidTerritory ? 1 : (1 / 3);
        // Apply energy deficit penalty
        const energyRatio = this.world.energy.getSatisfactionRatio();
        return multiplier * energyRatio;
    }

    getEffectiveRangeR(): number {
        return this.inValidTerritory ? this.rangeR : this.rangeR * (2 / 3);
    }

    isUpLevelAble(): boolean {
        for (let towerName of this.levelUpArr) {
            const meta = TowerRegistry.getMeta(towerName);
            if (meta && this.world.user.money >= meta.basePrice) {
                return true;
            }
        }
        return false;
    }

    // Vision system methods
    getVisionRadius(): number {
        switch (this.visionType) {
            case VisionType.OBSERVER:
                return VISION_CONFIG.observer.radius[this.visionLevel] || VISION_CONFIG.basicTower;
            case VisionType.RADAR:
                if (VISION_CONFIG.radar.radius[this.visionLevel] !== undefined) {
                    return VISION_CONFIG.radar.radius[this.visionLevel];
                }
                const maxDefinedRadarLevel = Math.max(...Object.keys(VISION_CONFIG.radar.radius).map(Number));
                return VISION_CONFIG.radar.radius[maxDefinedRadarLevel] || VISION_CONFIG.basicTower;
            default:
                return VISION_CONFIG.basicTower;
        }
    }

    getVisionUpgradePrice(type: VisionType): number {
        const nextLevel = this.visionType === type ? this.visionLevel + 1 : 1;
        if (type === VisionType.OBSERVER) {
            return VISION_CONFIG.observer.price[nextLevel] || 0;
        } else if (type === VisionType.RADAR) {
            return VISION_CONFIG.radar.price[nextLevel] || 0;
        }
        return 0;
    }

    canUpgradeVision(type: VisionType): boolean {
        if (this.visionType !== VisionType.NONE && this.visionType !== type) {
            return false;  // Already has other type
        }
        const maxLevel = type === VisionType.OBSERVER ? 3 : 5;
        return this.visionLevel < maxLevel;
    }

    upgradeVision(type: VisionType): boolean {
        if (!this.canUpgradeVision(type)) return false;

        if (this.visionType === type) {
            this.visionLevel++;
        } else {
            this.visionType = type;
            this.visionLevel = 1;
        }
        this.world.fog?.markDirty();
        return true;
    }

    /**
     * Get total cost spent on vision upgrades (for sell refund)
     */
    getVisionUpgradeTotalCost(): number {
        if (this.visionType === VisionType.NONE || this.visionLevel === 0) {
            return 0;
        }
        const config = this.visionType === VisionType.OBSERVER
            ? VISION_CONFIG.observer
            : VISION_CONFIG.radar;

        let total = 0;
        for (let i = 1; i <= this.visionLevel; i++) {
            total += config.price[i] || 0;
        }
        return total;
    }

    /**
     * Get total refund when selling (basePrice/2 + visionUpgrade/2)
     */
    getSellRefund(): number {
        return Math.floor(this.price / 2) + Math.floor(this.getVisionUpgradeTotalCost() / 2);
    }
}

// Register class type for save system
TowerRegistry.registerClassType('Tower', () => Tower);
