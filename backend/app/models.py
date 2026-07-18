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

    pattern = relationship("Pattern", back_populates="problems")

    @property
    def leetcode_url(self) -> str:
        return f"https://leetcode.com/problems/{self.leetcode_slug}/"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True)
    email = Column(String(255), unique=True, nullable=False)
    auth_provider = Column(String(50), default="email")  # 'email' | 'github'
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class UserProgress(Base):
    __tablename__ = "user_progress"
    __table_args__ = (UniqueConstraint("user_id", "problem_id", name="uq_user_problem"),)

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    problem_id = Column(Integer, ForeignKey("problems.id", ondelete="CASCADE"), nullable=False)
    status = Column(String(20), default="not_started")  # 'not_started' | 'attempted' | 'solved'
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
