/**
 * Earthquake tower variants
 *
 * Contains: Earthquake, Earthquake_Power_1~2, Earthquake_Speed_1~2 (5 towers)
 */
import { TowerLaser } from '../base/towerLaser';
import { TowerRegistry } from '../towerRegistry';

interface WorldLike {
    batterys: unknown[];
}

export function Earthquake(world: WorldLike): TowerLaser {
    const b = new TowerLaser(0, 0, world as any);
    b.name = "地震发生器";
    b.r += 5;

    b.laserBaseDamage = 500;
    b.laserFreezeMax = 50;
    b.laserMaxDamage = 200;
    b.laserDamagePreAdd = 5;
    b.rangeR = 120;
    b.hpInit(5000);

    b.attackFunc = b.earthquakeAttack;
    b.levelDownGetter = 'TraditionalCannon_Middle';
    b.levelUpArr = ['Earthquake_Power_1', 'Earthquake_Speed_1'];
    b.imgIndex = 31;
    b.price = 250;
    b.comment = `直接发生一个地震，对范围内的敌人统一造成伤害，妥妥的群伤`;
    return b;
}

export function Earthquake_Power_1(world: WorldLike): TowerLaser {
    const b = new TowerLaser(0, 0, world as any);
    b.name = "1级重型地震发生器";
    b.r += 10;

    b.laserBaseDamage = 5000;
    b.laserFreezeMax = 500;
    b.laserMaxDamage = 5000;
    b.laserDamagePreAdd = 20;
    b.rangeR = 250;
    b.hpInit(10000);

    b.attackFunc = b.earthquakeAttack;
    b.levelDownGetter = 'Earthquake';
    b.levelUpArr = ['Earthquake_Power_2'];
    b.imgIndex = 32;
    b.price = 260;
    b.comment = `很长时间才能地震一次，但是一旦地震，伤害巨大，并且还可以蓄力`;
    return b;
}

export function Earthquake_Power_2(world: WorldLike): TowerLaser {
    const b = new TowerLaser(0, 0, world as any);
    b.name = "2级重型地震发生器";
    b.r += 15;

    b.laserBaseDamage = 10000;
    b.laserFreezeMax = 500;
    b.laserMaxDamage = 10000;
    b.laserDamagePreAdd = 50;
    b.rangeR = 260;
    b.hpInit(100000);

    b.attackFunc = b.earthquakeAttack;
    b.levelDownGetter = 'Earthquake_Power_1';
    b.levelUpArr = [];
    b.imgIndex = 32;
    b.price = 300;
    b.comment = `地震伤害本来很大了，但是这下子更大了`;
    return b;
}

export function Earthquake_Speed_1(world: WorldLike): TowerLaser {
    const b = new TowerLaser(0, 0, world as any);
    b.name = "1级高频地震发生器";
    b.r += 10;

    b.laserBaseDamage = 100;
    b.laserFreezeMax = 5;
    b.laserMaxDamage = 200;
    b.laserDamagePreAdd = 5;
    b.rangeR = 250;
    b.hpInit(6000);

    b.attackFunc = b.earthquakeAttack;
    b.levelDownGetter = 'Earthquake';
    b.levelUpArr = ['Earthquake_Speed_2'];
    b.imgIndex = 31;
    b.price = 260;
    b.comment = `地震伤害变得很小了，但是频率非常高`;
    return b;
}

export function Earthquake_Speed_2(world: WorldLike): TowerLaser {
    const b = new TowerLaser(0, 0, world as any);
    b.name = "2级高频地震发生器";
    b.r += 12;

    b.laserBaseDamage = 110;
    b.laserFreezeMax = 2;
    b.laserMaxDamage = 300;
    b.laserDamagePreAdd = 5;
    b.rangeR = 300;
    b.hpInit(9000);

    b.laserBaseDamage = 10;
    b.attackFunc = b.earthquakeAttack;
    b.levelDownGetter = 'Earthquake_Speed_1';
    b.levelUpArr = [];
    b.imgIndex = 31;
    b.price = 400;
    b.comment = `地震的频率进一步提高了，非常快`;
    return b;
}

// Register towers
TowerRegistry.register('Earthquake', Earthquake as any, { name: "地震发生器", imgIndex: 31, basePrice: 250 });
TowerRegistry.register('Earthquake_Power_1', Earthquake_Power_1 as any, { name: "1级重型地震发生器", imgIndex: 32, basePrice: 260 });
TowerRegistry.register('Earthquake_Power_2', Earthquake_Power_2 as any, { name: "2级重型地震发生器", imgIndex: 32, basePrice: 300 });
TowerRegistry.register('Earthquake_Speed_1', Earthquake_Speed_1 as any, { name: "1级高频地震发生器", imgIndex: 31, basePrice: 260 });
TowerRegistry.register('Earthquake_Speed_2', Earthquake_Speed_2 as any, { name: "2级高频地震发生器", imgIndex: 31, basePrice: 400 });
