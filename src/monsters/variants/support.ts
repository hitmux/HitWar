/**
 * Support monster variants
 * Contains: Medic, Medic_S, Medic_M, SpeedAdder, AttackAdder (5)
 */
import { MyColor } from '../../entities/myColor';
import { Monster } from '../base/monster';
import { MonsterRegistry } from '../monsterRegistry';

interface WorldLike {
    [key: string]: unknown;
}

export function Medic(world: WorldLike): Monster {
    const m = Monster.randInit(world as any);
    m.name = "加血辅助";
    m.addPrice += 10;
    m.speedNumb = 0.5;
    m.bodyColor = MyColor.arrTo([105, 117, 60, 1]);
    m.r = 30;
    m.haveGain = true;
    m.gainDetails = {
        gainRadius: 100,
        gainFrequency: 10,
        gainR: 0,
        gainCollideDamageAddNum: 0,
        gainHpAddedNum: 10,
        gainSpeedNAddNum: 0,
        gainHpAddedRate: 0.0,
        gainMaxHpAddedNum: 0,
    };
    m.imgIndex = 7;
    m.comment = "不停的给队友恢复固定的血量";
    return m;
}

export function Medic_S(world: WorldLike): Monster {
    const m = Monster.randInit(world as any);
    m.name = "加比例血辅助";
    m.addPrice += 10;
    m.speedNumb = 0.5;
    m.bodyColor = MyColor.arrTo([92, 117, 79, 1]);
    m.r = 30;
    m.haveGain = true;
    m.gainDetails = {
        gainRadius: 200,
        gainFrequency: 20,
        gainR: 0,
        gainCollideDamageAddNum: 0,
        gainHpAddedNum: 0,
        gainSpeedNAddNum: 0,
        gainHpAddedRate: 0.1,
        gainMaxHpAddedNum: 0,
    };
    m.imgIndex = 8;
    m.comment = "不停的给队友恢复他们自身最大血量一定比例的血量";
    return m;
}

export function Medic_M(world: WorldLike): Monster {
    const m = Monster.randInit(world as any);
    m.name = "加上限血辅助";
    m.addPrice += 10;
    m.speedNumb = 0.3;
    m.bodyColor = MyColor.arrTo([120, 188, 85, 1]);
    m.r = 40;
    m.haveGain = true;
    m.gainDetails = {
        gainRadius: 200,
        gainFrequency: 30,
        gainR: 2,
        gainCollideDamageAddNum: 0,
        gainHpAddedNum: 0,
        gainSpeedNAddNum: 0,
        gainHpAddedRate: 0.0,
        gainMaxHpAddedNum: 100,
    };
    m.imgIndex = 9;
    m.comment = "不停的给身边的队友增加血量上限";
    return m;
}

export function SpeedAdder(world: WorldLike): Monster {
    const m = Monster.randInit(world as any);
    m.name = "加速辅助";
    m.addPrice += 10;
    m.speedNumb = 0.35;
    m.bodyColor = MyColor.arrTo([68, 230, 249, 1]);
    m.haveGain = true;
    m.gainDetails = {
        gainRadius: 100,
        gainFrequency: 5,
        gainR: 0,
        gainCollideDamageAddNum: 0,
        gainHpAddedNum: 0,
        gainSpeedNAddNum: 0.02,
        gainHpAddedRate: 0.0,
        gainMaxHpAddedNum: 0,
    };
    m.imgIndex = 10;
    m.comment = "会给身边的队友增加速度，但是不能给自己增加速度，但是两个它们在一起的时候就有意思了";
    return m;
}

export function AttackAdder(world: WorldLike): Monster {
    const m = Monster.randInit(world as any);
    m.name = "加攻击辅助";
    m.addPrice += 10;
    m.speedNumb = 0.55;
    m.bodyColor = MyColor.arrTo([255, 198, 109, 1]);
    m.haveGain = true;
    m.gainDetails = {
        gainRadius: 100,
        gainFrequency: 1,
        gainR: 0.1,
        gainCollideDamageAddNum: 10,
        gainHpAddedNum: 0,
        gainSpeedNAddNum: 0.0,
        gainHpAddedRate: 0.0,
        gainMaxHpAddedNum: 0,
    };
    m.imgIndex = 11;
    m.comment = "不停的给身边的队友增加攻击力，增加的攻击力是撞击伤害。所以你要小心一点。";
    return m;
}

// Register monsters
MonsterRegistry.register('Medic', Medic as any);
MonsterRegistry.register('Medic_S', Medic_S as any);
MonsterRegistry.register('Medic_M', Medic_M as any);
MonsterRegistry.register('SpeedAdder', SpeedAdder as any);
MonsterRegistry.register('AttackAdder', AttackAdder as any);
