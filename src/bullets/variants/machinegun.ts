/**
 * Machine gun bullet variants
 * Fast-firing, small damage bullets
 */
import { Vector } from '../../core/math/vector';
import { MyColor } from '../../entities/myColor';
import { Bully } from '../bullet';
import { BulletRegistry } from '../bulletRegistry';

/**
 * Machine gun bullet - small
 */
export function F_S(): Bully {
    const b = new Bully(Vector.zero(), Vector.zero(), null, 5, 2.5);
    b.r = 0.8;
    b.damage = 10;
    b.bodyColor = new MyColor(20, 20, 20, 1);
    b.bodyStrokeWidth = 0;
    b.bodyStrokeColor = MyColor.arrTo([0, 0, 0, 0]);
    return b;
}

/**
 * Machine gun bullet - medium
 */
export function F_M(): Bully {
    const b = new Bully(Vector.zero(), Vector.zero(), null, 5, 2.5);
    b.r = 0.9;
    b.damage = 30;
    b.bodyColor = MyColor.arrTo([10, 10, 10, 1]);
    b.bodyStrokeWidth = 0;
    b.bodyStrokeColor = MyColor.arrTo([10, 10, 10, 0]);
    return b;
}

/**
 * Machine gun bullet - large
 */
export function F_L(): Bully {
    const b = new Bully(Vector.zero(), Vector.zero(), null, 5, 2.5);
    b.r = 1;
    b.damage = 30;
    b.bodyColor = MyColor.arrTo([0, 0, 0, 1]);
    b.bodyStrokeWidth = 0;
    b.bodyStrokeColor = MyColor.arrTo([0, 0, 0, 0]);
    return b;
}

// Register all machine gun bullets
BulletRegistry.register('F_S', F_S);
BulletRegistry.register('F_M', F_M);
BulletRegistry.register('F_L', F_L);
