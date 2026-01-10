/**
 * Laser tower variants
 *
 * Contains: Laser, Laser_Blue_1~3, Laser_Green_1~3, Laser_Hell_1~2,
 *           Laser_Red, Laser_Red_Alpha_1~2, Laser_Red_Beta_1~2 (14 towers)
 */
import { MyColor } from '../../entities/myColor';
import { TowerLaser } from '../base/towerLaser';
import { TowerHell } from '../base/towerHell';
import { TowerRay } from '../base/towerRay';
import { TowerRegistry } from '../towerRegistry';

interface WorldLike {
    batterys: unknown[];
}

export function Laser(world: WorldLike): TowerLaser {
    const b = new TowerLaser(0, 0, world as any);
    b.name = "激光塔";
    b.r += 6;

    b.rangeR = 120;
    b.laserBaseDamage = 50;
    b.laserFreezeMax = 10;
    b.laserMaxDamage = 300;
    b.laserDamagePreAdd = 1;
    b.laserColor = new MyColor(100, 100, 100, 0.7);

    b.levelUpArr = ['Laser_Blue_1', 'Laser_Red', 'Laser_Green_1'];
    b.levelDownGetter = 'FutureCannon_1';
    b.imgIndex = 60;
    b.price = 350;
    b.comment = `蓄力发射激光直接瞬间命中敌人，攻击冷却是${b.laserFreezeMax}个时间刻度，每次击中基础伤害是${b.laserBaseDamage}，最大额外蓄力伤害是${b.laserMaxDamage}`;
    return b;
}

export function Laser_Blue_1(world: WorldLike): TowerLaser {
    const b = new TowerLaser(0, 0, world as any);
    b.name = "1级蓝激光";
    b.rangeR = 130;
    b.laserBaseDamage = 150;
    b.laserFreezeMax = 20;
    b.laserMaxDamage = 700;
    b.laserDamagePreAdd = 5;

    b.r += 7;
    b.levelUpArr = ['Laser_Blue_2', 'Laser_Hell_1'];
    b.levelDownGetter = 'Laser';
    b.imgIndex = 59;
    b.price = 600;
    b.comment = `蓄力发射激光直接瞬间命中敌人，攻击冷却是${b.laserFreezeMax}个时间刻度，每次击中基础伤害是${b.laserBaseDamage}，最大额外蓄力伤害是${b.laserMaxDamage}`;
    return b;
}

export function Laser_Blue_2(world: WorldLike): TowerLaser {
    const b = new TowerLaser(0, 0, world as any);
    b.name = "2级蓝激光";
    b.r += 10;
    b.rangeR = 150;
    b.laserBaseDamage = 300;
    b.laserFreezeMax = 20;
    b.laserMaxDamage = 1000;
    b.laserDamagePreAdd = 10;
    b.levelUpArr = ['Laser_Blue_3'];
    b.levelDownGetter = 'Laser_Blue_1';
    b.imgIndex = 59;
    b.price = 1200;
    b.comment = `蓄力发射激光直接瞬间命中敌人，攻击冷却是${b.laserFreezeMax}个时间刻度，每次击中基础伤害是${b.laserBaseDamage}，最大额外蓄力伤害是${b.laserMaxDamage}`;
    return b;
}

export function Laser_Blue_3(world: WorldLike): TowerLaser {
    const b = new TowerLaser(0, 0, world as any);
    b.name = "3级蓝激光";
    b.r += 13;
    b.rangeR = 170;
    b.laserBaseDamage = 500;
    b.laserFreezeMax = 30;
    b.laserMaxDamage = 5000;
    b.laserDamagePreAdd = 10;
    b.levelUpArr = [];
    b.levelDownGetter = 'Laser_Blue_2';
    b.imgIndex = 59;
    b.price = 1000;
    b.comment = `蓄力发射激光直接瞬间命中敌人，攻击冷却是${b.laserFreezeMax}个时间刻度，每次击中基础伤害是${b.laserBaseDamage}，最大额外蓄力伤害是${b.laserMaxDamage}`;
    return b;
}

export function Laser_Hell_1(world: WorldLike): TowerHell {
    const b = new TowerHell(0, 0, world as any);
    b.name = "1级地狱激光塔";
    b.r += 13;
    b.damageRate = 1000;
    b.levelUpArr = ['Laser_Hell_2'];
    b.levelDownGetter = 'Laser_Blue_1';
    b.imgIndex = 69;
    b.price = 2000;
    b.comment = `锁定敌人之后会持续对敌人发射激光，激光会越来越强，随着时间推移伤害会越来越高，无限制增高，血量再厚的敌人也抵挡不过它`;
    return b;
}

export function Laser_Hell_2(world: WorldLike): TowerHell {
    const b = new TowerHell(0, 0, world as any);
    b.name = "2级地狱激光塔";
    b.r += 15;
    b.damageRate = 100;
    b.levelUpArr = [];
    b.levelDownGetter = 'Laser_Hell_1';
    b.imgIndex = 69;
    b.price = 1000;
    b.comment = `锁定目标后伤害增加的速度变得更快了`;
    return b;
}

export function Laser_Green_1(world: WorldLike): TowerLaser {
    const b = new TowerLaser(0, 0, world as any);
    b.name = "1级绿激光";
    b.r += 7;
    b.rangeR = 200;
    b.laserBaseDamage = 40;
    b.laserFreezeMax = 4;
    b.laserMaxDamage = 100;
    b.laserDamagePreAdd = 1;
    b.laserColor = new MyColor(24, 212, 107, 0.7);

    b.levelDownGetter = 'Laser';
    b.levelUpArr = ['Laser_Green_2'];
    b.imgIndex = 58;
    b.price = 400;
    b.comment = `蓄力发射激光直接瞬间命中敌人，攻击冷却是${b.laserFreezeMax}个时间刻度，每次击中基础伤害是${b.laserBaseDamage}，最大额外蓄力伤害是${b.laserMaxDamage}`;
    return b;
}

export function Laser_Green_2(world: WorldLike): TowerLaser {
    const b = new TowerLaser(0, 0, world as any);
    b.name = "2级绿激光";
    b.r += 8;
    b.rangeR = 250;
    b.laserBaseDamage = 35;
    b.laserFreezeMax = 3;
    b.laserMaxDamage = 120;
    b.laserDamagePreAdd = 2;
    b.laserColor = new MyColor(24, 212, 107, 0.7);
    b.levelUpArr = ['Laser_Green_3'];
    b.levelDownGetter = 'Laser_Green_1';
    b.imgIndex = 58;
    b.price = 500;
    b.comment = `蓄力发射激光直接瞬间命中敌人，攻击冷却是${b.laserFreezeMax}个时间刻度，每次击中基础伤害是${b.laserBaseDamage}，最大额外蓄力伤害是${b.laserMaxDamage}`;
    return b;
}

export function Laser_Green_3(world: WorldLike): TowerLaser {
    const b = new TowerLaser(0, 0, world as any);
    b.name = "3级绿激光";
    b.r += 10;
    b.rangeR = 300;
    b.laserBaseDamage = 55;
    b.laserFreezeMax = 2;
    b.laserMaxDamage = 200;
    b.laserDamagePreAdd = 4;
    b.laserColor = new MyColor(24, 212, 107, 0.7);
    b.levelUpArr = [];
    b.levelDownGetter = 'Laser_Blue_2';
    b.imgIndex = 58;
    b.price = 700;
    b.comment = `蓄力发射激光直接瞬间命中敌人，攻击冷却是${b.laserFreezeMax}个时间刻度，每次击中基础伤害是${b.laserBaseDamage}，最大额外蓄力伤害是${b.laserMaxDamage}`;
    return b;
}

export function Laser_Red(world: WorldLike): TowerRay {
    const b = new TowerRay(0, 0, world as any);
    b.name = "红激光";
    b.r += 7;

    b.rangeR = 250;
    b.rayLen = 300;
    b.rayClock = 10;
    b.rayWidth = 5;
    b.damage = 100;
    b.hpInit(10000);
    b.rayColor = new MyColor(255, 0, 0, 1);

    b.levelUpArr = ['Laser_Red_Alpha_1', 'Laser_Red_Beta_1'];
    b.levelDownGetter = 'Laser';
    b.imgIndex = 57;
    b.price = 800;
    b.comment = `绿色激光是一种高频激光，蓝色激光是一种低频高伤害激光，而红色激光是一种大范围群体伤害激光，能够穿射`;
    return b;
}

export function Laser_Red_Alpha_1(world: WorldLike): TowerRay {
    const b = new TowerRay(0, 0, world as any);
    b.name = "1级Alpha红激光";
    b.r += 9;

    b.rangeR = 300;
    b.rayLen = 1000;
    b.rayClock = 30;
    b.rayWidth = 10;
    b.damage = 300;
    b.hpInit(20000);
    b.rayColor = new MyColor(255, 0, 0, 1);

    b.levelDownGetter = 'Laser_Red';
    b.levelUpArr = ['Laser_Red_Alpha_2'];
    b.imgIndex = 57;
    b.price = 800;
    b.comment = `穿刺范围大大增加了`;
    return b;
}

export function Laser_Red_Alpha_2(world: WorldLike): TowerRay {
    const b = new TowerRay(0, 0, world as any);
    b.name = "2级Alpha红激光";
    b.r += 11;

    b.rangeR = 350;
    b.rayLen = 1500;
    b.rayClock = 10;
    b.rayWidth = 13;
    b.damage = 200;
    b.hpInit(30000);
    b.rayColor = new MyColor(255, 0, 0, 1);

    b.levelDownGetter = 'Laser_Red_Alpha_1';
    b.levelUpArr = [];
    b.imgIndex = 57;
    b.price = 1000;
    b.comment = `穿刺长度又大大增加了，伤害减少了一些，但是频率提高了`;
    return b;
}

export function Laser_Red_Beta_1(world: WorldLike): TowerRay {
    const b = new TowerRay(0, 0, world as any);
    b.name = "1级Beta红激光";
    b.r += 10;
    b.damage = 30;
    b.rangeR = 0;
    b.rayLen = 800;
    b.rayWidth = 4;
    b.hpInit(30000);
    b.rayColor = new MyColor(255, 0, 0, 1);

    b.attackFunc = b.scanningAttack;
    b.levelDownGetter = 'Laser_Red';
    b.levelUpArr = ['Laser_Red_Beta_2'];
    b.imgIndex = 57;
    b.price = 800;
    b.comment = `全屏扫射`;
    return b;
}

export function Laser_Red_Beta_2(world: WorldLike): TowerRay {
    const b = new TowerRay(0, 0, world as any);
    b.name = "2级Beta红激光";
    b.r += 13;
    b.damage = 50;
    b.rangeR = 0;
    b.rayLen = 1000;
    b.rayWidth = 5;
    b.hpInit(50000);
    b.rayColor = new MyColor(255, 0, 0, 1);

    b.attackFunc = b.scanningAttack;
    b.levelDownGetter = 'Laser_Red_Beta_1';
    b.levelUpArr = [];
    b.imgIndex = 57;
    b.price = 1000;
    b.comment = `全屏扫射`;
    return b;
}

// Register towers
TowerRegistry.register('Laser', Laser as any, { name: "激光塔", imgIndex: 60, basePrice: 350 });
TowerRegistry.register('Laser_Blue_1', Laser_Blue_1 as any, { name: "1级蓝激光", imgIndex: 59, basePrice: 600 });
TowerRegistry.register('Laser_Blue_2', Laser_Blue_2 as any, { name: "2级蓝激光", imgIndex: 59, basePrice: 1200 });
TowerRegistry.register('Laser_Blue_3', Laser_Blue_3 as any, { name: "3级蓝激光", imgIndex: 59, basePrice: 1000 });
TowerRegistry.register('Laser_Hell_1', Laser_Hell_1 as any, { name: "1级地狱激光塔", imgIndex: 69, basePrice: 2000 });
TowerRegistry.register('Laser_Hell_2', Laser_Hell_2 as any, { name: "2级地狱激光塔", imgIndex: 69, basePrice: 1000 });
TowerRegistry.register('Laser_Green_1', Laser_Green_1 as any, { name: "1级绿激光", imgIndex: 58, basePrice: 400 });
TowerRegistry.register('Laser_Green_2', Laser_Green_2 as any, { name: "2级绿激光", imgIndex: 58, basePrice: 500 });
TowerRegistry.register('Laser_Green_3', Laser_Green_3 as any, { name: "3级绿激光", imgIndex: 58, basePrice: 700 });
TowerRegistry.register('Laser_Red', Laser_Red as any, { name: "红激光", imgIndex: 57, basePrice: 800 });
TowerRegistry.register('Laser_Red_Alpha_1', Laser_Red_Alpha_1 as any, { name: "1级Alpha红激光", imgIndex: 57, basePrice: 800 });
TowerRegistry.register('Laser_Red_Alpha_2', Laser_Red_Alpha_2 as any, { name: "2级Alpha红激光", imgIndex: 57, basePrice: 1000 });
TowerRegistry.register('Laser_Red_Beta_1', Laser_Red_Beta_1 as any, { name: "1级Beta红激光", imgIndex: 57, basePrice: 800 });
TowerRegistry.register('Laser_Red_Beta_2', Laser_Red_Beta_2 as any, { name: "2级Beta红激光", imgIndex: 57, basePrice: 1000 });
