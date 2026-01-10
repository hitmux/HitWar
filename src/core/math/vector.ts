/**
 * Vector class for 2D vector operations
 * by littlefean
 */
export class Vector {
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
    toTheta(): number {
        let alpha = Math.atan(this.x / this.y);
        if (this.y < 0) {
            alpha *= -1;
        }
        return alpha;
    }

    /**
     * Rotate vector and return new rotated vector
     */
    rotate(a: number): Vector {
        if (a === 0) {
            return this;
        }
        let alpha = this.toTheta();
        alpha += a;
        const res = new Vector(Math.sin(alpha), Math.cos(alpha)).mul(this.abs());
        return res;
    }

    /**
     * Rotate point p1 around pivot p0 by angle a
     */
    static rotatePoint(p0: Vector, p1: Vector, a: number): Vector {
        const ry0 = p0.y;
        const rx0 = p0.x;
        const x = p1.x;
        const y = p1.y;

        const cos = (x: number): number => Math.cos(x);
        const sin = (x: number): number => Math.sin(x);
        const x0 = (x - rx0) * cos(a) - (y - ry0) * sin(a) + rx0;
        const y0 = (x - rx0) * sin(a) + (y - ry0) * cos(a) + ry0;
        return new Vector(x0, y0);
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
        const a = Math.random() * 2 * Math.PI;
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
}
