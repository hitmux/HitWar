/**
 * 怪物AI模块统一导出
 */

export {
    calcBulletDodge,
    isBulletApproaching,
    calcDodgeVector,
    DEFAULT_DODGE_CONFIG
} from './bulletDodge';
export type { DodgeConfig } from './bulletDodge';

export {
    selectTarget,
    DEFAULT_TARGET_CONFIG
} from './targetSelection';
export type { TargetConfig, TargetStrategy } from './targetSelection';
