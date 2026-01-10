/**
 * Split bullet variants
 * Bullets that split into multiple projectiles on impact
 */
import { Vector } from '../../core/math/vector';
import { MyColor } from '../../entities/myColor';
import { Bully } from '../bullet';
import { BulletRegistry } from '../bulletRegistry';

/**
 * Split bullet - small
 */
export function SS_S(): Bully {
    const b = new Bully(Vector.zero(), Vector.zero(), null, 5, 5);

    b.damage = 30;
    // Split bullet properties
    b.splitAble = true;
    b.splitNum = 6;
    b.splitRandomV = 2;
    b.splitRotate = Math.PI / 6;
    b.splitBully = () => BulletRegistry.create('Bully_S') as Bully;
    b.splitRangeRate = 200;
    b.bodyColor = MyColor.arrTo([0, 84, 71, 1]);
    return b;
}

/**
 * Split bullet - medium
 */
export function SS_M(): Bully {
    const b = new Bully(Vector.zero(), Vector.zero(), null, 5, 5);
    b.damage = 20;
    b.r = 6;
    // Split bullet properties
    b.splitAble = true;
    b.splitNum = 20;
    b.splitRandomV = 10;
    b.splitBully = () => BulletRegistry.create('Bully_M') as Bully;
    b.splitRangeRate = 250;
    b.bodyColor = MyColor.arrTo([0, 84, 71, 1]);
    return b;
}

/**
 * Split bullet - large (with explosion)
 */
export function SS_L(): Bully {
    const b = new Bully(Vector.zero(), Vector.zero(), null, 5, 5);
    b.damage = 50;
    b.r = 8;
    // Explosive properties
    b.haveBomb = true;
    b.bombDamage = 100;
    b.bombRange = 50;
    b.bombFunc = b.bombFire;
    // Split bullet properties
    b.splitAble = true;
    b.splitNum = 20;
    b.splitRandomV = 20;
    b.splitBully = () => BulletRegistry.create('Bully_L') as Bully;
    b.splitRangeRate = 300;

    b.bodyColor = MyColor.arrTo([0, 84, 71, 1]);
    return b;
}

/**
 * Super split bullet - second level
 */
export function SS_Second(): Bully {
    const b = new Bully(Vector.zero(), Vector.zero(), null, 5, 5);
    b.damage = 100;
    b.r = 15;
    // Explosive properties
    b.haveBomb = true;
    b.bombDamage = 200;
    b.bombRange = 80;
    b.bombFunc = b.bombFire;
    // Split bullet properties
    b.splitAble = true;
    b.splitNum = 5;
    b.splitRandomV = 10;
    b.splitBully = () => BulletRegistry.create('SS_S') as Bully;
    b.splitRangeRate = 100;

    b.bodyColor = MyColor.arrTo([0, 136, 111, 1]);
    return b;
}

/**
 * Super split bullet - third level
 */
export function SS_Third(): Bully {
    const b = new Bully(Vector.zero(), Vector.zero(), null, 5, 5);
    b.damage = 120;
    b.r = 20;
    // Explosive properties
    b.haveBomb = true;
    b.bombDamage = 300;
    b.bombRange = 100;
    b.bombFunc = b.bombFire;
    // Split bullet properties
    b.splitAble = true;
    b.splitNum = 5;
    b.splitRandomV = 10;
    b.splitBully = () => BulletRegistry.create('SS_Second') as Bully;
    b.splitRangeRate = 100;

    b.bodyColor = MyColor.arrTo([0, 234, 194, 1]);
    return b;
}

/**
 * Spike bullet (Brawl Stars Spike super)
 */
export function SpikeBully(): Bully {
    const b = new Bully(Vector.zero(), Vector.zero(), null, 5, 10);
    b.splitAble = true;
    b.splitNum = 10;
    b.splitRandomV = 0;
    b.splitV = 3;
    b.splitRotate = Math.PI * 2;
    b.splitRangeRate = 250;
    b.splitBully = () => BulletRegistry.create('CactusNeedle') as Bully;

    b.r = 10;
    b.bodyColor = MyColor.arrTo([97, 150, 66, 1]);
    b.bodyStrokeColor = new MyColor(41, 53, 29, 1);
    b.bodyStrokeWidth = 3;
    return b;
}

/**
 * Cactus needle bullet
 */
export function CactusNeedle(): Bully {
    const b = new Bully(Vector.zero(), Vector.zero(), null, 5, 10);

    b.r = 1;
    b.bodyColor = MyColor.arrTo([97, 150, 66, 1]);
    b.bodyStrokeColor = new MyColor(41, 53, 29, 1);
    b.bodyStrokeWidth = 3;
    return b;
}

// Register all split bullets
BulletRegistry.register('SS_S', SS_S);
BulletRegistry.register('SS_M', SS_M);
BulletRegistry.register('SS_L', SS_L);
BulletRegistry.register('SS_Second', SS_Second);
BulletRegistry.register('SS_Third', SS_Third);
BulletRegistry.register('SpikeBully', SpikeBully);
BulletRegistry.register('CactusNeedle', CactusNeedle);
