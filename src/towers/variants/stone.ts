/**
 * Stone/Cannon tower variants
 *
 * Contains: StoneCannon, StoneCannon_Far_1~3, StoneCannon_Power_1~3 (7 towers)
 */
import { Tower } from '../base/tower';
import { TowerRegistry } from '../towerRegistry';

// BullyFinally will be resolved from global scope
declare const BullyFinally: {
    CannonStone_S: (() => unknown) | null;
    CannonStone_M: (() => unknown) | null;
    CannonStone_L: (() => unknown) | null;
} | undefined;

interface WorldLike {
    batterys: unknown[];
}

export function StoneCannon(world: WorldLike): Tower {
    const b = new Tower(0, 0, world as any);
    b.name = "加农炮";
    b.r += 3;
    b.rangeR = 120;
    b.clock = 20;
    b.bullySpeed = 3;
    b.bullySpeedAddMax = 7;
    b.bullySlideRate = 1.5;
    b.hpInit(3000);
    b.getmMainBullyFunc = typeof BullyFinally !== 'undefined' ? BullyFinally.CannonStone_S as any : null;
    b.levelUpArr = ['StoneCannon_Far_1', 'StoneCannon_Power_1'];
    b.levelDownGetter = 'AncientCannon';
    b.imgIndex = 7;
    b.price = 100;
    b.comment = "发射石头蛋子，威力超过弓箭很多很多，但是攻击速度慢了";
    b.audioSrcString = "/sound/子弹音效/石头蛋子.mp3";
    return b;
}

export function StoneCannon_Far_1(world: WorldLike): Tower {
    const b = new Tower(0, 0, world as any);
    b.name = "远程加农炮1级";
    b.r += 4;
    b.rangeR = 260;
    b.clock = 20;
    b.bullySpeed = 7;
    b.bullySpeedAddMax = 2;
    b.bullySlideRate = 2;
    b.hpInit(3000);
    b.getmMainBullyFunc = typeof BullyFinally !== 'undefined' ? BullyFinally.CannonStone_S as any : null;
    b.levelUpArr = ['StoneCannon_Far_2'];
    b.levelDownGetter = 'StoneCannon';
    b.imgIndex = 8;
    b.price = 200;
    b.comment = "增加了攻击距离";
    b.audioSrcString = "/sound/子弹音效/石头蛋子.mp3";
    return b;
}

export function StoneCannon_Far_2(world: WorldLike): Tower {
    const b = new Tower(0, 0, world as any);
    b.name = "远程加农炮2级";
    b.r += 5;
    b.rangeR = 270;
    b.clock = 20;
    b.bullySpeed = 7;
    b.bullySpeedAddMax = 3;
    b.bullySlideRate = 2.2;
    b.getmMainBullyFunc = typeof BullyFinally !== 'undefined' ? BullyFinally.CannonStone_M as any : null;
    b.levelUpArr = ['StoneCannon_Far_3'];
    b.levelDownGetter = 'StoneCannon_Far_1';
    b.imgIndex = 8;
    b.price = 250;
    b.comment = "进一步增加了攻击距离";
    b.audioSrcString = "/sound/子弹音效/石头蛋子.mp3";
    return b;
}

export function StoneCannon_Far_3(world: WorldLike): Tower {
    const b = new Tower(0, 0, world as any);
    b.name = "远程加农炮3级";
    b.r += 6;
    b.rangeR = 300;
    b.clock = 20;
    b.bullySpeed = 7;
    b.bullySpeedAddMax = 4;
    b.bullySlideRate = 2.2;
    b.getmMainBullyFunc = typeof BullyFinally !== 'undefined' ? BullyFinally.CannonStone_M as any : null;
    b.levelUpArr = [];
    b.levelDownGetter = 'StoneCannon_Far_2';
    b.imgIndex = 8;
    b.price = 300;
    b.comment = "攻击距离更远了，射出的子弹成了中型号的石头蛋子";
    b.audioSrcString = "/sound/子弹音效/石头蛋子.mp3";
    return b;
}

export function StoneCannon_Power_1(world: WorldLike): Tower {
    const b = new Tower(0, 0, world as any);
    b.name = "重型加农炮1级";

    b.rangeR = 180;
    b.clock = 50;
    b.bullySpeed = 8;
    b.bullySpeedAddMax = 1;
    b.bullySlideRate = 1.5;
    b.hpInit(9000);

    b.r += 4;
    b.getmMainBullyFunc = typeof BullyFinally !== 'undefined' ? BullyFinally.CannonStone_M as any : null;
    b.levelUpArr = ['StoneCannon_Power_2'];
    b.levelDownGetter = 'StoneCannon';
    b.imgIndex = 9;
    b.price = 120;
    b.comment = "发射大型石头蛋子，大型石头蛋子打中怪物之后会碎裂成一些有伤害的小石头蛋子";
    b.audioSrcString = "/sound/子弹音效/石头蛋子.mp3";
    return b;
}

export function StoneCannon_Power_2(world: WorldLike): Tower {
    const b = new Tower(0, 0, world as any);
    b.name = "重型加农炮2级";
    b.r += 5;
    b.rangeR = 200;
    b.bullySpeed = 8;
    b.bullySlideRate = 2.5;
    b.clock = 50;
    b.hpInit(30000);
    b.getmMainBullyFunc = typeof BullyFinally !== 'undefined' ? BullyFinally.CannonStone_L as any : null;
    b.levelUpArr = ['StoneCannon_Power_3'];
    b.levelDownGetter = 'StoneCannon_Power_1';
    b.imgIndex = 9;
    b.price = 300;
    b.comment = "增加了一点攻击范围，石头蛋子滑出视野的距离增加了";
    b.audioSrcString = "/sound/子弹音效/石头蛋子.mp3";
    return b;
}

export function StoneCannon_Power_3(world: WorldLike): Tower {
    const b = new Tower(0, 0, world as any);
    b.name = "重型加农炮3级";
    b.rangeR = 230;
    b.r += 6;
    b.bullySpeed = 10;
    b.clock += 55;
    b.hpInit(100000);
    b.getmMainBullyFunc = typeof BullyFinally !== 'undefined' ? BullyFinally.CannonStone_L as any : null;
    b.levelUpArr = [];
    b.levelDownGetter = 'StoneCannon_Power_2';
    b.imgIndex = 9;
    b.price = 320;
    b.comment = "范围进一步增加";
    b.audioSrcString = "/sound/子弹音效/石头蛋子.mp3";
    return b;
}

// Register towers
TowerRegistry.register('StoneCannon', StoneCannon as any, { name: "加农炮", imgIndex: 7, basePrice: 100 });
TowerRegistry.register('StoneCannon_Far_1', StoneCannon_Far_1 as any, { name: "远程加农炮1级", imgIndex: 8, basePrice: 200 });
TowerRegistry.register('StoneCannon_Far_2', StoneCannon_Far_2 as any, { name: "远程加农炮2级", imgIndex: 8, basePrice: 250 });
TowerRegistry.register('StoneCannon_Far_3', StoneCannon_Far_3 as any, { name: "远程加农炮3级", imgIndex: 8, basePrice: 300 });
TowerRegistry.register('StoneCannon_Power_1', StoneCannon_Power_1 as any, { name: "重型加农炮1级", imgIndex: 9, basePrice: 120 });
TowerRegistry.register('StoneCannon_Power_2', StoneCannon_Power_2 as any, { name: "重型加农炮2级", imgIndex: 9, basePrice: 300 });
TowerRegistry.register('StoneCannon_Power_3', StoneCannon_Power_3 as any, { name: "重型加农炮3级", imgIndex: 9, basePrice: 320 });
