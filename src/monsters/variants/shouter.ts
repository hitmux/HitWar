/**
 * Shouter monster variants
 * Contains: Shouter, Shouter_Stone, Shouter_Bomber, Shouter_Spike (4)
 */
import { MyColor } from '../../entities/myColor';
import { MonsterShooter } from '../base/monsterShooter';
import { MonsterRegistry } from '../monsterRegistry';

// BullyFinally will be resolved from global scope
declare const BullyFinally: {
    CannonStone_L: (() => unknown) | null;
    H_S: (() => unknown) | null;
    SpikeBully: (() => unknown) | null;
} | undefined;

interface WorldLike {
    [key: string]: unknown;
}

export function Shouter(world: WorldLike): MonsterShooter {
    const m = MonsterShooter.randInit(world as any) as MonsterShooter;
    m.name = "射击者";
    m.addPrice += 5;
    m.speedNumb = 0.35;
    m.bodyColor = MyColor.arrTo([190, 145, 23, 1]);
    m.r = 20;
    m.imgIndex = 15;
    m.comment = "会对你的建筑进行远程射击，造成伤害";
    return m;
}

export function Shouter_Stone(world: WorldLike): MonsterShooter {
    const m = MonsterShooter.randInit(world as any) as MonsterShooter;
    m.name = "石头蛋子射击者";
    m.addPrice += 5;
    m.speedNumb = 0.30;
    m.bodyColor = MyColor.arrTo([190, 145, 23, 1]);
    m.r = 20;
    m.imgIndex = 15;
    // Use global BullyFinally if available
    m.getmMainBullyFunc = typeof BullyFinally !== 'undefined' ? BullyFinally.CannonStone_L as any : null;
    m.clock = 50;
    m.rangeR = 170;
    m.comment = "会对你的建筑进行远程射击伤害巨大的石头蛋子";
    return m;
}

export function Shouter_Bomber(world: WorldLike): MonsterShooter {
    const m = MonsterShooter.randInit(world as any) as MonsterShooter;
    m.name = "火炮射击者";
    m.addPrice += 5;
    m.speedNumb = 0.30;
    m.bodyColor = MyColor.arrTo([190, 145, 23, 1]);
    m.r = 20;
    m.imgIndex = 15;
    // Use global BullyFinally if available
    m.getmMainBullyFunc = typeof BullyFinally !== 'undefined' ? BullyFinally.H_S as any : null;
    m.clock = 50;
    m.rangeR = 128;
    m.comment = "会对你的建筑进行远程射击伤害巨大的火炮";
    return m;
}

export function Shouter_Spike(world: WorldLike): MonsterShooter {
    const m = MonsterShooter.randInit(world as any) as MonsterShooter;
    m.name = "绿球射击者";
    m.addPrice += 5;
    m.speedNumb = 0.30;
    m.bodyColor = MyColor.arrTo([190, 145, 23, 1]);
    m.r = 20;
    m.imgIndex = 15;
    // Use global BullyFinally if available
    m.getmMainBullyFunc = typeof BullyFinally !== 'undefined' ? BullyFinally.SpikeBully as any : null;
    m.clock = 8;
    m.rangeR = 100;
    m.comment = "会对你的建筑进行远程射击仙人球";
    return m;
}

// Register monsters
MonsterRegistry.register('Shouter', Shouter as any);
MonsterRegistry.register('Shouter_Stone', Shouter_Stone as any);
MonsterRegistry.register('Shouter_Bomber', Shouter_Bomber as any);
MonsterRegistry.register('Shouter_Spike', Shouter_Spike as any);
