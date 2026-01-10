/**
 * Gun tower variants
 *
 * Contains: Rifle_1~3, MachineGun_1~3, ArmorPiercing_1~3 (9 towers)
 */
import { Tower } from '../base/tower';
import { TowerRegistry } from '../towerRegistry';

// BullyFinally will be resolved from global scope
declare const BullyFinally: {
    Rifle_Bully_L: (() => unknown) | null;
    Rifle_Bully_M: (() => unknown) | null;
    F_S: (() => unknown) | null;
    F_M: (() => unknown) | null;
    F_L: (() => unknown) | null;
    T_M: (() => unknown) | null;
    T_L: (() => unknown) | null;
    T_LL: (() => unknown) | null;
} | undefined;

interface WorldLike {
    batterys: unknown[];
}

export function Rifle_1(world: WorldLike): Tower {
    const res = new Tower(0, 0, world as any);
    res.name = "1级步枪";
    res.r += 3;
    res.rangeR = 200;
    res.clock = 4;
    res.bullySpeed += 3;
    res.getmMainBullyFunc = typeof BullyFinally !== 'undefined' ? BullyFinally.Rifle_Bully_L as any : null;
    res.levelDownGetter = 'TraditionalCannon_Small';
    res.levelUpArr = ['Rifle_2'];
    res.imgIndex = 25;
    res.price = 160;
    res.comment = `就是步枪了啦`;
    res.audioSrcString = "/sound/子弹音效/步枪子弹.mp3";
    return res;
}

export function Rifle_2(world: WorldLike): Tower {
    const res = new Tower(0, 0, world as any);
    res.name = "2级步枪";
    res.r += 3;
    res.rangeR = 230;
    res.clock = 3;
    res.bullySpeed += 4;
    res.getmMainBullyFunc = typeof BullyFinally !== 'undefined' ? BullyFinally.Rifle_Bully_M as any : null;
    res.levelUpArr = ['Rifle_3'];
    res.levelDownGetter = 'Rifle_1';
    res.imgIndex = 25;
    res.price = 170;
    res.comment = `范围和射速增加了啦`;
    res.audioSrcString = "/sound/子弹音效/步枪子弹.mp3";
    return res;
}

export function Rifle_3(world: WorldLike): Tower {
    const res = new Tower(0, 0, world as any);
    res.name = "3级步枪";
    res.r += 4;
    res.rangeR = 260;
    res.clock = 3;
    res.bullySpeed += 5;
    res.getmMainBullyFunc = typeof BullyFinally !== 'undefined' ? BullyFinally.Rifle_Bully_L as any : null;
    res.levelUpArr = [];
    res.levelDownGetter = 'Rifle_2';
    res.imgIndex = 25;
    res.price = 180;
    res.comment = `子弹的速度增加了，步枪子弹也加强了`;
    res.audioSrcString = "/sound/子弹音效/步枪子弹.mp3";
    return res;
}

export function MachineGun_1(world: WorldLike): Tower {
    const b = new Tower(0, 0, world as any);
    b.name = "1级重机枪";
    b.rangeR = 220;
    b.r += 3;
    b.bullySpeed += 2;
    b.getmMainBullyFunc = typeof BullyFinally !== 'undefined' ? BullyFinally.F_S as any : null;
    b.bullySpeedAddMax = 5;
    b.clock = 2;
    b.bullyDeviation = 20;
    b.hpInit(2000);
    b.levelUpArr = ['MachineGun_2'];
    b.levelDownGetter = 'TraditionalCannon_Small';
    b.imgIndex = 26;
    b.price = 250;
    b.comment = `就是机枪了啦`;
    b.audioSrcString = "/sound/子弹音效/机枪子弹.mp3";
    return b;
}

export function MachineGun_2(world: WorldLike): Tower {
    const b = new Tower(0, 0, world as any);
    b.name = "2级重机枪";
    b.rangeR = 190;
    b.r += 5;

    b.bullySpeed = 2;
    b.bullySlideRate = 1.1;
    b.bullySpeedAddMax = 10;
    b.getmMainBullyFunc = typeof BullyFinally !== 'undefined' ? BullyFinally.F_M as any : null;
    b.clock = 1;
    b.hpInit(5000);
    b.bullyDeviation = 20;
    b.attackBullyNum = 3;
    b.levelUpArr = ['MachineGun_3'];
    b.levelDownGetter = 'MachineGun_1';
    b.imgIndex = 26;
    b.price = 300;
    b.comment = `射速更快，子弹更多`;
    b.audioSrcString = "/sound/子弹音效/机枪子弹.mp3";
    return b;
}

export function MachineGun_3(world: WorldLike): Tower {
    const b = new Tower(0, 0, world as any);
    b.name = "3级重机枪";
    b.rangeR = 250;
    b.r += 7;

    b.bullySpeed = 8.2;
    b.bullySlideRate = 1;
    b.bullySpeedAddMax = 3;
    b.getmMainBullyFunc = typeof BullyFinally !== 'undefined' ? BullyFinally.F_L as any : null;
    b.clock = 1;
    b.hpInit(10000);
    b.bullyDeviation = 30;
    b.attackBullyNum = 3;
    b.levelUpArr = [];
    b.levelDownGetter = 'MachineGun_2';
    b.imgIndex = 27;
    b.price = 500;
    b.comment = `射速又加强了，子弹也加强了`;
    b.audioSrcString = "/sound/子弹音效/机枪子弹.mp3";
    return b;
}

export function ArmorPiercing_1(world: WorldLike): Tower {
    const b = new Tower(0, 0, world as any);
    b.name = "1级穿甲炮";
    b.rangeR = 200;
    b.r += 5;
    b.bullySpeed += 3;
    b.bullySlideRate = 3;
    b.clock = 4;
    b.hpInit(1500);
    b.getmMainBullyFunc = typeof BullyFinally !== 'undefined' ? BullyFinally.T_M as any : null;
    b.levelDownGetter = 'TraditionalCannon_Small';
    b.levelUpArr = ['ArmorPiercing_2'];
    b.imgIndex = 28;
    b.price = 220;
    b.comment = `穿甲炮的子弹能够穿过敌人，在穿过敌人的过程中对敌人持续造成伤害，但是子弹半径会变小，直到子弹消失，消失前子弹伤害是不变的`;
    b.audioSrcString = "/sound/子弹音效/穿甲弹.mp3";
    return b;
}

export function ArmorPiercing_2(world: WorldLike): Tower {
    const b = new Tower(0, 0, world as any);
    b.name = "2级穿甲炮";
    b.rangeR = 220;
    b.r += 7;
    b.bullySpeed += 3;
    b.bullySlideRate = 5;
    b.clock = 2;
    b.hpInit(5000);
    b.bullySpeedAddMax = 3;
    b.getmMainBullyFunc = typeof BullyFinally !== 'undefined' ? BullyFinally.T_L as any : null;
    b.levelUpArr = ['ArmorPiercing_3'];
    b.levelDownGetter = 'AirCannon_1';
    b.imgIndex = 29;
    b.price = 250;
    b.comment = `子弹加强了，射速也更快了`;
    b.audioSrcString = "/sound/子弹音效/穿甲弹.mp3";
    return b;
}

export function ArmorPiercing_3(world: WorldLike): Tower {
    const b = new Tower(0, 0, world as any);
    b.name = "3级穿甲炮";
    b.rangeR = 230;
    b.r += 9;
    b.bullySpeed = 4;
    b.bullySlideRate = 5;
    b.clock = 10;
    b.hpInit(10000);
    b.bullySpeedAddMax = 4;
    b.getmMainBullyFunc = typeof BullyFinally !== 'undefined' ? BullyFinally.T_LL as any : null;
    b.levelUpArr = [];
    b.levelDownGetter = 'AirCannon_2';
    b.imgIndex = 29;
    b.price = 400;
    b.comment = `射速更慢了，但是子弹变成大型的穿甲弹了`;
    b.audioSrcString = "/sound/子弹音效/穿甲弹.mp3";
    return b;
}

// Register towers
TowerRegistry.register('Rifle_1', Rifle_1 as any, { name: "1级步枪", imgIndex: 25, basePrice: 160 });
TowerRegistry.register('Rifle_2', Rifle_2 as any, { name: "2级步枪", imgIndex: 25, basePrice: 170 });
TowerRegistry.register('Rifle_3', Rifle_3 as any, { name: "3级步枪", imgIndex: 25, basePrice: 180 });
TowerRegistry.register('MachineGun_1', MachineGun_1 as any, { name: "1级重机枪", imgIndex: 26, basePrice: 250 });
TowerRegistry.register('MachineGun_2', MachineGun_2 as any, { name: "2级重机枪", imgIndex: 26, basePrice: 300 });
TowerRegistry.register('MachineGun_3', MachineGun_3 as any, { name: "3级重机枪", imgIndex: 27, basePrice: 500 });
TowerRegistry.register('ArmorPiercing_1', ArmorPiercing_1 as any, { name: "1级穿甲炮", imgIndex: 28, basePrice: 220 });
TowerRegistry.register('ArmorPiercing_2', ArmorPiercing_2 as any, { name: "2级穿甲炮", imgIndex: 29, basePrice: 250 });
TowerRegistry.register('ArmorPiercing_3', ArmorPiercing_3 as any, { name: "3级穿甲炮", imgIndex: 29, basePrice: 400 });
