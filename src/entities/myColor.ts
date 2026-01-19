/**
 * Color utility class
 * by littlefean
 */

/** Readonly color interface - for type constraints on shared instances */
export interface ReadonlyColor {
    readonly r: number;
    readonly g: number;
    readonly b: number;
    readonly a: number;
    toStringRGB(): string;
    toStringRGBA(): string;
    toArr(): [number, number, number, number];
}

export class MyColor implements ReadonlyColor {
    r: number;
    g: number;
    b: number;
    a: number;
    private _rgbCache: string | null;
    private _rgbaCache: string | null;

    constructor(r: number, g: number, b: number, a: number) {
        this.r = this.limit0_255(r);
        this.g = this.limit0_255(g);
        this.b = this.limit0_255(b);
        this.a = this.limit0_1(a);
        this._rgbCache = null;
        this._rgbaCache = null;
    }

    toStringRGBA(): string {
        if (!this._rgbaCache) {
            this._rgbaCache = `rgba(${this.r}, ${this.g}, ${this.b}, ${this.a})`;
        }
        return this._rgbaCache;
    }

    setRGB(r: number, g: number, b: number): void {
        const newR = this.limit0_255(r);
        const newG = this.limit0_255(g);
        const newB = this.limit0_255(b);
        
        // 仅在值真正改变时清空缓存
        if (this.r !== newR || this.g !== newG || this.b !== newB) {
            this.r = newR;
            this.g = newG;
            this.b = newB;
            this._rgbCache = null;
            this._rgbaCache = null;
        }
    }

    setRGBA(r: number, g: number, b: number, a: number): void {
        const newR = this.limit0_255(r);
        const newG = this.limit0_255(g);
        const newB = this.limit0_255(b);
        const newA = this.limit0_1(a);
        
        // 仅在值真正改变时清空缓存
        if (this.r !== newR || this.g !== newG || this.b !== newB || this.a !== newA) {
            this.r = newR;
            this.g = newG;
            this.b = newB;
            this.a = newA;
            this._rgbCache = null;
            this._rgbaCache = null;
        }
    }

    /**
     * Change color values
     * @param dr delta red
     * @param dg delta green
     * @param db delta blue
     * @param da delta alpha
     */
    change(dr: number, dg: number, db: number, da: number): void {
        const newR = this.limit0_255(this.r + dr);
        const newG = this.limit0_255(this.g + dg);
        const newB = this.limit0_255(this.b + db);
        const newA = this.limit0_1(this.a + da);
        
        // 仅在值真正改变时清空缓存
        if (this.r !== newR || this.g !== newG || this.b !== newB || this.a !== newA) {
            this.r = newR;
            this.g = newG;
            this.b = newB;
            this.a = newA;
            this._rgbCache = null;
            this._rgbaCache = null;
        }
    }

    changeAlpha(newAlpha: number): void {
        const newA = this.limit0_1(newAlpha);
        if (this.a !== newA) {
            this.a = newA;
            this._rgbaCache = null;
        }
    }

    toArr(): [number, number, number, number] {
        return [this.r, this.g, this.b, this.a];
    }

    // Helper to create frozen instance with pre-filled cache
    private static createFrozen(r: number, g: number, b: number, a: number): ReadonlyColor {
        const color = new MyColor(r, g, b, a);
        // Pre-fill cache before freezing to avoid lazy-init write errors
        color.toStringRGB();
        color.toStringRGBA();
        return Object.freeze(color) as ReadonlyColor;
    }

    // Frozen shared instances (immutable, safe to share)
    private static readonly _BLACK: ReadonlyColor = MyColor.createFrozen(0, 0, 0, 1);
    private static readonly _GRAY: ReadonlyColor = MyColor.createFrozen(60, 63, 65, 1);
    private static readonly _TRANSPARENT: ReadonlyColor = MyColor.createFrozen(0, 0, 0, 0);

    /**
     * Returns readonly black instance (shared, immutable)
     * Use for: bodyStrokeColor and other read-only scenarios
     */
    static BLACK(): ReadonlyColor {
        return MyColor._BLACK;
    }

    /**
     * Returns readonly gray instance (shared, immutable)
     */
    static GRAY(): ReadonlyColor {
        return MyColor._GRAY;
    }

    /**
     * Returns readonly transparent instance (shared, immutable)
     */
    static Transparent(): ReadonlyColor {
        return MyColor._TRANSPARENT;
    }

    /**
     * Creates a mutable black instance
     * Use for: scenarios requiring setRGB/setRGBA calls
     */
    static createBlack(): MyColor {
        return new MyColor(0, 0, 0, 1);
    }

    static createGray(): MyColor {
        return new MyColor(60, 63, 65, 1);
    }

    static createTransparent(): MyColor {
        return new MyColor(0, 0, 0, 0);
    }

    static arrTo(arr: [number, number, number, number]): MyColor {
        return new MyColor(...arr);
    }

    toStringRGB(): string {
        if (!this._rgbCache) {
            this._rgbCache = `rgb(${this.r}, ${this.g}, ${this.b})`;
        }
        return this._rgbCache;
    }

    limit0_255(n: number): number {
        let res = n;
        if (n > 255) {
            res = 255;
        }
        if (n < 0) {
            res = 0;
        }
        return res;
    }

    limit0_1(n: number): number {
        let res = n;
        if (n > 1) {
            res = 1;
        }
        if (n < 0) {
            res = 0;
        }
        return res;
    }
}
