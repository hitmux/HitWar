/**
 * Basic bullet variants
 * Normal bullets, arrows, cannon stones, military bullets, rifle bullets
 */
import { Vector } from '../../core/math/vector';
import { MyColor } from '../../entities/myColor';
import { Bullet } from '../bullet';
import { BulletRegistry } from '../bulletRegistry';

/**
 * Normal bullet - default bullet type
 */
export function Normal(): Bullet {
    const res = new Bullet(Vector.zero(), Vector.zero(), null, 5, 2.5);
    return res;
}

/**
 * Small stone bullet
 */
export function littleStone(): Bullet {
    const res = new Bullet(Vector.zero(), Vector.zero(), null, 5, 2.5);
    res.damage = 7;
    res.r = 3;
    res.bodyColor = new MyColor(130, 131, 133, 1);
    res.bodyStrokeColor = MyColor.BLACK();
    res.bodyStrokeWidth = 1;
    return res;
}

/**
 * Arrow bullet
 */
export function Arrow(): Bullet {
    const res = new Bullet(Vector.zero(), Vector.zero(), null, 5, 2.5);
    res.damage = 10;
    res.r = 2;
    res.bodyColor = new MyColor(104, 128, 144, 1);
    res.bodyStrokeColor = MyColor.BLACK();
    res.bodyStrokeWidth = 0.5;
    res.dRGB = [-10, -10, -10, 0];
    return res;
}

/**
 * Large arrow
 */
export function Arrow_L(): Bullet {
    const res = new Bullet(Vector.zero(), Vector.zero(), null, 5, 2.5);
    res.damage = 15;
    res.r = 2.5;
    res.bodyColor = new MyColor(104, 128, 144, 1);
    res.bodyStrokeColor = MyColor.BLACK();
    res.bodyStrokeWidth = 0.5;
    res.dRGB = [-15, -15, -15, 0];
    return res;
}

/**
 * Crossbow arrow (not repeating crossbow)
 */
export function Arrow_LL(): Bullet {
    const res = new Bullet(Vector.zero(), Vector.zero(), null, 5, 2.5);
    res.damage = 70;
    res.r = 2.7;
    res.bodyColor = new MyColor(177, 119, 49, 1);
    res.bodyStrokeColor = MyColor.BLACK();
    res.bodyStrokeWidth = 0.6;
    res.dRGB = [-20, -20, -20, 0];
    return res;
}

/**
 * Cannon stone - small
 */
export function CannonStone_S(): Bullet {
    const res = new Bullet(Vector.zero(), Vector.zero(), null, 5, 2.5);
    res.damage = 500;
    res.r = 4;
    res.bodyColor = new MyColor(66, 66, 66, 1);
    res.bodyStrokeColor = new MyColor(135, 147, 154, 1);
    res.bodyStrokeWidth = 2;
    return res;
}

/**
 * Cannon stone - medium
 */
export function CannonStone_M(): Bullet {
    const res = new Bullet(Vector.zero(), Vector.zero(), null, 5, 2.5);
    res.damage = 800;
    res.r = 6;
    res.bodyColor = new MyColor(66, 66, 66, 1);
    res.bodyStrokeColor = new MyColor(135, 147, 154, 1);
    res.bodyStrokeWidth = 2.2;
    return res;
}

/**
 * Cannon stone - large (with split)
 */
export function CannonStone_L(): Bullet {
    const res = new Bullet(Vector.zero(), Vector.zero(), null, 5, 2.5);
    res.damage = 1000;
    res.r = 8;
    res.bodyColor = new MyColor(66, 66, 66, 1);
    res.bodyStrokeColor = new MyColor(135, 147, 154, 1);
    res.bodyStrokeWidth = 2.5;
    res.splitAble = true;
    res.splitNum = 13;
    res.splitRandomV = 5;
    res.splitRangeRate = 200;
    res.splitRotate = 1.5;
    res.splitBullet = () => BulletRegistry.create('littleStone') as Bullet;
    return res;
}

/**
 * Military bullet - small
 */
export function Bullet_S(): Bullet {
    const res = new Bullet(Vector.zero(), Vector.zero(), null, 5, 2.5);
    res.damage = 40;
    res.r = 1.5;
    res.bodyColor = new MyColor(86, 94, 39, 1);
    res.bodyStrokeColor = new MyColor(98, 151, 85, 1);
    res.bodyStrokeWidth = 1;
    return res;
}

/**
 * Military bullet - medium
 */
export function Bullet_M(): Bullet {
    const res = new Bullet(Vector.zero(), Vector.zero(), null, 5, 2.5);
    res.damage = 50;
    res.r = 1.7;
    res.bodyColor = new MyColor(86, 94, 39, 1);
    res.bodyStrokeColor = new MyColor(98, 151, 85, 1);
    res.bodyStrokeWidth = 1;
    return res;
}

/**
 * Military bullet - large
 */
export function Bullet_L(): Bullet {
    const res = new Bullet(Vector.zero(), Vector.zero(), null, 5, 2.5);
    res.damage = 75;
    res.r = 2;
    res.bodyColor = new MyColor(86, 94, 39, 1);
    res.bodyStrokeColor = new MyColor(98, 151, 85, 1);
    res.bodyStrokeWidth = 1;
    return res;
}

/**
 * Rifle bullet - small
 */
export function Rifle_Bullet_S(): Bullet {
    const res = new Bullet(Vector.zero(), Vector.zero(), null, 5, 2.5);
    res.damage = 70;
    res.r = 1;
    res.bodyColor = new MyColor(64, 182, 224, 1);
    res.bodyStrokeColor = new MyColor(98, 151, 85, 1);
    res.bodyStrokeWidth = 0.2;
    return res;
}

/**
 * Rifle bullet - medium
 */
export function Rifle_Bullet_M(): Bullet {
    const res = new Bullet(Vector.zero(), Vector.zero(), null, 5, 2.5);
    res.damage = 100;
    res.r = 1.1;
    res.bodyColor = new MyColor(64, 182, 224, 1);
    res.bodyStrokeColor = new MyColor(98, 151, 85, 1);
    res.bodyStrokeWidth = 0.2;
    return res;
}

/**
 * Rifle bullet - large
 */
export function Rifle_Bullet_L(): Bullet {
    const res = new Bullet(Vector.zero(), Vector.zero(), null, 5, 2.5);
    res.damage = 150;
    res.r = 1.2;
    res.bodyColor = new MyColor(64, 182, 224, 1);
    res.bodyStrokeColor = new MyColor(98, 151, 85, 1);
    return res;
}

// Register all basic bullets
BulletRegistry.register('Normal', Normal);
BulletRegistry.register('littleStone', littleStone);
BulletRegistry.register('Arrow', Arrow);
BulletRegistry.register('Arrow_L', Arrow_L);
BulletRegistry.register('Arrow_LL', Arrow_LL);
BulletRegistry.register('CannonStone_S', CannonStone_S);
BulletRegistry.register('CannonStone_M', CannonStone_M);
BulletRegistry.register('CannonStone_L', CannonStone_L);
BulletRegistry.register('Bullet_S', Bullet_S);
BulletRegistry.register('Bullet_M', Bullet_M);
BulletRegistry.register('Bullet_L', Bullet_L);
BulletRegistry.register('Rifle_Bullet_S', Rifle_Bullet_S);
BulletRegistry.register('Rifle_Bullet_M', Rifle_Bullet_M);
BulletRegistry.register('Rifle_Bullet_L', Rifle_Bullet_L);
