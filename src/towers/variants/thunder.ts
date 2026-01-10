/**
 * Thunder tower variants
 *
 * Contains: Thunder_1~2, Thunder_Far_1~2, Thunder_Power_1~2, ThunderBall_1~3 (9 towers)
 */
import { Tower } from '../base/tower';
import { MyColor } from '../../entities/myColor';
import { TowerLaser } from '../base/towerLaser';
import { TowerRegistry } from '../towerRegistry';

// BullyFinally will be resolved from global scope
declare const BullyFinally: {
    ThunderBall: (() => unknown) | null;
} | undefined;

interface WorldLike {
    batterys: unknown[];
}

export function Thunder_1(world: WorldLike): TowerLaser {
    const b = new TowerLaser(0, 0, world as any);
    b.name = "1级雷电塔";
    b.r += 5;
    b.rangeR = 250;
    b.laserFreezeMax = 30;
    b.laserBaseDamage = 300;
    b.laserMaxDamage = 500;
    b.laserDamagePreAdd = 1;
    b.zapCount = 3;
    b.damageMultipleRate = 1.1;
    b.zapLen = 100;
    b.zapInitColor = new MyColor(0, 200, 255, 0.9);
    b.attackFunc = b.zapAttack;

    b.levelUpArr = ['Thunder_2', 'ThunderBall_1'];
    b.levelDownGetter = 'FutureCannon_1';
    b.imgIndex = 55;
    b.price = 400;
    b.comment = `能够发射一道闪电，击中敌人后会继续电传导击中附近${b.zapLen}范围内的敌人，进行如上操作${b.zapCount}次数，每次伤害是上一个击中目标的${b.damageMultipleRate}倍数累加，闪电的基础伤害是${b.laserBaseDamage}，最大蓄力伤害是${b.laserMaxDamage}`;
    return b;
}

export function Thunder_2(world: WorldLike): TowerLaser {
    const b = new TowerLaser(0, 0, world as any);
    b.name = "2级雷电塔";
    b.r += 10;
    b.rangeR = 270;
    b.laserFreezeMax = 30;
    b.laserBaseDamage = 300;
    b.laserMaxDamage = 500;
    b.laserDamagePreAdd = 1;
    b.zapCount = 5;
    b.damageMultipleRate = 1.2;
    b.zapLen = 110;
    b.zapInitColor = new MyColor(0, 200, 255, 0.9);
    b.attackFunc = b.zapAttack;
    b.levelUpArr = ['Thunder_Far_1', 'Thunder_Power_1'];
    b.levelDownGetter = 'Thunder_1';
    b.imgIndex = 55;
    b.price = 600;
    b.comment = `能够发射一道闪电，击中敌人后会继续电传导击中附近${b.zapLen}范围内的敌人，进行如上操作${b.zapCount}次数，每次伤害是上一个击中目标的${b.damageMultipleRate}倍数累加，闪电的基础伤害是${b.laserBaseDamage}，最大蓄力伤害是${b.laserMaxDamage}`;
    return b;
}

export function Thunder_Far_1(world: WorldLike): TowerLaser {
    const b = new TowerLaser(0, 0, world as any);
    b.name = "1级远程雷电塔";
    b.r += 12;
    b.rangeR = 300;
    b.laserFreezeMax = 20;
    b.laserBaseDamage = 150;
    b.laserMaxDamage = 100;
    b.laserDamagePreAdd = 10;
    b.zapCount = 10;
    b.damageMultipleRate = 0.9;
    b.zapLen = 300;
    b.zapInitColor = new MyColor(255, 20, 100, 0.9);
    b.attackFunc = b.zapAttack;
    b.levelUpArr = ['Thunder_Far_2'];
    b.levelDownGetter = 'Thunder_2';
    b.imgIndex = 55;
    b.price = 600;
    b.comment = `能够发射一道闪电，击中敌人后会继续电传导击中附近${b.zapLen}范围内的敌人，进行如上操作${b.zapCount}次数，每次伤害是上一个击中目标的${b.damageMultipleRate}倍数累加，闪电的基础伤害是${b.laserBaseDamage}，最大蓄力伤害是${b.laserMaxDamage}`;
    return b;
}

export function Thunder_Far_2(world: WorldLike): TowerLaser {
    const b = new TowerLaser(0, 0, world as any);
    b.name = "2级远程雷电塔";
    b.r += 13;
    b.rangeR = 320;
    b.laserFreezeMax = 18;
    b.laserBaseDamage = 140;
    b.laserMaxDamage = 120;
    b.laserDamagePreAdd = 8;
    b.zapCount = 20;
    b.damageMultipleRate = 0.85;
    b.zapLen = 500;
    b.zapInitColor = new MyColor(255, 20, 20, 0.9);
    b.attackFunc = b.zapAttack;
    b.levelUpArr = [];
    b.levelDownGetter = 'Thunder_Far_1';
    b.imgIndex = 55;
    b.price = 600;
    b.comment = `能够发射一道闪电，击中敌人后会继续电传导击中附近${b.zapLen}范围内的敌人，进行如上操作${b.zapCount}次数，每次伤害是上一个击中目标的${b.damageMultipleRate}倍数累加，闪电的基础伤害是${b.laserBaseDamage}，最大蓄力伤害是${b.laserMaxDamage}`;
    return b;
}

export function Thunder_Power_1(world: WorldLike): TowerLaser {
    const b = new TowerLaser(0, 0, world as any);
    b.name = "1级强力雷电塔";
    b.r += 10;
    b.rangeR = 250;
    b.laserFreezeMax = 60;
    b.laserBaseDamage = 500;
    b.laserMaxDamage = 500;
    b.laserDamagePreAdd = 3;
    b.zapCount = 3;
    b.damageMultipleRate = 1.8;
    b.zapLen = 110;
    b.zapInitColor = new MyColor(0, 20, 255, 0.9);
    b.attackFunc = b.zapAttack;
    b.levelUpArr = ['Thunder_Power_2'];
    b.levelDownGetter = 'Thunder_2';
    b.imgIndex = 55;
    b.price = 400;
    b.comment = `能够发射一道闪电，击中敌人后会继续电传导击中附近${b.zapLen}范围内的敌人，进行如上操作${b.zapCount}次数，每次伤害是上一个击中目标的${b.damageMultipleRate}倍数累加，闪电的基础伤害是${b.laserBaseDamage}，最大蓄力伤害是${b.laserMaxDamage}`;
    return b;
}

export function Thunder_Power_2(world: WorldLike): TowerLaser {
    const b = new TowerLaser(0, 0, world as any);
    b.name = "2级强力雷电塔";
    b.r += 12;
    b.rangeR = 245;
    b.laserFreezeMax = 70;
    b.laserBaseDamage = 700;
    b.laserMaxDamage = 1000;
    b.laserDamagePreAdd = 3;
    b.zapCount = 3;
    b.damageMultipleRate = 2;
    b.zapLen = 90;
    b.zapInitColor = new MyColor(255, 0, 255, 0.9);
    b.attackFunc = b.zapAttack;
    b.levelUpArr = [];
    b.levelDownGetter = 'Thunder_Power_1';
    b.imgIndex = 55;
    b.price = 1000;
    b.comment = `能够发射一道闪电，击中敌人后会继续电传导击中附近${b.zapLen}范围内的敌人，进行如上操作${b.zapCount}次数，每次伤害是上一个击中目标的${b.damageMultipleRate}倍数累加，闪电的基础伤害是${b.laserBaseDamage}，最大蓄力伤害是${b.laserMaxDamage}`;
    return b;
}

export function ThunderBall_1(world: WorldLike): Tower {
    const b = new Tower(0, 0, world as any);
    b.name = "1级球状闪电发生器";
    b.rangeR = 280;
    b.r += 7;
    b.bullySpeed = 10;
    b.clock = 30;
    b.getmMainBullyFunc = typeof BullyFinally !== 'undefined' ? BullyFinally.ThunderBall as any : null;
    b.price = 520;
    b.hpInit(15000);
    b.levelUpArr = ['ThunderBall_2'];
    b.levelDownGetter = 'Thunder_1';
    b.imgIndex = 56;
    b.price = 1000;
    b.comment = `发射出去的球状闪电具有很强的跟踪能力`;
    return b;
}

export function ThunderBall_2(world: WorldLike): Tower {
    const b = new Tower(0, 0, world as any);
    b.name = "2级球状闪电发生器";
    b.rangeR = 290;
    b.r += 12;
    b.bullySpeed = 15;
    b.clock = 18;
    b.getmMainBullyFunc = typeof BullyFinally !== 'undefined' ? BullyFinally.ThunderBall as any : null;
    b.price = 520;
    b.hpInit(16000);
    b.levelUpArr = ['ThunderBall_3'];
    b.levelDownGetter = 'ThunderBall_1';
    b.imgIndex = 56;
    b.price = 600;
    b.comment = `发射出去的球状闪电具有很强的跟踪能力`;
    return b;
}

export function ThunderBall_3(world: WorldLike): Tower {
    const b = new Tower(0, 0, world as any);
    b.name = "3级球状闪电发生器";
    b.rangeR = 300;
    b.r += 13;
    b.bullySpeed = 20;
    b.clock = 16;
    b.getmMainBullyFunc = typeof BullyFinally !== 'undefined' ? BullyFinally.ThunderBall as any : null;
    b.price = 520;
    b.hpInit(20000);
    b.levelUpArr = [];
    b.levelDownGetter = 'ThunderBall_2';
    b.imgIndex = 56;
    b.price = 600;
    b.comment = `发射出去的球状闪电具有很强的跟踪能力`;
    return b;
}

// Register towers
TowerRegistry.register('Thunder_1', Thunder_1 as any, { name: "1级雷电塔", imgIndex: 55, basePrice: 400 });
TowerRegistry.register('Thunder_2', Thunder_2 as any, { name: "2级雷电塔", imgIndex: 55, basePrice: 600 });
TowerRegistry.register('Thunder_Far_1', Thunder_Far_1 as any, { name: "1级远程雷电塔", imgIndex: 55, basePrice: 600 });
TowerRegistry.register('Thunder_Far_2', Thunder_Far_2 as any, { name: "2级远程雷电塔", imgIndex: 55, basePrice: 600 });
TowerRegistry.register('Thunder_Power_1', Thunder_Power_1 as any, { name: "1级强力雷电塔", imgIndex: 55, basePrice: 400 });
TowerRegistry.register('Thunder_Power_2', Thunder_Power_2 as any, { name: "2级强力雷电塔", imgIndex: 55, basePrice: 1000 });
TowerRegistry.register('ThunderBall_1', ThunderBall_1 as any, { name: "1级球状闪电发生器", imgIndex: 56, basePrice: 1000 });
TowerRegistry.register('ThunderBall_2', ThunderBall_2 as any, { name: "2级球状闪电发生器", imgIndex: 56, basePrice: 600 });
TowerRegistry.register('ThunderBall_3', ThunderBall_3 as any, { name: "3级球状闪电发生器", imgIndex: 56, basePrice: 600 });
