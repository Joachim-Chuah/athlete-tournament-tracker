from __future__ import annotations
from datetime import datetime, timezone
from typing import Optional
from sqlalchemy import String, Float, Integer, DateTime, Enum as SAEnum, Index, ForeignKey
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from backend.database import Base

# Reference the enum Prisma already created — don't recreate it
subsidy_covers_type = SAEnum(
    "flights", "accommodation", "full_expenses", "flat_stipend",
    name="SubsidyCovers",
    create_type=False,
)


class User(Base):
    __tablename__ = "User"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    email: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String, nullable=False)
    home_country: Mapped[str] = mapped_column(String, nullable=False)
    home_currency: Mapped[str] = mapped_column(String, default="USD")
    sport: Mapped[str] = mapped_column(String, default="other")
    monthly_income: Mapped[float] = mapped_column(Float, default=0.0)
    savings_balance: Mapped[float] = mapped_column(Float, default=0.0)
    monthly_sponsorship: Mapped[float] = mapped_column(Float, default=0.0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    tournaments = relationship("Tournament", back_populates="user", cascade="all, delete-orphan")

    def to_dict(self):
        return {
            "id": self.id,
            "email": self.email,
            "name": self.name,
            "home_country": self.home_country,
            "home_currency": self.home_currency,
            "sport": self.sport,
            "monthly_income": self.monthly_income,
            "savings_balance": self.savings_balance,
            "monthly_sponsorship": self.monthly_sponsorship,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class Tournament(Base):
    __tablename__ = "Tournament"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    user_id: Mapped[str] = mapped_column(String, ForeignKey("User.id", ondelete="CASCADE"), nullable=False)
    name: Mapped[str] = mapped_column(String, nullable=False)
    location: Mapped[str] = mapped_column(String, nullable=False)
    country: Mapped[str] = mapped_column(String, nullable=False)
    currency: Mapped[str] = mapped_column(String, nullable=False)
    start_date: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    end_date: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    duration_days: Mapped[int] = mapped_column(Integer)
    entry_fee: Mapped[float] = mapped_column(Float, default=0.0)
    flight_cost: Mapped[float] = mapped_column(Float, default=0.0)
    accommodation_total: Mapped[float] = mapped_column(Float, default=0.0)
    daily_spending_cap: Mapped[float] = mapped_column(Float, default=0.0)
    coaching_cost: Mapped[float] = mapped_column(Float, default=0.0)
    misc_cost: Mapped[float] = mapped_column(Float, default=0.0)
    subsidy_by: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    subsidy_amount: Mapped[float] = mapped_column(Float, default=0.0)
    subsidy_covers = mapped_column(subsidy_covers_type, nullable=True)
    sponsorship_allocated: Mapped[float] = mapped_column(Float, default=0.0)
    prize_rounds: Mapped[dict] = mapped_column(JSONB, nullable=False, default={})
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    user = relationship("User", back_populates="tournaments")

    __table_args__ = (Index("Tournament_user_id_idx", "user_id"),)

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "name": self.name,
            "location": self.location,
            "country": self.country,
            "currency": self.currency,
            "start_date": self.start_date.isoformat() if self.start_date else None,
            "end_date": self.end_date.isoformat() if self.end_date else None,
            "duration_days": self.duration_days,
            "entry_fee": self.entry_fee,
            "flight_cost": self.flight_cost,
            "accommodation_total": self.accommodation_total,
            "daily_spending_cap": self.daily_spending_cap,
            "coaching_cost": self.coaching_cost,
            "misc_cost": self.misc_cost,
            "subsidy_by": self.subsidy_by,
            "subsidy_amount": self.subsidy_amount,
            "subsidy_covers": self.subsidy_covers,
            "sponsorship_allocated": self.sponsorship_allocated,
            "prize_rounds": self.prize_rounds,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


class KnownTournament(Base):
    __tablename__ = "KnownTournament"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    psa_id: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String, nullable=False)
    sport: Mapped[str] = mapped_column(String, default="squash")
    tier: Mapped[str] = mapped_column(String, nullable=False)
    level_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    location: Mapped[str] = mapped_column(String, nullable=False)
    country: Mapped[str] = mapped_column(String, nullable=False)
    country_code: Mapped[str] = mapped_column(String, nullable=False)
    currency: Mapped[str] = mapped_column(String, default="USD")
    start_date: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    end_date: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    duration_days: Mapped[int] = mapped_column(Integer, default=7)
    prize_total: Mapped[float] = mapped_column(Float, default=0.0)
    prize_rounds: Mapped[dict] = mapped_column(JSONB, nullable=False, default={})
    draw_size: Mapped[int] = mapped_column(Integer, default=32)
    gender: Mapped[str] = mapped_column(String, default="Open")
    source: Mapped[str] = mapped_column(String, default="psa")
    scraped_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    def to_dict(self):
        return {
            "id": self.psa_id,
            "name": self.name,
            "sport": self.sport,
            "tier": self.tier,
            "location": self.location,
            "country": self.country,
            "currency": self.currency,
            "typical_month": self.start_date.month if self.start_date else 6,
            "duration_days": self.duration_days,
            "prize_rounds": self.prize_rounds,
            "start_date": self.start_date.date().isoformat() if self.start_date else None,
            "end_date": self.end_date.date().isoformat() if self.end_date else None,
        }
