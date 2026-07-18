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

**Core idea:** use two indices moving through an array/string/linked list based on a
condition, instead of nested loops — turns O(n^2) scans into O(n).

### Opposite Direction (Converging)
`left` starts at 0, `right` at n-1, they move toward each other.
Used for: sorted-array pair sums, palindrome checks, container/area problems.

### Same Direction (Slow-Fast)
Both start near 0; one moves every step, the other moves conditionally.
Used for: in-place compaction (dedupe, move zeroes), the backbone of Sliding Window.

### Fast-Slow on Linked Lists
Same idea, different speeds (1 step vs 2 steps) — cycle detection, finding the middle node.

### Decision framework
1. Sorted (or sortable without losing info)? -> opposite-direction.
2. Compacting/overwriting in place while scanning once? -> same-direction.
3. Linked list, need cycle/middle? -> fast-slow.
4. Looking for a subarray/substring meeting a condition? -> Sliding Window (related, not identical).
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
