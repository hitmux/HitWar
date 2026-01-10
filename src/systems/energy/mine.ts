/**
 * Mine - Mine/Power Plant entity
 * Extends CircleObject
 */

import { Vector } from '../../core/math/vector';
import { MyColor } from '../../entities/myColor';
import { CircleObject } from '../../entities/base/circleObject';
import { EffectCircle } from '../../effects/effectCircle';

interface WorldLike {
    buildings: unknown[];
    mines: Set<Mine>;
    territory: { markDirty: () => void };
    addEffect: (effect: unknown) => void;
    user: { money: number };
}

export class Mine extends CircleObject {
    // State constants
    static STATE_NORMAL: string = 'normal';           // Normal mine (black triangle)
    static STATE_DAMAGED: string = 'damaged';         // Damaged mine (gray triangle)
    static STATE_POWER_PLANT: string = 'powerPlant';  // Power plant (black square)

    // Upgrade prices for each level (level 1, 2, 3)
    static UPGRADE_PRICES: readonly number[] = [150, 200, 250];

    gameType: string = "Mine";
    name: string = "矿井";
    state: string = Mine.STATE_NORMAL;
    powerPlantLevel: number = 0;  // 0=mine, 1-3=power plant level

    // Repair related
    repairing: boolean = false;
    repairProgress: number = 0;
    REPAIR_TIME: number = 1500;   // Repair time in ticks   // Repair time in ticks
    REPAIR_COST: number = 50;    // Repair cost    // Repair cost

    // Territory penalty state
    inValidTerritory: boolean = true;
    _originalMaxHp: number | null = null;
    _territoryPenaltyApplied: boolean = false;

    constructor(pos: Vector, world: WorldLike) {
        super(pos, world as any);

        // HP bar color set to green (same as towers)
        this.hpColor = MyColor.arrTo([2, 230, 13, 0.8]);

        // Use circumscribed circle radius for collision detection
        this._updateRadius();
        this.hpInit(0);
    }

    /**
     * Update collision radius based on state
     */
    _updateRadius(): void {
        const size = this.getSize();
        if (this.state === Mine.STATE_POWER_PLANT) {
            // Square circumscribed circle radius = side * sqrt(2) / 2
            this.r = size * Math.SQRT2 / 2;
        } else {
            // Equilateral triangle circumscribed circle radius = side / sqrt(3)
            this.r = size / Math.sqrt(3);
        }
    }

    /**
     * Get side length
     */
    getSize(): number {
        return this.state === Mine.STATE_DAMAGED ? 30 : 25;
    }

    /**
     * Get energy production
     */
    getEnergyProduction(): number {
        if (this.state !== Mine.STATE_POWER_PLANT) return 0;
        if (!this.inValidTerritory) return 0;
        return this.powerPlantLevel * 2;
    }

    /**
     * Get upgrade price
     */
    getUpgradePrice(): number | null {
        if (this.state === Mine.STATE_NORMAL) return Mine.UPGRADE_PRICES[0];
        if (this.state === Mine.STATE_POWER_PLANT && this.powerPlantLevel < 3) {
            return Mine.UPGRADE_PRICES[this.powerPlantLevel];
        }
        return null;  // Cannot upgrade
    }

    /**
     * Upgrade to power plant / upgrade power plant level
     */
    upgrade(): void {
        const hpValues = [3000, 5000, 10000];

        if (this.state === Mine.STATE_NORMAL) {
            // Mine → Level 1 power plant
            this.state = Mine.STATE_POWER_PLANT;
            this.powerPlantLevel = 1;
            this.maxHp = hpValues[0];
            this.hp = this.maxHp;
            this._updateRadius();
            // Add to buildings set so monsters can attack
            (this.world as any).buildings.push(this);
            // Trigger territory update
            (this.world as any).territory.markDirty();
        } else if (this.state === Mine.STATE_POWER_PLANT && this.powerPlantLevel < 3) {
            // Upgrade power plant
            this.powerPlantLevel++;
            this.maxHp = hpValues[this.powerPlantLevel - 1];
            this.hp = this.maxHp;
        }
    }

    /**
     * Downgrade power plant
     */
    downgrade(): void {
        if (this.state !== Mine.STATE_POWER_PLANT) return;

        const hpValues = [3000, 5000, 10000];

        if (this.powerPlantLevel > 1) {
            // High level power plant → Lower level
            this.powerPlantLevel--;
            this.maxHp = hpValues[this.powerPlantLevel - 1];
            this.hp = this.maxHp;
        } else {
            // Level 1 power plant → Normal mine
            // Remove from buildings set
            const buildings = (this.world as any).buildings;
            const idx = buildings.indexOf(this);
            if (idx !== -1) {
                buildings.splice(idx, 1);
            }
            this.state = Mine.STATE_NORMAL;
            this.powerPlantLevel = 0;
            this.hp = 0;
            this.maxHp = 0;
            this._updateRadius();
            // Reset territory penalty state
            this._territoryPenaltyApplied = false;
            this._originalMaxHp = null;
        }
    }

    /**
     * Get downgrade refund amount
     */
    getDowngradeRefund(): number {
        if (this.state !== Mine.STATE_POWER_PLANT) return 0;
        // Refund 1/4 of current level upgrade price
        return Math.floor(Mine.UPGRADE_PRICES[this.powerPlantLevel - 1] / 4);
    }

    /**
     * Get sell price (50% of total upgrade cost)
     */
    getSellPrice(): number {
        if (this.state !== Mine.STATE_POWER_PLANT) return 0;
        let totalValue = 0;
        for (let i = 0; i < this.powerPlantLevel; i++) {
            totalValue += Mine.UPGRADE_PRICES[i];
        }
        return Math.floor(totalValue / 2);
    }

    /**
     * Power plant destroyed
     */
    destroy(skipRemoveFromBuildings: boolean = false): void {
        if (this.state === Mine.STATE_POWER_PLANT) {
            // Play explosion effect
            const e = EffectCircle.acquire(this.pos);
            e.animationFunc = e.destroyAnimation;
            e.circle.r = 30;
            (this.world as any).addEffect(e);

            // Remove from buildings set (unless caller already handled it)
            if (!skipRemoveFromBuildings) {
                const buildings = (this.world as any).buildings;
                const idx = buildings.indexOf(this);
                if (idx !== -1) {
                    buildings.splice(idx, 1);
                }
            }

            // Downgrade to damaged mine
            this.state = Mine.STATE_DAMAGED;
            this.powerPlantLevel = 0;
            this.hp = 0;
            this.maxHp = 0;
            this._updateRadius();

            // Reset territory penalty state (critical!)
            this._territoryPenaltyApplied = false;
            this._originalMaxHp = null;
        }
    }

    /**
     * Start repair
     */
    startRepair(): void {
        if (this.state === Mine.STATE_DAMAGED && !this.repairing) {
            if ((this.world as any).user.money >= this.REPAIR_COST) {
                (this.world as any).user.money -= this.REPAIR_COST;
                this.repairing = true;
                this.repairProgress = 0;
            }
        }
    }

    override goStep(): void {
        // Handle repair progress
        if (this.repairing) {
            this.repairProgress++;
            if (this.repairProgress >= this.REPAIR_TIME) {
                this.state = Mine.STATE_NORMAL;
                this.repairing = false;
                this.repairProgress = 0;
                this._updateRadius();
            }
        }

        // Power plant destroyed detection (in goStep, not isDead)
        if (this.state === Mine.STATE_POWER_PLANT && this.hp <= 0) {
            this.destroy();
        }
    }

    override render(ctx: CanvasRenderingContext2D): void {
        const size = this.getSize();
        const x = this.pos.x;
        const y = this.pos.y;

        if (this.state === Mine.STATE_POWER_PLANT) {
            // Call base class to draw circle and HP bar
            super.render(ctx);

            // Draw ⚡ symbol above the circle
            ctx.fillStyle = 'yellow';
            ctx.font = '12px sans-serif';
            ctx.textAlign = 'center';
            const lightning = '⚡'.repeat(this.powerPlantLevel);
            ctx.fillText(lightning, x, y - this.r - 15);
        } else {
            // Triangle
            ctx.fillStyle = this.state === Mine.STATE_NORMAL ? 'black' : 'gray';
            ctx.beginPath();
            ctx.moveTo(x, y - size/2);
            ctx.lineTo(x - size/2, y + size/2);
            ctx.lineTo(x + size/2, y + size/2);
            ctx.closePath();
            ctx.fill();

            // Repair progress bar
            if (this.repairing) {
                const progress = this.repairProgress / this.REPAIR_TIME;
                ctx.fillStyle = 'green';
                ctx.fillRect(x - 15, y + size/2 + 5, 30 * progress, 4);
                ctx.strokeStyle = 'black';
                ctx.strokeRect(x - 15, y + size/2 + 5, 30, 4);
            }
        }
    }
}
