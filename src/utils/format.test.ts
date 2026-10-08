import { expect, it } from 'vitest';
import { formatCell, formatNumber } from './format';

it('writes whole numbers as they are', () => {
  expect(formatNumber(12)).toBe('12');
  expect(formatNumber(0)).toBe('0');
});

it('rounds fractions to two decimals', () => {
  expect(formatNumber(4 * Math.SQRT2)).toBe('5.66');
  expect(formatNumber(1.5)).toBe('1.50');
});

it('writes an unknown distance as ∞', () => {
  expect(formatNumber(Infinity)).toBe('∞');
});

it('writes a cell as (row,col)', () => {
  expect(formatCell(50, 207)).toBe('(4,7)');
  expect(formatCell(50, 0)).toBe('(0,0)');
});
