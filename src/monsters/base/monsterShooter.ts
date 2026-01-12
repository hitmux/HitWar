/**
 * MonsterShooter - Shooter monster class
 * by littlefean
 */
import { Vector } from '../../core/math/vector';
import { Circle } from '../../core/math/circle';
import { Monster } from './monster';
import { MonsterRegistry } from '../monsterRegistry';
import { scaleSpeed, scalePeriod } from '../../core/speedScale';

// Declare globals for non-migrated modules
declare const BullyFinally: { S: () => BulletLike } | undefined;

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

interface BulletLike {
    targetTower: boolean;
    father: MonsterShooter;
    originalPos: Vector;
    world: WorldLike;
    pos: Vector;
    speed: Vector;
    slideRate: number;
    goStep(): void;
    render(ctx: CanvasRenderingContext2D): void;
    remove(): void;
}

interface BuildingLike {
    pos: VectorLike;
    getBodyCircle(): CircleLike;
    isDead(): boolean;
}

interface WorldLike {
    width: number;
    height: number;
    monsters: Set<Monster>;
    allBullys: Iterable<unknown>;
    rootBuilding: { pos: Vector };
    user: { money: number };
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
        this.clock = scalePeriod(5);
        this.attackBullyNum = 1;
        this.bullyDeviationRotate = 0;
        this.bullySpeedAddMax = 0;
        this.bullyDeviation = 0;
        this.bullySlideRate = 1;
        this.bullys = new Set();
        this.target = null;
    }

    goStep(): void {
        this.getTarget();
        super.goStep();
        this.attackAction();

        for (let bully of this.bullys) {
            bully.goStep();
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
        const nearbyBuildings = this.world.getBuildingsInRange(this.pos.x, this.pos.y, this.rangeR);
        const viewCircle = this.getViewCircle();
        for (let building of nearbyBuildings) {
            const bc = building.getBodyCircle();
            if (Circle.collides(viewCircle.x, viewCircle.y, viewCircle.r, bc.x, bc.y, bc.r)) {
                this.target = building;
                return;
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
        let bDir = this.dirction.mul(Math.random() * this.bullySpeedAddMax + this.bullySpeed);
        bDir = bDir.deviation(this.bullyDeviationRotate);
        res.speed = bDir;
        res.slideRate = this.bullySlideRate;
        return res;
    }

    render(ctx: CanvasRenderingContext2D): void {
        super.render(ctx);
        new Circle(this.pos.x, this.pos.y, this.rangeR).renderView(ctx);
        for (let b of this.bullys) {
            b.render(ctx);
        }
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
