/**
 * Building - Base class for all buildings
 *
 * by littlefean
 */
import { Vector } from '../core/math/vector';
import { Circle } from '../core/math/circle';
import { MyColor } from '../entities/myColor';
import { CircleObject } from '../entities/base/circleObject';
import { EffectCircle } from '../effects/effectCircle';
import { BuildingRegistry } from './buildingRegistry';

interface TerritoryLike {
    markDirty(): void;
    addBuildingIncremental(building: unknown): void;
    removeBuildingIncremental(building: unknown): void;
}

interface UserLike {
    money: number;
}

interface BuildingLike {
    pos: Vector;
    hpChange(delta: number): void;
    dis?(other: Vector): number;
}

interface TowerLike {
    pos: Vector;
    hpChange(delta: number): void;
}

interface WorldLike {
    width: number;
    height: number;
    user: UserLike;
    territory?: TerritoryLike;
    buildings: Set<Building>;
    batterys: TowerLike[];
    addEffect(effect: unknown): void;
}

type LevelUpFunc = () => Building;

/**
 * Building base class - extends CircleObject
 */
export class Building extends CircleObject {
    gameType: string;
    name: string;
    price: number;

    // Production properties
    moneyAddedAble: boolean;
    moneyAddedNum: number;
    moneyAddedFreezeTime: number;

    // Self-healing properties
    hpAddNum: number;
    hpAddNumFreezeTime: number;

    // Affects nearby buildings
    otherHpAddAble: boolean;
    otherHpAddRadius: number;
    private _otherHpAddRadiusSq: number;  // otherHpAddRadius² (cached)
    otherHpAddNum: number;
    otherHpAddFreezeTime: number;

    levelUpArr: LevelUpFunc[];

    // Cached render circle
    protected _hpAddRangeCircle: Circle | null;

    declare world: WorldLike;

    constructor(pos: Vector, world: any) {
        super(pos, world);
        this.gameType = "Building";
        this.name = "Default Building";
        this.price = 10;
        this.hpInit(1000);
        this.hpColor = MyColor.arrTo([2, 200, 50, 0.8]);

        // Production properties
        this.moneyAddedAble = false;
        this.moneyAddedNum = 0;  // Money added per tick
        this.moneyAddedFreezeTime = 100;  // Ticks between money additions

        // Self-healing properties
        this.hpAddNum = 0;
        this.hpAddNumFreezeTime = 100;

        // Affects nearby buildings
        this.otherHpAddAble = false;
        this.otherHpAddRadius = 100;
        this._otherHpAddRadiusSq = 10000;  // 100²
        this.otherHpAddNum = 0;
        this.otherHpAddFreezeTime = 100;

        this.levelUpArr = [];

        this._hpAddRangeCircle = null;
    }

    hpChange(dh: number): void {
        const prev = this.hp;
        super.hpChange(dh);
        if (this.hp !== prev) {
            const worldAny = this.world as any;
            if (worldAny && typeof worldAny.markStaticLayerDirty === "function") {
                worldAny.markStaticLayerDirty();
            }
        }
    }

    hpSet(hp: number): void {
        const prev = this.hp;
        super.hpSet(hp);
        if (this.hp !== prev) {
            const worldAny = this.world as any;
            if (worldAny && typeof worldAny.markStaticLayerDirty === "function") {
                worldAny.markStaticLayerDirty();
            }
        }
    }

    goStep(): void {
        super.goStep();
        // Add money (gold mines cannot produce in invalid territory)
        if (this.moneyAddedAble && this.inValidTerritory) {
            if (this.liveTime % this.moneyAddedFreezeTime === 0) {
                this.world.user.money += this.moneyAddedNum;
                // Add collection effect
                const e = EffectCircle.acquire(this.pos);
                e.circle.r = this.r;
                e.animationFunc = e.energeticAnimation;
                e.duration = Math.floor(this.moneyAddedFreezeTime / 2);
                this.world.addEffect(e);
            }
        }
        // Self-healing
        if (this.liveTime % this.hpAddNumFreezeTime === 0) {
            this.hpChange(this.hpAddNum);
        }
        // Heal nearby buildings (healing reduced by half in invalid territory)
        if (this.otherHpAddAble) {
            if (this.liveTime % this.otherHpAddFreezeTime === 0) {
                // Healing reduced by half in invalid territory
                const healAmount = this.inValidTerritory ? this.otherHpAddNum : Math.floor(this.otherHpAddNum / 2);
                const radiusSq = this._otherHpAddRadiusSq;
                // Heal nearby buildings and towers
                for (const b of this.world.buildings) {
                    if (b !== this) {
                        if (b.pos.disSq(this.pos) <= radiusSq) {
                            b.hpChange(healAmount);
                        }
                    }
                }
                for (const b of this.world.batterys) {
                    if (b.pos.disSq(this.pos) <= radiusSq) {
                        b.hpChange(healAmount);
                    }
                }
                // Heal effect
                const e = EffectCircle.acquire(this.pos);
                e.animationFunc = e.flashGreenAnimation;
                e.duration = this.otherHpAddFreezeTime;
                e.circle.r = this.otherHpAddRadius;
                this.world.addEffect(e);
            }
        }
    }

    remove(): void {
        this.hpSet(0);
        // Use incremental update instead of markDirty
        if (this.world.territory) {
            this.world.territory.removeBuildingIncremental(this as any);
        }
        super.remove();
    }

    render(ctx: CanvasRenderingContext2D): void {
        super.render(ctx);
        // Draw healing range circle (cache Circle object)
        if (this.otherHpAddAble) {
            if (!this._hpAddRangeCircle) {
                this._hpAddRangeCircle = new Circle(this.pos.x, this.pos.y, this.otherHpAddRadius);
                this._hpAddRangeCircle.fillColor.setRGBA(0, 0, 0, 0);
                this._hpAddRangeCircle.strokeColor.setRGBA(81, 139, 60, 1);
                this._hpAddRangeCircle.setStrokeWidth(0.5);
            } else {
                // Update position (buildings don't move, but just in case)
                this._hpAddRangeCircle.x = this.pos.x;
                this._hpAddRangeCircle.y = this.pos.y;
            }
            this._hpAddRangeCircle.render(ctx);
        }
    }
}

// Register class type for save system
BuildingRegistry.registerClassType('Building', () => Building);
