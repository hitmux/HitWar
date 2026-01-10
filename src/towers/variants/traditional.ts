/**
 * Traditional (military) tower variants
 *
 * Contains: TraditionalCannon, TraditionalCannon_Small/Middle/Large/MultiTube (5 towers)
 */
import { Tower } from '../base/tower';
import { TowerRegistry } from '../towerRegistry';

// BullyFinally will be resolved from global scope until bullets module is migrated
declare const BullyFinally: {
    Bully_S: (() => unknown) | null;
    Bully_M: (() => unknown) | null;
    Bully_L: (() => unknown) | null;
} | undefined;

interface WorldLike {
    batterys: unknown[];
}

/**
 * TraditionalCannon - Military style tower
 */
export function TraditionalCannon(world: WorldLike): Tower {
    const res = new Tower(0, 0, world as any);
    res.name = "军事炮塔";
    res.r += 1;
    res.hpInit(5000);
    res.rangeR += 5;
    res.levelDownGetter = 'BasicCannon';
    res.levelUpArr = ['TraditionalCannon_Small', 'TraditionalCannon_Middle', 'TraditionalCannon_Large', 'TraditionalCannon_MultiTube'];
    res.price = 120;
    res.imgIndex = 20;
    res.comment = "接下来的风格都是军事风格的炮塔";
    res.audioSrcString = "/sound/子弹音效/军事子弹.mp3";
    return res;
}

export function TraditionalCannon_Small(world: WorldLike): Tower {
    const res = new Tower(0, 0, world as any);
    res.name = "小型炮塔";
    res.r += 2;
    res.rangeR = 200;
    res.clock = 3;
    res.getmMainBullyFunc = typeof BullyFinally !== 'undefined' ? BullyFinally.Bully_S as any : null;
    res.levelUpArr = ['Rifle_1', 'MachineGun_1', 'ArmorPiercing_1'];
    res.levelDownGetter = 'TraditionalCannon';
    res.imgIndex = 21;
    res.price = 120;
    res.comment = "该炮塔是小型枪械的过渡";
    res.audioSrcString = "/sound/子弹音效/军事子弹.mp3";
    return res;
}

export function TraditionalCannon_Middle(world: WorldLike): Tower {
    const res = new Tower(0, 0, world as any);
    res.name = "中型炮塔";
    res.rangeR = 200;
    res.r += 3;
    res.clock = 3;
    res.getmMainBullyFunc = typeof BullyFinally !== 'undefined' ? BullyFinally.Bully_M as any : null;
    res.levelDownGetter = 'TraditionalCannon';
    res.levelUpArr = ['AirCannon_1', 'Earthquake'];
    res.imgIndex = 22;
    res.price = 130;
    res.comment = `该炮塔能发展成一些比较特殊的军事器械`;
    res.audioSrcString = "/sound/子弹音效/军事子弹.mp3";
    return res;
}

export function TraditionalCannon_Large(world: WorldLike): Tower {
    const res = new Tower(0, 0, world as any);
    res.name = "大型炮塔";
    res.rangeR = 200;
    res.r += 4;
    res.getmMainBullyFunc = typeof BullyFinally !== 'undefined' ? BullyFinally.Bully_L as any : null;
    res.clock = 3;
    res.levelDownGetter = 'TraditionalCannon';
    res.imgIndex = 23;
    res.levelUpArr = ['Artillery_1', 'MissileGun_1'];
    res.price = 140;
    res.comment = `该炮塔能够发展成更有火药，伤害更强的军事器械`;
    res.audioSrcString = "/sound/子弹音效/军事子弹.mp3";
    return res;
}

export function TraditionalCannon_MultiTube(world: WorldLike): Tower {
    const res = new Tower(0, 0, world as any);
    res.name = "双管炮塔";
    res.rangeR = 200;
    res.r += 4;
    res.getmMainBullyFunc = typeof BullyFinally !== 'undefined' ? BullyFinally.Bully_M as any : null;
    res.bullyRotate = Math.PI / 36;
    res.attackFunc = res.shrapnelAttack;
    res.attackBullyNum = 2;
    res.clock = 4;

    res.levelDownGetter = 'TraditionalCannon';
    res.imgIndex = 24;
    res.levelUpArr = ['ThreeTubeCannon', 'SprayCannon_1', 'PowderCannon'];
    res.price = 135;
    res.comment = `该炮塔主要朝着多发、散弹、群体伤害方向发展`;
    res.audioSrcString = "/sound/子弹音效/军事子弹.mp3";
    return res;
}

// Register towers
TowerRegistry.register('TraditionalCannon', TraditionalCannon as any, { name: "军事炮塔", imgIndex: 20, basePrice: 120 });
TowerRegistry.register('TraditionalCannon_Small', TraditionalCannon_Small as any, { name: "小型炮塔", imgIndex: 21, basePrice: 120 });
TowerRegistry.register('TraditionalCannon_Middle', TraditionalCannon_Middle as any, { name: "中型炮塔", imgIndex: 22, basePrice: 130 });
TowerRegistry.register('TraditionalCannon_Large', TraditionalCannon_Large as any, { name: "大型炮塔", imgIndex: 23, basePrice: 140 });
TowerRegistry.register('TraditionalCannon_MultiTube', TraditionalCannon_MultiTube as any, { name: "双管炮塔", imgIndex: 24, basePrice: 135 });
