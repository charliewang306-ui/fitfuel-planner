/**
 * Water Intake Calculation Utilities (Imperial-first)
 * 水分摄入计算工具（英制优先）
 */

export const OZ_PER_ML = 1 / 29.5735; // ml -> oz
export const ML_PER_OZ = 29.5735;     // oz -> ml
export const MAX_HOURLY_OZ = 32;      // 安全上限（不是建议量）
export const ROUND_BUCKET_OZ = 4;     // 记录与建议的最小步进

/**
 * 默认日目标（英制）：体重(lb) * 0.6 = oz/day
 * Default daily target (Imperial): weight(lb) * 0.6 = oz/day
 */
export function defaultDailyTargetOz(weightLb: number): number {
  return Math.max(40, Math.round(weightLb * 0.6)); // 至少40oz，避免过低
}

/**
 * 运动加成（分钟 -> 额外oz），30~60min: +12~24oz 线性映射
 * Exercise bonus (minutes -> extra oz), 30~60min: +12~24oz linear mapping
 */
export function exerciseBonusOz(minutes: number): number {
  if (!minutes || minutes <= 0) return 0;
  const minBonus = 12; // 30min
  const maxBonus = 24; // 60min
  if (minutes <= 30) return minBonus * (minutes / 30);
  if (minutes >= 60) return maxBonus + (minutes - 60) * 0.3; // >60逐步递增(可微调)
  // 30~60线性过渡
  const ratio = (minutes - 30) / 30;
  return minBonus + (maxBonus - minBonus) * ratio;
}

/**
 * 四舍五入到固定桶（如4oz）
 * Round to fixed bucket (e.g., 4oz)
 */
export function roundToBucketOz(value: number, bucket = ROUND_BUCKET_OZ): number {
  return Math.round(value / bucket) * bucket;
}

/**
 * oz ↔ ml conversion
 */
export const toMl = (oz: number) => oz * ML_PER_OZ;
export const toOz = (ml: number) => ml * OZ_PER_ML;

/**
 * 晚间减量：默认减半，可传倍率
 * Evening reduction: default 50%, customizable factor
 */
export function eveningReduce(oz: number, factor = 0.5) {
  return oz * factor;
}

/**
 * 计算每次提醒建议量
 * Calculate suggested amount per reminder
 */
export function suggestPerReminderOz(
  remainingOz: number,
  remindersLeft: number,
  isLate: boolean
): number {
  if (remindersLeft <= 0) return 0;
  let base = remainingOz / remindersLeft;
  if (isLate) base = eveningReduce(base); // 晚间降低
  return Math.max(0, roundToBucketOz(base));
}
