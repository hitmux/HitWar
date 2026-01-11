/**
 * Vector class for 2D vector operations
 * by littlefean
 */
export class Vector {
    // Precomputed constant
    private static readonly TWO_PI = Math.PI * 2;

    x: number;
    y: number;

    constructor(x: number, y: number) {
        this.x = x;
        this.y = y;
    }

    add(otherVector: Vector): void {
        this.x += otherVector.x;
        this.y += otherVector.y;
    }

    /**
     * Returns a new vector that is the sum of this and other
     */
    plus(otherVector: Vector): Vector {
        return new Vector(this.x + otherVector.x, this.y + otherVector.y);
    }

    /**
     * Normalize to unit vector
     */
    to1(): Vector {
        const a = Math.sqrt(this.x * this.x + this.y * this.y);
        const x = this.x / a;
        const y = this.y / a;
        return new Vector(x, y);
    }

    /**
     * Subtract another vector
     */
    sub(otherVector: Vector): Vector {
        const x = this.x - otherVector.x;
        const y = this.y - otherVector.y;
        return new Vector(x, y);
    }

    /**
     * Multiply by scalar
     */
    mul(n: number): Vector {
        return new Vector(this.x * n, this.y * n);
    }


    /**
     * Subtract another vector in place (modifies this vector)
     */
    subInPlace(otherVector: Vector): this {
        this.x -= otherVector.x;
        this.y -= otherVector.y;
        return this;
    }

    /**
     * Multiply by scalar in place (modifies this vector)
     */
    mulInPlace(n: number): this {
        this.x *= n;
        this.y *= n;
        return this;
    }

    /**
     * Normalize to unit vector in place (modifies this vector)
     */
    normalizeInPlace(): this {
        const a = Math.sqrt(this.x * this.x + this.y * this.y);
        this.x /= a;
        this.y /= a;
        return this;
    }

    /**
     * Add another vector and return new vector
     */
    plusInPlace(otherVector: Vector): this {
        this.x += otherVector.x;
        this.y += otherVector.y;
        return this;
    }

    /**
     * Get distance between two position vectors
     */
    dis(other: Vector): number {
        const dx = this.x - other.x;
        const dy = this.y - other.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    /**
     * Get squared distance between two position vectors (faster, no sqrt)
     */
    disSq(other: Vector): number {
        const dx = this.x - other.x;
        const dy = this.y - other.y;
        return dx * dx + dy * dy;
    }

    /**
     * Get magnitude
     */
    abs(): number {
        return Math.sqrt(this.x * this.x + this.y * this.y);
    }

    /**
     * Get squared magnitude (faster, no sqrt)
     */
    absSq(): number {
        return this.x * this.x + this.y * this.y;
    }

    /**
     * Convert to angle in radians
     */
    /**
     * Convert to angle in radians (y-axis positive = 0°)
     */
    toTheta(): number {
        return Math.atan2(this.x, this.y);
    }

    /**
     * Rotate vector and return new rotated vector
     */
    /**
     * Rotate vector and return new rotated vector
     */
    rotate(a: number): Vector {
        if (a === 0) {
            return this;
        }
        const cos = Math.cos(a);
        const sin = Math.sin(a);
        return new Vector(
            this.x * cos - this.y * sin,
            this.x * sin + this.y * cos
        );
    }

    /**
     * Rotate point p1 around pivot p0 by angle a
     */
    static rotatePoint(p0: Vector, p1: Vector, a: number): Vector {
        const cosA = Math.cos(a);
        const sinA = Math.sin(a);
        const dx = p1.x - p0.x;
        const dy = p1.y - p0.y;
        return new Vector(
            dx * cosA - dy * sinA + p0.x,
            dx * sinA + dy * cosA + p0.y
        );
    }

    /**
     * Rotate 90 degrees counter-clockwise
     */
    rotate90(): Vector {
        return new Vector(-this.y, this.x);
    }

    /**
     * Random deviation
     * @param diff deviation distance
     */
    deviation(diff: number): Vector {
        const diffX = Math.random() * diff - diff / 2;
        const diffY = Math.random() * diff - diff / 2;
        const x = this.x + diffX;
        const y = this.y + diffY;
        return new Vector(x, y);
    }

    /**
     * Get random unit circle vector
     */
    static randCircle(): Vector {
        const a = Math.random() * Vector.TWO_PI;
        const x = Math.sin(a);
        const y = Math.cos(a);
        return new Vector(x, y);
    }

    static zero(): Vector {
        return new Vector(0, 0);
    }

    /**
     * Random position on rectangle edge
     */
    static randRectBrim(xMin: number, xMax: number, yMin: number, yMax: number): Vector {
        let x: number, y: number;
        const rand = Math.random();
        if (rand < 0.25) {
            y = 0;
            x = Math.random() * (xMax - xMin);
        } else if (rand < 0.5) {
            y = (yMax - yMin);
            x = Math.random() * (xMax - xMin);
        } else if (rand < 0.75) {
            x = 0;
            y = Math.random() * (yMax - yMin);
        } else {
            x = (xMax - xMin);
            y = Math.random() * (yMax - yMin);
        }
        return new Vector(x, y);
    }

    /**
     * Generate random position in annular region
     */
    static randCircleOutside(
        centerX: number,
        centerY: number,
        minRadius: number,
        maxRadius: number,
        worldWidth: number,
        worldHeight: number
    ): Vector {
        const angle = Math.random() * Math.PI * 2;
        const dist = minRadius + Math.random() * (maxRadius - minRadius);
        const x = centerX + Math.cos(angle) * dist;
        const y = centerY + Math.sin(angle) * dist;
        return new Vector(x, y);
    }

    toString(): string {
        return `(${this.x},${this.y})`;
    }

    copy(): Vector {
        return new Vector(this.x, this.y);
    }

    /**
     * Copy values from another vector (modifies this vector)
     */
    copyFrom(other: Vector): this {
        this.x = other.x;
        this.y = other.y;
        return this;
    }

    // ==================== Static *To methods (write result to out parameter) ====================

    /**
     * Subtract b from a, write result to out
     */
    static subTo(a: Vector, b: Vector, out: Vector): Vector {
        out.x = a.x - b.x;
        out.y = a.y - b.y;
        return out;
    }

    /**
     * Multiply vector by scalar, write result to out
     */
    static mulTo(v: Vector, n: number, out: Vector): Vector {
        out.x = v.x * n;
        out.y = v.y * n;
        return out;
    }

    /**
     * Normalize vector to unit length, write result to out
     */
    static normalizeTo(v: Vector, out: Vector): Vector {
        const a = Math.sqrt(v.x * v.x + v.y * v.y);
        out.x = v.x / a;
        out.y = v.y / a;
        return out;
    }

    /**
     * Rotate 90 degrees counter-clockwise, write result to out
     */
    static rotate90To(v: Vector, out: Vector): Vector {
        out.x = -v.y;
        out.y = v.x;
        return out;
    }

    /**
     * Rotate point p1 around pivot p0 by angle a, write result to out
     */
    static rotatePointTo(p0: Vector, p1: Vector, a: number, out: Vector): Vector {
        const cos = Math.cos(a);
        const sin = Math.sin(a);
        const dx = p1.x - p0.x;
        const dy = p1.y - p0.y;
        out.x = dx * cos - dy * sin + p0.x;
        out.y = dx * sin + dy * cos + p0.y;
        return out;
    }
}
