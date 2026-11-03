"""Glicko-2 rating system (Glickman 2012), compact reference implementation.

Each (student, concept) pair is treated as a "player". An assessment attempt is a
match against a fixed reference opponent (rating 1500, RD 350 — unknown item
difficulty), which keeps the math standard instead of a hand-made formula.
"""

import math

GLICKO_SCALE = 173.7178
INITIAL_RATING = 1500.0
INITIAL_RD = 350.0
INITIAL_VOLATILITY = 0.06
TAU = 0.5  # constrains volatility change over time

# Reference opponent for a single attempt with unknown item difficulty.
REFERENCE_RATING = 1500.0
REFERENCE_RD = 350.0


def _mu(rating: float) -> float:
    return (rating - 1500.0) / GLICKO_SCALE


def _phi(rd: float) -> float:
    return rd / GLICKO_SCALE


def _g(phi: float) -> float:
    return 1.0 / math.sqrt(1.0 + 3.0 * phi * phi / (math.pi ** 2))


def _expected(mu: float, opponent_mu: float, g: float) -> float:
    z = -g * (opponent_mu - mu)
    if z > 50.0:   # E -> 0, avoid exp overflow
        return 0.0
    if z < -50.0:  # E -> 1
        return 1.0
    return 1.0 / (1.0 + math.exp(z))


def add_inactivity_rd(rd: float, days_idle: float, full_inflation_days: float = 365.0) -> float:
    """RD inflation for inactivity: reaches the initial 350 after a year idle."""
    if days_idle <= 0:
        return rd
    variance_growth = (INITIAL_RD ** 2) / full_inflation_days * days_idle
    return min(INITIAL_RD, math.sqrt(rd * rd + variance_growth))


def rate(
    rating: float,
    rd: float,
    volatility: float,
    matches: list[tuple[float, float, float]],
) -> tuple[float, float, float]:
    """One Glickman rating period.

    matches: list of (opponent_rating, opponent_rd, score) with score in {0, 0.5, 1}.
    Returns (new_rating, new_rd, new_volatility).
    """
    if not matches:
        # No games: only volatility stays, RD unchanged (period without competition).
        return rating, rd, volatility

    mu = _mu(rating)
    phi = _phi(rd)
    a = math.log(volatility ** 2)

    v_sum = 0.0
    delta_sum = 0.0
    for opponent_rating, opponent_rd, score in matches:
        opp_phi = _phi(opponent_rd)
        opp_mu = _mu(opponent_rating)
        g = _g(opp_phi)
        expected = _expected(mu, opp_mu, g)
        v_sum += g * g * expected * (1.0 - expected)
        delta_sum += g * (score - expected)
    v = 1.0 / v_sum
    delta = v * delta_sum

    delta_sq = delta * delta

    # 5.2: initial bracket for the volatility root.
    # f(x) = e^x(Δ²−φ²−v−e^x)/(2(φ²+v+e^x)²) − (x−a)/τ²  is decreasing in x:
    # f(x→−∞) → +∞ (the −(x−a)/τ² term), f(x→+∞) → −∞. A wide, sign-safe
    # bracket lets plain bisection converge deterministically (no fragile
    # label-swapping as in the classic Illinois loop).
    lo = a - 30.0
    hi = a + 30.0
    for _ in range(200):
        mid = (lo + hi) / 2.0
        f_mid = _f(x=mid, delta_sq=delta_sq, phi=phi, v=v, a=a)
        if f_mid > 0.0:
            lo = mid
        else:
            hi = mid
        if hi - lo < 1e-12:
            break
    new_volatility = math.exp(((lo + hi) / 2.0) / 2.0)

    phi_star = math.sqrt(phi * phi + new_volatility ** 2)
    # Glickman 2012: 1/φ'² = 1/φ*² + 1/v  (v is already the inverse variance term)
    new_phi = 1.0 / math.sqrt(1.0 / (phi_star * phi_star) + 1.0 / v)
    new_mu = mu + new_phi * new_phi * delta_sum

    return (
        GLICKO_SCALE * new_mu + 1500.0,
        GLICKO_SCALE * new_phi,
        new_volatility,
    )


def _f(x: float, *, delta_sq: float, phi: float, v: float, a: float) -> float:
    ex = math.exp(x)
    num = ex * (delta_sq - phi * phi - v - ex)
    den = 2.0 * (phi * phi + v + ex) ** 2
    return num / den - (x - a) / (TAU * TAU)
