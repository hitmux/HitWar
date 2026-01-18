/**
 * TowerHammer - Rotating hammer tower
 *
 * Uses a rotating weapon attachment that damages enemies on contact.
 */
import { Vector } from '../../core/math/vector';
import { Line } from '../../core/math/line';
import { Circle } from '../../core/math/circle';
import { MyColor } from '../../entities/myColor';
import { CircleObject } from '../../entities/base/circleObject';
import { Tower } from './tower';
import { TowerRegistry } from '../towerRegistry';
import { scalePeriod } from '../../core/speedScale';

interface VectorLike {
    x: number;
    y: number;
    dis(other: VectorLike): number;
}

interface CircleLike {
    x: number;
    y: number;
    r: number;
    impact(other: CircleLike): boolean;
}

interface MonsterLike {
    pos: VectorLike;
    getBodyCircle(): CircleLike;
    hpChange(delta: number): void;
}

interface WorldLike {
    width: number;
    height: number;
    batterys: Tower[];
    territory?: { markDirty(): void };
    user: { money: number };
    getMonstersInRange(x: number, y: number, range: number): MonsterLike[];
    addBully(bully: unknown): void;
    removeBully(bully: unknown): void;
}

// 碰撞冷却帧数（约0.5秒 @ 60fps，考虑速度缩放）
const HIT_COOLDOWN_FRAMES = 30;

export class TowerHammer extends Tower {
    itemRange: number;
    itemRidus: number;
    itemDamage: number;
    itemSpeed: number;
    additionItem: CircleObject;
    // 记录每个怪物的最后受击帧，用于冷却判定
    private hitCooldown: WeakMap<object, number> = new WeakMap();

    constructor(x: number, y: number, world: any) {
        super(x, y, world);
        this.name = "附属物品塔楼";
        this.clock = 1.1;

        this.itemRange = this.rangeR;
        this.itemRidus = 20;
        this.itemDamage = 1000;
        this.itemSpeed = scalePeriod(10);
        this.additionItem = this.initAdditionItem();
    }

    initAdditionItem(): CircleObject {
        let loc = this.pos.plus(Vector.randCircle().mul(this.itemRange));
        let c = new CircleObject(loc, this.world as any);
        c.r = this.itemRidus;

        c.hpInit(-1);

        c.bodyColor = new MyColor(60, 63, 65, 1);
        c.bodyStrokeColor = new MyColor(31, 31, 31, 0);
        return c;
    }

    itemGoStep(): void {
        let a = this.itemSpeed;
        let loc = new Vector(Math.sin(this.liveTime / a), Math.cos(this.liveTime / a)).mul(this.itemRange);
        this.additionItem.pos = this.pos.plus(loc);

        let itemPos = this.additionItem.pos;
        let itemR = this.additionItem.r;
        let nearbyMonsters = this.world.getMonstersInRange(itemPos.x, itemPos.y, itemR + 50);
        let itemCircle = this.additionItem.getBodyCircle();
        let actualDamage = this.itemDamage * this.getDamageMultiplier();
        for (let m of nearbyMonsters) {
            // Check fog first, using circle visibility for edge detection
            const mc = m.getBodyCircle();
            if (this.world.fog?.enabled && !this.world.fog.isCircleVisible(mc.x, mc.y, mc.r)) {
                continue;
            }
            if (Circle.collides(itemCircle.x, itemCircle.y, itemCircle.r, mc.x, mc.y, mc.r)) {
                m.hpChange(-actualDamage);
            }
        }
    }

    toTarget(): void {
        let effectiveRange = this.getEffectiveRangeR();
        let effectiveRangeSq = effectiveRange * effectiveRange;
        let nearbyMonsters = this.world.getMonstersInRange(this.pos.x, this.pos.y, effectiveRange);
        for (let m of nearbyMonsters) {
            // Check fog first, using circle visibility for edge detection
            const mc = m.getBodyCircle();
            if (this.world.fog?.enabled && !this.world.fog.isCircleVisible(mc.x, mc.y, mc.r)) {
                continue;
            }
            let distanceSq = m.pos.disSq(this.pos);
            if (distanceSq < effectiveRangeSq) {
                this.itemRange = Math.sqrt(distanceSq);
                break;
            }
        }
    }

    itemRender(ctx: CanvasRenderingContext2D): void {
        this.additionItem.render(ctx);
        let line = new Line(this.pos, this.additionItem.pos);
        line.strokeWidth = 10;
        line.strokeColor = this.additionItem.bodyColor;
        line.render(ctx);
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
        this.itemRender(ctx);
    }

    goStep(): void {
        // 保持向后兼容：执行完整的更新逻辑
        this.goStepMove();
        this.goStepCollide();
    }

    /**
     * 移动阶段：处理锤子物品的位置更新
     */
    goStepMove(): void {
        super.goStepMove();
        // 更新锤子物品位置
        let a = this.itemSpeed;
        let loc = new Vector(Math.sin(this.liveTime / a), Math.cos(this.liveTime / a)).mul(this.itemRange);
        this.additionItem.pos = this.pos.plus(loc);
    }

    /**
     * 碰撞阶段：处理锤子的目标检测和碰撞
     */
    goStepCollide(): void {
        super.goStepCollide();
        this.toTarget();
        // 锤子物品碰撞检测
        let itemPos = this.additionItem.pos;
        let itemR = this.additionItem.r;
        let nearbyMonsters = this.world.getMonstersInRange(itemPos.x, itemPos.y, itemR + 50);
        let itemCircle = this.additionItem.getBodyCircle();
        let actualDamage = this.itemDamage * this.getDamageMultiplier();
        for (let m of nearbyMonsters) {
            const mc = m.getBodyCircle();
            if (this.world.fog?.enabled && !this.world.fog.isCircleVisible(mc.x, mc.y, mc.r)) {
                continue;
            }
            // 检查冷却，避免同一怪物每帧都受伤害
            const lastHit = this.hitCooldown.get(m) ?? -HIT_COOLDOWN_FRAMES;
            if (this.liveTime - lastHit < HIT_COOLDOWN_FRAMES) {
                continue;
            }
            if (Circle.collides(itemCircle.x, itemCircle.y, itemCircle.r, mc.x, mc.y, mc.r)) {
                m.hpChange(-actualDamage);
                this.hitCooldown.set(m, this.liveTime);
            }
        }
    }
}

// Register class type for save system
TowerRegistry.registerClassType('TowerHammer', () => TowerHammer);
