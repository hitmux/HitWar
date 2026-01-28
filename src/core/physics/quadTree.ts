/**
 * QuadTree - Spatial partitioning for collision detection optimization
 * by Claude
 */

interface QuadTreeObject {
    pos: { x: number; y: number };
    r: number;
}

export class QuadTree {
    x: number;
    y: number;
    w: number;
    h: number;
    maxObjects: number;
    maxLevels: number;
    level: number;
    objects: QuadTreeObject[];
    nodes: QuadTree[];

    private static _nodePool: QuadTree[] = [];

    /**
     * Create a QuadTree node
     */
    constructor(
        x: number,
        y: number,
        w: number,
        h: number,
        maxObjects: number = 10,
        maxLevels: number = 4,
        level: number = 0
    ) {
        this.x = x;
        this.y = y;
        this.w = w;
        this.h = h;
        this.maxObjects = maxObjects;
        this.maxLevels = maxLevels;
        this.level = level;
        this.objects = [];
        this.nodes = [];
    }

    /**
     * Clear the quadtree
     */
    clear(): void {
        this.objects.length = 0;

        for (const node of this.nodes) {
            node.clear();
            QuadTree._nodePool.push(node);
        }
        this.nodes.length = 0;
    }

    /**
     * Split node into 4 subnodes
     */
    split(): void {
        const subWidth = this.w / 2;
        const subHeight = this.h / 2;
        const x = this.x;
        const y = this.y;

        this.nodes[0] = QuadTree._getNode(x, y, subWidth, subHeight,
            this.maxObjects, this.maxLevels, this.level + 1);
        this.nodes[1] = QuadTree._getNode(x + subWidth, y, subWidth, subHeight,
            this.maxObjects, this.maxLevels, this.level + 1);
        this.nodes[2] = QuadTree._getNode(x, y + subHeight, subWidth, subHeight,
            this.maxObjects, this.maxLevels, this.level + 1);
        this.nodes[3] = QuadTree._getNode(x + subWidth, y + subHeight, subWidth, subHeight,
            this.maxObjects, this.maxLevels, this.level + 1);
    }

    /**
     * Get indices of child nodes that the object belongs to
     */
    getIndices(obj: QuadTreeObject): number[] {
        // Create new array each call to avoid recursive corruption
        const indices: number[] = [];
        
        const midX = this.x + this.w / 2;
        const midY = this.y + this.h / 2;

        const left = obj.pos.x - obj.r;
        const right = obj.pos.x + obj.r;
        const top = obj.pos.y - obj.r;
        const bottom = obj.pos.y + obj.r;

        const inTop = top < midY;
        const inBottom = bottom > midY;
        const inLeft = left < midX;
        const inRight = right > midX;

        if (inTop && inLeft) indices.push(0);
        if (inTop && inRight) indices.push(1);
        if (inBottom && inLeft) indices.push(2);
        if (inBottom && inRight) indices.push(3);

        return indices;
    }

    /**
     * Insert an object into the quadtree
     */
    insert(obj: QuadTreeObject): void {
        if (this.nodes.length > 0) {
            const indices = this.getIndices(obj);
            for (const i of indices) {
                this.nodes[i].insert(obj);
            }
            return;
        }

        this.objects.push(obj);

        if (this.objects.length > this.maxObjects && this.level < this.maxLevels) {
            if (this.nodes.length === 0) {
                this.split();
            }

            for (const o of this.objects) {
                const indices = this.getIndices(o);
                for (const i of indices) {
                    this.nodes[i].insert(o);
                }
            }
            this.objects = [];
        }
    }

    /**
     * Retrieve all objects that could potentially collide with the given object
     */
    retrieve(obj: QuadTreeObject, result: QuadTreeObject[] = []): QuadTreeObject[] {
        for (const o of this.objects) {
            result.push(o);
        }

        if (this.nodes.length > 0) {
            const indices = this.getIndices(obj);
            for (const i of indices) {
                this.nodes[i].retrieve(obj, result);
            }
        }

        return result;
    }

    /**
     * Retrieve objects within a circular range
     */
    retrieveInRange(x: number, y: number, radius: number, result: QuadTreeObject[] = []): QuadTreeObject[] {
        const rangeObj: QuadTreeObject = {
            pos: { x: x, y: y },
            r: radius
        };
        return this.retrieve(rangeObj, result);
    }

    /**
     * Get a node from pool or create new one
     */
    private static _getNode(
        x: number,
        y: number,
        w: number,
        h: number,
        maxObjects: number,
        maxLevels: number,
        level: number
    ): QuadTree {
        const node = QuadTree._nodePool.pop();
        if (node) {
            node.x = x;
            node.y = y;
            node.w = w;
            node.h = h;
            node.maxObjects = maxObjects;
            node.maxLevels = maxLevels;
            node.level = level;
            return node;
        }
        return new QuadTree(x, y, w, h, maxObjects, maxLevels, level);
    }
}
