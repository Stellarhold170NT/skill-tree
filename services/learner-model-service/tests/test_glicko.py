"""Glicko-2 math properties and RD inactivity inflation."""

import math

from app import glicko


def test_win_improves_rating_loss_degrades():
    base = (1500.0, 350.0, 0.06)
    win = glicko.rate(*base, [(glicko.REFERENCE_RATING, glicko.REFERENCE_RD, 1.0)])
    loss = glicko.rate(*base, [(glicko.REFERENCE_RATING, glicko.REFERENCE_RD, 0.0)])
    assert win[0] > 1500.0 > loss[0]
    # symmetric-ish magnitudes (within 5 points via volatility asymmetry)
    assert abs((win[0] - 1500) - (1500 - loss[0])) < 5


def test_rd_shrinks_after_a_game():
    _, rd_after, _ = glicko.rate(1500.0, 350.0, 0.06, [(1500.0, 350.0, 1.0)])
    assert rd_after < 350.0


def test_volatility_stays_bounded():
    _, _, vol = glicko.rate(1500.0, 350.0, 0.06, [(1500.0, 350.0, 0.0)])
    assert 0.001 < vol < 0.5


def test_deterministic_and_reproducible():
    args = (1500.0, 200.0, 0.06)
    matches = [(1400.0, 30.0, 1.0), (1550.0, 100.0, 0.0), (1700.0, 300.0, 0.0)]
    first = glicko.rate(*args, matches)
    second = glicko.rate(*args, matches)
    assert first == second
    # Canonical Glickman (2012) numerical example: Rating=1464.05, RD=151.52, Vol=0.06000
    assert round(first[0], 2) == 1464.05
    assert round(first[1], 2) == 151.52
    assert round(first[2], 5) == 0.06000


def test_inactivity_inflation_caps_at_initial_rd():
    assert glicko.add_inactivity_rd(100.0, 0) == 100.0
    mid = glicko.add_inactivity_rd(100.0, 100)
    assert 100.0 < mid < 350.0
    assert glicko.add_inactivity_rd(100.0, 10_000) == 350.0


def test_expected_probability_sane():
    # sanity: mastery_of maps rating 1500 to 0.5 via service layer
    from app.service import mastery_of

    assert abs(mastery_of(1500.0) - 0.5) < 1e-9
    assert mastery_of(1850.0) > 0.7
    assert mastery_of(1150.0) < 0.3
    assert not math.isnan(mastery_of(0.0))
