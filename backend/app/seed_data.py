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

PROBLEM_GUIDES = {
    "Two Sum II - Input Array Is Sorted": {
        "hints": [
            "Because the array is sorted, use two pointers from both ends.",
            "Move the left pointer right when the sum is too small.",
            "Move the right pointer left when the sum is too large.",
        ],
        "explanation": "This is a classic two-pointer pattern on a sorted array. Keep one pointer at the start and one at the end, then adjust them based on whether the current sum is less than or greater than the target.",
        "python": "def two_sum_ii(nums, target):\n    left, right = 0, len(nums) - 1\n    while left < right:\n        total = nums[left] + nums[right]\n        if total == target:\n            return [left + 1, right + 1]\n        if total < target:\n            left += 1\n        else:\n            right -= 1\n    return []",
        "javascript": "function twoSumIi(nums, target) {\n  let left = 0;\n  let right = nums.length - 1;\n  while (left < right) {\n    const total = nums[left] + nums[right];\n    if (total === target) return [left + 1, right + 1];\n    if (total < target) left += 1;\n    else right -= 1;\n  }\n  return [];\n}",
    },
    "Valid Palindrome": {
        "hints": [
            "Ignore case and non-alphanumeric characters first.",
            "Compare characters from both ends inward.",
            "If they ever mismatch, the palindrome check fails.",
        ],
        "explanation": "Use two pointers that start at the beginning and end of the string. Skip irrelevant characters and compare the remaining letters until the pointers meet.",
        "python": "def is_palindrome(s):\n    left, right = 0, len(s) - 1\n    while left < right:\n        while left < right and not s[left].isalnum():\n            left += 1\n        while left < right and not s[right].isalnum():\n            right -= 1\n        if s[left].lower() != s[right].lower():\n            return False\n        left += 1\n        right -= 1\n    return True",
        "javascript": "function isPalindrome(s) {\n  let left = 0;\n  let right = s.length - 1;\n  while (left < right) {\n    while (left < right && !/^[a-z0-9]$/i.test(s[left])) left += 1;\n    while (left < right && !/^[a-z0-9]$/i.test(s[right])) right -= 1;\n    if (s[left].toLowerCase() !== s[right].toLowerCase()) return false;\n    left += 1;\n    right -= 1;\n  }\n  return true;\n}",
    },
    "Reverse String": {
        "hints": [
            "Swap characters from the outside inward.",
            "Use a left pointer and a right pointer.",
            "The loop should stop when the pointers cross.",
        ],
        "explanation": "This problem is a direct in-place two-pointer swap. Each iteration swaps the current left and right characters and moves the pointers inward.",
        "python": "def reverse_string(chars):\n    left, right = 0, len(chars) - 1\n    while left < right:\n        chars[left], chars[right] = chars[right], chars[left]\n        left += 1\n        right -= 1\n    return chars",
        "javascript": "function reverseString(chars) {\n  let left = 0;\n  let right = chars.length - 1;\n  while (left < right) {\n    [chars[left], chars[right]] = [chars[right], chars[left]];\n    left += 1;\n    right -= 1;\n  }\n  return chars;\n}",
    },
    "Move Zeroes": {
        "hints": [
            "Think of a write pointer and a scan pointer.",
            "Keep all non-zero values packed to the front.",
            "Fill the remaining spaces with zeroes at the end.",
        ],
        "explanation": "Use a slow pointer to mark the next write position and a fast pointer to scan the array. Every time you see a non-zero value, write it to the slow pointer and advance both.",
        "python": "def move_zeroes(nums):\n    write = 0\n    for read in range(len(nums)):\n        if nums[read] != 0:\n            nums[write] = nums[read]\n            write += 1\n    while write < len(nums):\n        nums[write] = 0\n        write += 1\n    return nums",
        "javascript": "function moveZeroes(nums) {\n  let write = 0;\n  for (let read = 0; read < nums.length; read += 1) {\n    if (nums[read] !== 0) {\n      nums[write] = nums[read];\n      write += 1;\n    }\n  }\n  while (write < nums.length) {\n    nums[write] = 0;\n    write += 1;\n  }\n  return nums;\n}",
    },
    "Remove Duplicates from Sorted Array": {
        "hints": [
            "Keep the next unique position in a slow pointer.",
            "Scan with a fast pointer and overwrite only when a new value appears.",
            "The array is sorted, so duplicates are adjacent.",
        ],
        "explanation": "Because the array is sorted, duplicates will appear next to each other. Use a slow pointer for the next unique slot and a fast pointer to scan the rest of the array.",
        "python": "def remove_duplicates(nums):\n    if not nums:\n        return 0\n    write = 1\n    for read in range(1, len(nums)):\n        if nums[read] != nums[write - 1]:\n            nums[write] = nums[read]\n            write += 1\n    return write",
        "javascript": "function removeDuplicates(nums) {\n  if (nums.length === 0) return 0;\n  let write = 1;\n  for (let read = 1; read < nums.length; read += 1) {\n    if (nums[read] !== nums[write - 1]) {\n      nums[write] = nums[read];\n      write += 1;\n    }\n  }\n  return write;\n}",
    },
    "Squares of a Sorted Array": {
        "hints": [
            "The largest square comes from the ends, not the middle.",
            "Use two pointers from both ends of the original array.",
            "Fill the result array from the back.",
        ],
        "explanation": "Because the input is sorted, the biggest squares are at the ends. Place the largest square into the result from the end and move inward.",
        "python": "def sorted_squares(nums):\n    result = [0] * len(nums)\n    left, right = 0, len(nums) - 1\n    index = len(nums) - 1\n    while left <= right:\n        if abs(nums[left]) > abs(nums[right]):\n            result[index] = nums[left] * nums[left]\n            left += 1\n        else:\n            result[index] = nums[right] * nums[right]\n            right -= 1\n        index -= 1\n    return result",
        "javascript": "function sortedSquares(nums) {\n  const result = new Array(nums.length).fill(0);\n  let left = 0;\n  let right = nums.length - 1;\n  let index = nums.length - 1;\n  while (left <= right) {\n    if (Math.abs(nums[left]) > Math.abs(nums[right])) {\n      result[index] = nums[left] * nums[left];\n      left += 1;\n    } else {\n      result[index] = nums[right] * nums[right];\n      right -= 1;\n    }\n    index -= 1;\n  }\n  return result;\n}",
    },
    "3Sum": {
        "hints": [
            "Sort the array first.",
            "Fix one value and run a standard two-pointer search for the rest.",
            "Skip duplicate values to avoid repeated triplets.",
        ],
        "explanation": "The idea is to fix one number and then solve a two-sum-style problem on the remaining sorted values. Use two pointers and skip duplicates to keep the solution efficient.",
        "python": "def three_sum(nums):\n    nums.sort()\n    result = []\n    for i in range(len(nums) - 2):\n        if i > 0 and nums[i] == nums[i - 1]:\n            continue\n        left, right = i + 1, len(nums) - 1\n        while left < right:\n            total = nums[i] + nums[left] + nums[right]\n            if total == 0:\n                result.append([nums[i], nums[left], nums[right]])\n                left += 1\n                right -= 1\n                while left < right and nums[left] == nums[left - 1]:\n                    left += 1\n            elif total < 0:\n                left += 1\n            else:\n                right -= 1\n    return result",
        "javascript": "function threeSum(nums) {\n  nums.sort((a, b) => a - b);\n  const result = [];\n  for (let i = 0; i < nums.length - 2; i += 1) {\n    if (i > 0 && nums[i] === nums[i - 1]) continue;\n    let left = i + 1;\n    let right = nums.length - 1;\n    while (left < right) {\n      const total = nums[i] + nums[left] + nums[right];\n      if (total === 0) {\n        result.push([nums[i], nums[left], nums[right]]);\n        left += 1;\n        right -= 1;\n        while (left < right && nums[left] === nums[left - 1]) left += 1;\n      } else if (total < 0) {\n        left += 1;\n      } else {\n        right -= 1;\n      }\n    }\n  }\n  return result;\n}",
    },
    "3Sum Closest": {
        "hints": [
            "Sort the values before applying the pointer scan.",
            "Track the closest sum seen so far.",
            "Move the pointers based on whether the current sum is too small or too large.",
        ],
        "explanation": "Fix one element and use two pointers to search for the sum closest to the target. The sorted order makes the pointer movement intuitive.",
        "python": "def three_sum_closest(nums, target):\n    nums.sort()\n    best = float('inf')\n    for i in range(len(nums) - 2):\n        left, right = i + 1, len(nums) - 1\n        while left < right:\n            total = nums[i] + nums[left] + nums[right]\n            if abs(total - target) < abs(best - target):\n                best = total\n            if total < target:\n                left += 1\n            else:\n                right -= 1\n    return best",
        "javascript": "function threeSumClosest(nums, target) {\n  nums.sort((a, b) => a - b);\n  let best = Infinity;\n  for (let i = 0; i < nums.length - 2; i += 1) {\n    let left = i + 1;\n    let right = nums.length - 1;\n    while (left < right) {\n      const total = nums[i] + nums[left] + nums[right];\n      if (Math.abs(total - target) < Math.abs(best - target)) best = total;\n      if (total < target) left += 1;\n      else right -= 1;\n    }\n  }\n  return best;\n}",
    },
    "Container With Most Water": {
        "hints": [
            "Use the widest lines first and shrink from the shorter side.",
            "The height of the water is limited by the shorter line.",
            "Move the pointer on the shorter side because it is the limiting factor.",
        ],
        "explanation": "This is a classic two-pointer greedy problem. The maximum area is found by moving the lower-height pointer, because increasing the taller side cannot improve the area with the current shorter side.",
        "python": "def max_area(height):\n    left, right = 0, len(height) - 1\n    best = 0\n    while left < right:\n        area = min(height[left], height[right]) * (right - left)\n        best = max(best, area)\n        if height[left] < height[right]:\n            left += 1\n        else:\n            right -= 1\n    return best",
        "javascript": "function maxArea(height) {\n  let left = 0;\n  let right = height.length - 1;\n  let best = 0;\n  while (left < right) {\n    const area = Math.min(height[left], height[right]) * (right - left);\n    best = Math.max(best, area);\n    if (height[left] < height[right]) left += 1;\n    else right -= 1;\n  }\n  return best;\n}",
    },
    "Sort Colors": {
        "hints": [
            "Use three pointers: one for the next red, one for the next white, and one for the end.",
            "The Dutch national flag approach is perfect here.",
            "Keep swapping values until the middle region is fully processed.",
        ],
        "explanation": "This problem is solved with a three-way partition. The pointers separate the array into red, white, and blue sections in a single pass.",
        "python": "def sort_colors(nums):\n    red, white, blue = 0, 0, len(nums) - 1\n    while white <= blue:\n        if nums[white] == 0:\n            nums[red], nums[white] = nums[white], nums[red]\n            red += 1\n            white += 1\n        elif nums[white] == 1:\n            white += 1\n        else:\n            nums[white], nums[blue] = nums[blue], nums[white]\n            blue -= 1",
        "javascript": "function sortColors(nums) {\n  let red = 0;\n  let white = 0;\n  let blue = nums.length - 1;\n  while (white <= blue) {\n    if (nums[white] === 0) {\n      [nums[red], nums[white]] = [nums[white], nums[red]];\n      red += 1;\n      white += 1;\n    } else if (nums[white] === 1) {\n      white += 1;\n    } else {\n      [nums[white], nums[blue]] = [nums[blue], nums[white]];\n      blue -= 1;\n    }\n  }\n  return nums;\n}",
    },
    "Remove Duplicates from Sorted Array II": {
        "hints": [
            "Allow at most two copies of each value.",
            "Use a write pointer and scan the rest of the array.",
            "Use the sorted order to detect duplicates quickly.",
        ],
        "explanation": "This follows the same idea as removing duplicates, but you keep up to two occurrences of each value instead of one. The slow pointer writes the next valid slot while the fast pointer scans.",
        "python": "def remove_duplicates_two(nums):\n    if len(nums) <= 2:\n        return len(nums)\n    write = 2\n    for read in range(2, len(nums)):\n        if nums[read] != nums[write - 2]:\n            nums[write] = nums[read]\n            write += 1\n    return write",
        "javascript": "function removeDuplicatesTwo(nums) {\n  if (nums.length <= 2) return nums.length;\n  let write = 2;\n  for (let read = 2; read < nums.length; read += 1) {\n    if (nums[read] !== nums[write - 2]) {\n      nums[write] = nums[read];\n      write += 1;\n    }\n  }\n  return write;\n}",
    },
    "Linked List Cycle": {
        "hints": [
            "Use a slow pointer and a fast pointer.",
            "If the fast pointer reaches the end, there is no cycle.",
            "If they meet, the list has a cycle.",
        ],
        "explanation": "This is the classic Floyd cycle detection technique. A slow pointer moves one node at a time, while a fast pointer moves two nodes at a time.",
        "python": "def has_cycle(head):\n    slow = head\n    fast = head\n    while fast and fast.next:\n        slow = slow.next\n        fast = fast.next.next\n        if slow == fast:\n            return True\n    return False",
        "javascript": "function hasCycle(head) {\n  let slow = head;\n  let fast = head;\n  while (fast && fast.next) {\n    slow = slow.next;\n    fast = fast.next.next;\n    if (slow === fast) return true;\n  }\n  return false;\n}",
    },
    "Middle of the Linked List": {
        "hints": [
            "Use a slow pointer and a fast pointer.",
            "The fast pointer should move twice as fast as the slow pointer.",
            "When the fast pointer reaches the end, the slow pointer is in the middle.",
        ],
        "explanation": "The slow-fast pattern also solves the linked-list middle-node problem. By the time the fast pointer reaches the end, the slow pointer has advanced half as far.",
        "python": "def middle_node(head):\n    slow = head\n    fast = head\n    while fast and fast.next:\n        slow = slow.next\n        fast = fast.next.next\n    return slow",
        "javascript": "function middleNode(head) {\n  let slow = head;\n  let fast = head;\n  while (fast && fast.next) {\n    slow = slow.next;\n    fast = fast.next.next;\n  }\n  return slow;\n}",
    },
    "Trapping Rain Water": {
        "hints": [
            "Think in terms of left and right boundaries.",
            "The trapped water is limited by the shorter boundary.",
            "Move the pointer that points to the smaller height.",
        ],
        "explanation": "The water trapped at a position is limited by the shorter of the left and right boundary. Two pointers are efficient because they avoid checking every pair of bars.",
        "python": "def trap(height):\n    left, right = 0, len(height) - 1\n    left_max = right_max = 0\n    water = 0\n    while left < right:\n        if height[left] <= height[right]:\n            if height[left] >= left_max:\n                left_max = height[left]\n            else:\n                water += left_max - height[left]\n            left += 1\n        else:\n            if height[right] >= right_max:\n                right_max = height[right]\n            else:\n                water += right_max - height[right]\n            right -= 1\n    return water",
        "javascript": "function trap(height) {\n  let left = 0;\n  let right = height.length - 1;\n  let leftMax = 0;\n  let rightMax = 0;\n  let water = 0;\n  while (left < right) {\n    if (height[left] <= height[right]) {\n      if (height[left] >= leftMax) leftMax = height[left];\n      else water += leftMax - height[left];\n      left += 1;\n    } else {\n      if (height[right] >= rightMax) rightMax = height[right];\n      else water += rightMax - height[right];\n      right -= 1;\n    }\n  }\n  return water;\n}",
    },
    "4Sum": {
        "hints": [
            "Sort the array first.",
            "Fix two values and use two pointers for the remaining pair.",
            "Skip duplicates to avoid duplicate quadruplets.",
        ],
        "explanation": "4Sum builds on the 3Sum idea. Fix two numbers and then use two pointers to find the remaining pair that reaches the target.",
        "python": "def four_sum(nums, target):\n    nums.sort()\n    result = []\n    n = len(nums)\n    for i in range(n - 3):\n        if i > 0 and nums[i] == nums[i - 1]:\n            continue\n        for j in range(i + 1, n - 2):\n            if j > i + 1 and nums[j] == nums[j - 1]:\n                continue\n            left, right = j + 1, n - 1\n            while left < right:\n                total = nums[i] + nums[j] + nums[left] + nums[right]\n                if total == target:\n                    result.append([nums[i], nums[j], nums[left], nums[right]])\n                    left += 1\n                    right -= 1\n                    while left < right and nums[left] == nums[left - 1]:\n                        left += 1\n                elif total < target:\n                    left += 1\n                else:\n                    right -= 1\n    return result",
        "javascript": "function fourSum(nums, target) {\n  nums.sort((a, b) => a - b);\n  const result = [];\n  const n = nums.length;\n  for (let i = 0; i < n - 3; i += 1) {\n    if (i > 0 && nums[i] === nums[i - 1]) continue;\n    for (let j = i + 1; j < n - 2; j += 1) {\n      if (j > i + 1 && nums[j] === nums[j - 1]) continue;\n      let left = j + 1;\n      let right = n - 1;\n      while (left < right) {\n        const total = nums[i] + nums[j] + nums[left] + nums[right];\n        if (total === target) {\n          result.push([nums[i], nums[j], nums[left], nums[right]]);\n          left += 1;\n          right -= 1;\n          while (left < right && nums[left] === nums[left - 1]) left += 1;\n        } else if (total < target) {\n          left += 1;\n        } else {\n          right -= 1;\n        }\n      }\n    }\n  }\n  return result;\n}",
    },
    "Linked List Cycle II": {
        "hints": [
            "Use the slow-fast approach again.",
            "Once the pointers meet, move one pointer to the head and keep the other at the meeting point.",
            "Walk them together and the meeting point is the cycle start.",
        ],
        "explanation": "This is the advanced version of cycle detection. After the slow and fast pointers meet, reset one pointer to the head and move both one step at a time to find the entry point of the cycle.",
        "python": "def detect_cycle(head):\n    slow = fast = head\n    while fast and fast.next:\n        slow = slow.next\n        fast = fast.next.next\n        if slow == fast:\n            break\n    else:\n        return None\n    slow = head\n    while slow != fast:\n        slow = slow.next\n        fast = fast.next\n    return slow",
        "javascript": "function detectCycle(head) {\n  let slow = head;\n  let fast = head;\n  while (fast && fast.next) {\n    slow = slow.next;\n    fast = fast.next.next;\n    if (slow === fast) break;\n  }\n  if (!fast || !fast.next) return null;\n  slow = head;\n  while (slow !== fast) {\n    slow = slow.next;\n    fast = fast.next;\n  }\n  return slow;\n}",
    },
    "Backspace String Compare": {
        "hints": [
            "Process the strings from the end back to the start.",
            "Use a backspace counter and skip characters as needed.",
            "Compare the final meaningful characters.",
        ],
        "explanation": "A two-pointer scan from the end allows you to handle backspaces naturally. Each time you see a backspace, skip the preceding character and continue.",
        "python": "def backspace_compare(s, t):\n    def build(chars):\n        skip = 0\n        for i in range(len(chars) - 1, -1, -1):\n            if chars[i] == '#':\n                skip += 1\n            elif skip:\n                skip -= 1\n            else:\n                yield chars[i]\n    return list(build(s)) == list(build(t))",
        "javascript": "function backspaceCompare(s, t) {\n  const build = (chars) => {\n    const result = [];\n    let skip = 0;\n    for (let i = chars.length - 1; i >= 0; i -= 1) {\n      if (chars[i] === '#') skip += 1;\n      else if (skip > 0) skip -= 1;\n      else result.push(chars[i]);\n    }\n    return result;\n  };\n  return build(s).join('') === build(t).join('');\n}",
    },
    "Sort Transformed Array": {
        "hints": [
            "The transformed values are monotonic in one direction.",
            "Use two pointers at the ends and fill the result from the back.",
            "Choose the larger transformed value at each step.",
        ],
        "explanation": "This problem is often solved by combining the sorted input with a two-pointer fill from the end. The result can be built in linear time once the transformation direction is known.",
        "python": "def sort_transformed_array(nums, a, b, c):\n    result = [0] * len(nums)\n    left, right = 0, len(nums) - 1\n    index = len(nums) - 1\n    while left <= right:\n        left_val = a * nums[left] * nums[left] + b * nums[left] + c\n        right_val = a * nums[right] * nums[right] + b * nums[right] + c\n        if left_val >= right_val:\n            result[index] = left_val\n            left += 1\n        else:\n            result[index] = right_val\n            right -= 1\n        index -= 1\n    return result",
        "javascript": "function sortTransformedArray(nums, a, b, c) {\n  const result = new Array(nums.length).fill(0);\n  let left = 0;\n  let right = nums.length - 1;\n  let index = nums.length - 1;\n  while (left <= right) {\n    const leftVal = a * nums[left] * nums[left] + b * nums[left] + c;\n    const rightVal = a * nums[right] * nums[right] + b * nums[right] + c;\n    if (leftVal >= rightVal) {\n      result[index] = leftVal;\n      left += 1;\n    } else {\n      result[index] = rightVal;\n      right -= 1;\n    }\n    index -= 1;\n  }\n  return result;\n}",
    },
    "Boats to Save People": {
        "hints": [
            "Sort the people and use two pointers.",
            "Pair the lightest with the heaviest when possible.",
            "The goal is to minimize the number of boats used.",
        ],
        "explanation": "After sorting, use one pointer at the start and one at the end. Try to place the heaviest person with the lightest person when they fit together.",
        "python": "def num_boats(people, limit):\n    people.sort()\n    left, right = 0, len(people) - 1\n    boats = 0\n    while left <= right:\n        if people[left] + people[right] <= limit:\n            left += 1\n        right -= 1\n        boats += 1\n    return boats",
        "javascript": "function numBoats(people, limit) {\n  people.sort((a, b) => a - b);\n  let left = 0;\n  let right = people.length - 1;\n  let boats = 0;\n  while (left <= right) {\n    if (people[left] + people[right] <= limit) left += 1;\n    right -= 1;\n    boats += 1;\n  }\n  return boats;\n}",
    },
    "Minimum Size Subarray Sum": {
        "hints": [
            "Use a sliding window with two pointers.",
            "Expand the right boundary and shrink the left boundary when the sum is too large.",
            "Track the smallest valid window.",
        ],
        "explanation": "This is a sliding window problem that uses two pointers. The right pointer grows the window, and the left pointer shrinks it when the running sum becomes too large.",
        "python": "def min_subarray_len(target, nums):\n    left = 0\n    total = 0\n    best = float('inf')\n    for right, value in enumerate(nums):\n        total += value\n        while total >= target:\n            best = min(best, right - left + 1)\n            total -= nums[left]\n            left += 1\n    return 0 if best == float('inf') else best",
        "javascript": "function minSubarrayLen(target, nums) {\n  let left = 0;\n  let total = 0;\n  let best = Infinity;\n  for (let right = 0; right < nums.length; right += 1) {\n    total += nums[right];\n    while (total >= target) {\n      best = Math.min(best, right - left + 1);\n      total -= nums[left];\n      left += 1;\n    }\n  }\n  return best === Infinity ? 0 : best;\n}",
    },
    "Longest Duplicate Substring": {
        "hints": [
            "This one is more advanced than the base pattern.",
            "Think about a rolling hash or binary search over substring length.",
            "The primary challenge is finding the longest repeated substring efficiently.",
        ],
        "explanation": "This problem is not a plain two-pointer solution, but it is a good advanced exercise in using efficient scanning and search strategies. The core idea is to test candidate substring lengths and find repeated patterns quickly.",
        "python": "def longest_duplicate_substring(s):\n    # This is a classic advanced problem that usually uses hashing or suffix arrays.\n    return s",
        "javascript": "function longestDuplicateSubstring(s) {\n  // This is a classic advanced problem that usually uses hashing or suffix arrays.\n  return s;\n}",
    },
    "Palindrome Partitioning": {
        "hints": [
            "Use backtracking and check palindromic prefixes.",
            "Try cutting the string at every possible point.",
            "Prune early when the current partition is invalid.",
        ],
        "explanation": "This problem is solved with depth-first search over the string. At each step, try to split the remaining substring into palindromic pieces and recurse.",
        "python": "def partition(s):\n    result = []\n    def dfs(path, start):\n        if start == len(s):\n            result.append(path.copy())\n            return\n        for end in range(start + 1, len(s) + 1):\n            if s[start:end] == s[start:end][::-1]:\n                path.append(s[start:end])\n                dfs(path, end)\n                path.pop()\n    dfs([], 0)\n    return result",
        "javascript": "function partition(s) {\n  const result = [];\n  const dfs = (path, start) => {\n    if (start === s.length) {\n      result.push([...path]);\n      return;\n    }\n    for (let end = start + 1; end <= s.length; end += 1) {\n      const part = s.slice(start, end);\n      if (part === part.split('').reverse().join('')) {\n        path.push(part);\n        dfs(path, end);\n        path.pop();\n      }\n    }\n  };\n  dfs([], 0);\n  return result;\n}",
    },
    "Merge Sorted Array": {
        "hints": [
            "Work from the end of both arrays.",
            "Build the merged array in place.",
            "Avoid shifting values unnecessarily.",
        ],
        "explanation": "This is a merge-style problem that relies on the fact that both arrays are sorted. Fill the result from the end so you can overwrite in place without extra memory.",
        "python": "def merge_sorted(nums1, m, nums2, n):\n    i, j, k = m - 1, n - 1, m + n - 1\n    while i >= 0 and j >= 0:\n        if nums1[i] > nums2[j]:\n            nums1[k] = nums1[i]\n            i -= 1\n        else:\n            nums1[k] = nums2[j]\n            j -= 1\n        k -= 1\n    while j >= 0:\n        nums1[k] = nums2[j]\n        j -= 1\n        k -= 1\n    return nums1",
        "javascript": "function mergeSorted(nums1, m, nums2, n) {\n  let i = m - 1;\n  let j = n - 1;\n  let k = m + n - 1;\n  while (i >= 0 && j >= 0) {\n    if (nums1[i] > nums2[j]) {\n      nums1[k] = nums1[i];\n      i -= 1;\n    } else {\n      nums1[k] = nums2[j];\n      j -= 1;\n    }\n    k -= 1;\n  }\n  while (j >= 0) {\n    nums1[k] = nums2[j];\n    j -= 1;\n    k -= 1;\n  }\n  return nums1;\n}",
    },
    "Partition Labels": {
        "hints": [
            "Track the last index of each character.",
            "Cut the string when the current scan reaches the farthest last index.",
            "Break the string into maximal valid partitions.",
        ],
        "explanation": "This problem is solved by scanning the string once and tracking where each character last appears. A partition ends when the current index reaches the farthest last occurrence seen so far.",
        "python": "def partition_labels(s):\n    last = {ch: i for i, ch in enumerate(s)}\n    result = []\n    start = end = 0\n    for i, ch in enumerate(s):\n        end = max(end, last[ch])\n        if i == end:\n            result.append(end - start + 1)\n            start = i + 1\n    return result",
        "javascript": "function partitionLabels(s) {\n  const last = {};\n  for (let i = 0; i < s.length; i += 1) last[s[i]] = i;\n  const result = [];\n  let start = 0;\n  let end = 0;\n  for (let i = 0; i < s.length; i += 1) {\n    end = Math.max(end, last[s[i]]);\n    if (i === end) {\n      result.push(end - start + 1);\n      start = i + 1;\n    }\n  }\n  return result;\n}",
    },
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

EXTRA_TRACKS_SEED = [
    {
        "slug": "debounce-throttle",
        "name": "Debounce & Throttle Implementation",
        "description": "Master rate-limiting UI helper functions commonly asked in frontend machine coding rounds.",
        "track_category": "frontend",
        "revision_note_md": "## Debounce & Throttle Patterns\n\n- **Debounce**: Delays execution of a function until after a specific wait time has elapsed since the last time it was invoked.\n- **Throttle**: Ensures a function is called at most once in a specified time window.\n\n### Use Cases\n- Search auto-complete inputs -> **Debounce**\n- Window resize / scroll listeners -> **Throttle**",
        "problems_by_tier": {
            1: [
                {
                    "id": 101,
                    "title": "Implement basic debounce() function",
                    "leetcode_url": "https://leetcode.com/problems/debounce/",
                    "leetcode_number": 2627,
                    "guide": {
                        "hints": [
                            "Use setTimeout and clearTimeout inside a closure.",
                            "Cancel the previous timer whenever a new call comes in before the delay finishes."
                        ],
                        "explanation": "Return a wrapper function that clears the pending timer and sets a new timer every time it is invoked.",
                        "python": "# Python decorator implementation\nimport threading\n\ndef debounce(wait):\n    def decorator(fn):\n        timer = None\n        def debounced(*args, **kwargs):\n            nonlocal timer\n            if timer:\n                timer.cancel()\n            timer = threading.Timer(wait, fn, args, kwargs)\n            timer.start()\n        return debounced\n    return decorator",
                        "javascript": "function debounce(fn, t) {\n  let timer;\n  return function(...args) {\n    clearTimeout(timer);\n    timer = setTimeout(() => fn.apply(this, args), t);\n  };\n}"
                    }
                },
                {
                    "id": 102,
                    "title": "Implement throttle() with leading and trailing options",
                    "leetcode_url": "https://leetcode.com/problems/throttle/",
                    "leetcode_number": 2676,
                    "guide": {
                        "hints": [
                            "Track the last execution timestamp or use a flag to defer execution.",
                            "Handle leading calls immediately and trailing calls after the interval."
                        ],
                        "explanation": "Use a timestamp check or a boolean lock to limit execution frequency.",
                        "python": "# Python throttle class\nimport time\nclass Throttle:\n    def __init__(self, interval):\n        self.interval = interval\n        self.last_run = 0\n    def __call__(self, fn, *args):\n        now = time.time()\n        if now - self.last_run >= self.interval:\n            self.last_run = now\n            return fn(*args)",
                        "javascript": "function throttle(fn, t) {\n  let timer = null;\n  let nextArgs = null;\n  return function helper(...args) {\n    if (timer) {\n      nextArgs = args;\n    } else {\n      fn(...args);\n      timer = setTimeout(() => {\n        timer = null;\n        if (nextArgs) {\n          helper(...nextArgs);\n          nextArgs = null;\n        }\n      }, t);\n    }\n  };\n}"
                    }
                }
            ],
            2: [
                {
                    "id": 103,
                    "title": "Build a Live Search Input with Debounced API Calls",
                    "leetcode_url": "https://github.com/topics/frontend-machine-coding",
                    "leetcode_number": None,
                    "guide": {
                        "hints": [
                            "Combine input state with useEffect or custom hook useDebounce.",
                            "Handle API response cancellation to prevent race conditions."
                        ],
                        "explanation": "Create a `useDebounce` hook that yields the debounced search term to trigger API fetches safely.",
                        "python": "# Backend mock for live search endpoint",
                        "javascript": "function useDebounce(value, delay) {\n  const [debouncedValue, setDebouncedValue] = useState(value);\n  useEffect(() => {\n    const handler = setTimeout(() => setDebouncedValue(value), delay);\n    return () => clearTimeout(handler);\n  }, [value, delay]);\n  return debouncedValue;\n}"
                    }
                }
            ]
        }
    },
    {
        "slug": "custom-promises-async",
        "name": "Custom Promises & Async Utilities",
        "description": "Build Promise.all, Promise.race, async queue, and custom event emitters from scratch.",
        "track_category": "frontend",
        "revision_note_md": "## Async Utilities & Promise Polyfills\n\nUnderstanding how microtasks, Promises, and event loops work under the hood is critical for senior frontend rounds.",
        "problems_by_tier": {
            1: [
                {
                    "id": 104,
                    "title": "Implement Promise.all Polyfill",
                    "leetcode_url": "https://leetcode.com/problems/execute-asynchronous-functions-in-parallel/",
                    "leetcode_number": 2721,
                    "guide": {
                        "hints": [
                            "Track resolved count and result array by index.",
                            "Reject immediately on the first promise failure."
                        ],
                        "explanation": "Iterate through input functions/promises, executing each and waiting for all to resolve before resolving the overall promise.",
                        "python": "import asyncio\nasync def promise_all(futures):\n    return await asyncio.gather(*futures)",
                        "javascript": "function promiseAll(functions) {\n  return new Promise((resolve, reject) => {\n    const results = new Array(functions.length);\n    let count = 0;\n    functions.forEach((fn, i) => {\n      fn().then(res => {\n        results[i] = res;\n        count++;\n        if (count === functions.length) resolve(results);\n      }).catch(reject);\n    });\n  });\n}"
                    }
                }
            ]
        }
    },
    {
        "slug": "system-design-sde1",
        "name": "SDE 1 System Design & Architecture",
        "description": "Essential architectural patterns, load balancing, caching strategies, and database indexing for SDE 1 interviews.",
        "track_category": "sde1",
        "revision_note_md": "## SDE 1 System Design Fundamentals\n\n- **Client-Server Architecture**: HTTP/HTTPS, REST APIs, WebSockets, gRPC.\n- **Scalability**: Vertical vs Horizontal scaling, Load Balancers (Round Robin, Least Connections).\n- **Caching**: Redis, Memcached, eviction policies (LRU, LFU).\n- **Databases**: SQL vs NoSQL, Indexing (B-Tree), Normalization vs Denormalization.",
        "problems_by_tier": {
            1: [
                {
                    "id": 201,
                    "title": "Design a URL Shortener Service (TinyURL)",
                    "leetcode_url": "https://leetcode.com/problems/encode-and-decode-tinyurl/",
                    "leetcode_number": 535,
                    "guide": {
                        "hints": [
                            "Use Base62 encoding (a-z, A-Z, 0-9) to convert auto-increment IDs into short codes.",
                            "Use Redis caching for high-frequency reads."
                        ],
                        "explanation": "Map long URLs to unique 6-character short strings using Base62 encoding or hash collision handling.",
                        "python": "import string\nchars = string.ascii_letters + string.digits\ndef encode_id(n):\n    res = []\n    while n > 0:\n        res.append(chars[n % 62])\n        n //= 62\n    return ''.join(reversed(res))",
                        "javascript": "class Codec {\n  constructor() {\n    this.codeToUrl = new Map();\n    this.urlToCode = new Map();\n    this.chars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';\n  }\n  encode(longUrl) {\n    if (this.urlToCode.has(longUrl)) return 'http://tinyurl.com/' + this.urlToCode.get(longUrl);\n    let code = Array.from({length: 6}, () => this.chars[Math.floor(Math.random() * 62)]).join('');\n    this.codeToUrl.set(code, longUrl);\n    this.urlToCode.set(longUrl, code);\n    return 'http://tinyurl.com/' + code;\n  }\n}"
                    }
                },
                {
                    "id": 202,
                    "title": "Design an In-Memory LRU Cache Data Structure",
                    "leetcode_url": "https://leetcode.com/problems/lru-cache/",
                    "leetcode_number": 146,
                    "guide": {
                        "hints": [
                            "Combine a HashMap (O(1) lookup) with a Doubly Linked List (O(1) node removal and insertion).",
                            "Move accessed items to the head of the list; evict from the tail when capacity is full."
                        ],
                        "explanation": "HashMap maps key -> Node in DLL. DLL maintains usage order.",
                        "python": "from collections import OrderedDict\nclass LRUCache:\n    def __init__(self, capacity: int):\n        self.cache = OrderedDict()\n        self.cap = capacity\n    def get(self, key: int) -> int:\n        if key not in self.cache:\n            return -1\n        self.cache.move_to_end(key)\n        return self.cache[key]\n    def put(self, key: int, value: int) -> None:\n        if key in self.cache:\n            self.cache.move_to_end(key)\n        self.cache[key] = value\n        if len(self.cache) > self.cap:\n            self.cache.popitem(last=False)",
                        "javascript": "class LRUCache {\n  constructor(capacity) {\n    this.capacity = capacity;\n    this.map = new Map();\n  }\n  get(key) {\n    if (!this.map.has(key)) return -1;\n    const val = this.map.get(key);\n    this.map.delete(key);\n    this.map.set(key, val);\n    return val;\n  }\n  put(key, value) {\n    if (this.map.has(key)) this.map.delete(key);\n    this.map.set(key, value);\n    if (this.map.size > this.capacity) {\n      const firstKey = this.map.keys().next().value;\n      this.map.delete(firstKey);\n    }\n  }\n}"
                    }
                }
            ]
        }
    }
]


def seed():
    from app.models import User
    from app.routes.auth import hash_password

    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        # 1. Seed Pre-created Admin User
        admin = db.query(User).filter((User.username == "Admin") | (User.email == "admin@dsatracker.com")).first()
        if not admin:
            admin_pass_hash = hash_password("Suraz@1998")
            admin = User(
                username="Admin",
                email="admin@dsatracker.com",
                password_hash=admin_pass_hash,
                avatar_url="https://api.dicebear.com/7.x/bottts/svg?seed=Admin",
                auth_provider="email"
            )
            db.add(admin)
            db.commit()
            print("Created pre-seeded Admin user (username: Admin, password: Suraz@1998)")
        else:
            print("Admin user already exists in DB.")

        # 2. Seed DSA Track Pattern
        pattern = db.query(Pattern).filter_by(slug=PATTERN["slug"]).first()
        if not pattern:
            pattern = Pattern(
                slug=PATTERN["slug"],
                name=PATTERN["name"],
                description=PATTERN["description"],
                revision_note_md=PATTERN["revision_note_md"],
                display_order=PATTERN["display_order"],
                track_category="dsa"
            )
            db.add(pattern)
            db.commit()
            db.refresh(pattern)
            print(f"Created DSA pattern: {pattern.name}")
        else:
            print(f"DSA Pattern already exists: {pattern.name}")

        existing_slugs = {
            p.leetcode_slug for p in db.query(Problem).filter_by(pattern_id=pattern.id).all()
        }

        import json
        added = 0
        for order, (title, slug, number, tier) in enumerate(PROBLEMS, start=1):
            guide_info = PROBLEM_GUIDES.get(title, {})
            existing_p = db.query(Problem).filter_by(pattern_id=pattern.id, title=title).first()
            if not existing_p:
                db.add(
                    Problem(
                        pattern_id=pattern.id,
                        title=title,
                        leetcode_slug=slug,
                        leetcode_number=number,
                        tier=tier,
                        display_order=order,
                        guide_hints_json=json.dumps(guide_info.get("hints", [])),
                        guide_explanation=guide_info.get("explanation"),
                        guide_python=guide_info.get("python"),
                        guide_javascript=guide_info.get("javascript"),
                    )
                )
                added += 1
            else:
                # Update existing problem rows to ensure guide columns are populated in DB
                existing_p.guide_hints_json = json.dumps(guide_info.get("hints", []))
                existing_p.guide_explanation = guide_info.get("explanation")
                existing_p.guide_python = guide_info.get("python")
                existing_p.guide_javascript = guide_info.get("javascript")

        db.commit()
        print(f"Added/Updated {added} problem(s) with DB guide columns to DSA pattern.")

        # 3. Seed Extra Tracks (Frontend Machine Coding & SDE 1)
        for extra in EXTRA_TRACKS_SEED:
            p_obj = db.query(Pattern).filter_by(slug=extra["slug"]).first()
            if not p_obj:
                p_obj = Pattern(
                    slug=extra["slug"],
                    name=extra["name"],
                    description=extra["description"],
                    revision_note_md=extra["revision_note_md"],
                    track_category=extra["track_category"],
                    display_order=10
                )
                db.add(p_obj)
                db.commit()
                db.refresh(p_obj)
                print(f"Created extra track pattern: {p_obj.name} [{p_obj.track_category}]")

            for tier, prob_list in extra["problems_by_tier"].items():
                for p_data in prob_list:
                    guide_info = p_data.get("guide", {})
                    existing_p = db.query(Problem).filter_by(pattern_id=p_obj.id, title=p_data["title"]).first()
                    if not existing_p:
                        db.add(
                            Problem(
                                pattern_id=p_obj.id,
                                title=p_data["title"],
                                leetcode_slug=p_data["leetcode_url"],
                                leetcode_number=p_data["leetcode_number"],
                                tier=tier,
                                display_order=p_data["id"],
                                guide_hints_json=json.dumps(guide_info.get("hints", [])),
                                guide_explanation=guide_info.get("explanation"),
                                guide_python=guide_info.get("python"),
                                guide_javascript=guide_info.get("javascript"),
                            )
                        )
                    else:
                        existing_p.guide_hints_json = json.dumps(guide_info.get("hints", []))
                        existing_p.guide_explanation = guide_info.get("explanation")
                        existing_p.guide_python = guide_info.get("python")
                        existing_p.guide_javascript = guide_info.get("javascript")
            db.commit()

    finally:
        db.close()


if __name__ == "__main__":
    seed()

