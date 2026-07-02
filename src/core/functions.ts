/**
 * Game balance functions
 * by littlefean
 *
 * This class wraps the shared pure functions for backward compatibility.
 * New code should import directly from @shared/formulas/gameBalance.
 */

import * as GameBalance from '@shared/formulas/gameBalance';

// Re-export all pure functions for direct imports
export * from '@shared/formulas/gameBalance';

// Keep the Functions class as a namespace wrapper for backward compatibility
export class Functions {
    static timeMonsterHp = GameBalance.timeMonsterHp;
    static timeMonsterAtt = GameBalance.timeMonsterAtt;
    static timeMonsterAddedNum = GameBalance.timeMonsterAddedNum;
    static levelMonsterFlowNum = GameBalance.levelMonsterFlowNum;
    static levelMonsterFlowNumHard = GameBalance.levelMonsterFlowNumHard;
    static timeRateAlpha = GameBalance.timeRateAlpha;
    static timeRateAlphaDownFast = GameBalance.timeRateAlphaDownFast;
    static timeAddPrise = GameBalance.timeAddPrise;
    static levelMonsterHpAddedHard = GameBalance.levelMonsterHpAddedHard;
    static levelMonsterHpAddedNormal = GameBalance.levelMonsterHpAddedNormal;
    static levelMonsterHpAddedEasy = GameBalance.levelMonsterHpAddedEasy;
    static tickMonsterHpAddedEasy = GameBalance.tickMonsterHpAddedEasy;
    static tickMonsterHpAddedHard = GameBalance.tickMonsterHpAddedHard;
    static tickAddMonsterNumEasy = GameBalance.tickAddMonsterNumEasy;
    static tickAddMonsterNumHard = GameBalance.tickAddMonsterNumHard;
    static levelT800Count = GameBalance.levelT800Count;
    static levelT800CountHard = GameBalance.levelT800CountHard;
    static levelAddPrice = GameBalance.levelAddPrice;
    static levelAddPriceNormal = GameBalance.levelAddPriceNormal;
    static levelAddPriceHard = GameBalance.levelAddPriceHard;
    static timeHellTowerDamage_E = GameBalance.timeHellTowerDamage_E;
    static timeHellTowerDamage = GameBalance.timeHellTowerDamage;
    static levelCollideAdded = GameBalance.levelCollideAdded;
    static levelCollideAddedHard = GameBalance.levelCollideAddedHard;
    static TowerNumPriceAdded = GameBalance.TowerNumPriceAdded;
    static TowerNumPriceAdded2 = GameBalance.TowerNumPriceAdded2;

    /**
     * Explosion damage falloff with distance
     * @deprecated Not implemented
     */
    static disBoomDamage(_dis: number): void {
        // Not implemented
    }
}
