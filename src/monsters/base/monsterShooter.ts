/**
 * MonsterShooter - Shooter monster class
 * by littlefean
 */
import { Vector } from '../../core/math/vector';
import { Circle } from '../../core/math/circle';
import { Monster } from './monster';
import { MonsterRegistry } from '../monsterRegistry';
import { renderMonsterShooter } from '../rendering/monsterRenderer';
import { scaleSpeed, scalePeriod } from '../../core/speedScale';
import type {
    VectorLike,
    CircleLike as BaseCircleLike,
    BuildingLike as BaseBuildingLike,
    UserLike,
    RootBuildingLike,
} from '@/types/worldLike';

// Declare globals for non-migrated modules
declare const BullyFinally: { S: () => BulletLike } | undefined;

// Extended CircleLike with impact method
interface CircleLike extends BaseCircleLike {
    impact(other: BaseCircleLike): boolean;
}

// Shooter-specific bullet interface
interface BulletLike {
    targetTower: boolean;
    father: MonsterShooter;
    originalPos: Vector;
    world: WorldLike;
    pos: Vector;
    speed: Vector;
    slideRate: number;
    ownerId: string | null;
    goStep(): void;
    render(ctx: CanvasRenderingContext2D): void;
    remove(): void;
    // Two-phase update methods
    move(): void;
    rChange(): void;
    getTarget(): void;
    collide(world: WorldLike): void;
    split(): void;
    outTowerViewRange(): boolean;
}

// Extended BuildingLike for shooter targeting
interface BuildingLike extends BaseBuildingLike {
    getBodyCircle(): CircleLike;
}

// WorldLike interface for MonsterShooter
interface WorldLike {
    width: number;
    height: number;
    monsters: Set<Monster>;
    allBullys: Iterable<unknown>;
    getBaseBuilding(): RootBuildingLike & { pos: Vector };
    user: UserLike;
    getMonstersInRange(x: number, y: number, range: number): Monster[];
    getBullysInRange(x: number, y: number, range: number): unknown[];
    getBuildingsInRange(x: number, y: number, range: number): BuildingLike[];
    getAllBuildingArr(): BuildingLike[];
    addMonster(monster: Monster): void;
    addEffect(effect: unknown): void;
}

export class MonsterShooter extends Monster {
    rangeR: number;
    dirction: Vector;
    getmMainBullyFunc: (() => BulletLike) | null;
    bullySpeed: number;
    clock: number;
    attackBullyNum: number;
    bullyDeviationRotate: number;
    bullySpeedAddMax: number;
    bullyDeviation: number;
    bullySlideRate: number;
    bullys: Set<BulletLike>;
    target: BuildingLike | null;

    constructor(pos: Vector, world: any) {
        super(pos, world);
        this.gameType = "Monster";
        this.name = "射手怪物";

        this.rangeR = 100;
        this.dirction = new Vector(1, 2).to1();

        this.getmMainBullyFunc = typeof BullyFinally !== 'undefined' ? BullyFinally.S : null;
        this.bullySpeed = scaleSpeed(8);
        this.clock = scalePeriod(30);
        this.attackBullyNum = 1;
        this.bullyDeviationRotate = 0;
        this.bullySpeedAddMax = 0;
        this.bullyDeviation = 0;
        this.bullySlideRate = 1;
        this.bullys = new Set();
        this.target = null;
    }

    goStep(): void {
        // Backward compatibility: if called directly, execute full update
        this.getTarget();
        super.goStep();
        this.attackAction();

        for (const bully of this.bullys) {
            bully.goStep();
        }
    }

    /**
     * Phase 1: Movement only (called by EntityManager)
     */
    moveOnly(): void {
        this.getTarget();
        super.moveOnly();

        // Bullet movement (following Tower.goStepMove pattern)
        for (const b of this.bullys) {
            b.move();
            b.rChange();
            b.getTarget();
        }
    }

    /**
     * Phase 2: Collision only (called by EntityManager)
     */
    clashOnly(): void {
        super.clashOnly();
        this.attackAction();

        // Remove out-of-range bullets first
        this.removeOutRangeBullys();

        // Bullet collision (following Tower.goStepCollide pattern)
        for (const b of this.bullys) {
            b.collide(this.world);
            b.split();
        }
    }

    /**
     * Remove bullets that are out of range
     */
    private removeOutRangeBullys(): void {
        for (const b of this.bullys) {
            if (b.outTowerViewRange()) {
                b.remove();
                this.bullys.delete(b);
            }
        }
    }

    move(): void {
        if (this.haveTarget()) {
            // Stay still when attacking
        } else {
            super.move();
        }
    }

    haveTarget(): boolean {
        return !(this.target === null || this.target === undefined || this.target.isDead());
    }

    getTarget(): void {
        // First, check if current target is still valid (alive and in range)
        if (this.target !== null) {
            if (this.target.isDead()) {
                this.target = null;
            } else {
                const tc = this.target.getBodyCircle();
                const viewCircle = this.getViewCircle();
                if (!Circle.collides(viewCircle.x, viewCircle.y, viewCircle.r, tc.x, tc.y, tc.r)) {
                    this.target = null;
                }
            }
        }

        // If no valid target, search for a new one
        if (this.target === null) {
            const nearbyBuildings = this.world.getBuildingsInRange(this.pos.x, this.pos.y, this.rangeR);
            const viewCircle = this.getViewCircle();
            for (const building of nearbyBuildings) {
                const bc = building.getBodyCircle();
                if (Circle.collides(viewCircle.x, viewCircle.y, viewCircle.r, bc.x, bc.y, bc.r)) {
                    this.target = building;
                    return;
                }
            }
        }
    }

    attackAction(): void {
        if (this.liveTime % this.clock !== 0) {
            return;
        }
        if (this.haveTarget() && this.target) {
            this.dirction = (this.target.pos as Vector).sub(this.pos).to1();
            for (let i = 0; i < this.attackBullyNum; i++) {
                this.fire();
            }
        }
    }

    fire(): void {
        let b = this.getRunningBully();
        if (b) {
            this.bullys.add(b);
        }
    }

    getRunningBully(): BulletLike | null {
        if (!this.getmMainBullyFunc) return null;

        let res = this.getmMainBullyFunc();
        if (res === undefined) {
            console.log("??????? possible missing return in finalBully");
            return null;
        }
        res.targetTower = true;
        res.father = this;
        res.originalPos = new Vector(this.pos.x, this.pos.y);
        res.world = this.world;
        res.pos = new Vector(this.pos.x, this.pos.y).deviation(this.bullyDeviation);
        res.ownerId = this.ownerId;
        let bDir = this.dirction.mul(Math.random() * this.bullySpeedAddMax + this.bullySpeed);
        bDir = bDir.deviation(this.bullyDeviationRotate);
        res.speed = bDir;
        res.slideRate = this.bullySlideRate;
        return res;
    }

    render(ctx: CanvasRenderingContext2D): void {
        renderMonsterShooter(this as any, ctx);
    }

    getViewCircle(): Circle {
        return new Circle(this.pos.x, this.pos.y, this.rangeR);
    }

    remove(): void {
        for (const b of this.bullys) {
            b.remove();
        }
        this.bullys.clear();
        super.remove();
    }
}

// Register class type for save system
MonsterRegistry.registerClassType('MonsterShooter', () => MonsterShooter);
