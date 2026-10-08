import { expect, it } from 'vitest';
import { PriorityQueue } from './priorityQueue';

it('pops in ascending order and reports its size', () => {
  const queue = new PriorityQueue<number>((a, b) => a < b);
  const values = Array.from({ length: 200 }, (_, i) => (i * 7919) % 211);
  values.forEach((v) => queue.push(v));
  expect(queue.size).toBe(200);

  const popped: number[] = [];
  while (queue.size > 0) popped.push(queue.pop()!);
  expect(popped).toEqual([...values].sort((a, b) => a - b));
});

it('returns undefined when empty', () => {
  const queue = new PriorityQueue<number>((a, b) => a < b);
  expect(queue.pop()).toBeUndefined();
  expect(queue.size).toBe(0);
});

it('orders by whatever the comparator says', () => {
  const queue = new PriorityQueue<{ f: number; seq: number }>(
    (a, b) => a.f < b.f || (a.f === b.f && a.seq < b.seq),
  );
  queue.push({ f: 2, seq: 0 });
  queue.push({ f: 1, seq: 2 });
  queue.push({ f: 1, seq: 1 });
  expect([queue.pop(), queue.pop(), queue.pop()]).toEqual([
    { f: 1, seq: 1 },
    { f: 1, seq: 2 },
    { f: 2, seq: 0 },
  ]);
});
