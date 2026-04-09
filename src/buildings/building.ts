/**
 * Building - Base class for all buildings
 *
 * by littlefean
 */
import { Vector } from '../core/math/vector';
import { Circle } from '../core/math/circle';
import { MyColor } from '../entities/myColor';
import { CircleObject, CircleObjectWorldLike } from '../entities/base/circleObject';
import { EffectCircle } from '../effects/effectCircle';
import { BuildingRegistry } from './buildingRegistry';
import { renderBuilding, renderBuildingStatic, renderBuildingDynamic } from './rendering/buildingRenderer';
import { scalePeriod } from '../core/speedScale';
import { renderStatusBar, BAR_OFFSET } from '../entities/statusBar';

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

export interface BuildingWorldLike extends CircleObjectWorldLike {
    territory?: TerritoryLike;
    buildings: Set<Building>;
    batterys: TowerLike[];
    addEffect(effect: unknown): void;
    addMoneyToOwner(ownerId: string | null, amount: number): void;
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

    declare world: BuildingWorldLike;

    constructor(pos: Vector, world: any) {
        super(pos, world);
        this.gameType = "Building";
        this.name = "Default Building";
        this.price = 10;
        this.hpInit(1000);
        this.hpColor = MyColor.arrTo([2, 230, 13, 0.8]);
        this.hpBarHeight = 7;

        // Production properties
        this.moneyAddedAble = false;
        this.moneyAddedNum = 0;  // Money added per tick
        this.moneyAddedFreezeTime = scalePeriod(100);  // Ticks between money additions

        // Self-healing properties
        this.hpAddNum = 0;
        this.hpAddNumFreezeTime = scalePeriod(100);

        // Affects nearby buildings
        this.otherHpAddAble = false;
        this.otherHpAddRadius = 100;
        this._otherHpAddRadiusSq = 10000;  // 100²
        this.otherHpAddNum = 0;
        this.otherHpAddFreezeTime = scalePeriod(100);

        this.levelUpArr = [];

        this._hpAddRangeCircle = null;
    }

    hpChange(dh: number): void {
        super.hpChange(dh);
        // Note: No need to mark static layer dirty since HP bars are now rendered dynamically
    }

    hpSet(hp: number): void {
        super.hpSet(hp);
        // Note: No need to mark static layer dirty since HP bars are now rendered dynamically
    }

    goStep(): void {
        super.goStep();
        // Add money (gold mines cannot produce in invalid territory)
        if (this.moneyAddedAble && this.inValidTerritory) {
            if (this.liveTime % this.moneyAddedFreezeTime === 0) {
                // Gold production: dispatch to building owner (multiplayer compatible)
                this.world.addMoneyToOwner(this.ownerId, this.moneyAddedNum);
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
            }
        }
    }

    remove(): void {
        this.hpSet(0);
        // Use incremental update instead of markDirty
        if (this.world.territory) {
            this.world.territory.removeBuildingIncremental(this);
        }
        super.remove();
    }

    render(ctx: CanvasRenderingContext2D): void {
        renderBuilding(this, ctx);
    }

    /**
     * Render static parts (body, healing range) - can be cached to static layer
     */
    renderStatic(ctx: CanvasRenderingContext2D): void {
        renderBuildingStatic(this, ctx);
    }

    /**
     * Render dynamic parts (HP bar) - must be rendered every frame
     */
    renderDynamic(ctx: CanvasRenderingContext2D): void {
        renderBuildingDynamic(this, ctx);
    }
}

// Register class type for save system
BuildingRegistry.registerClassType('Building', () => Building);
