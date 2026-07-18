"""
Loads the Two Pointer pattern + all Tier 1-4 problems into the database.
Idempotent: safe to re-run, skips anything already seeded (matched by slug).

Usage:
    python -m app.seed_data
"""

from app.db import Base, engine, SessionLocal
from app.models import Pattern, Problem

TWO_POINTER_NOTE_MD = """
## Two Pointer Pattern

**Core idea:** instead of nested loops (O(n^2)), use two indices that move through an
array, string, or linked list based on a condition. Both pointers move forward
(mostly), so the whole structure gets scanned in O(n) instead of O(n^2).

**Precondition that unlocks this pattern:** the array/string is already sorted, or the
problem has a structural property (palindrome, linked list, partitioning) that lets you
reason about both ends — or both speeds — at once.

---

### 1. Opposite Direction (Converging Pointers)
`left` starts at index 0, `right` starts at index n-1. They move toward each other,
one step at a time, until they meet or cross.

**Used for:** sorted-array pair sums (Two Sum II), palindrome checks, container/area
problems (Container With Most Water), reversing in place.

**How to decide which pointer to move:** look at the current pair. If the pair "isn't
good enough yet" in one direction (sum too small, wall too short, etc.), move the
pointer that can fix that — usually `left++` to increase, or `right--` to decrease.

---

### 2. Same Direction (Slow-Fast / Sliding Pointers)
Both pointers start at or near index 0. `fast` moves every single step, scanning
forward. `slow` only moves when a specific condition is met — it marks the boundary
of "the part of the array we've already finalized."

**Used for:** in-place compaction (Remove Duplicates, Move Zeroes). This is also the
backbone of the Sliding Window pattern, which extends this idea to variable-size
windows instead of single pointers.

**Mental model:** `slow` is the next write position. `fast` is the scanner deciding
what's worth writing there.

---

### 3. Fast-Slow on Linked Lists (Floyd's Algorithm)
A special case of same-direction, but the two pointers move at *different speeds* —
`slow` moves 1 node at a time, `fast` moves 2 nodes at a time.

**Used for:** cycle detection (does this linked list loop back on itself?), finding the
middle node in a single pass.

**Why it works:** if there's a cycle, the faster pointer will eventually lap the slower
one and they'll land on the same node. If there's no cycle, `fast` simply reaches the
end first.

---

### Decision Framework — ask these in order
1. **Is the array sorted** (or can it be sorted without losing needed info)? -> use
   opposite-direction pointers.
2. **Am I comparing or overwriting elements in place while scanning once?** -> use
   same-direction pointers.
3. **Is it a linked list, and do I need cycle detection or the middle node?** -> use
   fast-slow pointers.
4. **Am I looking for a *subarray or substring* that satisfies some condition** (a
   target sum, a max distinct-character count, etc.)? -> that's Sliding Window, a
   close cousin of two-pointer, not the same thing — don't force plain two-pointer
   onto a windowing problem.
""".strip()

PATTERN = {
    "slug": "two-pointer",
    "name": "Two Pointer",
    "description": "Use two indices moving through a structure to avoid nested loops.",
    "revision_note_md": TWO_POINTER_NOTE_MD,
    "display_order": 1,
}

PROBLEMS = [
    # Tier 1 — Foundation
    ("Two Sum II - Input Array Is Sorted", "two-sum-ii-input-array-is-sorted", 167, 1),
    ("Valid Palindrome", "valid-palindrome", 125, 1),
    ("Reverse String", "reverse-string", 344, 1),
    ("Move Zeroes", "move-zeroes", 283, 1),
    ("Remove Duplicates from Sorted Array", "remove-duplicates-from-sorted-array", 26, 1),
    ("Squares of a Sorted Array", "squares-of-a-sorted-array", 977, 1),
    # Tier 2 — Core Fluency
    ("3Sum", "3sum", 15, 2),
    ("3Sum Closest", "3sum-closest", 16, 2),
    ("Container With Most Water", "container-with-most-water", 11, 2),
    ("Sort Colors", "sort-colors", 75, 2),
    ("Remove Duplicates from Sorted Array II", "remove-duplicates-from-sorted-array-ii", 80, 2),
    ("Linked List Cycle", "linked-list-cycle", 141, 2),
    ("Middle of the Linked List", "middle-of-the-linked-list", 876, 2),
    # Tier 3 — Where People Get Stuck
    ("Trapping Rain Water", "trapping-rain-water", 42, 3),
    ("4Sum", "4sum", 18, 3),
    ("Linked List Cycle II", "linked-list-cycle-ii", 142, 3),
    ("Backspace String Compare", "backspace-string-compare", 844, 3),
    ("Sort Transformed Array", "sort-transformed-array", 360, 3),  # Premium-locked on LeetCode
    ("Boats to Save People", "boats-to-save-people", 881, 3),
    ("Minimum Size Subarray Sum", "minimum-size-subarray-sum", 209, 3),
    # Tier 4 — Interview-Expert Level
    ("Longest Duplicate Substring", "longest-duplicate-substring", 1044, 4),
    ("Palindrome Partitioning", "palindrome-partitioning", 131, 4),
    ("Merge Sorted Array", "merge-sorted-array", 88, 4),
    ("Partition Labels", "partition-labels", 763, 4),
]


def seed():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        pattern = db.query(Pattern).filter_by(slug=PATTERN["slug"]).first()
        if not pattern:
            pattern = Pattern(**PATTERN)
            db.add(pattern)
            db.commit()
            db.refresh(pattern)
            print(f"Created pattern: {pattern.name}")
        else:
            print(f"Pattern already exists: {pattern.name}")

        existing_slugs = {
            p.leetcode_slug for p in db.query(Problem).filter_by(pattern_id=pattern.id).all()
        }

        added = 0
        for order, (title, slug, number, tier) in enumerate(PROBLEMS, start=1):
            if slug in existing_slugs:
                continue
            db.add(
                Problem(
                    pattern_id=pattern.id,
                    title=title,
                    leetcode_slug=slug,
                    leetcode_number=number,
                    tier=tier,
                    display_order=order,
                )
            )
            added += 1

        db.commit()
        print(f"Added {added} new problem(s). Total problems for this pattern now seeded.")
    finally:
        db.close()


if __name__ == "__main__":
    seed()
