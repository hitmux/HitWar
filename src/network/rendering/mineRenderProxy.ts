/**
 * MineRenderProxy - Lightweight proxy that adapts MineState schema data
 * for client-side rendering. Satisfies the Mine interface expected by
 * WorldRenderer and PanelManager.
 */

import { Vector } from '../../core/math/vector';
import { Circle } from '../../core/math/circle';
import { MINE_CONFIG, MineStateType } from '@shared/config/mineMeta';
import { renderStatusBar, BAR_OFFSET, type StatusBarCache } from '../../entities/statusBar';
import { MyColor } from '../../entities/myColor';

/** HP bar color for mines (green, same as towers) */
const MINE_HP_COLOR = MyColor.arrTo([2, 230, 13, 0.8]);

export class MineRenderProxy {
  // Identity
  id: string = '';
  gameType: string = 'Mine';
  name: string = '矿井';

  // Position & collision (compatible with CircleObject interface)
  pos: Vector;
  r: number = 15;

  // Mine state
  state: string = MineStateType.NORMAL;
  powerPlantLevel: number = 0;
  hp: number = 0;
  maxHp: number = 0;
  ownerId: string = '';
  repairing: boolean = false;
  repairProgress: number = 0;
  inValidTerritory: boolean = true;
  selected: boolean = false;

  // Constants (for PanelManager compatibility)
  REPAIR_COST: number = MINE_CONFIG.repairCost;
  REPAIR_TIME: number = MINE_CONFIG.repairTicks;
  UPGRADE_PRICES: readonly number[] = MINE_CONFIG.upgradePrices;

  // HP bar rendering cache
  private _hpBarCache: StatusBarCache | null = null;
  private _bodyCircle: Circle | null = null;

  constructor() {
    this.pos = new Vector(0, 0);
  }

  /**
   * Update proxy from schema state
   */
  syncFromSchema(schema: {
    id: string;
    position: { x: number; y: number };
    mineState: string;
    ownerId: string;
    level: number;
    hp: number;
    maxHp: number;
    radius: number;
    repairing: boolean;
    repairProgress: number;
  }): void {
    this.id = schema.id;
    this.pos.x = schema.position.x;
    this.pos.y = schema.position.y;
    this.state = schema.mineState;
    this.ownerId = schema.ownerId;
    this.powerPlantLevel = schema.level;
    this.hp = schema.hp;
    this.maxHp = schema.maxHp;
    this.r = schema.radius;
    this.repairing = schema.repairing;
    this.repairProgress = schema.repairProgress;
    this._bodyCircle = null; // Invalidate cache
  }

  // === PanelManager compatibility methods ===

  getEnergyProduction(): number {
    if (this.state !== MineStateType.POWER_PLANT) return 0;
    if (!this.inValidTerritory) return 0;
    return this.powerPlantLevel * MINE_CONFIG.productionPerLevel;
  }

  getUpgradePrice(): number | null {
    if (this.state === MineStateType.NORMAL) return MINE_CONFIG.upgradePrices[0];
    if (this.state === MineStateType.POWER_PLANT && this.powerPlantLevel < MINE_CONFIG.maxLevel) {
      return MINE_CONFIG.upgradePrices[this.powerPlantLevel];
    }
    return null;
  }

  getDowngradeRefund(): number {
    if (this.state !== MineStateType.POWER_PLANT) return 0;
    return Math.floor(MINE_CONFIG.upgradePrices[this.powerPlantLevel - 1] * MINE_CONFIG.downgradeRefundRatio);
  }

  getSellPrice(): number {
    if (this.state !== MineStateType.POWER_PLANT) return 0;
    let totalValue = 0;
    for (let i = 0; i < this.powerPlantLevel; i++) {
      totalValue += MINE_CONFIG.upgradePrices[i];
    }
    return Math.floor(totalValue * MINE_CONFIG.sellRefundRatio);
  }

  getBodyCircle(): Circle {
    if (!this._bodyCircle) {
      this._bodyCircle = new Circle(this.pos.copy(), this.r);
    }
    this._bodyCircle.pos.x = this.pos.x;
    this._bodyCircle.pos.y = this.pos.y;
    this._bodyCircle.r = this.r;
    return this._bodyCircle;
  }

  getSize(): number {
    return this.state === MineStateType.DAMAGED ? 30 : 25;
  }

  // === Rendering ===

  render(ctx: CanvasRenderingContext2D): void {
    const size = this.getSize();
    const x = this.pos.x;
    const y = this.pos.y;

    if (this.state === MineStateType.POWER_PLANT) {
      // Draw circle body (like CircleObject.renderBody)
      ctx.fillStyle = '#222222';
      ctx.beginPath();
      ctx.arc(x, y, this.r, 0, Math.PI * 2);
      ctx.fill();

      // Draw HP bar
      if (this.maxHp > 0) {
        this._hpBarCache = renderStatusBar(
          ctx, x, y, this.r,
          this.hp, this.maxHp,
          MINE_HP_COLOR,
          3, BAR_OFFSET,
          this._hpBarCache
        );
      }

      // Draw ⚡ symbol
      ctx.fillStyle = 'yellow';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'center';
      const lightning = '⚡'.repeat(this.powerPlantLevel);
      ctx.fillText(lightning, x, y - this.r - 15);
    } else {
      // Triangle (normal or damaged)
      ctx.fillStyle = this.state === MineStateType.NORMAL ? 'black' : 'gray';
      ctx.beginPath();
      ctx.moveTo(x, y - size / 2);
      ctx.lineTo(x - size / 2, y + size / 2);
      ctx.lineTo(x + size / 2, y + size / 2);
      ctx.closePath();
      ctx.fill();

      // Repair progress bar
      if (this.repairing) {
        const progress = this.repairProgress / this.REPAIR_TIME;
        ctx.fillStyle = 'green';
        ctx.fillRect(x - 15, y + size / 2 + 5, 30 * progress, 4);
        ctx.strokeStyle = 'black';
        ctx.strokeRect(x - 15, y + size / 2 + 5, 30, 4);
      }
    }
  }
}
