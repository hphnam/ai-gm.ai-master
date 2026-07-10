# LLM-judge prompts (offline seam)

Model to use: **claude-opus-4-8** (pinned). System prompt and rubric are fixed for reproducibility. Fill one JSON object per item against the schema (each with its `item_key`), then pass the list to `eval.judge.calibrate` to score agreement against `eval_labels`.

## System
```
You are evaluating a hospitality-manager's daily briefing item. Score it on the rubric, each 1 (poor) to 5 (excellent). Judge only what is shown; do not invent facts. Set keep=true if a manager should act on it today (actionability ≥ 3). Return only the JSON object matching the schema.
```

## Scoring schema
```json
{
  "type": "object",
  "properties": {
    "correctness": {
      "type": "integer",
      "minimum": 1,
      "maximum": 5
    },
    "actionability": {
      "type": "integer",
      "minimum": 1,
      "maximum": 5
    },
    "clarity": {
      "type": "integer",
      "minimum": 1,
      "maximum": 5
    },
    "calibrated_confidence": {
      "type": "integer",
      "minimum": 1,
      "maximum": 5
    },
    "keep": {
      "type": "boolean"
    },
    "rationale": {
      "type": "string"
    }
  },
  "required": [
    "correctness",
    "actionability",
    "clarity",
    "calibrated_confidence",
    "keep",
    "rationale"
  ],
  "additionalProperties": false
}
```

## Items

### Item 1 · `beer_hall:down:2026-05-17:change_point`
```
Rubric (score each 1 (poor) to 5 (excellent)):
- correctness: Does the headline match the day's numbers (actual vs expected/band)?
- actionability: Would a busy venue manager actually do something about this today?
- clarity: Is the 'why' (reason) clear and specific, not vague?
- calibrated_confidence: Is the severity/confidence proportionate to the evidence?

Briefing item:
{
  "venue": "The Beer Hall",
  "headline": "The Beer Hall: sustained shift since 2026-05-17 (171% below normal); coincides with a school term\u2194holiday transition",
  "reason": "coincides with a school term\u2194holiday transition",
  "severity": "high",
  "direction": "down",
  "status": "new",
  "caveats": [],
  "head": {
    "source": "change_point",
    "venue": "beer_hall",
    "onset_date": "2026-05-17",
    "direction": "down",
    "severity": "high",
    "magnitude": -170.81768730917574,
    "payload": {
      "onset_date": "2026-05-17",
      "magnitude_pct": -170.81768730917574,
      "detector": "persistence",
      "attribution": [
        "coincides with a school term\u2194holiday transition"
      ],
      "detected_date": "2026-05-27",
      "note": null
    }
  }
}

Return JSON: {correctness, actionability, clarity, calibrated_confidence, keep, rationale}.
```

### Item 2 · `beer_hall:down:2025-12-27:change_point`
```
Rubric (score each 1 (poor) to 5 (excellent)):
- correctness: Does the headline match the day's numbers (actual vs expected/band)?
- actionability: Would a busy venue manager actually do something about this today?
- clarity: Is the 'why' (reason) clear and specific, not vague?
- calibrated_confidence: Is the severity/confidence proportionate to the evidence?

Briefing item:
{
  "venue": "The Beer Hall",
  "headline": "The Beer Hall: sustained shift since 2025-12-27 (29% below normal); coincides with a cold snap (~6\u00b0C vs 11\u00b0C avg)",
  "reason": "coincides with a cold snap (~6\u00b0C vs 11\u00b0C avg)",
  "severity": "medium",
  "direction": "down",
  "status": "new",
  "caveats": [],
  "head": {
    "source": "change_point",
    "venue": "beer_hall",
    "onset_date": "2025-12-27",
    "direction": "down",
    "severity": "medium",
    "magnitude": -28.84677238692987,
    "payload": {
      "onset_date": "2025-12-27",
      "magnitude_pct": -28.84677238692987,
      "detector": "persistence",
      "attribution": [
        "coincides with a cold snap (~6\u00b0C vs 11\u00b0C avg)"
      ],
      "detected_date": "2026-01-03",
      "note": null
    }
  }
}

Return JSON: {correctness, actionability, clarity, calibrated_confidence, keep, rationale}.
```

### Item 3 · `beer_hall:up:2026-05-15:deviation`
```
Rubric (score each 1 (poor) to 5 (excellent)):
- correctness: Does the headline match the day's numbers (actual vs expected/band)?
- actionability: Would a busy venue manager actually do something about this today?
- clarity: Is the 'why' (reason) clear and specific, not vague?
- calibrated_confidence: Is the severity/confidence proportionate to the evidence?

Briefing item:
{
  "venue": "The Beer Hall",
  "headline": "The Beer Hall: \u00a31,367 above band on 2026-05-15; no coincident calendar/weather/event/promo signal \u2014 likely an operational or competitive change worth investigating",
  "reason": "no coincident calendar/weather/event/promo signal \u2014 likely an operational or competitive change worth investigating",
  "severity": "medium",
  "direction": "up",
  "status": "new",
  "caveats": [],
  "head": {
    "source": "deviation",
    "venue": "beer_hall",
    "onset_date": "2026-05-15",
    "direction": "up",
    "severity": "medium",
    "magnitude": 1.0532648936740951,
    "payload": {
      "date": "2026-05-15",
      "actual": 1367.4419999999986,
      "expected": 778.5300000000002,
      "z": 1.0532648936740951
    }
  }
}

Return JSON: {correctness, actionability, clarity, calibrated_confidence, keep, rationale}.
```

### Item 4 · `beer_hall:up:2026-05-29:deviation`
```
Rubric (score each 1 (poor) to 5 (excellent)):
- correctness: Does the headline match the day's numbers (actual vs expected/band)?
- actionability: Would a busy venue manager actually do something about this today?
- clarity: Is the 'why' (reason) clear and specific, not vague?
- calibrated_confidence: Is the severity/confidence proportionate to the evidence?

Briefing item:
{
  "venue": "The Beer Hall",
  "headline": "The Beer Hall: \u00a31,910 above band on 2026-05-29; coincides with a school term\u2194holiday transition",
  "reason": "coincides with a school term\u2194holiday transition",
  "severity": "high",
  "direction": "up",
  "status": "new",
  "caveats": [],
  "head": {
    "source": "deviation",
    "venue": "beer_hall",
    "onset_date": "2026-05-29",
    "direction": "up",
    "severity": "high",
    "magnitude": 2.0539391597195387,
    "payload": {
      "date": "2026-05-29",
      "actual": 1909.7300000000005,
      "expected": 793.6399999999998,
      "z": 2.0539391597195387
    }
  }
}

Return JSON: {correctness, actionability, clarity, calibrated_confidence, keep, rationale}.
```

### Item 5 · `beer_hall:up:2026-05-20:deviation`
```
Rubric (score each 1 (poor) to 5 (excellent)):
- correctness: Does the headline match the day's numbers (actual vs expected/band)?
- actionability: Would a busy venue manager actually do something about this today?
- clarity: Is the 'why' (reason) clear and specific, not vague?
- calibrated_confidence: Is the severity/confidence proportionate to the evidence?

Briefing item:
{
  "venue": "The Beer Hall",
  "headline": "The Beer Hall: \u00a31,913 above band on 2026-05-20; coincides with a school term\u2194holiday transition",
  "reason": "coincides with a school term\u2194holiday transition",
  "severity": "high",
  "direction": "up",
  "status": "new",
  "caveats": [],
  "head": {
    "source": "deviation",
    "venue": "beer_hall",
    "onset_date": "2026-05-20",
    "direction": "up",
    "severity": "high",
    "magnitude": 2.9117607363619187,
    "payload": {
      "date": "2026-05-20",
      "actual": 1912.9650000000006,
      "expected": 294.8850000000001,
      "z": 2.9117607363619187
    }
  }
}

Return JSON: {correctness, actionability, clarity, calibrated_confidence, keep, rationale}.
```

### Item 6 · `beer_hall:down:2026-05-31:stock`
```
Rubric (score each 1 (poor) to 5 (excellent)):
- correctness: Does the headline match the day's numbers (actual vs expected/band)?
- actionability: Would a busy venue manager actually do something about this today?
- clarity: Is the 'why' (reason) clear and specific, not vague?
- calibrated_confidence: Is the severity/confidence proportionate to the evidence?

Briefing item:
{
  "venue": "The Beer Hall",
  "headline": "The Beer Hall: Synthetic Keg low \u2014 0.0d cover, reorder 2 keg(s)",
  "reason": "coincides with a school term\u2194holiday transition",
  "severity": "high",
  "direction": "down",
  "status": "new",
  "caveats": [],
  "head": {
    "source": "stock",
    "venue": "beer_hall",
    "onset_date": "2026-05-31",
    "direction": "down",
    "severity": "high",
    "magnitude": 0.0,
    "payload": {
      "product": "Synthetic Keg",
      "days_of_cover": 0.0,
      "suggested_order_kegs": 2.0,
      "as_of": "2026-05-31"
    }
  }
}

Return JSON: {correctness, actionability, clarity, calibrated_confidence, keep, rationale}.
```

### Item 7 · `beer_hall:down:2026-05-31:deviation`
```
Rubric (score each 1 (poor) to 5 (excellent)):
- correctness: Does the headline match the day's numbers (actual vs expected/band)?
- actionability: Would a busy venue manager actually do something about this today?
- clarity: Is the 'why' (reason) clear and specific, not vague?
- calibrated_confidence: Is the severity/confidence proportionate to the evidence?

Briefing item:
{
  "venue": "The Beer Hall",
  "headline": "The Beer Hall: \u00a3-545 below band on 2026-05-31; coincides with a school term\u2194holiday transition",
  "reason": "coincides with a school term\u2194holiday transition",
  "severity": "medium",
  "direction": "down",
  "status": "new",
  "caveats": [],
  "head": {
    "source": "deviation",
    "venue": "beer_hall",
    "onset_date": "2026-05-31",
    "direction": "down",
    "severity": "medium",
    "magnitude": -1.8548620248373315,
    "payload": {
      "date": "2026-05-31",
      "actual": -545.4459999999992,
      "expected": 483.65000000000003,
      "z": -1.8548620248373315
    }
  }
}

Return JSON: {correctness, actionability, clarity, calibrated_confidence, keep, rationale}.
```
