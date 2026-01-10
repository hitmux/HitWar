/**
 * Hammer tower variants
 *
 * Contains: Hammer, Hammer_Fast_1~3, Hammer_Power_1~3 (7 towers)
 */
import { TowerHammer } from '../base/towerHammer';
import { TowerRegistry } from '../towerRegistry';

interface WorldLike {
    batterys: unknown[];
}

export function Hammer(world: WorldLike): TowerHammer {
    const b = new TowerHammer(0, 0, world as any);
    b.name = "流星锤";
    b.r += 3;

    b.hpInit(5000);
    b.rangeR = 80;
    b.itemDamage = 200;

    b.levelUpArr = ['Hammer_Fast_1', 'Hammer_Power_1'];
    b.levelDownGetter = 'AncientCannon';
    b.imgIndex = 5;
    b.price = 230;
    b.comment = "他有一个转动的大铁球，这个转动的大铁球只要一碰到敌人，就能够造成很大的伤害。";
    return b;
}

export function Hammer_Fast_1(world: WorldLike): TowerHammer {
    const b = new TowerHammer(0, 0, world as any);
    b.name = "快速流星锤1级";
    b.r += 5;

    b.hpInit(6000);
    b.rangeR = 100;
    b.itemRidus = 15;
    b.itemDamage = 250;
    b.itemSpeed = 4;
    b.additionItem = b.initAdditionItem();
    b.levelUpArr = ['Hammer_Fast_2'];
    b.levelDownGetter = 'Hammer';
    b.imgIndex = 5;
    b.price = 300;
    b.comment = "这个转动的大铁球变小了，伤害变小了，但是转的更快了，能够更好的应对突然过来的怪物了";
    return b;
}

export function Hammer_Fast_2(world: WorldLike): TowerHammer {
    const b = new TowerHammer(0, 0, world as any);
    b.name = "快速流星锤2级";
    b.r += 7;

    b.hpInit(10000);
    b.rangeR = 150;
    b.itemRidus = 15;
    b.itemDamage = 300;
    b.itemSpeed = 3;
    b.additionItem = b.initAdditionItem();
    b.levelUpArr = ['Hammer_Fast_3'];
    b.levelDownGetter = 'Hammer_Fast_1';
    b.imgIndex = 5;
    b.price = 370;
    b.comment = "转的又更快了，伤害继续增加了一点，转动半径也增加了";
    return b;
}

export function Hammer_Fast_3(world: WorldLike): TowerHammer {
    const b = new TowerHammer(0, 0, world as any);
    b.name = "快速流星锤3级";
    b.r += 8;
    b.hpInit(18000);
    b.rangeR = 180;
    b.itemRidus = 15;
    b.itemDamage = 400;
    b.itemSpeed = 2;
    b.additionItem = b.initAdditionItem();
    b.levelUpArr = [];
    b.levelDownGetter = 'Hammer_Fast_2';
    b.imgIndex = 5;
    b.price = 320;
    b.comment = "转的飞快了，伤害继续增加，转动半径继续增加";
    return b;
}

export function Hammer_Power_1(world: WorldLike): TowerHammer {
    const b = new TowerHammer(0, 0, world as any);
    b.name = "重型流星锤1级";
    b.r += 3;
    b.hpInit(10000);
    b.rangeR = 90;
    b.itemRidus = 30;
    b.itemDamage = 100;
    b.itemSpeed = 20;
    b.additionItem = b.initAdditionItem();
    b.levelUpArr = ['Hammer_Power_2'];
    b.levelDownGetter = 'Hammer';
    b.imgIndex = 6;
    b.price = 400;
    b.comment = "转的更慢了，但是大铁球变得更大了，转的慢了之后，对敌人的伤害也更高了，因为触碰一下就会伤害怪物，增加了铁球和敌人的触碰时间";
    return b;
}

export function Hammer_Power_2(world: WorldLike): TowerHammer {
    const b = new TowerHammer(0, 0, world as any);
    b.name = "重型流星锤2级";
    b.r += 5;
    b.hpInit(20000);
    b.rangeR = 100;
    b.itemRidus = 35;
    b.itemDamage = 100;
    b.itemSpeed = 30;
    b.additionItem = b.initAdditionItem();
    b.levelUpArr = ['Hammer_Power_3'];
    b.levelDownGetter = 'Hammer_Power_1';
    b.imgIndex = 6;
    b.price = 450;
    b.comment = "更大，更慢，更强";
    return b;
}

export function Hammer_Power_3(world: WorldLike): TowerHammer {
    const b = new TowerHammer(0, 0, world as any);
    b.name = "重型流星锤3级";
    b.r += 7;
    b.hpInit(30000);
    b.rangeR = 110;
    b.itemRidus = 38;
    b.itemDamage = 200;
    b.itemSpeed = 50;
    b.additionItem = b.initAdditionItem();
    b.levelUpArr = [];
    b.levelDownGetter = 'Hammer_Power_2';
    b.imgIndex = 6;
    b.price = 500;
    b.comment = "更大，更慢，更强";
    return b;
}

// Register towers
TowerRegistry.register('Hammer', Hammer as any, { name: "流星锤", imgIndex: 5, basePrice: 230 });
TowerRegistry.register('Hammer_Fast_1', Hammer_Fast_1 as any, { name: "快速流星锤1级", imgIndex: 5, basePrice: 300 });
TowerRegistry.register('Hammer_Fast_2', Hammer_Fast_2 as any, { name: "快速流星锤2级", imgIndex: 5, basePrice: 370 });
TowerRegistry.register('Hammer_Fast_3', Hammer_Fast_3 as any, { name: "快速流星锤3级", imgIndex: 5, basePrice: 320 });
TowerRegistry.register('Hammer_Power_1', Hammer_Power_1 as any, { name: "重型流星锤1级", imgIndex: 6, basePrice: 400 });
TowerRegistry.register('Hammer_Power_2', Hammer_Power_2 as any, { name: "重型流星锤2级", imgIndex: 6, basePrice: 450 });
TowerRegistry.register('Hammer_Power_3', Hammer_Power_3 as any, { name: "重型流星锤3级", imgIndex: 6, basePrice: 500 });
