// 速度缩放因子 - 用于减少 ticks 计算
// 设置为 3 表示：速度 x3，周期 /3，实现 1x 速度 = 原 3x 效果
export const SPEED_SCALE_FACTOR = 3;

// 辅助函数
export const scaleSpeed = (v: number) => v * SPEED_SCALE_FACTOR;
export const scalePeriod = (v: number) => Math.max(1, Math.round(v / SPEED_SCALE_FACTOR));
