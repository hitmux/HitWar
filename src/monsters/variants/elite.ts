/**
 * Elite monster variants
 * Contains: Exciting, Visitor, Enderman, Mts, T800 (5)
 */
import { Monster } from '../base/monster';
import { MonsterMortis } from '../base/monsterMortis';
import { MonsterTerminator } from '../base/monsterTerminator';
import { MonsterRegistry } from '../monsterRegistry';

interface WorldLike {
    [key: string]: unknown;
}

export function Exciting(world: WorldLike): Monster {
    const m = Monster.randInit(world as any);
    m.name = "激动人";
    m.speedNumb = 3;
    m.changeSpeedFunc = m.selfExcitingMove;
    m.imgIndex = 21;
    m.comment = "一种移动路径前后更加剧烈的快速的怪物，看起来很激动";
    return m;
}

export function Visitor(world: WorldLike): Monster {
    const m = Monster.randInit(world as any);
    m.name = "旋转人";
    m.speedNumb = 3;
    m.changeSpeedFunc = m.selfDoubleSwingMove;
    m.imgIndex = 22;
    m.comment = "移动路径会很怪，它会旋转的走向目标，绕很多圈才会进行撞击，像是来参观的";
    return m;
}

export function Enderman(world: WorldLike): Monster {
    const m = Monster.randInit(world as any);
    m.name = "小黑";
    m.speedNumb = 1;
    m.teleportingAble = true;
    m.imgIndex = 23;
    m.comment = "一旦受到子弹碰撞，就会瞬移，所以它免疫子弹撞击伤害（不能免疫爆炸等其他伤害），但是它可能会一不小心瞬移到你的建筑上，然后撞死了。";
    return m;
}

export function Mts(world: WorldLike): MonsterMortis {
    const m = MonsterMortis.randInit(world as any) as MonsterMortis;
    m.name = "忍者";
    m.r = 35;
    m.speedNumb = 1;
    m.imgIndex = 24;
    m.addPrice = 50;
    m.comment = "像忍者一样，一旦发现了你的建筑，便会迅速对你的建筑进行收割，像忍者一样来回穿过你的建筑，对你的建筑造成伤害";
    return m;
}

export function T800(world: WorldLike): MonsterTerminator {
    const m = MonsterTerminator.randInit(world as any) as MonsterTerminator;
    m.name = "恐怖机器人";
    m.imgIndex = 25;
    m.addPrice = 600;
    m.comment = "一种由金属打造而成的恐怖机器，威力小的子弹几乎对他没有伤害。具有很强的近战能力。";
    return m;
}

// Register monsters
MonsterRegistry.register('Exciting', Exciting as any);
MonsterRegistry.register('Visitor', Visitor as any);
MonsterRegistry.register('Enderman', Enderman as any);
MonsterRegistry.register('Mts', Mts as any);
MonsterRegistry.register('T800', T800 as any);
