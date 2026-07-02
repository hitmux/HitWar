/**
 * Target Scoring - Shared scoring utility for tower target selection
 *
 * Provides a pure scoring function that ranks monsters by:
 *   - Distance (closer = higher priority)
 *   - HP ratio (lower HP = higher priority, easier to finish off)
 *   - Speed threat (faster = higher priority, more dangerous)
 */

export interface TargetWeights {
    /** Weight for distance score (closer = higher). Range: [0, 1] */
    distance: number;
    /** Weight for HP score (lower HP ratio = higher). Range: [0, 1] */
    hp: number;
    /** Weight for speed/threat score (faster = higher). Range: [0, 1] */
    threat: number;
}

export const DEFAULT_TOWER_TARGET_WEIGHTS: Readonly<TargetWeights> = {
    distance: 0.5,
    hp: 0.3,
    threat: 0.2,
};

/**
 * Calculate a composite target priority score for a monster.
 * Higher score = better target. No sqrt, no object allocation (~10 FLOPs).
 *
 * @param distSq       - Squared distance from tower to monster
 * @param attackRadiusSq - Squared attack radius of the tower
 * @param hp           - Current HP of the monster
 * @param maxHp        - Maximum HP of the monster
 * @param speed        - Current speed of the monster (0 if unknown)
 * @param maxSpeed     - Maximum expected monster speed (used for normalization)
 * @param weights      - Scoring weights
 * @returns Composite score in [0, 1] range
 */
export function calcMonsterTargetScore(
    distSq: number,
    attackRadiusSq: number,
    hp: number,
    maxHp: number,
    speed: number,
    maxSpeed: number,
    weights: Readonly<TargetWeights> = DEFAULT_TOWER_TARGET_WEIGHTS,
): number {
    // Distance score: closer = higher [0, 1]
    const distScore = attackRadiusSq > 0
        ? 1 - Math.min(distSq / attackRadiusSq, 1)
        : 0;

    // HP score: lower HP ratio = higher [0, 1] (easier to kill)
    const hpScore = maxHp > 0 ? 1 - hp / maxHp : 0;

    // Threat score: faster = higher [0, 1]
    const threatScore = maxSpeed > 0 ? Math.min(speed / maxSpeed, 1) : 0;

    return weights.distance * distScore + weights.hp * hpScore + weights.threat * threatScore;
}
