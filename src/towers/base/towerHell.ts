/**
 * TowerHell - Continuous damage tower
 *
 * Deals increasing damage the longer it focuses on a single target.
 */
import { MyColor } from '../../entities/myColor';
import { Circle } from '../../core/math/circle';
import { Tower } from './tower';
import { TowerRegistry } from '../towerRegistry';
import type {
    VectorLike,
    CircleLike,
    MonsterLike as BaseMonsterLike,
    TerritoryLike,
    FogOfWarLike,
    UserLike,
    TowerLike,
} from '@/types/worldLike';

// Declare globals for non-migrated modules
declare const EffectLine: {
    acquire(start: VectorLike, end: VectorLike): EffectLineLike;
} | undefined;

// Extended CircleLike with impact method
interface CircleLikeExt extends CircleLike {
    impact(other: CircleLike): boolean;
}

interface EffectLineLike {
    initLineStyle(color: MyColor, width: number): void;
}

// Extended MonsterLike for hell tower
interface MonsterLike extends BaseMonsterLike {
    getBodyCircle(): CircleLikeExt;
}

// WorldLike interface for TowerHell
interface WorldLike {
    width: number;
    height: number;
    batterys: TowerLike[];
    territory?: TerritoryLike;
    fog?: FogOfWarLike;
    user: UserLike;
    getMonstersInRange(x: number, y: number, range: number): MonsterLike[];
    addBully(bully: unknown): void;
    removeBully(bully: unknown): void;
    addEffect(effect: unknown): void;
}

export class TowerHell extends Tower {
    target: MonsterLike | null;
    nowDamage: number;
    damageRate: number;
    targetLiveTime: number;
    laserFreezeNow: number;
    laserFreezeMax: number;

    constructor(x: number, y: number, world: any) {
        super(x, y, world);
        this.name = "地狱塔";
        this.clock = 1; // 改为整数，虽然地狱塔不用 clock 控制攻击

        this.target = null;
        this.rangeR = 200;
        this.hpInit(5000);
        this.price = 1000;

        this.nowDamage = 1;
        this.damageRate = 5000;
        this.targetLiveTime = 0;

        // Inherit laser properties for compatibility
        this.laserFreezeNow = 0;
        this.laserFreezeMax = 0;

        // 地狱塔使用自定义 attack()，禁用父类的 normalAttack
        this.attackFunc = () => {};
    }

    getTarget(): void {
        if (this.target === null || this.target === undefined || this.target.isDead()) {
            const target = this.findFirstTarget();
            if (target) {
                this.target = target;
            }
        }
    }

    attack(): void {
        if (this.target === null || this.target === undefined || this.target.isDead()) {
            this.targetLiveTime = 0;
            return;
        }
        if (this.laserFreezeNow === this.laserFreezeMax) {
            let damage = Math.pow(this.targetLiveTime, 2) / this.damageRate;
            damage = damage * this.getDamageMultiplier();
            this.target.hpChange(-damage);
            this.targetLiveTime++;

            if (typeof EffectLine !== 'undefined') {
                let e = EffectLine.acquire(this.pos, this.target.pos);
                e.initLineStyle(new MyColor(255, 0, 0, 0.5), 15);
                this.world.addEffect?.(e);
                e = EffectLine.acquire(this.pos, this.target.pos);
                e.initLineStyle(new MyColor(255, 0, 255, 0.5), 10);
                this.world.addEffect?.(e);
                e = EffectLine.acquire(this.pos, this.target.pos);
                e.initLineStyle(new MyColor(255, 255, 19, 1), 5);
                this.world.addEffect?.(e);
            }
        }
        if (this.target.isDead()) {
            this.targetLiveTime = 0;
            this.target = null;
        }
    }

    goStep(): void {
        // 保持向后兼容：执行完整的更新逻辑
        this.goStepMove();
        this.goStepCollide();
    }

    /**
     * 移动阶段：继承基类移动逻辑
     */
    goStepMove(): void {
        super.goStepMove();
    }

    /**
     * 碰撞阶段：处理地狱塔的目标获取和攻击
     */
    goStepCollide(): void {
        super.goStepCollide();
        this.getTarget();
        this.attack();
    }
}

// Register class type for save system
TowerRegistry.registerClassType('TowerHell', () => TowerHell);
