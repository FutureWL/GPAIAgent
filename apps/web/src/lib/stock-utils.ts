/**
 * Shared stock formatting utilities used across market pages.
 * Centralizes fmtCap, fmtAmount, and getQtPrefix logic.
 */

/**
 * Formats market cap in Chinese scale: 万/亿/万亿
 */
export function fmtCap(v?: number): string {
  if (!v && v !== 0) return '-';
  if (v >= 10000) return (v / 10000).toFixed(2) + '万亿';
  if (v >= 1) return v.toFixed(0) + '亿';
  return (v * 10000).toFixed(0) + '万';
}

/**
 * Formats trading volume/amount in Chinese scale: 万/亿
 */
export function fmtAmount(v?: number): string {
  if (!v && v !== 0) return '-';
  if (v >= 10000) return (v / 10000).toFixed(2) + '亿';
  return v.toFixed(0) + '万';
}

/**
 * Determines Tencent Finance API prefix (sh/sz) from a stock code.
 * Indexes (000xxx, 399xxx) use 'sh'; others follow the 6/5→sh, else→sz rule.
 */
export function getQtPrefix(code: string): 'sh' | 'sz' {
  if (code.startsWith('000') || code.startsWith('399')) return 'sh';
  return code.startsWith('6') || code.startsWith('5') ? 'sh' : 'sz';
}
