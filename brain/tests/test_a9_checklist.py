"""A9 tests — template parse, weighting, conditional exclusion, Sunday rule."""

from __future__ import annotations

import pytest

from signals import checklist_discipline as cd


@pytest.fixture(scope="module")
def checklists():
    return cd.parse_checklists()


def test_template_step_counts(checklists):
    assert len(checklists["opening"]) == 27
    assert len(checklists["closing"]) == 32


def test_gas_off_is_critical(checklists):
    gas = next(s for s in checklists["closing"] if s.number == 8)
    assert gas.weight == cd.W_CRITICAL
    assert gas.mandatory


def test_conditional_step_is_not_mandatory(checklists):
    heating = next(s for s in checklists["opening"] if s.number == 3)  # "if required"
    assert not heating.mandatory
    assert heating.weight == cd.W_CONDITIONAL


def test_sunday_only_step_excluded_on_weekday(checklists):
    weekday = {s.number for s in cd.expected_mandatory(checklists["closing"], False)}
    sunday = {s.number for s in cd.expected_mandatory(checklists["closing"], True)}
    assert 31 not in weekday
    assert 31 in sunday


def test_conditionals_never_raise_a_miss(checklists):
    steps = checklists["opening"]
    all_mandatory = {s.number for s in cd.expected_mandatory(steps, False)}
    res = cd.evaluate(steps, all_mandatory, dow=0)
    assert res["missed"] == []
    assert res["severity"] == "ok"


def test_missed_gas_off_is_high_severity(checklists):
    steps = checklists["closing"]
    mandatory = {s.number for s in cd.expected_mandatory(steps, False)}
    res = cd.evaluate(steps, mandatory - {8}, dow=2)
    assert 8 in res["critical_missed"]
    assert res["weighted_score"] >= cd.W_CRITICAL
    assert res["severity"] == "high"


def test_skipped_checklist_is_critical(checklists):
    res = cd.evaluate(checklists["closing"], {1}, dow=4)
    assert res["skipped"] is True
    assert res["severity"] == "critical"
