"""
Loads the complete DSA curriculum dataset from JSON + Frontend & SDE 1 tracks into the database.
Idempotent: safe to re-run locally or on production servers.

Usage:
    python -m app.seed_data
"""

import os
import json
from pathlib import Path
from app.db import Base, engine, SessionLocal
from app.models import Pattern, Problem, User
from app.routes.auth import hash_password

# Path to JSON curriculum dataset
CURRICULUM_JSON_PATH = Path(__file__).parent / "data" / "dsa_curriculum.json"

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


from app.db import init_db, SessionLocal, engine

def seed():
    init_db()
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

        # 2. Seed DSA Curriculum from dsa_curriculum.json
        if CURRICULUM_JSON_PATH.exists():
            # Delete existing DSA patterns and their problems to cleanly wipe previous data
            db.query(Pattern).filter(Pattern.track_category == "dsa").delete(synchronize_session=False)
            db.commit()

            with open(CURRICULUM_JSON_PATH, "r", encoding="utf-8") as f:
                dsa_patterns = json.load(f)

            for order, pat_data in enumerate(dsa_patterns, start=1):
                pattern = Pattern(
                    slug=pat_data["slug"],
                    name=pat_data["name"],
                    description=pat_data["description"],
                    revision_note_md=pat_data["revision_note_md"],
                    display_order=order,
                    track_category="dsa"
                )
                db.add(pattern)
                db.commit()
                db.refresh(pattern)
                print(f"Created DSA pattern: {pattern.name}")

                # Seed Problems for Pattern
                for prob_order, p_data in enumerate(pat_data.get("problems", []), start=1):
                    slug = p_data.get("leetcode_url", "").rstrip("/").split("/")[-1] or p_data["title"].lower().replace(" ", "-")
                    db.add(
                        Problem(
                            pattern_id=pattern.id,
                            title=p_data["title"],
                            leetcode_slug=slug,
                            leetcode_number=p_data.get("leetcode_number"),
                            tier=p_data.get("tier", 1),
                            display_order=prob_order,
                            guide_hints_json=p_data.get("guide_hints_json", "[]"),
                            guide_explanation=p_data.get("guide_explanation"),
                            guide_python=p_data.get("guide_python"),
                            guide_javascript=p_data.get("guide_javascript"),
                        )
                    )
                db.commit()
            print("Successfully seeded/updated DSA curriculum from dsa_curriculum.json.")

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
