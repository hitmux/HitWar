/**
 * Shared raw monster definitions.
 *
 * These definitions intentionally mirror the single-player config files and
 * keep raw values unscaled. Runtime-specific defaults and scaling should be
 * applied by the consumer.
 */

import type {
  AnyMonsterDefinition,
  MonsterDefinitionMap,
} from './monsterDefinitionTypes.js';

export const BASIC_MONSTER_DEFINITIONS = {
  Normal: {
    id: 'Normal',
    baseClass: 'Monster',
    name: '普通人',
    imgIndex: 0,
    comment: '普通人',
    params: {
      speedNumb: 0.3,
      targetSelection: {
        targetSelectionAble: true,
        strategy: 'nearest',
        scanRadius: 250,
      },
    },
  },
  Runner: {
    id: 'Runner',
    baseClass: 'Monster',
    name: '跑人',
    imgIndex: 0,
    comment: '跑人',
    params: {
      speedNumb: 1,
      dodge: {
        dodgeAble: true,
        detectRadius: 100,
        dodgeStrength: 6,
      },
      targetSelection: {
        targetSelectionAble: true,
        strategy: 'nearest',
        scanRadius: 200,
      },
    },
  },
  TestMonster: {
    id: 'TestMonster',
    baseClass: 'Monster',
    name: '测试',
    imgIndex: 0,
    comment: '这个是程序测试用的',
    addPrice: 0,
    params: {
      hp: 1,
      colishDamage: 0,
    },
  },
  Ox1: {
    id: 'Ox1',
    baseClass: 'Monster',
    name: '冲锋1级',
    imgIndex: 1,
    comment: '速度会越来越快',
    params: {
      speedNumb: 0.01,
      accelerationV: 0.01,
      maxSpeedN: 5,
      bodyColor: [80, 20, 20, 1],
      targetSelection: {
        targetSelectionAble: true,
        strategy: 'weakest',
        scanRadius: 300,
      },
    },
  },
  Ox2: {
    id: 'Ox2',
    baseClass: 'Monster',
    name: '冲锋2级',
    imgIndex: 1,
    comment: '加速度，速度越来越快',
    params: {
      speedNumb: 0.01,
      accelerationV: 0.05,
      maxSpeedN: 7,
      bodyColor: [120, 20, 20, 1],
      targetSelection: {
        targetSelectionAble: true,
        strategy: 'weakest',
        scanRadius: 300,
      },
    },
  },
  Ox3: {
    id: 'Ox3',
    baseClass: 'Monster',
    name: '冲锋3级',
    imgIndex: 1,
    comment: '比普通冲锋加速的更快',
    params: {
      speedNumb: 0.01,
      accelerationV: 0.1,
      maxSpeedN: 10,
      bodyColor: [150, 20, 20, 1],
      dodge: {
        dodgeAble: true,
        detectRadius: 120,
        dodgeStrength: 5,
      },
      targetSelection: {
        targetSelectionAble: true,
        strategy: 'weakest',
        scanRadius: 350,
      },
    },
  },
} as const satisfies MonsterDefinitionMap;

export const BOMBER_MONSTER_DEFINITIONS = {
  Bomber1: {
    id: 'Bomber1',
    baseClass: 'Monster',
    name: '炸弹1级',
    imgIndex: 2,
    comment: '死了会爆炸',
    params: {
      speedNumb: 0.5,
      bodyColor: [60, 60, 20, 1],
      bombSelf: {
        bombSelfAble: true,
        bombSelfRange: 80,
        bombSelfDamage: 200,
      },
      targetSelection: {
        targetSelectionAble: true,
        strategy: 'balanced',
        scanRadius: 300,
      },
    },
  },
  Bomber2: {
    id: 'Bomber2',
    baseClass: 'Monster',
    name: '炸弹2级',
    imgIndex: 2,
    addPrice: 10,
    comment: '爆炸伤害更大',
    params: {
      speedNumb: 0.55,
      bodyColor: [90, 90, 30, 1],
      bombSelf: {
        bombSelfAble: true,
        bombSelfRange: 120,
        bombSelfDamage: 800,
      },
      dodge: {
        dodgeAble: true,
        detectRadius: 100,
        dodgeStrength: 5,
      },
      targetSelection: {
        targetSelectionAble: true,
        strategy: 'balanced',
        scanRadius: 350,
      },
    },
  },
  Bomber3: {
    id: 'Bomber3',
    baseClass: 'Monster',
    name: '炸弹3级',
    imgIndex: 2,
    addPrice: 10,
    comment: '爆炸伤害更更大',
    params: {
      speedNumb: 0.6,
      bodyColor: [150, 150, 50, 1],
      bombSelf: {
        bombSelfAble: true,
        bombSelfRange: 200,
        bombSelfDamage: 5000,
      },
      dodge: {
        dodgeAble: true,
        detectRadius: 120,
        dodgeStrength: 6,
      },
      targetSelection: {
        targetSelectionAble: true,
        strategy: 'balanced',
        scanRadius: 400,
      },
    },
  },
  Thrower1: {
    id: 'Thrower1',
    baseClass: 'Monster',
    name: '压路机1级',
    imgIndex: 3,
    addPrice: 10,
    comment: '直接碾压你的建筑，伤害很大',
    params: {
      speedNumb: 0.4,
      r: 30,
      throwAble: true,
      bodyColor: [50, 150, 150, 0.5],
      bodyStrokeColor: [5, 15, 15, 1],
      targetSelection: {
        targetSelectionAble: true,
        strategy: 'weakest',
        scanRadius: 300,
      },
    },
  },
} as const satisfies MonsterDefinitionMap;

export const DEFENDER_MONSTER_DEFINITIONS = {
  BulletWearer: {
    id: 'BulletWearer',
    baseClass: 'Monster',
    name: '子弹削子',
    imgIndex: 12,
    addPrice: 5,
    comment: '自身会有一个场，这个场里的子弹会不停的减少子弹半径',
    params: {
      speedNumb: 0.35,
      bodyColor: [62, 134, 160, 1],
      bulletChange: {
        haveBulletChangeArea: true,
        r: 100,
        f: 5,
        bulletDR: -1,
      },
      targetSelection: {
        targetSelectionAble: true,
        strategy: 'balanced',
        scanRadius: 300,
      },
    },
  },
  BulletRepellent: {
    id: 'BulletRepellent',
    baseClass: 'Monster',
    name: '子弹排斥',
    imgIndex: 13,
    addPrice: 5,
    comment:
      '自身会有一个排斥子弹的场，能够把场内的飞过来的子弹向外排斥，改变子弹的轨迹，只是对子弹有效果，对激光和其他武器没有效果',
    params: {
      speedNumb: 0.25,
      bodyColor: [186, 166, 128, 1],
      bulletChange: {
        haveBulletChangeArea: true,
        r: 150,
        f: 1,
        bulletAN: 1,
      },
      targetSelection: {
        targetSelectionAble: true,
        strategy: 'balanced',
        scanRadius: 300,
      },
    },
  },
  DamageReducers: {
    id: 'DamageReducers',
    baseClass: 'Monster',
    name: '子弹削弱',
    imgIndex: 14,
    addPrice: 5,
    comment: '能够对自身一定范围内的区域内的所有子弹减少伤害，伤害小的子弹比如小枪的子弹可能就没有伤害了。',
    params: {
      speedNumb: 0.35,
      bodyColor: [190, 145, 23, 1],
      bulletChange: {
        haveBulletChangeArea: true,
        r: 150,
        f: 1,
        bulletDD: -1,
      },
      targetSelection: {
        targetSelectionAble: true,
        strategy: 'balanced',
        scanRadius: 300,
      },
    },
  },
  BlackHole: {
    id: 'BlackHole',
    baseClass: 'Monster',
    name: '黑洞',
    imgIndex: 4,
    addPrice: 10,
    comment: '会把你的建筑吸走',
    params: {
      speedNumb: 0.2,
      r: 30,
      colishDamage: 10,
      throwAble: true,
      bodyColor: [0, 0, 0, 1],
      bodyStrokeColor: [0, 0, 0, 1],
      gravityArea: {
        haveGArea: true,
        gAreaR: 160,
        gAreaNum: 2,
      },
      targetSelection: {
        targetSelectionAble: true,
        strategy: 'threat',
        scanRadius: 400,
      },
    },
  },
} as const satisfies MonsterDefinitionMap;

export const ELITE_MONSTER_DEFINITIONS = {
  Exciting: {
    id: 'Exciting',
    baseClass: 'Monster',
    name: '激动人',
    imgIndex: 21,
    comment: '一种移动路径前后更加剧烈的快速的怪物，看起来很激动',
    params: {
      speedNumb: 3,
      movementType: 'exciting',
      dodge: {
        dodgeAble: true,
        detectRadius: 120,
        dodgeStrength: 8,
      },
      targetSelection: {
        targetSelectionAble: true,
        strategy: 'balanced',
        scanRadius: 300,
      },
    },
  },
  Visitor: {
    id: 'Visitor',
    baseClass: 'Monster',
    name: '旋转人',
    imgIndex: 22,
    comment: '移动路径会很怪，它会旋转的走向目标，绕很多圈才会进行撞击，像是来参观的',
    params: {
      speedNumb: 3,
      movementType: 'doubleSwing',
      dodge: {
        dodgeAble: true,
        detectRadius: 120,
        dodgeStrength: 7,
      },
      targetSelection: {
        targetSelectionAble: true,
        strategy: 'balanced',
        scanRadius: 300,
      },
    },
  },
  Enderman: {
    id: 'Enderman',
    baseClass: 'Monster',
    name: '小黑',
    imgIndex: 23,
    comment:
      '一旦受到子弹碰撞，就会瞬移，所以它免疫子弹撞击伤害（不能免疫爆炸等其他伤害），但是它可能会一不小心瞬移到你的建筑上，然后撞死了。',
    params: {
      speedNumb: 1,
      teleportingAble: true,
      teleportingRange: 100,
      teleportingCount: 3,
      dodge: {
        dodgeAble: true,
        detectRadius: 150,
        dodgeStrength: 10,
      },
      targetSelection: {
        targetSelectionAble: true,
        strategy: 'threat',
        scanRadius: 350,
      },
    },
  },
  Mts: {
    id: 'Mts',
    baseClass: 'MonsterMortis',
    name: '忍者',
    imgIndex: 24,
    addPrice: 40,
    comment: '像忍者一样，一旦发现了你的建筑，便会迅速对你的建筑进行收割，像忍者一样来回穿过你的建筑，对你的建筑造成伤害',
    params: {
      r: 35,
      speedNumb: 1,
      dodge: {
        dodgeAble: true,
        detectRadius: 130,
        dodgeStrength: 9,
      },
    },
  },
  T800: {
    id: 'T800',
    baseClass: 'MonsterTerminator',
    name: '恐怖机器人',
    imgIndex: 25,
    addPrice: 590,
    comment: '一种由金属打造而成的恐怖机器，威力小的子弹几乎对他没有伤害。具有很强的近战能力。',
  },
} as const satisfies MonsterDefinitionMap;

export const SHOUTER_MONSTER_DEFINITIONS = {
  Shouter: {
    id: 'Shouter',
    baseClass: 'MonsterShooter',
    name: '射击者',
    imgIndex: 15,
    addPrice: 5,
    comment: '会对你的建筑进行远程射击，造成伤害',
    params: {
      speedNumb: 0.35,
      r: 20,
      bodyColor: [190, 145, 23, 1],
      targetSelection: {
        targetSelectionAble: true,
        strategy: 'threat',
        scanRadius: 250,
      },
    },
  },
  Shouter_Stone: {
    id: 'Shouter_Stone',
    baseClass: 'MonsterShooter',
    name: '石头蛋子射击者',
    imgIndex: 15,
    addPrice: 5,
    comment: '会对你的建筑进行远程射击伤害巨大的石头蛋子',
    params: {
      speedNumb: 0.3,
      r: 20,
      bodyColor: [190, 145, 23, 1],
      bulletType: 'CannonStone_L',
      clock: 50,
      rangeR: 128,
      targetSelection: {
        targetSelectionAble: true,
        strategy: 'weakest',
        scanRadius: 200,
      },
    },
  },
  Shouter_Bomber: {
    id: 'Shouter_Bomber',
    baseClass: 'MonsterShooter',
    name: '火炮射击者',
    imgIndex: 15,
    addPrice: 5,
    comment: '会对你的建筑进行远程射击伤害巨大的火炮',
    params: {
      speedNumb: 0.3,
      r: 20,
      bodyColor: [190, 145, 23, 1],
      bulletType: 'H_S',
      clock: 50,
      rangeR: 128,
      targetSelection: {
        targetSelectionAble: true,
        strategy: 'weakest',
        scanRadius: 200,
      },
    },
  },
  Shouter_Spike: {
    id: 'Shouter_Spike',
    baseClass: 'MonsterShooter',
    name: '绿球射击者',
    imgIndex: 15,
    addPrice: 5,
    comment: '会对你的建筑进行远程射击仙人球',
    params: {
      speedNumb: 0.3,
      r: 20,
      bodyColor: [190, 145, 23, 1],
      bulletType: 'SpikeBullet',
      clock: 8,
      rangeR: 100,
      targetSelection: {
        targetSelectionAble: true,
        strategy: 'threat',
        scanRadius: 150,
      },
    },
  },
} as const satisfies MonsterDefinitionMap;

export const SLIME_MONSTER_DEFINITIONS = {
  Slime_L: {
    id: 'Slime_L',
    baseClass: 'Monster',
    name: '大史莱姆',
    imgIndex: 16,
    addPrice: 10,
    comment: '大型史莱姆，死亡之后会分裂成四个中型史莱姆，每个中型史莱姆死亡之后又会分裂成四个小型史莱姆',
    params: {
      speedNumb: 0.4,
      r: 50,
      bodyColor: [171, 236, 97, 0.8],
      bodyStrokeColor: [47, 113, 56, 1],
      bodyStrokeWidth: 12,
      summon: {
        deadSummonAble: true,
        summonMonsterName: 'Slime_M',
      },
      targetSelection: {
        targetSelectionAble: true,
        strategy: 'balanced',
        scanRadius: 300,
      },
    },
  },
  Slime_M: {
    id: 'Slime_M',
    baseClass: 'Monster',
    name: '中史莱姆',
    imgIndex: 16,
    addPrice: 10,
    comment: '中型史莱姆，由大型史莱姆分裂得到',
    params: {
      speedNumb: 0.6,
      r: 30,
      bodyColor: [171, 236, 97, 0.8],
      bodyStrokeColor: [47, 113, 56, 1],
      bodyStrokeWidth: 5,
      summon: {
        deadSummonAble: true,
        summonMonsterName: 'Slime_S',
      },
      targetSelection: {
        targetSelectionAble: true,
        strategy: 'balanced',
        scanRadius: 280,
      },
    },
  },
  Slime_S: {
    id: 'Slime_S',
    baseClass: 'Monster',
    name: '小史莱姆',
    imgIndex: 16,
    addPrice: 10,
    comment: '小型史莱姆，跑的比较快',
    params: {
      speedNumb: 0.8,
      r: 10,
      bodyColor: [171, 236, 97, 0.8],
      bodyStrokeColor: [47, 113, 56, 1],
      bodyStrokeWidth: 3,
      dodge: {
        dodgeAble: true,
        detectRadius: 80,
        dodgeStrength: 5,
      },
      targetSelection: {
        targetSelectionAble: true,
        strategy: 'nearest',
        scanRadius: 250,
      },
    },
  },
} as const satisfies MonsterDefinitionMap;

export const SUPPORT_MONSTER_DEFINITIONS = {
  Medic: {
    id: 'Medic',
    baseClass: 'Monster',
    name: '加血辅助',
    imgIndex: 7,
    addPrice: 10,
    comment: '不停的给队友恢复固定的血量',
    params: {
      speedNumb: 0.5,
      r: 30,
      bodyColor: [105, 117, 60, 1],
      gain: {
        haveGain: true,
        gainRadius: 100,
        gainFrequency: 10,
        gainR: 0,
        gainCollideDamageAddNum: 0,
        gainHpAddedNum: 10,
        gainSpeedNAddNum: 0,
        gainHpAddedRate: 0,
        gainMaxHpAddedNum: 0,
      },
      targetSelection: {
        targetSelectionAble: true,
        strategy: 'balanced',
        scanRadius: 300,
      },
    },
  },
  Medic_S: {
    id: 'Medic_S',
    baseClass: 'Monster',
    name: '加比例血辅助',
    imgIndex: 8,
    addPrice: 10,
    comment: '不停的给队友恢复他们自身最大血量一定比例的血量',
    params: {
      speedNumb: 0.5,
      r: 30,
      bodyColor: [92, 117, 79, 1],
      gain: {
        haveGain: true,
        gainRadius: 200,
        gainFrequency: 20,
        gainR: 0,
        gainCollideDamageAddNum: 0,
        gainHpAddedNum: 0,
        gainSpeedNAddNum: 0,
        gainHpAddedRate: 0.1,
        gainMaxHpAddedNum: 0,
      },
      targetSelection: {
        targetSelectionAble: true,
        strategy: 'balanced',
        scanRadius: 300,
      },
    },
  },
  Medic_M: {
    id: 'Medic_M',
    baseClass: 'Monster',
    name: '加上限血辅助',
    imgIndex: 9,
    addPrice: 10,
    comment: '不停的给身边的队友增加血量上限',
    params: {
      speedNumb: 0.3,
      r: 40,
      bodyColor: [120, 188, 85, 1],
      gain: {
        haveGain: true,
        gainRadius: 200,
        gainFrequency: 30,
        gainR: 2,
        gainCollideDamageAddNum: 0,
        gainHpAddedNum: 0,
        gainSpeedNAddNum: 0,
        gainHpAddedRate: 0,
        gainMaxHpAddedNum: 100,
      },
      targetSelection: {
        targetSelectionAble: true,
        strategy: 'balanced',
        scanRadius: 300,
      },
    },
  },
  SpeedAdder: {
    id: 'SpeedAdder',
    baseClass: 'Monster',
    name: '加速辅助',
    imgIndex: 10,
    addPrice: 10,
    comment: '会给身边的队友增加速度，但是不能给自己增加速度，但是两个它们在一起的时候就有意思了',
    params: {
      speedNumb: 0.35,
      bodyColor: [68, 230, 249, 1],
      gain: {
        haveGain: true,
        gainRadius: 100,
        gainFrequency: 5,
        gainR: 0,
        gainCollideDamageAddNum: 0,
        gainHpAddedNum: 0,
        gainSpeedNAddNum: 0.02,
        gainHpAddedRate: 0,
        gainMaxHpAddedNum: 0,
      },
      targetSelection: {
        targetSelectionAble: true,
        strategy: 'balanced',
        scanRadius: 300,
      },
    },
  },
  AttackAdder: {
    id: 'AttackAdder',
    baseClass: 'Monster',
    name: '加攻击辅助',
    imgIndex: 11,
    addPrice: 10,
    comment: '不停的给身边的队友增加攻击力，增加的攻击力是撞击伤害。所以你要小心一点。',
    params: {
      speedNumb: 0.55,
      bodyColor: [255, 198, 109, 1],
      gain: {
        haveGain: true,
        gainRadius: 100,
        gainFrequency: 1,
        gainR: 0.1,
        gainCollideDamageAddNum: 10,
        gainHpAddedNum: 0,
        gainSpeedNAddNum: 0,
        gainHpAddedRate: 0,
        gainMaxHpAddedNum: 0,
      },
      targetSelection: {
        targetSelectionAble: true,
        strategy: 'threat',
        scanRadius: 300,
      },
    },
  },
} as const satisfies MonsterDefinitionMap;

export const SPECIAL_MONSTER_DEFINITIONS = {
  Bulldozer: {
    id: 'Bulldozer',
    baseClass: 'Monster',
    name: '排斥人',
    imgIndex: 5,
    addPrice: 10,
    comment: '会把你的建筑推开，和黑洞相反',
    params: {
      speedNumb: 0.3,
      r: 25,
      colishDamage: 10,
      throwAble: true,
      bodyColor: [50, 30, 50, 1],
      bodyStrokeColor: [0, 0, 0, 1],
      gravityArea: {
        haveGArea: true,
        gAreaR: 50,
        gAreaNum: -2,
      },
      targetSelection: {
        targetSelectionAble: true,
        strategy: 'threat',
        scanRadius: 350,
      },
    },
  },
  Glans: {
    id: 'Glans',
    baseClass: 'Monster',
    name: '激光防御',
    imgIndex: 6,
    addPrice: 10,
    comment: '有激光防御能力，就是能摧毁射过来的子弹，但是摧毁子弹需要激光能量，激光能量是有限的，弱点是非子弹类伤害',
    params: {
      speedNumb: 0.3,
      r: 30,
      bodyColor: [152, 118, 170, 1],
      laserDefense: {
        haveLaserDefence: true,
        laserFreeze: 1,
        laserdefendPreNum: 10,
        maxLaserNum: 1000,
        laserDefendNum: 1000,
        laserRecoverFreeze: 100,
        laserRecoverNum: 20,
        laserRadius: 100,
      },
      targetSelection: {
        targetSelectionAble: true,
        strategy: 'threat',
        scanRadius: 300,
      },
    },
  },
  witch_N: {
    id: 'witch_N',
    baseClass: 'Monster',
    name: '召唤师',
    imgIndex: 17,
    addPrice: 10,
    comment: '召唤师会不停的召唤小怪物',
    params: {
      speedNumb: 0.3,
      r: 30,
      bodyColor: [152, 118, 170, 0.8],
      bodyStrokeColor: [152, 118, 170, 1],
      bodyStrokeWidth: 5,
      summon: {
        deadSummonAble: true,
        summonAble: true,
        summonCount: 4,
        summonDistance: 45,
        summonMonsterName: 'bat',
      },
      targetSelection: {
        targetSelectionAble: true,
        strategy: 'balanced',
        scanRadius: 300,
      },
    },
  },
  bat: {
    id: 'bat',
    baseClass: 'Monster',
    name: '小怪物',
    imgIndex: 18,
    addPrice: 10,
    comment: '快速飞到你的大本，对你的大本造成撞击伤害',
    params: {
      speedNumb: 3,
      r: 5,
      accelerationV: 0.01,
      maxSpeedN: 5,
      bodyColor: [152, 118, 170, 0.8],
      bodyStrokeColor: [152, 118, 170, 1],
      bodyStrokeWidth: 5,
      dodge: {
        dodgeAble: true,
        detectRadius: 100,
        dodgeStrength: 7,
      },
      targetSelection: {
        targetSelectionAble: true,
        strategy: 'nearest',
        scanRadius: 200,
      },
    },
  },
  Spoke: {
    id: 'Spoke',
    baseClass: 'Monster',
    name: '摇摆人',
    imgIndex: 19,
    comment: '一种移动路径来回摇摆的普通人',
    params: {
      speedNumb: 3,
      movementType: 'swing',
      dodge: {
        dodgeAble: true,
        detectRadius: 120,
        dodgeStrength: 8,
      },
      targetSelection: {
        targetSelectionAble: true,
        strategy: 'balanced',
        scanRadius: 300,
      },
    },
  },
  SpokeMan: {
    id: 'SpokeMan',
    baseClass: 'Monster',
    name: '突进人',
    imgIndex: 20,
    comment: '一种路径来回前后突进的普通怪物',
    params: {
      speedNumb: 3,
      movementType: 'suddenly',
      dodge: {
        dodgeAble: true,
        detectRadius: 120,
        dodgeStrength: 8,
      },
      targetSelection: {
        targetSelectionAble: true,
        strategy: 'balanced',
        scanRadius: 300,
      },
    },
  },
} as const satisfies MonsterDefinitionMap;

export const MONSTER_DEFINITIONS = {
  ...BASIC_MONSTER_DEFINITIONS,
  ...BOMBER_MONSTER_DEFINITIONS,
  ...DEFENDER_MONSTER_DEFINITIONS,
  ...ELITE_MONSTER_DEFINITIONS,
  ...SHOUTER_MONSTER_DEFINITIONS,
  ...SLIME_MONSTER_DEFINITIONS,
  ...SUPPORT_MONSTER_DEFINITIONS,
  ...SPECIAL_MONSTER_DEFINITIONS,
} as const satisfies MonsterDefinitionMap;

export const MONSTER_DEFINITION_LIST = Object.values(
  MONSTER_DEFINITIONS
) as AnyMonsterDefinition[];

export function getMonsterDefinition(
  monsterId: string
): AnyMonsterDefinition | undefined {
  return MONSTER_DEFINITIONS[monsterId as keyof typeof MONSTER_DEFINITIONS];
}

export function hasMonsterDefinition(monsterId: string): boolean {
  return monsterId in MONSTER_DEFINITIONS;
}
