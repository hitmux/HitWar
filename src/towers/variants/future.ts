/**
 * Future tech tower variants
 *
 * Contains: FutureCannon_1 ~ FutureCannon_5 (5 towers)
 */
import { MyColor } from '../../entities/myColor';
import { TowerRay } from '../base/towerRay';
import { TowerRegistry } from '../towerRegistry';

interface WorldLike {
    batterys: unknown[];
}

export function FutureCannon_1(world: WorldLike): TowerRay {
    const b = new TowerRay(0, 0, world as any);
    b.name = "高科技炮塔";

    b.hpInit(5000);
    b.rangeR = 150;
    b.r += 1;
    b.rayMoveSpeed = 10;
    b.rayMaxRange = 200;
    b.rayClock = 10;
    b.rayNum = 1;
    b.rayDeviationRotate = 0;
    b.damage = 15;
    b.rayThrowAble = false;
    b.attackFunc = b.shootingAttack;
    b.rayLen = 15;
    b.rayWidth = 2;
    b.rayColor = new MyColor(69, 214, 165, 1);

    b.levelDownGetter = 'BasicCannon';
    b.levelUpArr = ['FutureCannon_2', 'Thunder_1', 'Laser'];
    b.price = 800;
    b.imgIndex = 50;
    b.comment = "想要获取更强大的激光、闪电等等的高科技武器，就要从此处升级开始，该高科技炮塔会发射激光粒子子弹";
    b.audioSrcString = "/sound/发射音效/高科技塔发射.mp3";
    return b;
}

export function FutureCannon_2(world: WorldLike): TowerRay {
    const b = new TowerRay(0, 0, world as any);
    b.name = "2级高科技塔";
    b.r += 5;
    b.hpInit(10000);
    b.rangeR = 170;
    b.rayMoveSpeed = 15;
    b.rayMaxRange = 250;
    b.rayClock = 6;
    b.rayNum = 1;
    b.rayDeviationRotate = 0;
    b.damage = 20;
    b.rayThrowAble = false;
    b.attackFunc = b.shootingAttack;
    b.rayLen = 30;
    b.rayWidth = 4;
    b.rayColor = new MyColor(69, 200, 165, 0.9);

    b.levelDownGetter = 'FutureCannon_1';
    b.levelUpArr = ['FutureCannon_3'];
    b.imgIndex = 51;
    b.price = 300;
    b.comment = `高科技塔，发射的光粒子弹加强了`;
    return b;
}

export function FutureCannon_3(world: WorldLike): TowerRay {
    const b = new TowerRay(0, 0, world as any);
    b.name = "3级高科技塔";
    b.r += 7;

    b.hpInit(20000);
    b.rangeR = 200;
    b.rayMoveSpeed = 17;
    b.rayMaxRange = 300;
    b.rayClock = 5;
    b.rayNum = 1;
    b.rayDeviationRotate = 0.1;
    b.damage = 35;
    b.rayThrowAble = true;
    b.attackFunc = b.shootingAttack;
    b.rayLen = 40;
    b.rayWidth = 5;
    b.rayColor = new MyColor(69, 195, 165, 0.6);

    b.levelDownGetter = 'FutureCannon_2';
    b.levelUpArr = ['FutureCannon_4'];
    b.imgIndex = 52;
    b.price = 600;
    b.comment = `发射的子弹进一步加强`;
    return b;
}

export function FutureCannon_4(world: WorldLike): TowerRay {
    const b = new TowerRay(0, 0, world as any);
    b.name = "4级高科技塔";
    b.r += 9;
    b.hpInit(50000);
    b.rangeR = 250;
    b.rayMoveSpeed = 16;
    b.rayMaxRange = 400;
    b.rayClock = 4;
    b.rayNum = 1;
    b.rayDeviationRotate = 0;
    b.damage = 37;
    b.rayThrowAble = true;
    b.attackFunc = b.shootingAttack;
    b.rayLen = 40;
    b.rayDeviationRotate = 0.2;
    b.rayWidth = 6;
    b.rayColor = new MyColor(69, 180, 165, 0.6);
    b.levelDownGetter = 'FutureCannon_3';
    b.levelUpArr = ['FutureCannon_5'];
    b.imgIndex = 53;
    b.price = 800;
    b.comment = `发射的子弹能够穿过敌人了`;
    return b;
}

export function FutureCannon_5(world: WorldLike): TowerRay {
    const b = new TowerRay(0, 0, world as any);
    b.name = "5级高科技塔";
    b.r += 12;
    b.hpInit(100000);
    b.rangeR = 280;
    b.rayMoveSpeed = 16;
    b.rayMaxRange = 400;
    b.rayClock = 2;
    b.rayNum = 1;
    b.rayDeviationRotate = 0.3;
    b.damage = 40;
    b.rayThrowAble = true;
    b.attackFunc = b.shootingAttack;
    b.rayLen = 45;
    b.rayWidth = 7;
    b.rayColor = new MyColor(69, 150, 165, 0.6);
    b.levelDownGetter = 'FutureCannon_4';
    b.levelUpArr = [];
    b.imgIndex = 54;
    b.price = 1200;
    b.comment = `发射的子弹进一步加强了`;
    return b;
}

// Register towers
TowerRegistry.register('FutureCannon_1', FutureCannon_1 as any, { name: "高科技炮塔", imgIndex: 50, basePrice: 800 });
TowerRegistry.register('FutureCannon_2', FutureCannon_2 as any, { name: "2级高科技塔", imgIndex: 51, basePrice: 300 });
TowerRegistry.register('FutureCannon_3', FutureCannon_3 as any, { name: "3级高科技塔", imgIndex: 52, basePrice: 600 });
TowerRegistry.register('FutureCannon_4', FutureCannon_4 as any, { name: "4级高科技塔", imgIndex: 53, basePrice: 800 });
TowerRegistry.register('FutureCannon_5', FutureCannon_5 as any, { name: "5级高科技塔", imgIndex: 54, basePrice: 1200 });
