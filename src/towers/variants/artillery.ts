/**
 * Artillery tower variants
 *
 * Contains: Artillery_1~3, MissileGun_1~3 (6 towers)
 */
import { Tower } from '../base/tower';
import { TowerRegistry } from '../towerRegistry';

// BullyFinally will be resolved from global scope
declare const BullyFinally: {
    H_S: (() => unknown) | null;
    H_L: (() => unknown) | null;
    H_LL: (() => unknown) | null;
    H_Target_S: (() => unknown) | null;
} | undefined;

interface WorldLike {
    batterys: unknown[];
}

export function Artillery_1(world: WorldLike): Tower {
    const b = new Tower(0, 0, world as any);
    b.name = "1级火炮";
    b.rangeR += 200;
    b.r += 7;
    b.bullySpeed = 1;
    b.bullySlideRate = 1.2;
    b.bullySpeedAddMax = 1;
    b.clock += 20;
    b.getmMainBullyFunc = typeof BullyFinally !== 'undefined' ? BullyFinally.H_S as any : null;
    b.hpInit(5000);
    b.levelDownGetter = 'TraditionalCannon_Large';
    b.levelUpArr = ['Artillery_2'];
    b.imgIndex = 33;
    b.price = 500;
    b.comment = `这曾经是世界大战中的武器，发射出去的炮弹会持续加速，击中目标或者超出一定范围后发生爆炸，对范围内的怪物造成爆炸伤害，越接近爆炸中心，爆炸伤害越高`;
    b.audioSrcString = "/sound/发射音效/火箭发射.ogg";
    return b;
}

export function Artillery_2(world: WorldLike): Tower {
    const b = new Tower(0, 0, world as any);
    b.name = "2级火炮";
    b.rangeR = 250;
    b.r += 9;
    b.bullySpeed = 1;
    b.bullySlideRate = 1.2;
    b.bullySpeedAddMax = 1;
    b.clock += 25;
    b.getmMainBullyFunc = typeof BullyFinally !== 'undefined' ? BullyFinally.H_L as any : null;
    b.hpInit(8800);
    b.attackBullyNum = 2;
    b.attackFunc = b.shrapnelAttack;
    b.bullyDeviationRotate = 0.2;
    b.bullyRotate = Math.PI / 12;
    b.levelDownGetter = 'Artillery_1';
    b.levelUpArr = ['Artillery_3'];
    b.imgIndex = 34;
    b.price = 800;
    b.comment = `能够同时发射两枚炮弹了，发射的火炮弹伤害大大提高`;
    b.audioSrcString = "/sound/发射音效/火箭发射.ogg";
    return b;
}

export function Artillery_3(world: WorldLike): Tower {
    const b = new Tower(0, 0, world as any);
    b.name = "3级火炮";
    b.rangeR = 300;
    b.r += 11;
    b.bullySpeed = 1;
    b.bullySlideRate = 1.1;
    b.clock += 40;
    b.getmMainBullyFunc = typeof BullyFinally !== 'undefined' ? BullyFinally.H_LL as any : null;
    b.hpInit(30000);
    b.attackBullyNum = 2;
    b.bullyDeviationRotate = 0.8;
    b.attackFunc = b.shrapnelAttack;
    b.bullyRotate = Math.PI / 12;
    b.levelDownGetter = 'Artillery_2';
    b.levelUpArr = [];
    b.imgIndex = 34;
    b.price = 1000;
    b.comment = `每次攻击都会同时发射两枚超大型号的炮弹，造成很大的爆炸伤害`;
    b.audioSrcString = "/sound/发射音效/火箭发射.ogg";
    return b;
}

export function MissileGun_1(world: WorldLike): Tower {
    const b = new Tower(0, 0, world as any);
    b.name = "1级跟踪导弹炮";
    b.rangeR = 250;
    b.r += 8;
    b.bullySpeed = 7;
    b.bullySlideRate = 6;
    b.clock += 10;
    b.getmMainBullyFunc = typeof BullyFinally !== 'undefined' ? BullyFinally.H_Target_S as any : null;
    b.hpInit(10000);
    b.attackBullyNum = 1;
    b.levelDownGetter = 'TraditionalCannon_Large';
    b.levelUpArr = ['MissileGun_2'];
    b.imgIndex = 35;
    b.price = 700;
    b.comment = `发射出去的导弹具有追踪能力，同时也会爆炸，只不过因为会追踪，所以伤害没有火炮那么高了`;
    b.audioSrcString = "/sound/发射音效/火箭发射.ogg";
    return b;
}

export function MissileGun_2(world: WorldLike): Tower {
    const b = new Tower(0, 0, world as any);
    b.name = "2级跟踪导弹炮";
    b.rangeR = 250;
    b.r += 11;
    b.bullySpeed = 8;
    b.bullySlideRate = 6;
    b.clock += 10;
    b.getmMainBullyFunc = typeof BullyFinally !== 'undefined' ? BullyFinally.H_Target_S as any : null;
    b.hpInit(10000);
    b.attackBullyNum = 3;
    b.bullyRotate = Math.PI / 6;
    b.attackFunc = b.shrapnelAttack;
    b.levelDownGetter = 'MissileGun_1';
    b.levelUpArr = ['MissileGun_3'];
    b.imgIndex = 35;
    b.price = 750;
    b.comment = `每次发射能够发射三个导弹`;
    b.audioSrcString = "/sound/发射音效/火箭发射.ogg";
    return b;
}

export function MissileGun_3(world: WorldLike): Tower {
    const b = new Tower(0, 0, world as any);
    b.name = "3级跟踪导弹炮";
    b.rangeR = 250;
    b.r += 15;
    b.bullySpeed = 10;
    b.bullySlideRate = 6;
    b.clock += 10;
    b.getmMainBullyFunc = typeof BullyFinally !== 'undefined' ? BullyFinally.H_Target_S as any : null;
    b.hpInit(10000);
    b.attackBullyNum = 5;
    b.bullyRotate = Math.PI / 6;
    b.attackFunc = b.shrapnelAttack;
    b.levelDownGetter = 'MissileGun_2';
    b.levelUpArr = [];
    b.imgIndex = 35;
    b.price = 1000;
    b.comment = `每次发射能够发射五个导弹，这可以说是多管导弹炮`;
    b.audioSrcString = "/sound/发射音效/火箭发射.ogg";
    return b;
}

// Register towers
TowerRegistry.register('Artillery_1', Artillery_1 as any, { name: "1级火炮", imgIndex: 33, basePrice: 500 });
TowerRegistry.register('Artillery_2', Artillery_2 as any, { name: "2级火炮", imgIndex: 34, basePrice: 800 });
TowerRegistry.register('Artillery_3', Artillery_3 as any, { name: "3级火炮", imgIndex: 34, basePrice: 1000 });
TowerRegistry.register('MissileGun_1', MissileGun_1 as any, { name: "1级跟踪导弹炮", imgIndex: 35, basePrice: 700 });
TowerRegistry.register('MissileGun_2', MissileGun_2 as any, { name: "2级跟踪导弹炮", imgIndex: 35, basePrice: 750 });
TowerRegistry.register('MissileGun_3', MissileGun_3 as any, { name: "3级跟踪导弹炮", imgIndex: 35, basePrice: 1000 });
