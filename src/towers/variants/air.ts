/**
 * Air cannon tower variants
 *
 * Contains: AirCannon_1~3 (3 towers)
 */
import { MyColor } from '../../entities/myColor';
import { TowerRay } from '../base/towerRay';
import { TowerRegistry } from '../towerRegistry';

interface WorldLike {
    batterys: unknown[];
}

export function AirCannon_1(world: WorldLike): TowerRay {
    const b = new TowerRay(0, 0, world as any);
    b.name = "1级空气炮";
    b.r += 5;
    b.rayMoveSpeed = 8;
    b.rayMaxRange = 300;

    b.rayClock = 50;
    b.rayLen = 30;
    b.rayColor = new MyColor(103, 150, 138, 0.5);
    b.rayWidth = 10;
    b.rayRepel = 0.1;
    b.hpInit(4000);
    b.rangeR = 120;
    b.attackFunc = b.gerAttack;
    b.levelDownGetter = 'TraditionalCannon_Middle';
    b.levelUpArr = ['AirCannon_2'];
    b.imgIndex = 30;
    b.price = 300;
    b.comment = `发射出一个空气波，这个空气波对怪物具有击退作用`;
    return b;
}

export function AirCannon_2(world: WorldLike): TowerRay {
    const b = new TowerRay(0, 0, world as any);
    b.name = "2级空气炮";
    b.r += 7;
    b.rayMoveSpeed = 9;
    b.rayMaxRange = 300;
    b.rayClock = 50;
    b.rayLen = 40;
    b.rayRepel = 0.2;
    b.attackFunc = b.gerAttack;
    b.hpInit(5000);
    b.rangeR = 130;
    b.rayColor = new MyColor(103, 150, 138, 0.5);
    b.levelDownGetter = 'AirCannon_1';
    b.levelUpArr = ['AirCannon_3'];
    b.imgIndex = 30;
    b.price = 320;
    b.comment = `击退作用加强，运用的好可能可以赖敌人`;
    return b;
}

export function AirCannon_3(world: WorldLike): TowerRay {
    const b = new TowerRay(0, 0, world as any);
    b.name = "3级空气炮";
    b.r += 8;
    b.rayMoveSpeed = 10;
    b.rayMaxRange = 300;
    b.rayClock = 50;
    b.rayLen = 50;
    b.rayRepel = 0.25;
    b.attackFunc = b.gerAttack;
    b.hpInit(10000);
    b.rangeR = 150;
    b.rayColor = new MyColor(103, 150, 138, 0.5);
    b.levelDownGetter = 'AirCannon_2';
    b.levelUpArr = [];
    b.imgIndex = 30;
    b.price = 400;
    b.comment = `击退进一步加强了`;
    return b;
}

// Register towers
TowerRegistry.register('AirCannon_1', AirCannon_1 as any, { name: "1级空气炮", imgIndex: 30, basePrice: 300 });
TowerRegistry.register('AirCannon_2', AirCannon_2 as any, { name: "2级空气炮", imgIndex: 30, basePrice: 320 });
TowerRegistry.register('AirCannon_3', AirCannon_3 as any, { name: "3级空气炮", imgIndex: 30, basePrice: 400 });
