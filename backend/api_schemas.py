"""Pydantic models that define the versioned public API contract."""

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


RoundKey = Literal["r1", "r2", "r3", "qf", "sf", "f", "w"]
SubsidyCovers = Literal["flights", "accommodation", "full_expenses", "flat_stipend"]


class ContractModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class ErrorResponse(ContractModel):
    error: str


class Health(ContractModel):
    status: Literal["ok"]


class ProfileRequest(ContractModel):
    name: str
    home_country: str
    home_currency: str = Field(min_length=3, max_length=3)
    sport: str
    email: str | None = None
    monthly_income: float = 0
    savings_balance: float = 0
    monthly_sponsorship: float = 0


class Profile(ContractModel):
    id: str
    email: str
    name: str
    home_country: str
    home_currency: str
    sport: str
    monthly_income: float
    savings_balance: float
    monthly_sponsorship: float
    created_at: str
    runway_tournaments: int | None = None


class PrizeRounds(ContractModel):
    r1: float | None = Field(default=None, ge=0)
    r2: float | None = Field(default=None, ge=0)
    r3: float | None = Field(default=None, ge=0)
    qf: float | None = Field(default=None, ge=0)
    sf: float | None = Field(default=None, ge=0)
    f: float | None = Field(default=None, ge=0)
    w: float | None = Field(default=None, ge=0)


class PnlScenario(ContractModel):
    scenario: Literal["worst", "realistic", "best"]
    round: RoundKey
    prize_money: float
    prize_money_after_tax: float
    net_result: float
    profitable: bool


class PnlResult(ContractModel):
    total_expenses: float
    total_income_base: float
    scenarios: list[PnlScenario]
    break_even_round: RoundKey | None


class TournamentInput(ContractModel):
    name: str | None = None
    location: str | None = None
    country: str | None = None
    currency: str | None = None
    start_date: str | None = None
    end_date: str | None = None
    duration_days: int | None = Field(default=None, ge=1)
    entry_fee: float | None = Field(default=None, ge=0)
    flight_cost: float | None = Field(default=None, ge=0)
    accommodation_total: float | None = Field(default=None, ge=0)
    daily_spending_cap: float | None = Field(default=None, ge=0)
    coaching_cost: float | None = Field(default=None, ge=0)
    misc_cost: float | None = Field(default=None, ge=0)
    subsidy_by: str | None = None
    subsidy_amount: float | None = Field(default=None, ge=0)
    subsidy_covers: SubsidyCovers | None = None
    sponsorship_allocated: float | None = Field(default=None, ge=0)
    prize_rounds: PrizeRounds | None = None
    prize_tax_rate: float | None = Field(default=None, ge=0, le=100)


class TournamentCreate(TournamentInput):
    name: str
    location: str
    country: str
    currency: str
    start_date: str
    end_date: str
    duration_days: int = Field(ge=1)


class Tournament(ContractModel):
    id: str
    user_id: str
    name: str
    location: str
    country: str
    currency: str
    start_date: str
    end_date: str
    duration_days: int
    entry_fee: float
    flight_cost: float
    accommodation_total: float
    daily_spending_cap: float
    coaching_cost: float
    misc_cost: float
    subsidy_by: str | None
    subsidy_amount: float
    subsidy_covers: SubsidyCovers | None
    sponsorship_allocated: float
    prize_rounds: PrizeRounds
    prize_tax_rate: float
    created_at: str
    updated_at: str | None


class TournamentWithPnl(Tournament):
    home_currency: str
    pnl: PnlResult


class KnownTournament(ContractModel):
    id: str
    name: str
    sport: str
    tier: str
    tour_level: str
    location: str
    country: str
    currency: str
    typical_month: int
    duration_days: int
    prize_total: float
    estimated_prize_total: float
    prize_rounds: PrizeRounds
    start_date: str | None
    end_date: str | None


class Fx(ContractModel):
    from_: str = Field(alias="from")
    to: str
    amount: float
    converted: float
    rate: float


class DeleteResult(ContractModel):
    success: bool
