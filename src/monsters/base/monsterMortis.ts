/**
 * MonsterMortis - Mortis-like monster (like Brawl Stars)
 * by littlefean
 */
import { Vector } from '../../core/math/vector';
import { Circle } from '../../core/math/circle';
import { MyColor } from '../../entities/myColor';
import { Monster } from './monster';
import { MonsterRegistry } from '../monsterRegistry';

// Declare globals for non-migrated modules
declare const EffectCircle: {
    acquire(pos: VectorLike): EffectCircleLike;
} | undefined;

interface VectorLike {
    x: number;
    y: number;
    copy(): VectorLike;
}

interface CircleLike {
    x: number;
    y: number;
    r: number;
    impact(other: CircleLike): boolean;
    pointIn?(x: number, y: number): boolean;
}

interface EffectCircleLike {
    circle: { r: number };
    animationFunc: () => void;
    flashAnimation: () => void;
    initCircleStyle(fillColor: MyColor, strokeColor: MyColor, strokeWidth: number): void;
}

interface BuildingLike {
    pos: VectorLike;
    getBodyCircle(): CircleLike;
    hpChange(delta: number): void;
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

export class MonsterMortis extends Monster {
    viewRadius: number;
    bumpV: number;
    bumpDis: number;
    bumpEndPoint: Vector | null;
    target: BuildingLike | null;
    bumpSpeedVector: Vector;
    bumpDamage: number;

    constructor(pos: Vector, world: any) {
        super(pos, world);

        this.throwAble = true;

        this.viewRadius = 100;
        this.bumpV = 12;
        this.bumpDis = 50;
        this.bumpEndPoint = null;
        this.target = null;
        this.bumpSpeedVector = Vector.zero();
        this.bumpDamage = 5;
        this.bodyColor = new MyColor(46, 5, 39, 1);
        this.bodyStrokeColor = new MyColor(218, 60, 251, 1);
        this.bodyStrokeWidth = 3;
    }

    setEndPoint(): void {
        if (!this.target) return;
        let dv = (this.target.pos as Vector).sub(this.pos).to1();
        this.bumpEndPoint = (this.target.pos as Vector).plus(dv.mul(this.bumpDis));
        this.bumpSpeedVector = (this.target.pos as Vector).sub(this.pos).to1().mul(this.bumpV);
    }

    bump(): void {
        if (this.haveTarget()) {
            if (this.bumpEndPoint === null) {
                this.setEndPoint();
            }
            if (this.bumpEndPoint && new Circle(this.bumpEndPoint.x, this.bumpEndPoint.y, 12).pointIn(this.pos.x, this.pos.y)) {
                if (this.haveTarget()) {
                    this.setEndPoint();
                } else {
                    this.bumpEndPoint = null;
                    this.bumpSpeedVector = Vector.zero();
                }
            } else {
                if (typeof EffectCircle !== 'undefined' && EffectCircle.acquire) {
                    let ec = EffectCircle.acquire(this.pos.copy());
                    ec.circle.r = this.r;
                    ec.initCircleStyle(this.bodyColor, this.bodyStrokeColor, 0);
                    ec.animationFunc = ec.flashAnimation;
                    this.world.addEffect(ec);
                }
                this.pos.add(this.bumpSpeedVector);
            }
        } else {
            this.bumpEndPoint = null;
        }
    }

    haveTarget(): boolean {
        return !(this.target === null || this.target === undefined || this.target.isDead());
    }

    refreshTarget(): void {
        const nearbyBuildings = this.world.getBuildingsInRange(this.pos.x, this.pos.y, this.viewRadius);
        for (let building of nearbyBuildings) {
            if (building.getBodyCircle().impact(new Circle(this.pos.x, this.pos.y, this.viewRadius) as any)) {
                this.target = building;
                return;
            }
        }
    }

    goStep(): void {
        this.refreshTarget();
        this.bump();
        super.goStep();
    }

    clash(): void {
        const nearbyBuildings = this.world.getBuildingsInRange(this.pos.x, this.pos.y, this.r + 50);
        const myCircle = this.getBodyCircle();
        for (let b of nearbyBuildings) {
            const bc = b.getBodyCircle();
            if (Circle.collides(myCircle.x, myCircle.y, myCircle.r, bc.x, bc.y, bc.r)) {
                this.bombSelf();
                b.hpChange(-this.bumpDamage);
                if (!this.throwAble) {
                    this.remove();
                    break;
                }
            }
        }
    }

    move(): void {
        if (!this.haveTarget()) {
            super.move();
        }
    }

    render(ctx: CanvasRenderingContext2D): void {
        super.render(ctx);
        new Circle(this.pos.x, this.pos.y, this.viewRadius).renderView(ctx);
    }
}

// Register class type for save system
MonsterRegistry.registerClassType('MonsterMortis', () => MonsterMortis);
