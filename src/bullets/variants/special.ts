/**
 * Special bullet variants
 * Shotgun, knockback, smoke, fire, poison, thunder ball
 */
import { Vector } from '../../core/math/vector';
import { MyColor } from '../../entities/myColor';
import { Bully } from '../bullet';
import { BulletRegistry } from '../bulletRegistry';

/**
 * Shotgun bullet
 */
export function S(): Bully {
    const b = new Bully(Vector.zero(), Vector.zero(), null, 5, 2.5);
    b.r = 1.6;
    b.damage = 40;
    b.bodyColor = MyColor.arrTo([0, 0, 255, 1]);
    return b;
}

/**
 * Knockback cannon - medium
 */
export function R_M(): Bully {
    const b = new Bully(Vector.zero(), Vector.zero(), null, 5, 5);
    b.damage = 20;
    b.bodyColor = MyColor.arrTo([204, 120, 50, 1]);
    b.repel = 0.1;
    b.collideSound = "/sound/子弹音效/击退炮.mp3";
    return b;
}

/**
 * Smoke/Powder bullet
 */
export function Powder(): Bully {
    const b = new Bully(Vector.zero(), Vector.zero(), null, 5, 10);
    b.damage = 0.8;
    b.r = 8;
    // Fire penetration
    b.throughable = true;
    b.throughCutNum = 0;
    b.accelerationV = -0.04;
    // Bullet color
    b.bodyColor = MyColor.arrTo([0, 0, 0, 0.2]);
    b.bodyStrokeWidth = 0;
    b.bodyStrokeColor = MyColor.arrTo([255, 255, 0, 0]);

    b.dr = 0.8;  // Spread
    b.dRGB = [+10, +10, +10, -0.0003];  // Fire color evolution
    b.laserDestoryAble = false;

    return b;
}

/**
 * Fire particle bullet - medium
 */
export function Fire_M(): Bully {
    const b = new Bully(Vector.zero(), Vector.zero(), null, 5, 10);
    b.damage = 1;
    b.r = 10;
    // Fire penetration
    b.throughable = true;
    b.throughCutNum = 0;
    b.accelerationV = -0.04;
    // Bullet color
    b.bodyColor = MyColor.arrTo([255, 255, 31, 0.1]);
    b.bodyStrokeWidth = 0;
    b.bodyStrokeColor = MyColor.arrTo([255, 255, 0, 0]);
    b.freezeCutDown = 1.001;  // Speed up effect

    b.dr = 1;  // Fire spread
    b.dRGB = [0, -10, -10, -0.0003];  // Fire color evolution
    b.burnRateAdd = 0.0001;
    b.laserDestoryAble = false;
    return b;
}

/**
 * Fire particle bullet - large
 */
export function Fire_L(): Bully {
    const b = new Bully(Vector.zero(), Vector.zero(), null, 5, 10);
    b.damage = 0.5;
    b.r = 20;
    // Fire penetration
    b.throughable = true;
    b.throughCutNum = 0;
    b.accelerationV = -0.04;
    // Bullet color
    b.bodyColor = MyColor.arrTo([255, 255, 31, 0.1]);
    b.bodyStrokeWidth = 0;
    b.bodyStrokeColor = MyColor.arrTo([255, 255, 0, 0]);
    b.freezeCutDown = 1.0009;  // Speed up effect

    b.dr = 2;  // Fire spread
    b.dRGB = [0, -10, -10, -0.0003];  // Fire color evolution
    b.burnRateAdd = 0.0001;
    b.laserDestoryAble = false;
    return b;
}

/**
 * Fire particle bullet - extra large (blue fire)
 */
export function Fire_LL(): Bully {
    const b = new Bully(Vector.zero(), Vector.zero(), null, 5, 10);
    b.damage = 1;
    b.r = 10;
    // Fire penetration
    b.throughable = true;
    b.throughCutNum = 0;
    b.accelerationV = -0.04;
    // Bullet color
    b.bodyColor = MyColor.arrTo([50, 100, 255, 0.1]);
    b.bodyStrokeWidth = 0;
    b.bodyStrokeColor = MyColor.arrTo([255, 255, 0, 0]);
    b.freezeCutDown = 1.0005;  // Speed up effect

    b.dr = 3;  // Fire spread
    b.dRGB = [+20, -5, -50, -0.0003];  // Fire color evolution
    b.burnRateAdd = 0.0001;
    b.laserDestoryAble = false;
    return b;
}

/**
 * Poison gas bullet - large
 */
export function P_L(): Bully {
    const b = new Bully(Vector.zero(), Vector.zero(), null, 5, 10);
    b.r = 2;
    b.damage = 3;
    b.throughable = true;
    b.throughCutNum = 2;
    b.accelerationV = -0.005;

    // Bullet color
    b.bodyColor = MyColor.arrTo([50, 255, 20, 0.1]);
    b.bodyStrokeWidth = 0;
    b.bodyStrokeColor = MyColor.arrTo([255, 255, 0, 0]);
    b.dRGB = [0, 0, 0, -0.0003];  // Color evolution
    b.dr = 1;  // Spread
    b.laserDestoryAble = false;
    return b;
}

/**
 * Poison gas bullet - medium
 */
export function P_M(): Bully {
    const b = new Bully(Vector.zero(), Vector.zero(), null, 5, 10);
    b.r = 10;
    b.damage = 5;
    b.throughable = true;
    b.throughCutNum = 2;
    b.accelerationV = -0.005;

    // Bullet color
    b.bodyColor = MyColor.arrTo([20, 100, 20, 0.1]);
    b.bodyStrokeWidth = 0;
    b.bodyStrokeColor = MyColor.arrTo([255, 255, 0, 0]);
    b.dRGB = [0, 0, 0, -0.0003];  // Color evolution
    b.dr = 2;  // Spread
    b.laserDestoryAble = false;
    return b;
}

/**
 * Thunder ball - tracking lightning bullet
 */
export function ThunderBall(): Bully {
    const b = new Bully(Vector.zero(), Vector.zero(), null, 5, 2.5);
    b.damage = 100;
    b.dDamage = 5;
    b.r = 10;
    b.dr = 0.3;
    b.targetAble = true;
    b.viewRadius = 300;
    b.speedToTargetN = 16;
    b.laserDestoryAble = false;
    b.haveBomb = true;
    b.bombDamage = 200;
    b.bombRange = 160;

    b.bodyColor = MyColor.arrTo([65, 165, 238, 0.5]);
    b.bodyStrokeColor = MyColor.arrTo([51, 133, 255, 1]);
    b.bodyStrokeWidth = 3;
    return b;
}

// Register all special bullets
BulletRegistry.register('S', S);
BulletRegistry.register('R_M', R_M);
BulletRegistry.register('Powder', Powder);
BulletRegistry.register('Fire_M', Fire_M);
BulletRegistry.register('Fire_L', Fire_L);
BulletRegistry.register('Fire_LL', Fire_LL);
BulletRegistry.register('P_L', P_L);
BulletRegistry.register('P_M', P_M);
BulletRegistry.register('ThunderBall', ThunderBall);
