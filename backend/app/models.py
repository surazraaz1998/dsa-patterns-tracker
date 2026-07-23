from sqlalchemy import (
    Column,
    Integer,
    String,
    Text,
    ForeignKey,
    DateTime,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import relationship

from app.db import Base


class Pattern(Base):
    __tablename__ = "patterns"

    id = Column(Integer, primary_key=True)
    slug = Column(String(100), unique=True, nullable=False)  # 'two-pointer'
    name = Column(String(100), nullable=False)  # 'Two Pointer'
    description = Column(Text)
    revision_note_md = Column(Text)  # the markdown revision note, rendered client-side
    display_order = Column(Integer, default=0)
    track_category = Column(String(50), default="dsa", nullable=False)  # 'dsa' | 'frontend' | 'sde1'

    problems = relationship("Problem", back_populates="pattern", cascade="all, delete-orphan")


class Problem(Base):
    __tablename__ = "problems"

    id = Column(Integer, primary_key=True)
    pattern_id = Column(Integer, ForeignKey("patterns.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(200), nullable=False)  # 'Container With Most Water'
    leetcode_slug = Column(String(200))  # 'container-with-most-water'
    leetcode_number = Column(Integer)  # 11
    tier = Column(Integer, nullable=False)  # 1, 2, 3, 4
    notes_md = Column(Text)  # optional per-problem explanation
    display_order = Column(Integer, default=0)
    guide_hints_json = Column(Text, nullable=True)  # JSON encoded list of hints
    guide_explanation = Column(Text, nullable=True)
    guide_python = Column(Text, nullable=True)
    guide_javascript = Column(Text, nullable=True)

    pattern = relationship("Pattern", back_populates="problems")
    user_progress = relationship("UserProgress", back_populates="problem", cascade="all, delete-orphan")

    @property
    def leetcode_url(self) -> str:
        if not self.leetcode_slug:
            return "#"
        if self.leetcode_slug.startswith("http"):
            return self.leetcode_slug
        return f"https://leetcode.com/problems/{self.leetcode_slug}/"

    @property
    def guide(self) -> dict:
        import json
        hints = []
        if self.guide_hints_json:
            try:
                hints = json.loads(self.guide_hints_json)
            except Exception:
                hints = [self.guide_hints_json]
        return {
            "hints": hints or ["Read the problem statement carefully and identify the core pattern."],
            "explanation": self.guide_explanation or "Use a structured approach to break the problem into smaller steps before coding the solution.",
            "python": self.guide_python or "# Add a Python solution here",
            "javascript": self.guide_javascript or "// Add a JavaScript solution here",
        }


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True)
    username = Column(String(100), unique=True, nullable=False)
    email = Column(String(255), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=True)
    avatar_url = Column(String(500), nullable=True)
    github_username = Column(String(100), nullable=True)
    leetcode_username = Column(String(100), nullable=True)
    gfg_username = Column(String(100), nullable=True)
    auth_provider = Column(String(50), default="email")  # 'email' | 'github'
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    progress_entries = relationship("UserProgress", back_populates="user", cascade="all, delete-orphan")


class UserProgress(Base):
    __tablename__ = "user_progress"
    __table_args__ = (UniqueConstraint("user_id", "problem_id", name="uq_user_problem"),)

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    problem_id = Column(Integer, ForeignKey("problems.id", ondelete="CASCADE"), nullable=False)
    status = Column(String(20), default="not_started")  # 'not_started' | 'attempted' | 'solved'
    submitted_code = Column(Text, nullable=True)
    submitted_language = Column(String(50), nullable=True)
    last_submitted_at = Column(DateTime(timezone=True), nullable=True)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    user = relationship("User", back_populates="progress_entries")
    problem = relationship("Problem", back_populates="user_progress")


