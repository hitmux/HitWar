/**
 * Explosive bullet variants
 * Fire cannons and tracking missiles
 */
import { Vector } from '../../core/math/vector';
import { MyColor } from '../../entities/myColor';
import { Bully } from '../bullet';
import { BulletRegistry } from '../bulletRegistry';

/**
 * Fire cannon - small
 */
export function H_S(): Bully {
    const b = new Bully(Vector.zero(), Vector.zero(), null, 5, 2.5);
    b.r = 4;
    b.damage = 100;

    b.haveBomb = true;
    b.bombDamage = 1000;
    b.bombRange = 35;
    b.bombFunc = b.bombFire;
    b.accelerationV = 0.05;

    b.bodyColor = MyColor.arrTo([203, 91, 36, 1]);
    b.bodyStrokeColor = MyColor.arrTo([255, 100, 20, 1]);
    b.bodyStrokeWidth = 2;
    b.collideSound = "/sound/子弹音效/火炮爆炸.ogg";
    return b;
}

/**
 * Fire cannon - large
 */
export function H_L(): Bully {
    const b = new Bully(Vector.zero(), Vector.zero(), null, 5, 2.5);
    b.r = 6;
    b.damage = 200;

    b.haveBomb = true;
    b.bombDamage = 2000;
    b.bombRange = 60;
    b.bombFunc = b.bombFire;
    b.accelerationV = 0.05;

    b.bodyColor = MyColor.arrTo([203, 60, 10, 1]);
    b.bodyStrokeColor = MyColor.arrTo([255, 100, 20, 1]);
    b.bodyStrokeWidth = 4;
    b.collideSound = "/sound/子弹音效/火炮爆炸.ogg";
    return b;
}

/**
 * Fire cannon - extra large
 */
export function H_LL(): Bully {
    const b = new Bully(Vector.zero(), Vector.zero(), null, 5, 10);
    b.damage = 500;

    b.haveBomb = true;
    b.bombDamage = 3500;
    b.bombRange = 120;
    b.bombFunc = b.bombFire;
    b.accelerationV = 0.05;

    b.bodyColor = MyColor.arrTo([255, 20, 10, 1]);
    b.bodyStrokeColor = MyColor.arrTo([255, 100, 20, 1]);
    b.bodyStrokeWidth = 6;
    b.collideSound = "/sound/子弹音效/火炮爆炸.ogg";
    return b;
}

/**
 * Tracking missile - small
 */
export function H_Target_S(): Bully {
    const b = new Bully(Vector.zero(), Vector.zero(), null, 5, 2.5);
    b.r = 6;
    b.damage = 100;

    b.haveBomb = true;
    b.bombDamage = 100;
    b.bombRange = 100;
    b.bombFunc = b.bombFire;

    b.targetAble = true;
    b.viewRadius = 50;
    b.speedToTargetN = 5;

    b.bodyColor = MyColor.arrTo([168, 182, 172, 1]);
    b.bodyStrokeColor = MyColor.arrTo([255, 198, 109, 1]);
    b.bodyStrokeWidth = 4;
    b.collideSound = "/sound/large_gun_fire2.ogg";
    return b;
}

/**
 * Manual Cannon Shell - Explosive shell for ManualCannon tower
 * Can hit buildings (unique property)
 */
export function ManualCannon_Shell(): Bully {
    const b = new Bully(Vector.zero(), Vector.zero(), null, 5, 3);
    b.r = 5;
    b.damage = 50; // Direct hit damage

    b.haveBomb = true;
    b.bombDamage = 100; // Explosion damage (will be overridden by tower)
    b.bombRange = 50;   // Explosion radius (will be overridden by tower)
    b.bombFunc = b.bombFire;
    b.accelerationV = 0.03;

    // Can hit buildings flag (handled by collision system)
    (b as any).canHitBuildings = true;
    // Store target position for guided behavior
    (b as any).targetPos = null;

    // Dark metallic color
    b.bodyColor = MyColor.arrTo([80, 80, 100, 1]);
    b.bodyStrokeColor = MyColor.arrTo([120, 120, 150, 1]);
    b.bodyStrokeWidth = 3;
    b.collideSound = "/sound/子弹音效/火炮爆炸.ogg";
    return b;
}

// Register all explosive bullets
BulletRegistry.register('H_S', H_S);
BulletRegistry.register('H_L', H_L);
BulletRegistry.register('H_LL', H_LL);
BulletRegistry.register('H_Target_S', H_Target_S);
BulletRegistry.register('ManualCannon_Shell', ManualCannon_Shell);
