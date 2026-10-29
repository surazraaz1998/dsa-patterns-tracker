// Step-by-step traces for array, linked-list, tree, graph and DP visualisers.
// Every generator returns frames; the shared player steps through them.

export type Tone = 'compare' | 'found' | 'best' | 'bad' | 'done';

// ---------------------------------------------------------------- array family
export type ArrayFrame = {
    kind: 'array';
    items: (number | string)[];
    bars?: boolean;                                   // draw numbers as bars (container problem)
    pointers: { label: string; index: number }[];     // index may equal items.length (one past the end)
    window?: [number, number];                        // highlighted range; outside is dimmed
    tones?: Record<number, Tone>;
    aux?: { label: string; value: string }[];
    note: string;
};

// ---------------------------------------------------------------- linked list
export type ListFrame = {
    kind: 'list';
    values: number[];
    next: (number | null)[];
    pointers: { label: string; index: number | null }[];
    tones?: Record<number, Tone>;
    aux?: { label: string; value: string }[];
    note: string;
};

// ---------------------------------------------------------------- tree (heap-indexed array, null = no node)
export type TreeFrame = {
    kind: 'tree';
    tree: (number | null)[];
    current?: number;
    tones?: Record<number, Tone>;
    aux?: { label: string; value: string }[];
    note: string;
};

// ---------------------------------------------------------------- graph
export type GraphSpec = { nodes: { x: number; y: number }[]; edges: [number, number][] };
export type GraphFrame = {
    kind: 'graph';
    graph: GraphSpec;
    current?: number;
    edge?: [number, number];
    treeEdges: [number, number][];
    tones?: Record<number, Tone>;
    aux?: { label: string; value: string }[];
    note: string;
};

// ---------------------------------------------------------------- DP table
export type TableFrame = {
    kind: 'table';
    colHeaders: string[];
    rows: { label: string; cells: (number | string | null)[] }[];
    current?: [number, number];
    deps?: [number, number][];
    aux?: { label: string; value: string }[];
    note: string;
};

export type Frame = ArrayFrame | ListFrame | TreeFrame | GraphFrame | TableFrame;

export type VisualAlgorithm<I> = {
    name: string;
    run: (input: I) => Frame[];
    sample: () => I;
    parse: (text: string) => I | string;    // a string is an error message
    hint: string;
};

// ---------------------------------------------------------------- helpers
const rand = (lo: number, hi: number) => lo + Math.floor(Math.random() * (hi - lo + 1));
const pick = <T,>(xs: T[]) => xs[rand(0, xs.length - 1)];
const sortedUnique = (n: number, lo: number, hi: number) => {
    const s = new Set<number>();
    while (s.size < n) s.add(rand(lo, hi));
    return [...s].sort((a, b) => a - b);
};
const nums = (text: string) => text.split(/[\s,]+/).filter(Boolean).map(Number);
const badNums = (xs: number[], min = 1, max = 16) =>
    xs.length < min || xs.length > max ? `Enter between ${min} and ${max} numbers.`
        : xs.some((x) => !Number.isFinite(x) || !Number.isInteger(x)) ? 'Use whole numbers separated by commas.' : null;
const splitTarget = (text: string): [string, string] | null => {
    const parts = text.split(';');
    return parts.length === 2 ? [parts[0], parts[1].trim()] : null;
};

// ================================================================ binary search
type SearchInput = { items: number[]; target: number };

const parseSearch = (text: string): SearchInput | string => {
    const parts = splitTarget(text);
    if (!parts) return 'Use the format: numbers ; target — e.g. 2, 5, 8, 12, 16 ; 12';
    const items = nums(parts[0]);
    const err = badNums(items, 1, 16);
    if (err) return err;
    const target = Number(parts[1]);
    if (!Number.isInteger(target)) return 'The target must be a whole number.';
    return { items: [...items].sort((a, b) => a - b), target };
};

const sampleSearch = (): SearchInput => {
    const items = sortedUnique(11, 1, 60);
    return { items, target: Math.random() < 0.75 ? pick(items) : rand(1, 60) };
};

function binarySearchClassic({ items, target }: SearchInput): Frame[] {
    const frames: Frame[] = [];
    const f = (note: string, lo: number, hi: number, extra: Partial<ArrayFrame> = {}) =>
        frames.push({ kind: 'array', items, pointers: [{ label: 'lo', index: lo }, { label: 'hi', index: hi }], window: [lo, hi], note, aux: [{ label: 'target', value: String(target) }], ...extra });
    let lo = 0, hi = items.length - 1;
    f(`Search for ${target}. The answer, if it exists, is in [lo, hi].`, lo, hi);
    while (lo <= hi) {
        const mid = Math.floor((lo + hi) / 2);
        f(`mid = (${lo} + ${hi}) // 2 = ${mid}; a[mid] = ${items[mid]}.`, lo, hi, { pointers: [{ label: 'lo', index: lo }, { label: 'mid', index: mid }, { label: 'hi', index: hi }], tones: { [mid]: 'compare' } });
        if (items[mid] === target) {
            f(`a[${mid}] = ${target} → found at index ${mid}.`, lo, hi, { pointers: [{ label: 'mid', index: mid }], tones: { [mid]: 'found' } });
            return frames;
        }
        if (items[mid] < target) {
            f(`${items[mid]} < ${target}: everything at or left of mid is too small → lo = ${mid + 1}.`, mid + 1, hi);
            lo = mid + 1;
        } else {
            f(`${items[mid]} > ${target}: everything at or right of mid is too big → hi = ${mid - 1}.`, lo, mid - 1);
            hi = mid - 1;
        }
    }
    frames.push({ kind: 'array', items, pointers: [{ label: 'hi', index: Math.max(hi, 0) }, { label: 'lo', index: lo }], note: `lo > hi: the range is empty → ${target} is not in the array (it would be inserted at index ${lo}).`, aux: [{ label: 'target', value: String(target) }] });
    return frames;
}

function lowerBound({ items, target }: SearchInput): Frame[] {
    const frames: Frame[] = [];
    const aux = [{ label: 'goal', value: `first index with a[i] ≥ ${target}` }];
    let lo = 0, hi = items.length;
    const push = (note: string, extra: Partial<ArrayFrame> = {}) =>
        frames.push({ kind: 'array', items, pointers: [{ label: 'lo', index: lo }, { label: 'hi', index: hi }], window: hi > lo ? [lo, hi - 1] : undefined, note, aux, ...extra });
    push(`Half-open range [lo, hi). hi starts one past the end, because the answer may be "after everything".`);
    while (lo < hi) {
        const mid = Math.floor((lo + hi) / 2);
        push(`mid = ${mid}, a[mid] = ${items[mid]}. Is ${items[mid]} ≥ ${target}?`, { pointers: [{ label: 'lo', index: lo }, { label: 'mid', index: mid }, { label: 'hi', index: hi }], tones: { [mid]: 'compare' } });
        if (items[mid] >= target) {
            hi = mid;
            push(`Yes → mid could be the answer; keep it: hi = ${mid}.`);
        } else {
            lo = mid + 1;
            push(`No → the answer is to the right: lo = ${mid + 1}.`);
        }
    }
    frames.push({
        kind: 'array', items, pointers: [{ label: 'answer', index: lo }], tones: lo < items.length ? { [lo]: 'found' } : {}, aux,
        note: lo < items.length ? `lo = hi = ${lo}: a[${lo}] = ${items[lo]} is the first value ≥ ${target}.` : `lo = hi = ${lo} (past the end): every value is smaller than ${target}.`,
    });
    return frames;
}

// ================================================================ two pointers
function twoSumSorted({ items, target }: SearchInput): Frame[] {
    const frames: Frame[] = [];
    let l = 0, r = items.length - 1;
    const push = (note: string, tones: Record<number, Tone> = {}) =>
        frames.push({ kind: 'array', items, pointers: [{ label: 'L', index: l }, { label: 'R', index: r }], window: [l, r], tones, note, aux: [{ label: 'target', value: String(target) }, { label: 'sum', value: l < r ? `${items[l]} + ${items[r]} = ${items[l] + items[r]}` : '—' }] });
    push('Start with the smallest (L) and the largest (R) value.');
    while (l < r) {
        const s = items[l] + items[r];
        if (s === target) {
            push(`${items[l]} + ${items[r]} = ${target} → found the pair (indices ${l} and ${r}).`, { [l]: 'found', [r]: 'found' });
            return frames;
        }
        if (s < target) {
            push(`Sum ${s} < ${target}: ${items[l]} can't work with anything (R is already the biggest) → move L right.`, { [l]: 'bad' });
            l++;
        } else {
            push(`Sum ${s} > ${target}: ${items[r]} is too big for every remaining partner → move R left.`, { [r]: 'bad' });
            r--;
        }
        push(`Now L = ${l}, R = ${r}.`, { [l]: 'compare', [r]: 'compare' });
    }
    frames.push({ kind: 'array', items, pointers: [{ label: 'L', index: l }, { label: 'R', index: r }], note: `L met R → no pair adds up to ${target}.`, aux: [{ label: 'target', value: String(target) }] });
    return frames;
}

function containerMostWater(heights: number[]): Frame[] {
    const frames: Frame[] = [];
    let l = 0, r = heights.length - 1, best = 0, bestPair: [number, number] = [0, 0];
    while (l < r) {
        const area = Math.min(heights[l], heights[r]) * (r - l);
        const improved = area > best;
        if (improved) { best = area; bestPair = [l, r]; }
        frames.push({
            kind: 'array', items: heights, bars: true, pointers: [{ label: 'L', index: l }, { label: 'R', index: r }], window: [l, r],
            tones: { [l]: 'compare', [r]: 'compare' },
            aux: [{ label: 'area', value: `min(${heights[l]}, ${heights[r]}) × ${r - l} = ${area}` }, { label: 'best', value: `${best} (lines ${bestPair[0]} and ${bestPair[1]})` }],
            note: `${improved ? 'New best! ' : ''}Move the shorter line (${heights[l] <= heights[r] ? `L at ${heights[l]}` : `R at ${heights[r]}`}) — keeping it can only give less width with the same cap.`,
        });
        if (heights[l] <= heights[r]) l++; else r--;
    }
    frames.push({ kind: 'array', items: heights, bars: true, pointers: [{ label: 'L', index: bestPair[0] }, { label: 'R', index: bestPair[1] }], tones: { [bestPair[0]]: 'found', [bestPair[1]]: 'found' }, aux: [{ label: 'best', value: String(best) }], note: `Pointers met. The most water is ${best}, between lines ${bestPair[0]} and ${bestPair[1]}.` });
    return frames;
}

// ================================================================ sliding window
function longestUnique({ s }: { s: string }): Frame[] {
    const items = [...s];
    const frames: Frame[] = [];
    const last = new Map<string, number>();
    let l = 0, best = 0, bestRange: [number, number] = [0, -1];
    for (let r = 0; r < items.length; r++) {
        const ch = items[r];
        if (last.has(ch) && last.get(ch)! >= l) {
            const dup = last.get(ch)!;
            frames.push({ kind: 'array', items, pointers: [{ label: 'L', index: l }, { label: 'R', index: r }], window: [l, r], tones: { [dup]: 'bad', [r]: 'bad' }, note: `'${ch}' is already in the window (index ${dup}) → move L past it to ${dup + 1}.`, aux: [{ label: 'best', value: String(best) }] });
            l = dup + 1;
        }
        last.set(ch, r);
        if (r - l + 1 > best) { best = r - l + 1; bestRange = [l, r]; }
        frames.push({
            kind: 'array', items, pointers: [{ label: 'L', index: l }, { label: 'R', index: r }], window: [l, r], tones: { [r]: 'compare' },
            note: `Add '${ch}'. Window "${items.slice(l, r + 1).join('')}" has no repeats (length ${r - l + 1}).`,
            aux: [{ label: 'best', value: `${best} ("${items.slice(bestRange[0], bestRange[1] + 1).join('')}")` }],
        });
    }
    const tones: Record<number, Tone> = {};
    for (let i = bestRange[0]; i <= bestRange[1]; i++) tones[i] = 'found';
    frames.push({ kind: 'array', items, pointers: [], window: bestRange[1] >= 0 ? bestRange : undefined, tones, note: `Done: the longest substring without repeats has length ${best}.`, aux: [{ label: 'best', value: String(best) }] });
    return frames;
}

type WindowInput = { items: number[]; k: number };
function maxSumK({ items, k }: WindowInput): Frame[] {
    const frames: Frame[] = [];
    let sum = items.slice(0, k).reduce((a, b) => a + b, 0);
    let best = sum, bestAt = 0;
    frames.push({ kind: 'array', items, pointers: [{ label: 'L', index: 0 }, { label: 'R', index: k - 1 }], window: [0, k - 1], note: `First window of size ${k}: sum = ${sum}.`, aux: [{ label: 'sum', value: String(sum) }, { label: 'best', value: String(best) }] });
    for (let r = k; r < items.length; r++) {
        const out = items[r - k];
        sum += items[r] - out;
        if (sum > best) { best = sum; bestAt = r - k + 1; }
        frames.push({
            kind: 'array', items, pointers: [{ label: 'L', index: r - k + 1 }, { label: 'R', index: r }], window: [r - k + 1, r], tones: { [r]: 'compare', [r - k]: 'bad' },
            note: `Slide: add ${items[r]}, drop ${out} → sum = ${sum}${sum === best && bestAt === r - k + 1 ? ' (new best)' : ''}. No re-adding the whole window.`,
            aux: [{ label: 'sum', value: String(sum) }, { label: 'best', value: String(best) }],
        });
    }
    const tones: Record<number, Tone> = {};
    for (let i = bestAt; i < bestAt + k; i++) tones[i] = 'found';
    frames.push({ kind: 'array', items, pointers: [], window: [bestAt, bestAt + k - 1], tones, note: `Best window starts at index ${bestAt} with sum ${best}.`, aux: [{ label: 'best', value: String(best) }] });
    return frames;
}

// ================================================================ linked list
function reverseList(values: number[]): Frame[] {
    const n = values.length;
    const next: (number | null)[] = values.map((_, i) => (i + 1 < n ? i + 1 : null));
    const frames: Frame[] = [];
    let prev: number | null = null, curr: number | null = 0;
    const push = (note: string, nxt: number | null = null, tones: Record<number, Tone> = {}) =>
        frames.push({ kind: 'list', values, next: [...next], pointers: [{ label: 'prev', index: prev }, { label: 'curr', index: curr }, { label: 'next', index: nxt }], tones, note });
    push('prev = null, curr = head.');
    while (curr !== null) {
        const nxt: number | null = next[curr];
        push(`1. Save next = ${nxt === null ? 'null' : values[nxt]} so we don't lose the rest of the list.`, nxt, { [curr]: 'compare' });
        next[curr] = prev;
        push(`2. Flip: ${values[curr]}.next = ${prev === null ? 'null' : values[prev]}.`, nxt, { [curr]: 'bad' });
        prev = curr;
        curr = nxt;
        push(`3–4. Move prev to ${values[prev]} and curr to ${curr === null ? 'null' : values[curr]}.`, null, { [prev]: 'done' });
    }
    const tones: Record<number, Tone> = {};
    values.forEach((_, i) => { tones[i] = 'done'; });
    frames.push({ kind: 'list', values, next: [...next], pointers: [{ label: 'new head', index: prev }], tones, note: `curr is null → done. The new head is ${prev === null ? 'null' : values[prev]}. O(n) time, O(1) space.` });
    return frames;
}

function middleNode(values: number[]): Frame[] {
    const n = values.length;
    const next = values.map((_, i) => (i + 1 < n ? i + 1 : null));
    const frames: Frame[] = [];
    let slow = 0, fast: number | null = 0;
    const push = (note: string, tones: Record<number, Tone> = {}) =>
        frames.push({ kind: 'list', values, next, pointers: [{ label: 'slow', index: slow }, { label: 'fast', index: fast }], tones, note });
    push('slow and fast both start at the head.');
    while (fast !== null && next[fast] !== null) {
        slow = next[slow]!;
        fast = next[next[fast]!];
        push(`slow moves 1 step (to ${values[slow]}), fast moves 2 steps (to ${fast === null ? 'null' : values[fast]}).`, { [slow]: 'compare' });
    }
    frames.push({ kind: 'list', values, next, pointers: [{ label: 'middle', index: slow }], tones: { [slow]: 'found' }, note: `fast can't move 2 more steps → slow (${values[slow]}) is the middle. When fast has walked the whole list, slow has walked half.` });
    return frames;
}

// ================================================================ trees
const kids = (i: number) => [2 * i + 1, 2 * i + 2];
const has = (t: (number | null)[], i: number) => i < t.length && t[i] !== null;

function treeTraversal(order: 'preorder' | 'inorder' | 'postorder') {
    return (tree: (number | null)[]): Frame[] => {
        const frames: Frame[] = [];
        const out: number[] = [];
        const visited: Record<number, Tone> = {};
        const stack: number[] = [];
        const push = (note: string, current?: number) =>
            frames.push({ kind: 'tree', tree, current, tones: { ...visited }, note, aux: [{ label: 'call stack', value: stack.map((i) => tree[i]).join(' → ') || '—' }, { label: 'output', value: out.join(', ') || '—' }] });
        const visit = (i: number) => {
            out.push(tree[i]!);
            visited[i] = 'done';
            push(`Visit ${tree[i]} → output.`, i);
        };
        const go = (i: number) => {
            if (!has(tree, i)) return;
            stack.push(i);
            push(`Call on ${tree[i]}.`, i);
            if (order === 'preorder') visit(i);
            const [l, r] = kids(i);
            if (has(tree, l)) go(l); else push(`${tree[i]} has no left child.`, i);
            if (order === 'inorder') visit(i);
            if (has(tree, r)) go(r); else push(`${tree[i]} has no right child.`, i);
            if (order === 'postorder') visit(i);
            stack.pop();
            push(`Return from ${tree[i]}.`, stack[stack.length - 1]);
        };
        push(`${order[0].toUpperCase() + order.slice(1)}: ${order === 'preorder' ? 'node, left, right' : order === 'inorder' ? 'left, node, right' : 'left, right, node'}.`);
        go(0);
        push(`Done. ${order} = [${out.join(', ')}].`);
        return frames;
    };
}

function levelOrder(tree: (number | null)[]): Frame[] {
    const frames: Frame[] = [];
    const visited: Record<number, Tone> = {};
    const levels: number[][] = [];
    let queue = has(tree, 0) ? [0] : [];
    const push = (note: string, current?: number) =>
        frames.push({ kind: 'tree', tree, current, tones: { ...visited }, note, aux: [{ label: 'queue', value: queue.map((i) => tree[i]).join(', ') || '—' }, { label: 'levels', value: levels.map((l) => `[${l.join(', ')}]`).join(' ') || '—' }] });
    push('Put the root in the queue.');
    while (queue.length) {
        const size = queue.length;
        const level: number[] = [];
        levels.push(level);
        push(`Level ${levels.length}: the queue holds exactly ${size} node(s).`);
        for (let k = 0; k < size; k++) {
            const i = queue[0];
            queue = queue.slice(1);
            level.push(tree[i]!);
            visited[i] = 'done';
            for (const c of kids(i)) if (has(tree, c)) queue.push(c);
            push(`Take ${tree[i]}, add its children to the back of the queue.`, i);
        }
    }
    push(`Done: ${levels.map((l) => `[${l.join(', ')}]`).join(' ')}.`);
    return frames;
}

type BstInput = { tree: (number | null)[]; target: number };
function bstSearch({ tree, target }: BstInput): Frame[] {
    const frames: Frame[] = [];
    const tones: Record<number, Tone> = {};
    let i = 0;
    frames.push({ kind: 'tree', tree, note: `Search for ${target}. Smaller → go left, bigger → go right.`, tones: {}, aux: [{ label: 'target', value: String(target) }] });
    while (has(tree, i)) {
        const v = tree[i]!;
        if (v === target) {
            tones[i] = 'found';
            frames.push({ kind: 'tree', tree, current: i, tones: { ...tones }, note: `${v} = ${target} → found in ${Object.keys(tones).length} steps (O(height)).`, aux: [{ label: 'target', value: String(target) }] });
            return frames;
        }
        tones[i] = 'compare';
        const left = target < v;
        frames.push({ kind: 'tree', tree, current: i, tones: { ...tones }, note: `${target} ${left ? '<' : '>'} ${v} → the whole ${left ? 'right' : 'left'} subtree is skipped; go ${left ? 'left' : 'right'}.`, aux: [{ label: 'target', value: String(target) }] });
        i = kids(i)[left ? 0 : 1];
    }
    frames.push({ kind: 'tree', tree, tones: { ...tones }, note: `Reached an empty spot → ${target} is not in the tree (it would be inserted here).`, aux: [{ label: 'target', value: String(target) }] });
    return frames;
}

const parseTree = (text: string): (number | null)[] | string => {
    const parts = text.split(/[\s,]+/).filter(Boolean);
    if (parts.length < 1 || parts.length > 15) return 'Enter 1 to 15 values (4 levels), using null for gaps.';
    const tree = parts.map((p) => (p.toLowerCase() === 'null' ? null : Number(p)));
    if (tree.some((v) => v !== null && !Number.isInteger(v))) return 'Use whole numbers or null.';
    if (tree[0] === null) return 'The root cannot be null.';
    for (let i = 1; i < tree.length; i++) {
        if (tree[i] !== null && tree[Math.floor((i - 1) / 2)] === null) return `Value at position ${i + 1} has no parent (its parent is null).`;
    }
    return tree;
};

function randomBst(): (number | null)[] {
    // Pick roots near the middle of each value range, so the tree is bushy but not perfectly balanced.
    const values = sortedUnique(rand(7, 11), 1, 60);
    const tree: (number | null)[] = new Array(15).fill(null);
    const build = (lo: number, hi: number, i: number) => {
        if (lo > hi || i >= 15) return;
        const span = hi - lo;
        const mid = Math.floor((lo + hi) / 2) + (span >= 2 ? rand(-1, 1) : 0);
        tree[i] = values[mid];
        build(lo, mid - 1, 2 * i + 1);
        build(mid + 1, hi, 2 * i + 2);
    };
    build(0, values.length - 1, 0);
    let end = tree.length;
    while (end > 1 && tree[end - 1] === null) end--;
    return tree.slice(0, end);
}

const randomTree = randomBst; // a random BST is a fine general tree for traversals

// ================================================================ graphs
const PRESETS: GraphSpec[] = [
    { nodes: [{ x: 15, y: 50 }, { x: 38, y: 18 }, { x: 38, y: 82 }, { x: 62, y: 50 }, { x: 85, y: 20 }, { x: 85, y: 80 }],
      edges: [[0, 1], [0, 2], [1, 3], [2, 3], [3, 4], [3, 5], [4, 5]] },
    { nodes: [{ x: 50, y: 12 }, { x: 22, y: 40 }, { x: 78, y: 40 }, { x: 12, y: 82 }, { x: 40, y: 82 }, { x: 65, y: 82 }, { x: 90, y: 82 }],
      edges: [[0, 1], [0, 2], [1, 3], [1, 4], [2, 5], [2, 6], [4, 5]] },
    { nodes: [{ x: 12, y: 25 }, { x: 40, y: 15 }, { x: 70, y: 22 }, { x: 90, y: 55 }, { x: 62, y: 85 }, { x: 30, y: 80 }, { x: 45, y: 50 }],
      edges: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 0], [0, 6], [6, 3], [1, 6]] },
];

type GraphInput = { graph: GraphSpec; start: number };
const adjacency = (g: GraphSpec) => {
    const adj: number[][] = g.nodes.map(() => []);
    for (const [a, b] of g.edges) { adj[a].push(b); adj[b].push(a); }
    adj.forEach((l) => l.sort((x, y) => x - y));
    return adj;
};

function bfs({ graph, start }: GraphInput): Frame[] {
    const adj = adjacency(graph);
    const frames: Frame[] = [];
    const dist: Record<number, number> = { [start]: 0 };
    const tones: Record<number, Tone> = {};
    const treeEdges: [number, number][] = [];
    const order: number[] = [];
    let queue = [start];
    const push = (note: string, current?: number, edge?: [number, number]) =>
        frames.push({ kind: 'graph', graph, current, edge, treeEdges: [...treeEdges], tones: { ...tones, ...Object.fromEntries(queue.map((q) => [q, 'compare' as Tone])) }, note,
            aux: [{ label: 'queue', value: queue.join(', ') || '—' }, { label: 'visit order', value: order.join(' → ') || '—' }, { label: 'distance', value: Object.entries(dist).map(([k, v]) => `${k}:${v}`).join('  ') }] });
    push(`Start BFS at ${start}: distance 0, put it in the queue (mark visited when ADDED).`);
    while (queue.length) {
        const u = queue[0];
        queue = queue.slice(1);
        order.push(u);
        tones[u] = 'done';
        push(`Take ${u} from the front of the queue.`, u);
        for (const v of adj[u]) {
            if (v in dist) {
                push(`Edge ${u}–${v}: ${v} was already seen → skip.`, u, [u, v]);
                continue;
            }
            dist[v] = dist[u] + 1;
            treeEdges.push([u, v]);
            queue.push(v);
            push(`Edge ${u}–${v}: new node → distance ${dist[v]}, add to the back of the queue.`, u, [u, v]);
        }
    }
    push(`Queue empty → done. BFS reached nodes in order of distance: ${order.join(' → ')}.`);
    return frames;
}

function dfs({ graph, start }: GraphInput): Frame[] {
    const adj = adjacency(graph);
    const frames: Frame[] = [];
    const tones: Record<number, Tone> = {};
    const treeEdges: [number, number][] = [];
    const order: number[] = [];
    const path: number[] = [];
    const push = (note: string, current?: number, edge?: [number, number]) =>
        frames.push({ kind: 'graph', graph, current, edge, treeEdges: [...treeEdges], tones: { ...tones, ...Object.fromEntries(path.map((p) => [p, 'compare' as Tone])) }, note,
            aux: [{ label: 'call stack', value: path.join(' → ') || '—' }, { label: 'visit order', value: order.join(' → ') || '—' }] });
    const go = (u: number) => {
        tones[u] = 'done';
        order.push(u);
        path.push(u);
        push(`Visit ${u} and go as deep as possible from here.`, u);
        for (const v of adj[u]) {
            if (tones[v]) {
                push(`Edge ${u}–${v}: ${v} already visited → skip.`, u, [u, v]);
                continue;
            }
            treeEdges.push([u, v]);
            push(`Edge ${u}–${v}: unvisited → recurse into ${v}.`, u, [u, v]);
            go(v);
        }
        path.pop();
        push(`${u} has no unvisited neighbours left → backtrack${path.length ? ` to ${path[path.length - 1]}` : ''}.`, path[path.length - 1]);
    };
    push(`Start DFS at ${start}.`);
    go(start);
    push(`Done. DFS order: ${order.join(' → ')}.`);
    return frames;
}

const parseGraph = (text: string): GraphInput | string => {
    const parts = splitTarget(text);
    if (!parts) return 'Use the format: edges ; start — e.g. 0-1, 0-2, 1-3, 2-3 ; 0';
    const edges: [number, number][] = [];
    for (const e of parts[0].split(/[\s,]+/).filter(Boolean)) {
        const m = e.match(/^(\d)-(\d)$/);
        if (!m) return `"${e}" isn't an edge like 0-1 (nodes 0–9).`;
        if (m[1] !== m[2]) edges.push([Number(m[1]), Number(m[2])]);
    }
    if (!edges.length) return 'Add at least one edge.';
    const n = Math.max(...edges.flat()) + 1;
    const start = Number(parts[1]);
    if (!Number.isInteger(start) || start < 0 || start >= n) return `Start must be a node from 0 to ${n - 1}.`;
    const nodes = Array.from({ length: n }, (_, i) => ({ x: 50 + 38 * Math.cos((2 * Math.PI * i) / n - Math.PI / 2), y: 50 + 38 * Math.sin((2 * Math.PI * i) / n - Math.PI / 2) }));
    return { graph: { nodes, edges }, start };
};

let presetIndex = 0;
const sampleGraph = (): GraphInput => {
    const graph = PRESETS[presetIndex++ % PRESETS.length];
    return { graph, start: rand(0, graph.nodes.length - 1) };
};

// ================================================================ DP tables
function climbingStairs(n: number): Frame[] {
    const cols = Array.from({ length: n + 1 }, (_, i) => String(i));
    const dp: (number | null)[] = new Array(n + 1).fill(null);
    const frames: Frame[] = [];
    const push = (note: string, current?: number, deps: number[] = []) =>
        frames.push({ kind: 'table', colHeaders: cols, rows: [{ label: 'ways[i]', cells: [...dp] }], current: current === undefined ? undefined : [0, current], deps: deps.map((d) => [0, d] as [number, number]), note });
    dp[0] = 1; push('ways[0] = 1 (standing at the bottom is one way).', 0);
    if (n >= 1) { dp[1] = 1; push('ways[1] = 1 (a single 1-step).', 1); }
    for (let i = 2; i <= n; i++) {
        dp[i] = dp[i - 1]! + dp[i - 2]!;
        push(`ways[${i}] = ways[${i - 1}] + ways[${i - 2}] = ${dp[i - 1]} + ${dp[i - 2]} = ${dp[i]} (last move was 1 step or 2 steps).`, i, [i - 1, i - 2]);
    }
    push(`Answer: ${dp[n]} ways to climb ${n} stairs.`, n);
    return frames;
}

function houseRobber(houses: number[]): Frame[] {
    const cols = houses.map((_, i) => String(i));
    const dp: (number | null)[] = new Array(houses.length).fill(null);
    const frames: Frame[] = [];
    const push = (note: string, current?: number, deps: [number, number][] = []) =>
        frames.push({ kind: 'table', colHeaders: cols, rows: [{ label: 'money', cells: houses }, { label: 'best[i]', cells: [...dp] }], current: current === undefined ? undefined : [1, current], deps, note });
    push('best[i] = most money from houses 0..i, never robbing two neighbours.');
    for (let i = 0; i < houses.length; i++) {
        const skip = i >= 1 ? dp[i - 1]! : 0;
        const rob = houses[i] + (i >= 2 ? dp[i - 2]! : 0);
        dp[i] = Math.max(skip, rob);
        const deps: [number, number][] = [[0, i]];
        if (i >= 1) deps.push([1, i - 1]);
        if (i >= 2) deps.push([1, i - 2]);
        push(`House ${i}: skip it → ${skip}; rob it → ${houses[i]} + ${i >= 2 ? dp[i - 2] : 0} = ${rob}. best[${i}] = ${dp[i]}.`, i, deps);
    }
    push(`Answer: ${dp[houses.length - 1]}.`, houses.length - 1);
    return frames;
}

type CoinInput = { coins: number[]; amount: number };
function coinChange({ coins, amount }: CoinInput): Frame[] {
    const cols = Array.from({ length: amount + 1 }, (_, i) => String(i));
    const dp: (number | string | null)[] = new Array(amount + 1).fill(null);
    const val = (a: number) => (typeof dp[a] === 'number' ? (dp[a] as number) : Infinity);
    const frames: Frame[] = [];
    const push = (note: string, current?: number, deps: number[] = []) =>
        frames.push({ kind: 'table', colHeaders: cols, rows: [{ label: 'coins[a]', cells: [...dp] }], current: current === undefined ? undefined : [0, current], deps: deps.map((d) => [0, d] as [number, number]), note, aux: [{ label: 'coins', value: coins.join(', ') }] });
    dp[0] = 0;
    push('coins[0] = 0: zero coins make amount 0.', 0);
    for (let a = 1; a <= amount; a++) {
        let best = Infinity;
        const used: number[] = [];
        for (const c of coins) {
            if (c <= a && val(a - c) + 1 < best) { best = val(a - c) + 1; }
            if (c <= a) used.push(a - c);
        }
        dp[a] = Number.isFinite(best) ? best : '∞';
        push(`Amount ${a}: try each coin c ≤ ${a} → 1 + coins[${a} − c]. Best = ${dp[a]}.`, a, used);
    }
    push(`Answer: ${typeof dp[amount] === 'number' ? `${dp[amount]} coins` : 'impossible (∞)'} for amount ${amount}.`, amount);
    return frames;
}

type LcsInput = { a: string; b: string };
function lcs({ a, b }: LcsInput): Frame[] {
    const grid: (number | null)[][] = Array.from({ length: a.length + 1 }, (_, i) => Array.from({ length: b.length + 1 }, (_, j) => (i === 0 || j === 0 ? 0 : null)));
    const cols = ['∅', ...b];
    const frames: Frame[] = [];
    const push = (note: string, current?: [number, number], deps: [number, number][] = []) =>
        frames.push({ kind: 'table', colHeaders: cols, rows: grid.map((row, i) => ({ label: i === 0 ? '∅' : a[i - 1], cells: [...row] })), current, deps, note });
    push('Row/column 0 = empty prefix → LCS 0. Fill the table row by row.');
    for (let i = 1; i <= a.length; i++) {
        for (let j = 1; j <= b.length; j++) {
            if (a[i - 1] === b[j - 1]) {
                grid[i][j] = grid[i - 1][j - 1]! + 1;
                push(`'${a[i - 1]}' = '${b[j - 1]}' → diagonal + 1 = ${grid[i][j]}.`, [i, j], [[i - 1, j - 1]]);
            } else {
                grid[i][j] = Math.max(grid[i - 1][j]!, grid[i][j - 1]!);
                push(`'${a[i - 1]}' ≠ '${b[j - 1]}' → max(top ${grid[i - 1][j]}, left ${grid[i][j - 1]}) = ${grid[i][j]}.`, [i, j], [[i - 1, j], [i, j - 1]]);
            }
        }
    }
    push(`Answer (bottom-right): LCS of "${a}" and "${b}" has length ${grid[a.length][b.length]}.`, [a.length, b.length]);
    return frames;
}

// ================================================================ registry
const str = (min: number, max: number) => (text: string): { s: string } | string => {
    const s = text.trim();
    return s.length < min || s.length > max ? `Enter ${min}–${max} characters.` : { s };
};

export const VISUALS: Record<string, Record<string, VisualAlgorithm<any>>> = {
    'binary-search': {
        classic: { name: 'Binary search', run: binarySearchClassic, sample: sampleSearch, parse: parseSearch, hint: 'numbers ; target — e.g. 2, 5, 8, 12, 16 ; 12' },
        'lower-bound': { name: 'Lower bound', run: lowerBound, sample: () => { const items = sortedUnique(10, 1, 40); return { items, target: rand(0, 42) }; }, parse: parseSearch, hint: 'numbers ; target — e.g. 1, 3, 3, 5, 8 ; 4' },
    },
    'two-pointers': {
        'two-sum-sorted': {
            name: 'Two Sum II (sorted)', run: twoSumSorted, parse: parseSearch, hint: 'numbers ; target — e.g. 2, 7, 11, 15 ; 9',
            sample: () => { const items = sortedUnique(10, 1, 50); const i = rand(0, 4), j = rand(5, 9); return { items, target: Math.random() < 0.85 ? items[i] + items[j] : 2 }; },
        },
        container: {
            name: 'Container With Most Water', run: containerMostWater, sample: () => Array.from({ length: 10 }, () => rand(1, 9)), hint: 'heights — e.g. 1, 8, 6, 2, 5, 4, 8, 3, 7',
            parse: (t: string) => { const xs = nums(t); return badNums(xs, 2, 16) ?? (xs.some((x) => x < 0) ? 'Heights must be ≥ 0.' : xs); },
        },
    },
    'sliding-window': {
        'longest-unique': {
            name: 'Longest substring without repeats', run: longestUnique, parse: str(1, 18), hint: 'a string — e.g. abcabcbb',
            sample: () => ({ s: pick(['abcabcbb', 'pwwkew', 'dvdfabca', 'tmmzuxt', 'abba', 'geeksforgee']) }),
        },
        'max-sum-k': {
            name: 'Max sum of k consecutive', run: maxSumK, hint: 'numbers ; k — e.g. 2, 1, 5, 1, 3, 2 ; 3',
            sample: () => ({ items: Array.from({ length: 10 }, () => rand(1, 9)), k: 3 }),
            parse: (t: string) => {
                const parts = splitTarget(t);
                if (!parts) return 'Use the format: numbers ; k';
                const items = nums(parts[0]);
                const k = Number(parts[1]);
                return badNums(items, 1, 16) ?? (!Number.isInteger(k) || k < 1 || k > items.length ? `k must be between 1 and ${items.length}.` : { items, k });
            },
        },
    },
    'linked-list': {
        reverse: { name: 'Reverse a linked list', run: reverseList, sample: () => Array.from({ length: 5 }, () => rand(1, 99)), hint: 'values — e.g. 1, 2, 3, 4, 5', parse: (t: string) => { const xs = nums(t); return badNums(xs, 1, 8) ?? xs; } },
        middle: { name: 'Middle node (fast & slow)', run: middleNode, sample: () => Array.from({ length: rand(5, 8) }, () => rand(1, 99)), hint: 'values — e.g. 1, 2, 3, 4, 5, 6', parse: (t: string) => { const xs = nums(t); return badNums(xs, 1, 8) ?? xs; } },
    },
    tree: {
        preorder: { name: 'Pre-order traversal', run: treeTraversal('preorder'), sample: randomTree, parse: parseTree, hint: 'level order with null — e.g. 5, 3, 8, 1, 4, null, 9' },
        inorder: { name: 'In-order traversal', run: treeTraversal('inorder'), sample: randomTree, parse: parseTree, hint: 'level order with null — e.g. 5, 3, 8, 1, 4, null, 9' },
        postorder: { name: 'Post-order traversal', run: treeTraversal('postorder'), sample: randomTree, parse: parseTree, hint: 'level order with null — e.g. 5, 3, 8, 1, 4, null, 9' },
        levelorder: { name: 'Level-order (BFS)', run: levelOrder, sample: randomTree, parse: parseTree, hint: 'level order with null — e.g. 5, 3, 8, 1, 4, null, 9' },
        'bst-search': {
            name: 'Search a BST', run: bstSearch, hint: 'BST in level order ; target — e.g. 8, 3, 10, 1, 6, null, 14 ; 6',
            sample: () => { const tree = randomBst(); const vals = tree.filter((v): v is number => v !== null); return { tree, target: Math.random() < 0.75 ? pick(vals) : rand(1, 60) }; },
            parse: (t: string) => {
                const parts = splitTarget(t);
                if (!parts) return 'Use the format: tree ; target';
                const tree = parseTree(parts[0]);
                const target = Number(parts[1]);
                return typeof tree === 'string' ? tree : !Number.isInteger(target) ? 'The target must be a whole number.' : { tree, target };
            },
        },
    },
    graph: {
        bfs: { name: 'Breadth-first search', run: bfs, sample: sampleGraph, parse: parseGraph, hint: 'edges ; start — e.g. 0-1, 0-2, 1-3, 2-3, 3-4 ; 0' },
        dfs: { name: 'Depth-first search', run: dfs, sample: sampleGraph, parse: parseGraph, hint: 'edges ; start — e.g. 0-1, 0-2, 1-3, 2-3, 3-4 ; 0' },
    },
    dp: {
        'climbing-stairs': { name: 'Climbing Stairs', run: climbingStairs, sample: () => rand(5, 10), hint: 'number of stairs, 1–12', parse: (t: string) => { const n = Number(t.trim()); return Number.isInteger(n) && n >= 1 && n <= 12 ? n : 'Enter a whole number from 1 to 12.'; } },
        'house-robber': { name: 'House Robber', run: houseRobber, sample: () => Array.from({ length: 7 }, () => rand(1, 20)), hint: 'money per house — e.g. 2, 7, 9, 3, 1', parse: (t: string) => { const xs = nums(t); return badNums(xs, 1, 12) ?? (xs.some((x) => x < 0) ? 'Amounts must be ≥ 0.' : xs); } },
        'coin-change': {
            name: 'Coin Change', run: coinChange, hint: 'coins ; amount — e.g. 1, 2, 5 ; 11',
            sample: () => pick([{ coins: [1, 2, 5], amount: 11 }, { coins: [1, 3, 4], amount: 6 }, { coins: [2, 5], amount: 12 }, { coins: [3, 7], amount: 11 }]),
            parse: (t: string) => {
                const parts = splitTarget(t);
                if (!parts) return 'Use the format: coins ; amount';
                const coins = nums(parts[0]);
                const amount = Number(parts[1]);
                return badNums(coins, 1, 5) ?? (coins.some((c) => c < 1) ? 'Coins must be ≥ 1.' : !Number.isInteger(amount) || amount < 1 || amount > 15 ? 'Amount must be 1–15.' : { coins, amount });
            },
        },
        lcs: {
            name: 'Longest Common Subsequence', run: lcs, hint: 'two words ; separated — e.g. abcde ; ace',
            sample: () => pick([{ a: 'abcde', b: 'ace' }, { a: 'stone', b: 'longest' }, { a: 'abcbdab', b: 'bdcaba' }, { a: 'kitten', b: 'sitting' }]),
            parse: (t: string) => {
                const parts = splitTarget(t);
                if (!parts) return 'Use the format: word1 ; word2';
                const a = parts[0].trim(), b = parts[1].trim();
                return a.length < 1 || b.length < 1 || a.length > 8 || b.length > 8 ? 'Each word must be 1–8 characters.' : { a, b };
            },
        },
    },
};
