/**
 * Shot/Shotgun tower variants
 *
 * Contains: Shotgun_1~2, ShotCannon_1~2, ThreeTubeCannon (5 towers)
 */
import { Tower } from '../base/tower';
import { TowerRegistry } from '../towerRegistry';

// BullyFinally will be resolved from global scope
declare const BullyFinally: {
    Bully_M: (() => unknown) | null;
} | undefined;

interface WorldLike {
    batterys: unknown[];
}

export function ThreeTubeCannon(world: WorldLike): Tower {
    const b = new Tower(0, 0, world as any);
    b.name = "三管炮塔";
    b.r += 6;
    b.rangeR = 230;

    b.bullySpeed = 3;

    b.getmMainBullyFunc = typeof BullyFinally !== 'undefined' ? BullyFinally.Bully_M as any : null;
    b.bullyRotate = Math.PI / 12;
    b.attackFunc = b.shrapnelAttack;
    b.attackBullyNum = 3;
    b.clock = 4;

    b.levelDownGetter = 'TraditionalCannon_MultiTube';
    b.levelUpArr = ['Shotgun_1', 'ShotCannon_1'];
    b.imgIndex = 42;
    b.price = 400;
    b.comment = `一种散弹`;
    b.audioSrcString = "/sound/子弹音效/散弹子弹.mp3";
    return b;
}

export function Shotgun_1(world: WorldLike): Tower {
    const b = new Tower(0, 0, world as any);
    b.name = "1级快速散弹";

    b.rangeR = 250;
    b.bullySpeed = 3;
    b.bullySpeedAddMax = 0.5;
    b.getmMainBullyFunc = typeof BullyFinally !== 'undefined' ? BullyFinally.Bully_M as any : null;
    b.bullyRotate = Math.PI / 10;
    b.attackFunc = b.shrapnelAttack;
    b.attackBullyNum = 5;
    b.clock = 3;
    b.r += 10;
    b.hpInit(5000);

    b.levelDownGetter = 'ThreeTubeCannon';
    b.levelUpArr = ['Shotgun_2'];
    b.imgIndex = 44;
    b.price = 500;
    b.comment = `发射频率很快的散弹子弹`;
    b.audioSrcString = "/sound/子弹音效/散弹子弹.mp3";
    return b;
}

export function Shotgun_2(world: WorldLike): Tower {
    const b = new Tower(0, 0, world as any);
    b.name = "2级快速散弹";
    b.r += 11;
    b.rangeR = 260;
    b.bullySpeed = 2.8;
    b.bullySpeedAddMax = 0.7;
    b.getmMainBullyFunc = typeof BullyFinally !== 'undefined' ? BullyFinally.Bully_M as any : null;
    b.bullyRotate = Math.PI / 6;
    b.attackFunc = b.shrapnelAttack;
    b.attackBullyNum = 10;
    b.clock = 2;
    b.r += 12;
    b.hpInit(10000);

    b.levelDownGetter = 'Shotgun_1';
    b.levelUpArr = [];
    b.imgIndex = 44;
    b.price = 800;
    b.comment = `发射的频率更快了，但是子弹的移动速度可能并不是很快`;
    b.audioSrcString = "/sound/子弹音效/散弹子弹.mp3";
    return b;
}

export function ShotCannon_1(world: WorldLike): Tower {
    const b = new Tower(0, 0, world as any);
    b.name = "1级喷泄炮";
    b.r += 10;
    b.rangeR = 225;
    b.clock = 15;
    b.bullySpeed = 3;
    b.bullySlideRate = 1;
    b.bullySpeedAddMax = 14;

    b.hpInit(5000);
    b.attackBullyNum = 40;
    b.bullyDeviationRotate = 5;
    b.getmMainBullyFunc = typeof BullyFinally !== 'undefined' ? BullyFinally.Bully_M as any : null;

    b.price = 200;
    b.levelDownGetter = 'ThreeTubeCannon';
    b.levelUpArr = ['ShotCannon_2'];
    b.imgIndex = 43;
    b.price = 600;
    b.comment = `像人拉屎窜稀一样，快速的喷泄出大量子弹，喷泄出的子弹速度不一`;
    b.audioSrcString = "/sound/发射音效/喷泄.mp3";
    return b;
}

export function ShotCannon_2(world: WorldLike): Tower {
    const b = new Tower(0, 0, world as any);
    b.name = "2级喷泄炮";
    b.r += 11;
    b.rangeR += 235;
    b.clock = 18;
    b.bullySpeed = 3;
    b.bullySlideRate = 1.1;
    b.bullySpeedAddMax = 16;

    b.hpInit(5000);
    b.attackBullyNum = 100;
    b.bullyDeviationRotate = 8;
    b.getmMainBullyFunc = typeof BullyFinally !== 'undefined' ? BullyFinally.Bully_M as any : null;

    b.levelDownGetter = 'ShotCannon_1';
    b.levelUpArr = [];
    b.imgIndex = 43;
    b.price = 900;
    b.comment = `喷泄量增加了`;
    b.audioSrcString = "/sound/发射音效/喷泄.mp3";
    return b;
}

// Register towers
TowerRegistry.register('ThreeTubeCannon', ThreeTubeCannon as any, { name: "三管炮塔", imgIndex: 42, basePrice: 400 });
TowerRegistry.register('Shotgun_1', Shotgun_1 as any, { name: "1级快速散弹", imgIndex: 44, basePrice: 500 });
TowerRegistry.register('Shotgun_2', Shotgun_2 as any, { name: "2级快速散弹", imgIndex: 44, basePrice: 800 });
TowerRegistry.register('ShotCannon_1', ShotCannon_1 as any, { name: "1级喷泄炮", imgIndex: 43, basePrice: 600 });
TowerRegistry.register('ShotCannon_2', ShotCannon_2 as any, { name: "2级喷泄炮", imgIndex: 43, basePrice: 900 });
