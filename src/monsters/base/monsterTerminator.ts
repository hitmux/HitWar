/**
 * MonsterTerminator - Terminator-like monster
 * by littlefean
 */
import { Vector } from '../../core/math/vector';
import { Line } from '../../core/math/line';
import { Circle } from '../../core/math/circle';
import { MyColor } from '../../entities/myColor';
import { Monster } from './monster';
import { MonsterRegistry } from '../monsterRegistry';

interface CircleLike {
    x: number;
    y: number;
    r: number;
    impact(other: CircleLike): boolean;
}

interface BuildingLike {
    pos: Vector;
    getBodyCircle(): CircleLike;
    hpChange(delta: number): void;
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

interface ScarLine extends Line {
    isPlay?: boolean;
}

export class MonsterTerminator extends Monster {
    meeleAttacking: boolean;
    scar: Set<ScarLine>;

    constructor(pos: Vector, world: any) {
        super(pos, world);
        this.speedNumb = 0.3;
        this.meeleAttacking = false;
        this.scar = new Set();
    }

    hpChange(dh: number): void {
        let damage = -dh;
        if (damage < 10) {
            return;
        }
        if (damage < 100) {
            super.hpChange(-1);
        } else if (damage < 300) {
            super.hpChange(-5);
        } else if (damage < 500) {
            super.hpChange(-100);
        } else if (damage < 1500) {
            super.hpChange(-300);
        } else if (damage < 3000) {
            super.hpChange(-500);
        } else {
            super.hpChange(damage * 0.75);
        }
    }

    addScar(): void {
        let lc = new Line(
            this.pos.plus(Vector.randCircle().mul(Math.random() * this.r)),
            this.pos.plus(Vector.randCircle().mul(Math.random() * this.r))
        ) as ScarLine;
        lc.strokeColor = new MyColor(0, 0, 0, 0.2);
        lc.strokeWidth = 0.5;
        this.scar.add(lc);
    }

    goStep(): void {
        super.goStep();
        for (let s of this.scar) {
            if (!s.isPlay) {
                this.scar.delete(s);
            }
        }
    }

    clash(): void {
        this.meeleAttacking = false;
        const nearbyBuildings = this.world.getBuildingsInRange(this.pos.x, this.pos.y, this.r + 50);
        const myCircle = this.getBodyCircle();
        for (let b of nearbyBuildings) {
            const bc = b.getBodyCircle();
            if (Circle.collides(myCircle.x, myCircle.y, myCircle.r, bc.x, bc.y, bc.r)) {
                this.bombSelf();
                this.meeleAttacking = true;
                b.hpChange(-this.colishDamage);
            }
        }
    }

    move(): void {
        if (this.meeleAttacking) {
            return;
        }
        super.move();
    }

    render(ctx: CanvasRenderingContext2D): void {
        super.render(ctx);
        for (let s of this.scar) {
            s.render(ctx);
        }
    }
}

// Register class type for save system
MonsterRegistry.registerClassType('MonsterTerminator', () => MonsterTerminator);
