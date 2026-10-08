/** Binary min-heap. `less(a, b)` says whether `a` must come out before `b`. */
export class PriorityQueue<T> {
  private readonly heap: T[] = [];
  private readonly less: (a: T, b: T) => boolean;

  constructor(less: (a: T, b: T) => boolean) {
    this.less = less;
  }

  get size(): number {
    return this.heap.length;
  }

  push(item: T): void {
    const { heap, less } = this;
    let i = heap.length;
    heap.push(item);
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (!less(item, heap[parent])) break;
      heap[i] = heap[parent];
      i = parent;
    }
    heap[i] = item;
  }

  pop(): T | undefined {
    const { heap, less } = this;
    const top = heap[0];
    const last = heap.pop();
    if (last === undefined || heap.length === 0) return top;

    let i = 0;
    for (;;) {
      let child = 2 * i + 1;
      if (child >= heap.length) break;
      if (child + 1 < heap.length && less(heap[child + 1], heap[child])) child++;
      if (!less(heap[child], last)) break;
      heap[i] = heap[child];
      i = child;
    }
    heap[i] = last;
    return top;
  }
}
