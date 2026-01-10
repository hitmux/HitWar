/**
 * Penetrating bullet variants
 * Armor-piercing bullets that can pass through enemies
 */
import { Vector } from '../../core/math/vector';
import { MyColor } from '../../entities/myColor';
import { Bully } from '../bullet';
import { BulletRegistry } from '../bulletRegistry';

/**
 * Armor-piercing bullet - medium
 */
export function T_M(): Bully {
    const b = new Bully(Vector.zero(), Vector.zero(), null, 5, 2.5);
    b.throughable = true;
    b.throughCutNum = 0.1;

    b.damage = 30;
    b.bodyColor = MyColor.arrTo([0, 200, 255, 1]);
    b.bodyStrokeColor = MyColor.BLACK();
    return b;
}

/**
 * Armor-piercing bullet - large
 */
export function T_L(): Bully {
    const b = new Bully(Vector.zero(), Vector.zero(), null, 5, 2.5);
    b.throughable = true;
    b.throughCutNum = 1;

    b.r = 4;
    b.damage = 40;
    b.bodyColor = MyColor.arrTo([0, 150, 255, 1]);
    b.bodyStrokeColor = MyColor.BLACK();
    return b;
}

/**
 * Armor-piercing bullet - extra large
 */
export function T_LL(): Bully {
    const b = new Bully(Vector.zero(), Vector.zero(), null, 5, 8);
    b.throughable = true;
    b.throughCutNum = 1;
    b.damage = 120;
    b.bodyColor = MyColor.arrTo([0, 100, 255, 1]);
    b.bodyStrokeColor = MyColor.BLACK();
    return b;
}

// Register all penetrating bullets
BulletRegistry.register('T_M', T_M);
BulletRegistry.register('T_L', T_L);
BulletRegistry.register('T_LL', T_LL);
