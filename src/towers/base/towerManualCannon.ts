/**
 * TowerManualCannon - Manual cannon tower base class
 *
 * Special tower that requires manual targeting and can attack enemy buildings.
 * Has ammo system with reload mechanics.
 */

import { Vector } from '../../core/math/vector';
import { Circle } from '../../core/math/circle';
import { MyColor } from '../../entities/myColor';
import { Tower } from './tower';
import { TowerRegistry } from '../towerRegistry';
import { BulletRegistry } from '../../bullets/bulletRegistry';
import { isEnemy } from '../../game/player/ownership';
import { scalePeriod, scaleSpeed } from '../../core/speedScale';
import {
    renderTowerBody,
    renderTowerBars,
} from '../rendering/towerRenderer';
import {
    renderStatusBar,
    BAR_OFFSET,
    BAR_COLORS,
    type StatusBarCache
} from '../../entities/statusBar';

// Sound manager reference
declare const SoundManager: { play(src: string): void } | undefined;

/**
 * Extended world interface for ManualCannon
 */
interface ManualCannonWorld {
    batterys: unknown[];
    buildings: unknown[];
    monsters: unknown[];
    addBully(bullet: unknown): void;
    addEffect(effect: unknown): void;
    getMonstersInRange(x: number, y: number, r: number): unknown[];
    getBuildingsInRange(x: number, y: number, r: number): unknown[];
    fog?: { enabled: boolean; isCircleVisible(x: number, y: number, r: number): boolean };
    energy?: { getSatisfactionRate(): number };
    territory?: unknown;
}

/**
 * Target entity interface
 */
interface TargetEntity {
    pos: Vector;
    r: number;
    ownerId: string | null;
    hp: number;
    isDead(): boolean;
    hpChange(amount: number): void;
    getBodyCircle(): Circle;
}

/**
 * TowerManualCannon class
 */
export class TowerManualCannon extends Tower {
    /** Maximum ammo capacity */
    maxAmmo: number = 3;

    /** Current ammo count */
    currentAmmo: number = 3;

    /** Ticks to reload one ammo */
    reloadTime: number = scalePeriod(60);

    /** Current reload progress (ticks) */
    reloadProgress: number = 0;

    /** Explosion damage */
    explosionDamage: number = 100;

    /** Explosion radius */
    explosionRadius: number = 50;

    /** Target position for manual firing */
    targetPos: Vector | null = null;

    /** Whether currently aiming */
    isAiming: boolean = false;

    /** Can attack buildings (unique to ManualCannon) */
    canAttackBuildings: boolean = true;

    /** Semi-auto mode: marked target area center */
    markedTargetPos: Vector | null = null;

    /** Semi-auto mode: marked target radius */
    markedTargetRadius: number = 100;

    /** Semi-auto mode enabled */
    semiAutoMode: boolean = false;

    /** Ammo bar cache for rendering */
    _ammoBarCache: StatusBarCache = { border: null, fill: null, lastValueInt: -1, valueStr: '' };

    /** Shell audio */
    shellAudioSrc: string = '/sound/子弹音效/火炮爆炸.ogg';

    constructor(x: number, y: number, world: any) {
        super(x, y, world);
        this.gameType = "Tower";
        this.name = "手动炮塔";
        this.imgIndex = 100; // Will need a specific image index
        this.price = 800;
        this.r = 12;
        this.hpInit(2000);
        this.rangeR = 400;
        this.clock = scalePeriod(30); // Faster than reload, but ammo limited

        // Disable normal auto-attack
        this.attackFunc = this.manualAttack;

        // Visual styling
        this.bodyColor = new MyColor(60, 60, 80, 0.9);
        this.bodyStrokeColor = new MyColor(100, 100, 120, 1);
        this.bodyStrokeWidth = 3;
    }

    /**
     * Get world with extended interface
     */
    private get cannonWorld(): ManualCannonWorld {
        return this.world as unknown as ManualCannonWorld;
    }

    /**
     * Override goStepMove to handle reload
     */
    goStepMove(): void {
        super.goStepMove();
        this.handleReload();
    }

    /**
     * Override goStepCollide for semi-auto targeting
     */
    goStepCollide(): void {
        super.goStepCollide();

        // Semi-auto mode: automatically fire at marked area
        if (this.semiAutoMode && this.markedTargetPos && this.currentAmmo > 0) {
            const target = this.findTargetInMarkedArea();
            if (target) {
                this.fireAt(target.pos);
            }
        }
    }

    /**
     * Handle ammo reload
     */
    private handleReload(): void {
        if (this.currentAmmo < this.maxAmmo) {
            this.reloadProgress++;
            if (this.reloadProgress >= this.reloadTime) {
                this.currentAmmo++;
                this.reloadProgress = 0;
            }
        }
    }

    /**
     * Manual attack function (does nothing by default, requires manual trigger)
     */
    manualAttack(): void {
        // Manual cannon doesn't auto-attack
        // Attack is triggered by fireAt() from UI interaction
    }

    /**
     * Fire a shell at target position
     * @returns true if fired successfully
     */
    fireAt(targetPos: Vector): boolean {
        if (this.currentAmmo <= 0) {
            return false;
        }

        // Check range
        const distance = this.pos.dis(targetPos);
        if (distance > this.rangeR) {
            return false;
        }

        // Check valid territory
        if (!this.inValidTerritory) {
            return false;
        }

        // Create shell bullet
        const bullet = BulletRegistry.create('ManualCannon_Shell', this.world) as any;
        if (!bullet) {
            return false;
        }

        // Set bullet properties
        const direction = targetPos.sub(this.pos).to1();
        const speed = direction.mul(scaleSpeed(8));

        bullet.pos = this.pos.copy();
        bullet.originalPos = this.pos.copy();
        bullet.speed = speed;
        bullet.father = this;
        bullet.ownerId = this.ownerId;

        // Set explosion properties
        bullet.haveBomb = true;
        bullet.bombDamage = this.explosionDamage * this.getDamageMultiplier();
        bullet.bombRange = this.explosionRadius;
        bullet.targetPos = targetPos;

        // Add to world
        this.cannonWorld.addBully(bullet);
        this.bullys.add(bullet as any);

        // Consume ammo
        this.currentAmmo--;

        // Play sound
        if (typeof SoundManager !== 'undefined') {
            SoundManager.play(this.shellAudioSrc);
        }

        return true;
    }

    /**
     * Set marked target area for semi-auto mode
     */
    setMarkedTarget(pos: Vector, radius: number = 100): void {
        this.markedTargetPos = pos;
        this.markedTargetRadius = radius;
        this.semiAutoMode = true;
    }

    /**
     * Clear marked target (disable semi-auto mode)
     */
    clearMarkedTarget(): void {
        this.markedTargetPos = null;
        this.semiAutoMode = false;
    }

    /**
     * Find a valid target in the marked area (for semi-auto mode)
     */
    private findTargetInMarkedArea(): TargetEntity | null {
        if (!this.markedTargetPos) return null;

        const world = this.cannonWorld;
        const searchRadius = this.markedTargetRadius + 50;

        // Priority 1: Enemy buildings (towers, bases)
        const buildings = world.getBuildingsInRange(
            this.markedTargetPos.x,
            this.markedTargetPos.y,
            searchRadius
        ) as TargetEntity[];

        for (const building of buildings) {
            if (!building.isDead() && isEnemy(this, building)) {
                // Check if within marked area
                if (building.pos.dis(this.markedTargetPos) <= this.markedTargetRadius) {
                    // Check if within attack range
                    if (this.pos.dis(building.pos) <= this.rangeR) {
                        return building;
                    }
                }
            }
        }

        // Priority 2: Enemy monsters
        const monsters = world.getMonstersInRange(
            this.markedTargetPos.x,
            this.markedTargetPos.y,
            searchRadius
        ) as TargetEntity[];

        for (const monster of monsters) {
            if (!monster.isDead() && isEnemy(this, monster)) {
                if (monster.pos.dis(this.markedTargetPos) <= this.markedTargetRadius) {
                    if (this.pos.dis(monster.pos) <= this.rangeR) {
                        return monster;
                    }
                }
            }
        }

        return null;
    }

    /**
     * Get valid targets in range (for UI display)
     */
    getValidTargetsInRange(): { monsters: TargetEntity[]; buildings: TargetEntity[] } {
        const world = this.cannonWorld;
        const result = {
            monsters: [] as TargetEntity[],
            buildings: [] as TargetEntity[]
        };

        // Get all monsters in range
        const monsters = world.getMonstersInRange(this.pos.x, this.pos.y, this.rangeR) as TargetEntity[];
        for (const monster of monsters) {
            if (!monster.isDead() && isEnemy(this, monster)) {
                // Check fog visibility
                if (world.fog?.enabled) {
                    const mc = monster.getBodyCircle();
                    if (!world.fog.isCircleVisible(mc.x, mc.y, mc.r)) {
                        continue;
                    }
                }
                result.monsters.push(monster);
            }
        }

        // Get all buildings in range
        const buildings = world.getBuildingsInRange(this.pos.x, this.pos.y, this.rangeR) as TargetEntity[];
        for (const building of buildings) {
            if (!building.isDead() && isEnemy(this, building)) {
                result.buildings.push(building);
            }
        }

        return result;
    }

    /**
     * Check if a position is valid target
     */
    isValidTargetPosition(pos: Vector): boolean {
        const distance = this.pos.dis(pos);
        return distance <= this.rangeR && this.inValidTerritory && this.currentAmmo > 0;
    }

    /**
     * Override render to show ammo bar
     */
    render(ctx: CanvasRenderingContext2D): void {
        if (this.isDead()) return;

        // Render base tower
        renderTowerBody(this as any, ctx);
        renderTowerBars(this as any, ctx);

        // Render ammo bar
        this.renderAmmoBar(ctx);

        // Render marked target area if in semi-auto mode
        if (this.semiAutoMode && this.markedTargetPos) {
            this.renderMarkedArea(ctx);
        }
    }

    /**
     * Render ammo bar
     */
    private renderAmmoBar(ctx: CanvasRenderingContext2D): void {
        const barH = this.hpBarHeight;
        const barX = this.pos.x - this.r;
        const barY = this.pos.y + this.r + BAR_OFFSET.BOTTOM_1 * barH;
        const barW = this.r * 2;
        const ammoRate = this.currentAmmo / this.maxAmmo;

        // Ammo bar (yellow-ish color)
        renderStatusBar(ctx, {
            x: barX,
            y: barY,
            width: barW,
            height: barH,
            fillRate: ammoRate,
            fillColor: { r: 200, g: 180, b: 50, a: 1 },
            cache: this._ammoBarCache
        });

        // Show reload progress if reloading
        if (this.currentAmmo < this.maxAmmo) {
            const reloadRate = this.reloadProgress / this.reloadTime;
            const reloadBarY = this.pos.y + this.r + BAR_OFFSET.BOTTOM_2 * barH;
            ctx.fillStyle = `rgba(100, 100, 255, 0.5)`;
            ctx.fillRect(barX, reloadBarY, barW * reloadRate, barH);
        }
    }

    /**
     * Render marked target area for semi-auto mode
     */
    private renderMarkedArea(ctx: CanvasRenderingContext2D): void {
        if (!this.markedTargetPos) return;

        ctx.save();
        ctx.strokeStyle = 'rgba(255, 100, 100, 0.5)';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.arc(this.markedTargetPos.x, this.markedTargetPos.y, this.markedTargetRadius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
    }

    /**
     * Custom serialization
     */
    toJSON(): Record<string, unknown> {
        return {
            currentAmmo: this.currentAmmo,
            reloadProgress: this.reloadProgress,
            semiAutoMode: this.semiAutoMode,
            markedTargetPos: this.markedTargetPos ? { x: this.markedTargetPos.x, y: this.markedTargetPos.y } : null,
            markedTargetRadius: this.markedTargetRadius
        };
    }

    /**
     * Restore from save data
     */
    fromJSON(data: Record<string, unknown>): void {
        if (typeof data.currentAmmo === 'number') {
            this.currentAmmo = data.currentAmmo;
        }
        if (typeof data.reloadProgress === 'number') {
            this.reloadProgress = data.reloadProgress;
        }
        if (typeof data.semiAutoMode === 'boolean') {
            this.semiAutoMode = data.semiAutoMode;
        }
        if (data.markedTargetPos && typeof data.markedTargetPos === 'object') {
            const pos = data.markedTargetPos as { x: number; y: number };
            this.markedTargetPos = new Vector(pos.x, pos.y);
        }
        if (typeof data.markedTargetRadius === 'number') {
            this.markedTargetRadius = data.markedTargetRadius;
        }
    }
}

// Register class type for save system
TowerRegistry.registerClassType('TowerManualCannon', () => TowerManualCannon);
