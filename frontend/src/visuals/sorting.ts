// Step-by-step traces of sorting algorithms for the visualiser.
// Each generator records a Frame after every meaningful action, so the UI can play, pause and step.

export type AuxRow = { label: string; values: number[]; highlight?: number };

export type Frame = {
    array: number[];
    note: string;
    compare?: number[];      // indices being compared
    write?: number[];        // indices just swapped or written
    sorted?: number[];       // indices in their final place
    pivot?: number;
    range?: [number, number]; // active part of the array (inclusive)
    aux?: AuxRow[];          // helper arrays: merge halves, counts, buckets
    comparisons: number;
    writes: number;
};

type Marks = Partial<Pick<Frame, 'compare' | 'write' | 'pivot' | 'range' | 'aux'>>;

class Recorder {
    frames: Frame[] = [];
    comparisons = 0;
    writes = 0;
    sorted = new Set<number>();

    constructor(public a: number[]) {
        this.snap('Start: the unsorted input.');
    }

    snap(note: string, marks: Marks = {}) {
        this.frames.push({
            array: [...this.a],
            note,
            sorted: [...this.sorted],
            comparisons: this.comparisons,
            writes: this.writes,
            ...marks,
            aux: marks.aux?.map((r) => ({ ...r, values: [...r.values] })),
        });
    }

    less(i: number, j: number, marks: Marks = {}, note?: string): boolean {
        this.comparisons++;
        const result = this.a[i] < this.a[j];
        this.snap(note ?? `Compare ${this.a[i]} and ${this.a[j]}.`, { compare: [i, j], ...marks });
        return result;
    }

    swap(i: number, j: number, note: string, marks: Marks = {}) {
        [this.a[i], this.a[j]] = [this.a[j], this.a[i]];
        this.writes += 2;
        this.snap(note, { write: [i, j], ...marks });
    }

    set(i: number, value: number, note: string, marks: Marks = {}) {
        this.a[i] = value;
        this.writes++;
        this.snap(note, { write: [i], ...marks });
    }

    done(note = 'Done — the array is sorted.') {
        this.a.forEach((_, i) => this.sorted.add(i));
        this.snap(note);
        return this.frames;
    }
}

function bubble(input: number[]): Frame[] {
    const r = new Recorder([...input]);
    const a = r.a;
    const n = a.length;
    for (let pass = 0; pass < n - 1; pass++) {
        let swapped = false;
        for (let j = 0; j < n - 1 - pass; j++) {
            if (r.less(j + 1, j, {}, `Pass ${pass + 1}: is ${a[j]} > ${a[j + 1]}?`)) {
                r.swap(j, j + 1, `Yes → swap. The bigger value bubbles right.`);
                swapped = true;
            }
        }
        r.sorted.add(n - 1 - pass);
        r.snap(`End of pass ${pass + 1}: ${a[n - 1 - pass]} is in its final place.`);
        if (!swapped) return r.done('No swaps in this pass → already sorted, stop early.');
    }
    return r.done();
}

function selection(input: number[]): Frame[] {
    const r = new Recorder([...input]);
    const a = r.a;
    for (let i = 0; i < a.length - 1; i++) {
        let min = i;
        r.snap(`Find the smallest value in positions ${i}..${a.length - 1}. Start with ${a[i]}.`, { pivot: min, range: [i, a.length - 1] });
        for (let j = i + 1; j < a.length; j++) {
            if (r.less(j, min, { pivot: min, range: [i, a.length - 1] }, `Is ${a[j]} smaller than the current minimum ${a[min]}?`)) {
                min = j;
                r.snap(`New minimum: ${a[min]}.`, { pivot: min, range: [i, a.length - 1] });
            }
        }
        if (min !== i) r.swap(i, min, `Swap the minimum ${a[min]} into position ${i}.`);
        r.sorted.add(i);
        r.snap(`Position ${i} is final.`);
    }
    return r.done();
}

function insertion(input: number[]): Frame[] {
    const r = new Recorder([...input]);
    const a = r.a;
    r.sorted.add(0);
    for (let i = 1; i < a.length; i++) {
        r.snap(`Take ${a[i]} and insert it into the sorted left part.`, { pivot: i, range: [0, i] });
        let j = i;
        while (j > 0 && r.less(j, j - 1, { range: [0, i] }, `Is ${a[j]} smaller than ${a[j - 1]}?`)) {
            r.swap(j - 1, j, `Yes → shift ${a[j]} right, move ${a[j - 1]} left.`, { range: [0, i] });
            j--;
        }
        r.sorted.clear();
        for (let k = 0; k <= i; k++) r.sorted.add(k); // sorted relative to each other, not yet final
        r.snap(`The first ${i + 1} items are now in order.`);
    }
    return r.done();
}

function shell(input: number[]): Frame[] {
    const r = new Recorder([...input]);
    const a = r.a;
    for (let gap = Math.floor(a.length / 2); gap > 0; gap = Math.floor(gap / 2)) {
        r.snap(`Gap = ${gap}: insertion sort on items ${gap} apart.`);
        for (let i = gap; i < a.length; i++) {
            let j = i;
            while (j >= gap && r.less(j, j - gap, {}, `Gap ${gap}: is ${a[j]} smaller than ${a[j - gap]}?`)) {
                r.swap(j - gap, j, `Swap items ${gap} apart.`);
                j -= gap;
            }
        }
    }
    return r.done('Gap 1 finished (a plain insertion sort on nearly sorted data) → sorted.');
}

function merge(input: number[]): Frame[] {
    const r = new Recorder([...input]);
    const a = r.a;
    const sortRange = (lo: number, hi: number) => {
        if (lo >= hi) return;
        const mid = Math.floor((lo + hi) / 2);
        r.snap(`Split [${lo}..${hi}] into [${lo}..${mid}] and [${mid + 1}..${hi}].`, { range: [lo, hi] });
        sortRange(lo, mid);
        sortRange(mid + 1, hi);
        const left = a.slice(lo, mid + 1);
        const right = a.slice(mid + 1, hi + 1);
        let i = 0, j = 0, k = lo;
        const rows = () => [
            { label: 'left', values: left, highlight: i < left.length ? i : undefined },
            { label: 'right', values: right, highlight: j < right.length ? j : undefined },
        ];
        r.snap(`Merge the sorted halves [${left.join(', ')}] and [${right.join(', ')}].`, { range: [lo, hi], aux: rows() });
        while (i < left.length && j < right.length) {
            r.comparisons++;
            const takeLeft = left[i] <= right[j]; // <= keeps the sort stable
            r.snap(`Compare fronts: ${left[i]} vs ${right[j]}.`, { range: [lo, hi], aux: rows() });
            const value = takeLeft ? left[i++] : right[j++];
            r.set(k++, value, `Take ${value} (the smaller front).`, { range: [lo, hi], aux: rows() });
        }
        while (i < left.length) {
            const value = left[i++];
            r.set(k++, value, `Right half is empty → copy the leftover ${value}.`, { range: [lo, hi], aux: rows() });
        }
        while (j < right.length) {
            const value = right[j++];
            r.set(k++, value, `Left half is empty → copy the leftover ${value}.`, { range: [lo, hi], aux: rows() });
        }
        r.snap(`[${lo}..${hi}] is merged and sorted.`, { range: [lo, hi] });
    };
    sortRange(0, a.length - 1);
    return r.done();
}

function quick(input: number[]): Frame[] {
    const r = new Recorder([...input]);
    const a = r.a;
    const sortRange = (lo: number, hi: number) => {
        if (lo > hi) return;
        if (lo === hi) {
            r.sorted.add(lo);
            r.snap(`A single item [${lo}] is already in place.`);
            return;
        }
        const pivotValue = a[hi];
        r.snap(`Partition [${lo}..${hi}] around pivot ${pivotValue} (the last item).`, { pivot: hi, range: [lo, hi] });
        let i = lo; // next slot for an item smaller than the pivot
        for (let j = lo; j < hi; j++) {
            if (r.less(j, hi, { pivot: hi, range: [lo, hi] }, `Is ${a[j]} smaller than the pivot ${pivotValue}?`)) {
                if (i !== j) r.swap(i, j, `Yes → move ${a[j]} to the "smaller" side (slot ${i}).`, { pivot: hi, range: [lo, hi] });
                else r.snap(`Yes → ${a[j]} is already on the "smaller" side.`, { pivot: hi, range: [lo, hi] });
                i++;
            }
        }
        if (i !== hi) r.swap(i, hi, `Put the pivot ${pivotValue} between the two sides.`, { range: [lo, hi] });
        r.sorted.add(i);
        r.snap(`Pivot ${pivotValue} is now in its final place (index ${i}).`, { range: [lo, hi] });
        sortRange(lo, i - 1);
        sortRange(i + 1, hi);
    };
    sortRange(0, a.length - 1);
    return r.done();
}

function heap(input: number[]): Frame[] {
    const r = new Recorder([...input]);
    const a = r.a;
    const n = a.length;
    const siftDown = (start: number, end: number) => {
        let root = start;
        while (2 * root + 1 <= end) {
            let child = 2 * root + 1;
            if (child + 1 <= end && r.less(child, child + 1, { range: [0, end] }, `Pick the bigger child: ${a[child]} or ${a[child + 1]}?`)) child++;
            if (r.less(root, child, { range: [0, end] }, `Is parent ${a[root]} smaller than child ${a[child]}?`)) {
                r.swap(root, child, 'Yes → swap them and keep sifting down.', { range: [0, end] });
                root = child;
            } else return;
        }
    };
    r.snap('Phase 1: build a max-heap (every parent ≥ its children).');
    for (let start = Math.floor(n / 2) - 1; start >= 0; start--) siftDown(start, n - 1);
    r.snap(`Max-heap built: the largest value ${a[0]} is at the root (index 0).`, { pivot: 0 });
    for (let end = n - 1; end > 0; end--) {
        r.swap(0, end, `Phase 2: move the max ${a[0]} to the end (index ${end}).`);
        r.sorted.add(end);
        siftDown(0, end - 1);
    }
    return r.done();
}

function counting(input: number[]): Frame[] {
    const r = new Recorder([...input]);
    const a = r.a;
    const max = Math.max(...a);
    const count = new Array(max + 1).fill(0);
    const row = (h?: number) => [{ label: 'count[value]', values: count, highlight: h }];
    r.snap(`Make a count array for values 0..${max}.`, { aux: row() });
    a.forEach((v, i) => {
        count[v]++;
        r.snap(`Read ${v} → count[${v}] = ${count[v]}.`, { compare: [i], aux: row(v) });
    });
    let k = 0;
    for (let v = 0; v <= max; v++) {
        while (count[v] > 0) {
            count[v]--;
            r.set(k++, v, `Write ${v} back (${count[v]} more left).`, { aux: row(v) });
        }
    }
    return r.done('All counts written back in order → sorted, with no comparisons at all.');
}

function radix(input: number[]): Frame[] {
    const r = new Recorder([...input]);
    const a = r.a;
    const max = Math.max(...a);
    for (let exp = 1; Math.floor(max / exp) > 0; exp *= 10) {
        const place = exp === 1 ? 'ones' : exp === 10 ? 'tens' : exp === 100 ? 'hundreds' : `×${exp}`;
        const buckets: number[][] = Array.from({ length: 10 }, () => []);
        const rows = (h?: number) => buckets.map((b, d) => ({ label: `digit ${d}`, values: b, highlight: d === h ? b.length - 1 : undefined }));
        r.snap(`Distribute by the ${place} digit into buckets 0–9 (keeping order).`, { aux: rows() });
        a.forEach((v, i) => {
            const d = Math.floor(v / exp) % 10;
            buckets[d].push(v);
            r.snap(`${v} has ${place} digit ${d} → bucket ${d}.`, { compare: [i], aux: rows(d) });
        });
        let k = 0;
        for (const b of buckets) for (const v of b) r.set(k++, v, `Collect ${v} back in bucket order.`, { aux: rows() });
    }
    return r.done('Sorted by every digit, least significant first → fully sorted.');
}

function bucket(input: number[]): Frame[] {
    const r = new Recorder([...input]);
    const a = r.a;
    const B = 5;
    const max = Math.max(...a) + 1;
    const buckets: number[][] = Array.from({ length: B }, () => []);
    const width = Math.ceil(max / B);
    const rows = (h?: number) => buckets.map((b, i) => ({ label: `${i * width}–${(i + 1) * width - 1}`, values: b, highlight: i === h ? b.length - 1 : undefined }));
    r.snap(`Make ${B} buckets, each covering a range of ${width} values.`, { aux: rows() });
    a.forEach((v, i) => {
        const bi = Math.min(B - 1, Math.floor(v / width));
        buckets[bi].push(v);
        r.snap(`${v} goes into bucket ${bi} (${bi * width}–${(bi + 1) * width - 1}).`, { compare: [i], aux: rows(bi) });
    });
    buckets.forEach((b, bi) => {
        b.sort((x, y) => x - y);
        r.comparisons += Math.max(0, b.length - 1);
        r.snap(`Sort bucket ${bi} on its own (small, so insertion sort is fast).`, { aux: rows(bi) });
    });
    let k = 0;
    for (const b of buckets) for (const v of b) r.set(k++, v, `Concatenate: write ${v}.`, { aux: rows() });
    return r.done('Buckets joined in order → sorted.');
}

function cyclic(input: number[]): Frame[] {
    const r = new Recorder([...input]);
    const a = r.a;
    let i = 0;
    while (i < a.length) {
        const target = a[i] - 1;
        r.comparisons++;
        if (a[i] !== a[target]) {
            r.snap(`${a[i]} belongs at index ${target}, but index ${i} holds it.`, { compare: [i, target] });
            r.swap(i, target, `Swap ${a[target]} into its home (index ${target}).`);
            r.sorted.add(target);
        } else {
            r.sorted.add(i);
            r.snap(`Index ${i} holds ${a[i]}, which is home → move on.`, { compare: [i] });
            i++;
        }
    }
    return r.done('Every value v sits at index v − 1 → sorted in O(n) with O(1) space.');
}

export type SortingAlgorithm = {
    name: string;
    run: (input: number[]) => Frame[];
    /** Random input suited to the algorithm. */
    sample: () => number[];
    /** Returns an error message when the custom input doesn't suit the algorithm. */
    validate: (values: number[]) => string | null;
    inputHint: string;
};

const rand = (lo: number, hi: number) => lo + Math.floor(Math.random() * (hi - lo + 1));
const randomArray = (n: number, lo: number, hi: number) => Array.from({ length: n }, () => rand(lo, hi));
const shuffle = (xs: number[]) => {
    for (let i = xs.length - 1; i > 0; i--) {
        const j = rand(0, i);
        [xs[i], xs[j]] = [xs[j], xs[i]];
    }
    return xs;
};
const MAX_ITEMS = 20;
const ints = (lo: number, hi: number) => (values: number[]) => {
    if (values.length < 2 || values.length > MAX_ITEMS) return `Enter between 2 and ${MAX_ITEMS} numbers.`;
    if (values.some((v) => !Number.isInteger(v) || v < lo || v > hi)) return `Use whole numbers from ${lo} to ${hi}.`;
    return null;
};

export const SORTING_ALGORITHMS: Record<string, SortingAlgorithm> = {
    bubble: { name: 'Bubble sort', run: bubble, sample: () => randomArray(10, 5, 99), validate: ints(1, 999), inputHint: 'e.g. 5, 1, 4, 2, 8' },
    selection: { name: 'Selection sort', run: selection, sample: () => randomArray(10, 5, 99), validate: ints(1, 999), inputHint: 'e.g. 64, 25, 12, 22, 11' },
    insertion: { name: 'Insertion sort', run: insertion, sample: () => randomArray(10, 5, 99), validate: ints(1, 999), inputHint: 'e.g. 12, 11, 13, 5, 6' },
    shell: { name: 'Shell sort', run: shell, sample: () => randomArray(12, 5, 99), validate: ints(1, 999), inputHint: 'e.g. 35, 33, 42, 10, 14, 19, 27, 44' },
    merge: { name: 'Merge sort', run: merge, sample: () => randomArray(10, 5, 99), validate: ints(1, 999), inputHint: 'e.g. 38, 27, 43, 3, 9, 82, 10' },
    quick: { name: 'Quick sort', run: quick, sample: () => randomArray(10, 5, 99), validate: ints(1, 999), inputHint: 'e.g. 10, 80, 30, 90, 40, 50, 70' },
    heap: { name: 'Heap sort', run: heap, sample: () => randomArray(10, 5, 99), validate: ints(1, 999), inputHint: 'e.g. 4, 10, 3, 5, 1' },
    counting: { name: 'Counting sort', run: counting, sample: () => randomArray(12, 0, 9), validate: ints(0, 20), inputHint: 'small values 0–20, e.g. 4, 2, 2, 8, 3, 3, 1' },
    radix: { name: 'Radix sort', run: radix, sample: () => randomArray(10, 10, 999), validate: ints(0, 9999), inputHint: 'e.g. 170, 45, 75, 90, 802, 24, 2, 66' },
    bucket: { name: 'Bucket sort', run: bucket, sample: () => randomArray(12, 0, 99), validate: ints(0, 99), inputHint: 'values 0–99, e.g. 42, 32, 33, 52, 37, 47, 51' },
    cyclic: {
        name: 'Cyclic sort',
        run: cyclic,
        sample: () => shuffle(Array.from({ length: 8 }, (_, i) => i + 1)),
        validate: (values) => {
            const base = ints(1, MAX_ITEMS)(values);
            if (base) return base;
            const sorted = [...values].sort((x, y) => x - y);
            return sorted.every((v, i) => v === i + 1) ? null : 'Cyclic sort needs each number from 1 to n exactly once, e.g. 3, 1, 5, 4, 2.';
        },
        inputHint: 'numbers 1..n, each once, e.g. 3, 1, 5, 4, 2',
    },
};
