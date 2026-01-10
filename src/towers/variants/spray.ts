/**
 * Spray cannon tower variants
 *
 * Contains: SprayCannon_1~3, SprayCannon_Double, SprayCannon_Three (5 towers)
 */
import { Tower } from '../base/tower';
import { TowerRegistry } from '../towerRegistry';

// BullyFinally will be resolved from global scope
declare const BullyFinally: {
    SS_S: (() => unknown) | null;
    SS_M: (() => unknown) | null;
    SS_L: (() => unknown) | null;
    SS_Second: (() => unknown) | null;
    SS_Third: (() => unknown) | null;
} | undefined;

interface WorldLike {
    batterys: unknown[];
}

export function SprayCannon_1(world: WorldLike): Tower {
    const b = new Tower(0, 0, world as any);
    b.name = "1级溅射炮塔";
    b.rangeR = 200;
    b.r += 10;
    b.bullySpeed = 5;
    b.clock += 20;
    b.hpInit(1000);

    b.getmMainBullyFunc = typeof BullyFinally !== 'undefined' ? BullyFinally.SS_S as any : null;
    b.price = 300;
    b.levelDownGetter = 'TraditionalCannon_MultiTube';
    b.levelUpArr = ['SprayCannon_2', 'SprayCannon_Double'];
    b.imgIndex = 40;
    b.price = 250;
    b.comment = `发射出去的子弹可以发生分裂`;
    b.audioSrcString = "/sound/发射音效/喷泄.mp3";
    return b;
}

export function SprayCannon_2(world: WorldLike): Tower {
    const b = new Tower(0, 0, world as any);
    b.name = "2级溅射炮塔";
    b.rangeR = 220;
    b.r += 11;
    b.bullySpeed = 8;
    b.clock += 20;
    b.hpInit(3000);
    b.getmMainBullyFunc = typeof BullyFinally !== 'undefined' ? BullyFinally.SS_M as any : null;
    b.price = 500;
    b.levelDownGetter = 'SprayCannon_1';
    b.levelUpArr = ['SprayCannon_3'];
    b.imgIndex = 40;
    b.price = 360;
    b.comment = `发射的子弹由小型分裂弹变为中型分裂弹`;
    b.audioSrcString = "/sound/发射音效/喷泄.mp3";
    return b;
}

export function SprayCannon_3(world: WorldLike): Tower {
    const b = new Tower(0, 0, world as any);
    b.name = "3级溅射炮塔";
    b.rangeR = 250;
    b.r += 12;
    b.bullySpeed = 11;
    b.clock += 20;
    b.hpInit(5000);
    b.getmMainBullyFunc = typeof BullyFinally !== 'undefined' ? BullyFinally.SS_L as any : null;
    b.price = 1000;
    b.levelDownGetter = 'SprayCannon_2';
    b.levelUpArr = [];
    b.imgIndex = 40;
    b.price = 500;
    b.comment = `发射大型分裂弹`;
    b.audioSrcString = "/sound/发射音效/喷泄.mp3";
    return b;
}

export function SprayCannon_Double(world: WorldLike): Tower {
    const b = new Tower(0, 0, world as any);
    b.name = "二次溅射炮塔";
    b.rangeR = 250;
    b.r += 13;
    b.bullySpeed = 15;
    b.clock += 20;
    b.hpInit(10000);
    b.getmMainBullyFunc = typeof BullyFinally !== 'undefined' ? BullyFinally.SS_Second as any : null;
    b.price = 10000;
    b.levelDownGetter = 'SprayCannon_1';
    b.levelUpArr = ['SprayCannon_Three'];
    b.imgIndex = 41;
    b.price = 600;
    b.comment = `发射的子弹能够发生分裂，发生分裂后的子弹碰到怪物还能继续发生分裂`;
    b.audioSrcString = "/sound/发射音效/喷泄.mp3";
    return b;
}

export function SprayCannon_Three(world: WorldLike): Tower {
    const b = new Tower(0, 0, world as any);
    b.name = "三次溅射炮塔";
    b.rangeR = 250;
    b.r += 15;
    b.bullySpeed = 15;
    b.clock += 20;
    b.hpInit(10000);
    b.getmMainBullyFunc = typeof BullyFinally !== 'undefined' ? BullyFinally.SS_Third as any : null;
    b.price = 10000;
    b.levelDownGetter = 'SprayCannon_Double';
    b.levelUpArr = [];
    b.imgIndex = 41;
    b.price = 900;
    b.comment = `发生出去的子弹发生分裂，分裂后继续分裂，分裂后还能分裂！总共能够分裂三次`;
    b.audioSrcString = "/sound/发射音效/喷泄.mp3";
    return b;
}

// Register towers
TowerRegistry.register('SprayCannon_1', SprayCannon_1 as any, { name: "1级溅射炮塔", imgIndex: 40, basePrice: 250 });
TowerRegistry.register('SprayCannon_2', SprayCannon_2 as any, { name: "2级溅射炮塔", imgIndex: 40, basePrice: 360 });
TowerRegistry.register('SprayCannon_3', SprayCannon_3 as any, { name: "3级溅射炮塔", imgIndex: 40, basePrice: 500 });
TowerRegistry.register('SprayCannon_Double', SprayCannon_Double as any, { name: "二次溅射炮塔", imgIndex: 41, basePrice: 600 });
TowerRegistry.register('SprayCannon_Three', SprayCannon_Three as any, { name: "三次溅射炮塔", imgIndex: 41, basePrice: 900 });
