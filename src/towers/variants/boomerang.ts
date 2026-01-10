/**
 * Boomerang tower variants
 *
 * Contains: Boomerang, Boomerang_Far_1~3, Boomerang_Power_1~3 (7 towers)
 */
import { TowerBoomerang } from '../base/towerBoomerang';
import { TowerRegistry } from '../towerRegistry';

interface WorldLike {
    batterys: unknown[];
}

export function Boomerang(world: WorldLike): TowerBoomerang {
    const res = new TowerBoomerang(0, 0, world as any);
    res.name = "回旋镖";
    res.hpInit(3000);
    res.damage = 100;
    res.rangeR = 120;
    res.r += 2;
    res.bar = res.initBar();
    res.levelUpArr = ['Boomerang_Far_1', 'Boomerang_Power_1'];
    res.levelDownGetter = 'AncientCannon';
    res.imgIndex = 2;
    res.price = 190;
    res.comment = "一种威力不小的攻击东西，回旋镖能够穿过敌人，对所有穿过的敌人造成伤害";
    return res;
}

export function Boomerang_Far_1(world: WorldLike): TowerBoomerang {
    const res = new TowerBoomerang(0, 0, world as any);
    res.name = "远程回旋镖1级";
    res.r += 3;
    res.hpInit(6000);
    res.damage = 100;
    res.rangeR = 140;
    res.barRotateSelfSpeed = 0.6;
    res.bar = res.initBar();
    res.levelUpArr = ['Boomerang_Far_2'];
    res.levelDownGetter = 'Boomerang';
    res.imgIndex = 2;
    res.price = 230;
    res.comment = "回旋镖的距离更远了";
    return res;
}

export function Boomerang_Far_2(world: WorldLike): TowerBoomerang {
    const res = new TowerBoomerang(0, 0, world as any);
    res.name = "远程回旋镖2级";
    res.r += 4;
    res.hpInit(6000);
    res.damage = 100;
    res.rangeR = 160;
    res.barWidth = 10;
    res.barRotateSelfSpeed = 0.7;
    res.bar = res.initBar();
    res.levelUpArr = ['Boomerang_Far_3'];
    res.levelDownGetter = 'Boomerang_Far_1';
    res.imgIndex = 2;
    res.price = 350;
    res.comment = "距离又远了";
    return res;
}

export function Boomerang_Far_3(world: WorldLike): TowerBoomerang {
    const res = new TowerBoomerang(0, 0, world as any);
    res.name = "远程回旋镖3级";
    res.r += 5;
    res.hpInit(6000);
    res.damage = 120;
    res.rangeR = 200;
    res.barWidth = 10;
    res.barRotateSelfSpeed = 0.8;
    res.bar = res.initBar();
    res.levelUpArr = [];
    res.levelDownGetter = 'Boomerang_Far_2';
    res.imgIndex = 2;
    res.price = 300;
    res.comment = "距离又又又远了";
    return res;
}

export function Boomerang_Power_1(world: WorldLike): TowerBoomerang {
    const res = new TowerBoomerang(0, 0, world as any);
    res.name = "力量回旋镖1级";
    res.hpInit(3000);
    res.damage = 250;
    res.rangeR = 100;
    res.barWidth = 10;
    res.barLen = 20;
    res.r += 2;
    res.barRotateSelfSpeed = 0.2;
    res.bar = res.initBar();
    res.levelUpArr = ['Boomerang_Power_2'];
    res.levelDownGetter = 'Boomerang';
    res.imgIndex = 2;
    res.price = 300;
    res.comment = "相对于普通的回旋镖，距离虽然没那么远了，但是伤害更大了，回旋镖也更大更强了";
    return res;
}

export function Boomerang_Power_2(world: WorldLike): TowerBoomerang {
    const res = new TowerBoomerang(0, 0, world as any);
    res.name = "力量回旋镖2级";
    res.hpInit(5000);
    res.damage = 500;
    res.rangeR = 100;
    res.barWidth = 15;
    res.barLen = 30;
    res.r += 3;
    res.barRotateSelfSpeed = 0.1;
    res.bar = res.initBar();
    res.levelUpArr = ['Boomerang_Power_3'];
    res.levelDownGetter = 'Boomerang_Power_1';
    res.imgIndex = 2;
    res.price = 350;
    res.comment = "伤害又继续猛增";
    return res;
}

export function Boomerang_Power_3(world: WorldLike): TowerBoomerang {
    const res = new TowerBoomerang(0, 0, world as any);
    res.name = "力量回旋镖3级";
    res.hpInit(10000);
    res.damage = 800;
    res.rangeR = 110;
    res.barWidth = 20;
    res.barLen = 40;
    res.r += 4;
    res.barRotateSelfSpeed = 0.05;
    res.bar = res.initBar();
    res.levelUpArr = [];
    res.levelDownGetter = 'Boomerang_Power_2';
    res.imgIndex = 2;
    res.price = 400;
    res.comment = "伤害更大了，这恐怕不是回旋镖了，叫回旋的板砖儿...";
    return res;
}

// Register towers
TowerRegistry.register('Boomerang', Boomerang as any, { name: "回旋镖", imgIndex: 2, basePrice: 190 });
TowerRegistry.register('Boomerang_Far_1', Boomerang_Far_1 as any, { name: "远程回旋镖1级", imgIndex: 2, basePrice: 230 });
TowerRegistry.register('Boomerang_Far_2', Boomerang_Far_2 as any, { name: "远程回旋镖2级", imgIndex: 2, basePrice: 350 });
TowerRegistry.register('Boomerang_Far_3', Boomerang_Far_3 as any, { name: "远程回旋镖3级", imgIndex: 2, basePrice: 300 });
TowerRegistry.register('Boomerang_Power_1', Boomerang_Power_1 as any, { name: "力量回旋镖1级", imgIndex: 2, basePrice: 300 });
TowerRegistry.register('Boomerang_Power_2', Boomerang_Power_2 as any, { name: "力量回旋镖2级", imgIndex: 2, basePrice: 350 });
TowerRegistry.register('Boomerang_Power_3', Boomerang_Power_3 as any, { name: "力量回旋镖3级", imgIndex: 2, basePrice: 400 });
