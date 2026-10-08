import { expect, it } from 'vitest';
import { mulberry32 } from './rng';

const take = (seed: number, n: number) => {
  const rng = mulberry32(seed);
  return Array.from({ length: n }, rng);
};

it('gives the same sequence for the same seed', () => {
  expect(take(42, 20)).toEqual(take(42, 20));
});

it('gives different sequences for different seeds', () => {
  expect(take(1, 5)).not.toEqual(take(2, 5));
});

it('stays within [0, 1) and is not constant', () => {
  const values = take(7, 1000);
  expect(values.every((v) => v >= 0 && v < 1)).toBe(true);
  expect(new Set(values).size).toBeGreaterThan(990);
});
