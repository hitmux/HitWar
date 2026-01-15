/**
 * TowerBoomerang - Boomerang attack tower
 *
 * Uses a rotating bar that extends and retracts toward enemies.
 */
import { Vector } from '../../core/math/vector';
import { Line } from '../../core/math/line';
import { Circle } from '../../core/math/circle';
import { MyColor } from '../../entities/myColor';
import { Tower } from './tower';
import { TowerRegistry } from '../towerRegistry';
import { scaleSpeed, scalePeriod } from '../../core/speedScale';

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

interface MonsterLike {
    pos: Vector;
    getBodyCircle(): CircleLike;
    hpChange(delta: number): void;
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
}

export class TowerBoomerang extends Tower {
    damage: number;
    barLen: number;
    barDis: number;
    barWidth: number;
    barRotateSelfSpeed: number;
    barDirect: Vector;
    bar: Line;

    constructor(x: number, y: number, world: any) {
        super(x, y, world);
        this.name = "回旋镖";
        this.clock = 1.1;

        this.damage = 1000;

        this.rangeR = 200;
        this.barLen = 20;
        this.barDis = this.rangeR;
        this.barWidth = 10;
        this.barRotateSelfSpeed = scaleSpeed(0.5);

        this.barDirect = Vector.randCircle();
        this.bar = this.initBar();
    }

    initBar(): Line {
        let barCenterLoc = this.pos.plus(Vector.randCircle().mul(this.barDis));
        let p1 = barCenterLoc.plus(this.barDirect.mul(this.barLen));
        let p2 = barCenterLoc.sub(this.barDirect.mul(this.barLen));

        let barLine = new Line(p1, p2);
        barLine.strokeColor = new MyColor(255, 124, 36, 0.8);
        barLine.strokeWidth = this.barWidth;
        return barLine;
    }

    barGo(): void {
        this.barDis = (Math.sin(this.liveTime / scalePeriod(10)) + 1) * this.rangeR;
        let barCenterLoc = this.pos.plus(this.dirction.mul(this.barDis));
        this.bar.moveTo(barCenterLoc);
    }

    barRotate(): void {
        let center = this.bar.getCenter();
        let a = this.barRotateSelfSpeed;
        let p1 = Vector.rotatePoint(center, this.bar.PosStart, a);
        let p2 = Vector.rotatePoint(center, this.bar.PosEnd, a);
        this.bar.resetLine(p1, p2);
    }

    getTarget(): void {
        const target = this.findFirstTarget();
        if (target) {
            this.dirction = target.pos.sub(this.pos).to1();
        }
    }

    barGoStep(): void {
        let barCenter = this.bar.PosStart.plus(this.bar.PosEnd).mul(0.5);
        // Use squared distance for length calculation (approximate for range query)
        let dx = this.bar.PosEnd.x - this.bar.PosStart.x;
        let dy = this.bar.PosEnd.y - this.bar.PosStart.y;
        let barLen = Math.sqrt(dx * dx + dy * dy);
        let nearbyMonsters = this.world.getMonstersInRange(barCenter.x, barCenter.y, barLen);
        let actualDamage = this.damage * this.getDamageMultiplier();
        for (let m of nearbyMonsters) {
            // Check fog first, using circle visibility for edge detection
            const mc = m.getBodyCircle();
            if (this.world.fog?.enabled && !this.world.fog.isCircleVisible(mc.x, mc.y, mc.r)) {
                continue;
            }
            if (this.bar.intersectWithCircle(mc as any)) {
                m.hpChange(-actualDamage);
            }
        }
        this.barGo();
        this.barRotate();
    }

    goStep(): void {
        // 保持向后兼容：执行完整的更新逻辑
        this.goStepMove();
        this.goStepCollide();
    }

    /**
     * 移动阶段：处理旋转镖的移动和旋转
     */
    goStepMove(): void {
        super.goStepMove();
        this.barGo();
        this.barRotate();
    }

    /**
     * 碰撞阶段：处理旋转镖的碰撞检测
     */
    goStepCollide(): void {
        super.goStepCollide();
        this.getTarget();
        // 旋转镖碰撞检测
        let barCenter = this.bar.PosStart.plus(this.bar.PosEnd).mul(0.5);
        let dx = this.bar.PosEnd.x - this.bar.PosStart.x;
        let dy = this.bar.PosEnd.y - this.bar.PosStart.y;
        let barLen = Math.sqrt(dx * dx + dy * dy);
        let nearbyMonsters = this.world.getMonstersInRange(barCenter.x, barCenter.y, barLen);
        let actualDamage = this.damage * this.getDamageMultiplier();
        for (let m of nearbyMonsters) {
            const mc = m.getBodyCircle();
            if (this.world.fog?.enabled && !this.world.fog.isCircleVisible(mc.x, mc.y, mc.r)) {
                continue;
            }
            if (this.bar.intersectWithCircle(mc as any)) {
                m.hpChange(-actualDamage);
            }
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
        this.bar.render(ctx);
        super.renderBody(ctx);
        let line = new Line(this.pos, this.bar.getCenter());
        line.strokeWidth = 0.1;
        line.strokeColor = this.bar.strokeColor;
        line.render(ctx);
    }
}

// Register class type for save system
TowerRegistry.registerClassType('TowerBoomerang', () => TowerBoomerang);
