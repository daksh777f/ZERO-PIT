"""Reproducible benchmark for ZERO PIT claims.

This script measures two simple, deterministic claims from the generated
race timeline:
- a position-persistence benchmark against a majority-class baseline
- a commentary-latency benchmark over the loaded event timeline

The output is written to timing-generator/output/claim_benchmark_report.json.
"""

from __future__ import annotations

import json
import time
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any, Dict, Iterable, List

ROOT = Path(__file__).resolve().parent.parent
DEFAULT_TIMELINE = ROOT / "timing-generator" / "output" / "race_2" / "event_timeline_complete.json"
DEFAULT_REPORT = ROOT / "timing-generator" / "output" / "claim_benchmark_report.json"


def load_events(timeline_path: Path) -> List[Dict[str, Any]]:
    with timeline_path.open("r", encoding="utf-8") as handle:
        payload = json.load(handle)
    events = payload.get("events", [])
    events.sort(key=lambda event: (event.get("elapsed_race_time", 0.0), event.get("event_id", 0)))
    return events


def benchmark_position_persistence(events: Iterable[Dict[str, Any]], train_fraction: float = 0.83) -> Dict[str, Any]:
    events = list(events)
    split_index = max(1, min(len(events) - 1, int(len(events) * train_fraction)))
    train_events = events[:split_index]
    test_events = events[split_index:]

    train_positions = [int(event["race_position"]) for event in train_events if event.get("race_position") is not None]
    if not train_positions:
        return {
            "train_fraction": train_fraction,
            "train_count": len(train_events),
            "test_count": len(test_events),
            "model_accuracy": 0.0,
            "majority_baseline_accuracy": 0.0,
        }

    majority_position = Counter(train_positions).most_common(1)[0][0]
    driver_last_position: Dict[str, int] = {}
    model_correct = 0
    baseline_correct = 0
    model_total = 0

    for event in test_events:
        race_position = event.get("race_position")
        driver_number = str(event.get("driver_number", ""))
        if race_position is None:
            continue

        predicted_position = driver_last_position.get(driver_number, majority_position)
        if predicted_position == int(race_position):
            model_correct += 1
        if majority_position == int(race_position):
            baseline_correct += 1
        model_total += 1
        driver_last_position[driver_number] = int(race_position)

    model_accuracy = model_correct / model_total if model_total else 0.0
    baseline_accuracy = baseline_correct / model_total if model_total else 0.0

    return {
        "train_fraction": train_fraction,
        "train_count": len(train_events),
        "test_count": len(test_events),
        "model_accuracy": model_accuracy,
        "majority_baseline_accuracy": baseline_accuracy,
    }


def benchmark_commentary_latency(timeline_path: Path) -> Dict[str, Any]:
    start = time.perf_counter()
    events = load_events(timeline_path)

    sector_counts = defaultdict(int)
    lap_completion_count = 0
    for event in events:
        event_type = str(event.get("event_type", ""))
        if event_type == "lap_complete":
            lap_completion_count += 1
        if event_type.startswith("sector_") and event_type.endswith("_complete"):
            sector_counts[event_type] += 1

    commentary_events = lap_completion_count
    elapsed = time.perf_counter() - start

    return {
        "seconds": elapsed,
        "commentary_events": commentary_events,
        "sector_event_counts": dict(sector_counts),
    }


def main() -> None:
    timeline_path = DEFAULT_TIMELINE
    report_path = DEFAULT_REPORT

    events = load_events(timeline_path)
    position_benchmark = benchmark_position_persistence(events, train_fraction=0.83)
    commentary_benchmark = benchmark_commentary_latency(timeline_path)

    report = {
        "benchmark": "barber_race_2",
        "position_benchmark": position_benchmark,
        "commentary_benchmark": commentary_benchmark,
    }

    report_path.parent.mkdir(parents=True, exist_ok=True)
    report_path.write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
