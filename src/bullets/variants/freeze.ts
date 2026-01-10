/**
 * Freeze bullet variants
 * Ice bombs that slow enemies
 */
import { Vector } from '../../core/math/vector';
import { MyColor } from '../../entities/myColor';
import { Bully } from '../bullet';
import { BulletRegistry } from '../bulletRegistry';

/**
 * Freeze bomb - small
 */
export function Frozen_S(): Bully {
    const b = new Bully(Vector.zero(), Vector.zero(), null, 5, 1);
    b.damage = 0.1;

    b.haveBomb = true;
    b.bombDamage = 0.1;
    b.bombRange = 10;
    b.bombFunc = b.bombFreeze;
    b.freezeCutDown = 0.98;

    b.bodyColor = MyColor.arrTo([0, 100, 255, 1]);
    b.bodyStrokeColor = MyColor.arrTo([100, 100, 255, 1]);
    b.bodyStrokeWidth = 0.5;
    return b;
}

/**
 * Freeze bomb - medium
 */
export function Frozen_M(): Bully {
    const b = new Bully(Vector.zero(), Vector.zero(), null, 5, 1);
    b.damage = 0.1;
    b.r = 2;

    b.haveBomb = true;
    b.bombDamage = 0.1;
    b.bombRange = 20;
    b.bombFunc = b.bombFreeze;
    b.freezeCutDown = 0.9;

    b.bodyColor = MyColor.arrTo([0, 50, 255, 1]);
    b.bodyStrokeColor = MyColor.arrTo([10, 100, 255, 1]);
    b.bodyStrokeWidth = 0.5;
    return b;
}

/**
 * Freeze bomb - large
 */
export function Frozen_L(): Bully {
    const b = new Bully(Vector.zero(), Vector.zero(), null, 5, 1);
    b.damage = 0.1;
    b.r = 5;

    b.haveBomb = true;
    b.bombDamage = 0.1;
    b.bombRange = 30;
    b.bombFunc = b.bombFreeze;
    b.freezeCutDown = 0.7;

    b.bodyColor = MyColor.arrTo([122, 159, 216, 0.75]);
    b.bodyStrokeColor = MyColor.arrTo([10, 50, 255, 1]);
    b.bodyStrokeWidth = 0.5;
    return b;
}

// Register all freeze bullets
BulletRegistry.register('Frozen_S', Frozen_S);
BulletRegistry.register('Frozen_M', Frozen_M);
BulletRegistry.register('Frozen_L', Frozen_L);
