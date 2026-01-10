/**
 * CircleObject - Base class for all circular game entities
 * by littlefean
 */
import { Vector } from '../../core/math/vector';
import { Circle } from '../../core/math/circle';
import { Rectangle } from '../../core/math/rectangle';
import { MyColor } from '../myColor';

interface CheatMode {
    enabled: boolean;
    infiniteHp: boolean;
}

interface WorldLike {
    width: number;
    height: number;
    cheatMode?: CheatMode;
}

export class CircleObject {
    // Cached font string to avoid repeated string creation
    static FONT_9 = "9px Microsoft YaHei";
    // Static temp vector for move() to avoid GC pressure
    private static _tempVec: Vector = new Vector(0, 0);

    pos: Vector;
    world: WorldLike;
    gameType: string;
    liveTime: number;
    r: number;

    speed: Vector;
    acceleration: Vector;
    accelerationV: number;
    maxSpeedN: number;

    hp: number;
    maxHp: number;

    hpColor: MyColor;
    bodyColor: MyColor;
    bodyStrokeWidth: number;
    bodyStrokeColor: MyColor;
    hpBarHeight: number;

    comment: string;
    selected: boolean;

    protected _bodyCircle: Circle | null;
    protected _hpBarBorder: Rectangle | null;
    protected _hpBarFill: Rectangle | null;

    // HP string caching for performance
    private _hpStr: string = "";
    private _lastHpInt: number = -1;
    protected _bodyVersion: number = 0;

    // Territory related properties
    inValidTerritory: boolean;
    protected _originalMaxHp: number | null;
    protected _territoryPenaltyApplied: boolean;
    protected _originalRangeR: number | null;

    constructor(pos: Vector, world: WorldLike) {
        this.pos = pos;
        this.world = world;
        this.gameType = "CircleObject";
        this.liveTime = 0;
        this.r = 20;

        this.speed = new Vector(0, 0);
        this.acceleration = new Vector(0, 0);
        this.accelerationV = 0;
        this.maxSpeedN = 100;

        this.hp = 100;
        this.maxHp = 100;

        this.hpColor = new MyColor(122, 12, 12, 1);
        this.bodyColor = new MyColor(20, 20, 20, 1);
        this.bodyStrokeWidth = 5;
        this.bodyStrokeColor = MyColor.Transparent();
        this.hpBarHeight = 10;

        this.comment = "细节待补充.....内容还在完善中。。。";
        this.selected = false;

        this._bodyCircle = null;
        this._hpBarBorder = null;
        this._hpBarFill = null;

        this.inValidTerritory = true;
        this._originalMaxHp = null;
        this._territoryPenaltyApplied = false;
        this._originalRangeR = null;
        this._bodyVersion = 0;
    }

    /**
     * Initialize entity HP and fill to max
     */
    hpInit(n: number): void {
        this.hp = n;
        this.maxHp = n;
        this._markBodyDirty();
    }

    protected _markBodyDirty(): void {
        this._bodyVersion++;
    }

    protected _markMovement(prevX: number, prevY: number): void {
        if (prevX !== this.pos.x || prevY !== this.pos.y) {
            (this.world as any)?.markSpatialDirty?.call(this.world, this);
        }
    }

    /**
     * Change entity HP
     */
    hpChange(dh: number): void {
        // Infinite HP cheat for towers and buildings
        if (dh < 0 && this.world && this.world.cheatMode) {
            if (this.world.cheatMode.enabled && this.world.cheatMode.infiniteHp) {
                if (this.gameType === "Tower" || this.gameType === "Building" || this.gameType === "Mine") {
                    return;
                }
            }
        }

        if (this.hp + dh <= 0) {
            this.hp = 0;
            this._markBodyDirty();
            return;
        } else if (this.hp + dh >= this.maxHp) {
            this.hp = this.maxHp;
            this._markBodyDirty();
            return;
        }
        this.hp += dh;
        this._markBodyDirty();
    }

    hpSet(hp: number): void {
        // Infinite HP cheat for towers and buildings
        if (hp < this.hp && this.world && this.world.cheatMode) {
            if (this.world.cheatMode.enabled && this.world.cheatMode.infiniteHp) {
                if (this.gameType === "Tower" || this.gameType === "Building" || this.gameType === "Mine") {
                    return;
                }
            }
        }

        if (hp > this.maxHp) {
            this.hp = this.maxHp;
            this._markBodyDirty();
            return;
        }
        if (hp < 0) {
            this.hp = 0;
            this._markBodyDirty();
            return;
        }
        this.hp = hp;
        this._markBodyDirty();
    }

    /**
     * Change body radius
     */
    bodyRadiusChange(dr: number): void {
        if (this.r + dr <= 0) {
            this.r = 0;
            this.remove();
        } else {
            this.r += dr;
        }
        // 使用 call 保持 world 作为 this 上下文
        (this.world as any)?.markSpatialDirty?.call(this.world, this);
        this._markBodyDirty();
    }

    /**
     * Check if dead
     */
    isDead(): boolean {
        if (this.maxHp < 0) {
            return true;
        }
        return this.hp <= 0;
    }

    goStep(): void {
        this.liveTime++;
    }

    /**
     * Remove entity
     */
    remove(): void {
        this.pos.x = -10000;
        this.pos.y = -10000;
    }

    getBodyCircle(): Circle {
        if (!this._bodyCircle) {
            this._bodyCircle = new Circle(this.pos.x, this.pos.y, this.r);
        }
        let res = this._bodyCircle;
        res.x = this.pos.x;
        res.y = this.pos.y;
        res.r = this.r;
        res.pos.x = this.pos.x;
        res.pos.y = this.pos.y;
        res.fillColor = this.bodyColor;
        res.strokeColor = this.bodyStrokeColor;
        let hpRate = this.hp / this.maxHp;
        res.setStrokeWidth(this.bodyStrokeWidth * hpRate);
        return res;
    }

    move(): void {
        const prevX = this.pos.x;
        const prevY = this.pos.y;
        if (this.acceleration.x === this.acceleration.y && this.acceleration.x === 0) {
            // Use static temp vector to avoid GC pressure
            Vector.mulTo(this.speed, this.accelerationV, CircleObject._tempVec);
            this.speed.add(CircleObject._tempVec);
        } else {
            this.speed.add(this.acceleration);
        }
        const maxSpeedSq = this.maxSpeedN * this.maxSpeedN;
        if (this.speed.absSq() > maxSpeedSq) {
            // Use in-place operations to avoid GC pressure
            this.speed.mulInPlace(this.maxSpeedN / this.speed.abs());
        }
        this.pos.add(this.speed);
        this._markMovement(prevX, prevY);
    }

    isInScreen(): boolean {
        let xIn = -this.r < this.pos.x && this.pos.x < this.world.width + this.r;
        let yIn = -this.r < this.pos.y && this.pos.y < this.world.height + this.r;
        return xIn && yIn;
    }

    /**
     * Check if far outside screen
     */
    isOutScreen(): boolean {
        let margin = 500;
        let xIn = -this.r - margin < this.pos.x && this.pos.x < this.world.width + this.r + margin;
        let yIn = -this.r - margin < this.pos.y && this.pos.y < this.world.height + this.r + margin;
        return !(xIn && yIn);
    }

    /**
     * Render
     */
    render(ctx: CanvasRenderingContext2D): void {
        if (!this.isInScreen()) {
            return;
        }

        let hpRate = this.hp / this.maxHp;
        let c = this.getBodyCircle();
        c.render(ctx);

        if (this.maxHp > 0) {
            if (!this.isDead()) {
                let barH = this.hpBarHeight;
                let barX = this.pos.x - this.r;
                let barY = this.pos.y - this.r - 2.5 * barH;
                let barW = this.r * 2;

                if (!this._hpBarBorder) {
                    this._hpBarBorder = new Rectangle(barX, barY, barW, barH);
                    this._hpBarBorder.setStrokeWidth(1);
                    this._hpBarBorder.setFillColor(0, 0, 0, 0);
                    this._hpBarBorder.setStrokeColor(1, 1, 1);
                } else {
                    this._hpBarBorder.pos.x = barX;
                    this._hpBarBorder.pos.y = barY;
                    this._hpBarBorder.width = barW;
                    this._hpBarBorder.height = barH;
                }
                this._hpBarBorder.render(ctx);

                if (!this._hpBarFill) {
                    this._hpBarFill = new Rectangle(barX, barY, barW * hpRate, barH);
                    this._hpBarFill.setStrokeWidth(0);
                    this._hpBarFill.setFillColor(this.hpColor.r, this.hpColor.g, this.hpColor.b, this.hpColor.a);
                } else {
                    this._hpBarFill.pos.x = barX;
                    this._hpBarFill.pos.y = barY;
                    this._hpBarFill.width = barW * hpRate;
                    this._hpBarFill.height = barH;
                    this._hpBarFill.setFillColor(this.hpColor.r, this.hpColor.g, this.hpColor.b, this.hpColor.a);
                }
                this._hpBarFill.render(ctx);

                let hpInt = Math.floor(this.hp);
                if (hpInt !== this._lastHpInt) {
                    this._lastHpInt = hpInt;
                    this._hpStr = hpInt.toString();
                }
                ctx.fillStyle = "black";
                ctx.font = CircleObject.FONT_9;
                ctx.textAlign = "center";
                ctx.textBaseline = "top";
                ctx.fillText(this._hpStr, this.pos.x, barY + 1);
            }
        }
    }
}
