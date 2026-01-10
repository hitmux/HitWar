/**
 * Arrow tower variants
 *
 * Contains: ArrowBow_1~4, Crossbow_1~3 (7 towers)
 */
import { Tower } from '../base/tower';
import { TowerRegistry } from '../towerRegistry';

// BullyFinally will be resolved from global scope
declare const BullyFinally: {
    Arrow: (() => unknown) | null;
    Arrow_L: (() => unknown) | null;
    Arrow_LL: (() => unknown) | null;
} | undefined;

interface WorldLike {
    batterys: unknown[];
}

export function ArrowBow_1(world: WorldLike): Tower {
    const res = new Tower(0, 0, world as any);
    res.name = "弓箭塔1级";
    res.r += 2;
    res.hpInit(1500);
    res.rangeR = 200;
    res.clock = 15;
    res.getmMainBullyFunc = typeof BullyFinally !== 'undefined' ? BullyFinally.Arrow as any : null;

    res.levelUpArr = ['ArrowBow_2', 'Crossbow_1'];
    res.levelDownGetter = 'AncientCannon';
    res.imgIndex = 4;
    res.price = 60;
    res.comment = "这个弓箭塔是中世纪最基本的一种塔楼";
    res.audioSrcString = "/sound/发射音效/弓箭发射.mp3";
    return res;
}

export function ArrowBow_2(world: WorldLike): Tower {
    const res = new Tower(0, 0, world as any);
    res.name = "弓箭塔2级";
    res.r += 3;
    res.hpInit(2000);
    res.rangeR = 250;
    res.clock = 12;
    res.bullySpeed = 10;
    res.getmMainBullyFunc = typeof BullyFinally !== 'undefined' ? BullyFinally.Arrow_L as any : null;

    res.levelUpArr = ['ArrowBow_3'];
    res.levelDownGetter = 'ArrowBow_1';
    res.imgIndex = 4;
    res.price = 70;
    res.comment = "弓箭塔是偏远程的一种防御塔";
    res.audioSrcString = "/sound/发射音效/弓箭发射.mp3";
    return res;
}

export function ArrowBow_3(world: WorldLike): Tower {
    const res = new Tower(0, 0, world as any);
    res.name = "弓箭塔3级";
    res.r += 4;
    res.hpInit(5000);
    res.rangeR = 300;
    res.clock = 10;
    res.bullySpeed = 12;
    res.getmMainBullyFunc = typeof BullyFinally !== 'undefined' ? BullyFinally.Arrow_L as any : null;

    res.levelUpArr = ['ArrowBow_4'];
    res.levelDownGetter = 'ArrowBow_2';
    res.imgIndex = 4;
    res.price = 80;
    res.comment = "没什么";
    res.audioSrcString = "/sound/发射音效/弓箭发射.mp3";
    return res;
}

export function ArrowBow_4(world: WorldLike): Tower {
    const res = new Tower(0, 0, world as any);
    res.name = "弓箭塔4级";
    res.hpInit(8000);
    res.rangeR = 320;
    res.clock = 8;
    res.bullySpeed = 13;
    res.r += 5;
    res.getmMainBullyFunc = typeof BullyFinally !== 'undefined' ? BullyFinally.Arrow_LL as any : null;

    res.levelUpArr = [];
    res.levelDownGetter = 'ArrowBow_3';
    res.imgIndex = 4;
    res.price = 150;
    res.comment = "四级弓箭塔更换了弓箭子弹，伤害提高了";
    res.audioSrcString = "/sound/发射音效/弓箭发射.mp3";
    return res;
}

export function Crossbow_1(world: WorldLike): Tower {
    const res = new Tower(0, 0, world as any);
    res.name = "连弩1级";
    res.r += 3;
    res.hpInit(6000);
    res.rangeR = 160;
    res.clock = 11;
    res.bullySpeed = 10;
    res.attackBullyNum = 2;
    res.bullySpeedAddMax = 3;
    res.bullyDeviation = 3;
    res.getmMainBullyFunc = typeof BullyFinally !== 'undefined' ? BullyFinally.Arrow as any : null;
    res.levelUpArr = ['Crossbow_2'];
    res.levelDownGetter = 'ArrowBow_1';
    res.imgIndex = 3;
    res.price = 120;
    res.comment = "连弩视野范围没有弓箭塔那么大，但是射速更快了";
    res.audioSrcString = "/sound/发射音效/弓箭发射.mp3";
    return res;
}

export function Crossbow_2(world: WorldLike): Tower {
    const res = new Tower(0, 0, world as any);
    res.name = "连弩2级";
    res.r += 5;
    res.hpInit(10000);
    res.rangeR = 200;
    res.clock = 9;
    res.bullySpeed = 13;
    res.attackBullyNum = 3;
    res.bullySpeedAddMax = 5;
    res.bullyDeviation = 5;
    res.getmMainBullyFunc = typeof BullyFinally !== 'undefined' ? BullyFinally.Arrow as any : null;
    res.levelUpArr = ['Crossbow_3'];
    res.levelDownGetter = 'Crossbow_1';
    res.imgIndex = 3;
    res.price = 130;
    res.comment = `射速进一步加快，一次性能够射出${res.attackBullyNum}发子弹`;
    res.audioSrcString = "/sound/发射音效/弓箭发射.mp3";
    return res;
}

export function Crossbow_3(world: WorldLike): Tower {
    const res = new Tower(0, 0, world as any);
    res.name = "连弩3级";
    res.r += 7;
    res.hpInit(20000);
    res.rangeR = 250;
    res.clock = 5;
    res.bullySpeed = 15;
    res.attackBullyNum = 4;
    res.bullySpeedAddMax = 5;
    res.bullyDeviation = 10;
    res.getmMainBullyFunc = typeof BullyFinally !== 'undefined' ? BullyFinally.Arrow_L as any : null;
    res.levelUpArr = [];
    res.levelDownGetter = 'Crossbow_2';
    res.imgIndex = 3;
    res.price = 200;
    res.comment = `射速更快了，一次性能射出${res.attackBullyNum}发子弹`;
    res.audioSrcString = "/sound/发射音效/弓箭发射.mp3";
    return res;
}

// Register towers
TowerRegistry.register('ArrowBow_1', ArrowBow_1 as any, { name: "弓箭塔1级", imgIndex: 4, basePrice: 60 });
TowerRegistry.register('ArrowBow_2', ArrowBow_2 as any, { name: "弓箭塔2级", imgIndex: 4, basePrice: 70 });
TowerRegistry.register('ArrowBow_3', ArrowBow_3 as any, { name: "弓箭塔3级", imgIndex: 4, basePrice: 80 });
TowerRegistry.register('ArrowBow_4', ArrowBow_4 as any, { name: "弓箭塔4级", imgIndex: 4, basePrice: 150 });
TowerRegistry.register('Crossbow_1', Crossbow_1 as any, { name: "连弩1级", imgIndex: 3, basePrice: 120 });
TowerRegistry.register('Crossbow_2', Crossbow_2 as any, { name: "连弩2级", imgIndex: 3, basePrice: 130 });
TowerRegistry.register('Crossbow_3', Crossbow_3 as any, { name: "连弩3级", imgIndex: 3, basePrice: 200 });
