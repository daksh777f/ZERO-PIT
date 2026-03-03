#!/usr/bin/env python3
"""
Race Commentary Event Generator
Analyzes race timing data and generates commentary events for AI audio generation.

Input: JSON file with race timing events
Output: JSON file with detected commentary events
"""

import json
from typing import List, Dict, Any
from collections import defaultdict
from dataclasses import dataclass


@dataclass
class CommentaryEvent:
    eventId: int
    event_type: str
    event_meta: Dict[str, Any]


class RaceCommentaryGenerator:
    """
    Processes race timing data and detects commentary-worthy events.

    Detects:
    - Position changes (gains/losses, single and multi-position)
    - Leader and podium changes
    - Sector performance (fastest, slow, personal/race bests)
    - Close battles and gap analysis
    - Trend detection (strong pace, falling back)
    - Laps down status
    """

    # Configuration constants
    MIN_LAP_FOR_PERSONAL_BEST = 4  # Don't report personal bests before lap 3
    CLOSE_BATTLE_GAP_THRESHOLD = 0.25  # Seconds
    CLOSE_BATTLE_MIN_DURATION = 3  # Must persist for 3+ sectors to report
    CLOSE_BATTLE_COOLDOWN_LAPS = 2  # Don't report same battle again for 2 laps

    def __init__(self):
        self.commentary_events = []
        self.event_counter = 1

        # Track state across events
        self.driver_positions_history = defaultdict(list)
        self.driver_sector_times = defaultdict(lambda: defaultdict(list))
        self.race_best_sectors = {}
        self.driver_personal_bests = defaultdict(lambda: {'lap': None, 'sectors': {}})
        self.driver_best_lap_times = defaultdict(lambda: float('inf'))
        self.previous_leader = None
        self.previous_podium = set()
        self.driver_lap_complete = defaultdict(list)
        self.close_battles = defaultdict(list)  # Track ongoing battles
        self.reported_battles = {}  # Track when battles were last reported

    def add_event(self, event_type: str, event_meta: Dict[str, Any]):
        """Add a commentary event to the output"""
        self.commentary_events.append({
            "eventId": self.event_counter,
            "event_type": event_type,
            "event_meta": event_meta
        })
        self.event_counter += 1

    def process_race_data(self, race_data: Dict) -> List[Dict]:
        """Main processing function"""
        events = race_data['events']
        race_metadata = race_data['race_metadata']

        # Add race start event
        self.add_event("race_start", {
            "total_drivers": race_metadata['total_drivers'],
            "total_laps": race_metadata['total_laps'],
            "message": f"Race begins with {race_metadata['total_drivers']} drivers competing over {race_metadata['total_laps']} laps"
        })

        # Process each timing event
        for event in events:
            self._process_event(event, race_metadata)

        # Post-process for trend detection
        self._detect_trends(race_metadata)

        # Add race finish event
        self.add_event("race_finish", {
            "race_duration_seconds": race_metadata['race_duration_seconds'],
            "total_laps": race_metadata['total_laps'],
            "message": f"Race concludes after {race_metadata['total_laps']} laps"
        })

        return self.commentary_events

    def _process_event(self, event: Dict, race_metadata: Dict):
        """Process individual timing event"""
        driver = event['driver_number']
        driver_name = event['driver_name']
        lap = event['lap_number']
        sector = event['sector']
        position = event['race_position']

        # Track position history
        self.driver_positions_history[driver].append((lap, position))

        # 1. POSITION CHANGES
        if event['position_change'] != 0:
            self._detect_position_change(event)

        # 2. LEADER CHANGE
        if position == 1 and self.previous_leader != driver:
            self._detect_leader_change(event)
            self.previous_leader = driver

        # 3. PODIUM CHANGES
        if position <= 3:
            self._detect_podium_change(event)

        # 4. SECTOR PERFORMANCE
        self._process_sector_performance(event)

        # 5. PERSONAL BEST TRACKING
        if event['is_personal_best']:
            self._detect_personal_best(event)

        # 6. RACE BEST SECTORS
        self._detect_race_best_sector(event)

        # 7. GAP ANALYSIS
        self._analyze_gaps(event)

        # 8. BATTLE DETECTION
        self._detect_battles(event)

        # 9. LAP COMPLETE EVENTS (sector 3)
        if sector == 3:
            self._process_lap_complete(event)

        # 10. LAPS DOWN STATUS
        self._detect_laps_down_change(event)

    def _detect_position_change(self, event: Dict):
        """Detect position changes"""
        change = event['position_change']
        driver_name = event['driver_name']
        driver_number = event['driver_number']
        new_position = event['race_position']
        old_position = new_position - change
        lap = event['lap_number']
        sector = event['sector']

        if abs(change) == 1:
            if change > 0:
                self.add_event("position_gain", {
                    "driver_name": driver_name,
                    "driver_number": driver_number,
                    "positions_gained": change,
                    "old_position": old_position,
                    "new_position": new_position,
                    "lap": lap,
                    "sector": sector,
                    "elapsed_time": event['elapsed_race_time'],
                    "message": f"{driver_name} (#{driver_number}) overtakes into P{new_position}"
                })
            else:
                self.add_event("position_loss", {
                    "driver_name": driver_name,
                    "driver_number": driver_number,
                    "positions_lost": abs(change),
                    "old_position": old_position,
                    "new_position": new_position,
                    "lap": lap,
                    "sector": sector,
                    "elapsed_time": event['elapsed_race_time'],
                    "message": f"{driver_name} (#{driver_number}) loses position, drops to P{new_position}"
                })

        elif abs(change) > 1:
            if change > 0:
                self.add_event("multi_position_gain", {
                    "driver_name": driver_name,
                    "driver_number": driver_number,
                    "positions_gained": change,
                    "old_position": old_position,
                    "new_position": new_position,
                    "lap": lap,
                    "sector": sector,
                    "elapsed_time": event['elapsed_race_time'],
                    "message": f"{driver_name} (#{driver_number}) makes significant progress, gaining {change} positions from P{old_position} to P{new_position}"
                })
            else:
                self.add_event("multi_position_loss", {
                    "driver_name": driver_name,
                    "driver_number": driver_number,
                    "positions_lost": abs(change),
                    "old_position": old_position,
                    "new_position": new_position,
                    "lap": lap,
                    "sector": sector,
                    "elapsed_time": event['elapsed_race_time'],
                    "message": f"{driver_name} (#{driver_number}) drops {abs(change)} positions from P{old_position} to P{new_position}"
                })

    def _detect_leader_change(self, event: Dict):
        """Detect leader changes"""
        driver_name = event['driver_name']
        driver_number = event['driver_number']
        lap = event['lap_number']
        sector = event['sector']

        self.add_event("leader_change", {
            "new_leader_name": driver_name,
            "new_leader_number": driver_number,
            "previous_leader": self.previous_leader,
            "lap": lap,
            "sector": sector,
            "elapsed_time": event['elapsed_race_time'],
            "message": f"{driver_name} (#{driver_number}) takes the race lead on lap {lap}"
        })

    def _detect_podium_change(self, event: Dict):
        """Detect podium position changes"""
        driver_name = event['driver_name']
        driver_number = event['driver_number']
        position = event['race_position']

        # Check if this is a new driver in podium positions
        if driver_number not in self.previous_podium:
            self.add_event("podium_position_change", {
                "driver_name": driver_name,
                "driver_number": driver_number,
                "position": position,
                "lap": event['lap_number'],
                "sector": event['sector'],
                "elapsed_time": event['elapsed_race_time'],
                "message": f"{driver_name} (#{driver_number}) moves into podium position P{position}"
            })
            self.previous_podium.add(driver_number)

    def _process_sector_performance(self, event: Dict):
        """Process sector performance indicators"""
        driver_name = event['driver_name']
        driver_number = event['driver_number']
        sector = event['sector']
        performance = event['sector_performance']
        sector_time = event['sector_time']
        lap = event['lap_number']

        # Track all sector times
        self.driver_sector_times[driver_number][sector].append(sector_time)

        # Detect anomalous sectors
        if performance == "fastest":
            self.add_event("fastest_sector", {
                "driver_name": driver_name,
                "driver_number": driver_number,
                "sector": sector,
                "sector_time": sector_time,
                "lap": lap,
                "elapsed_time": event['elapsed_race_time'],
                "message": f"{driver_name} (#{driver_number}) sets a blistering sector {sector} time of {sector_time:.3f}s"
            })

        elif performance == "slow":
            # Only report slow sectors if driver has previous sectors for comparison
            if len(self.driver_sector_times[driver_number][sector]) > 2:
                avg_sector = sum(self.driver_sector_times[driver_number][sector][:-1]) / len(self.driver_sector_times[driver_number][sector][:-1])
                if sector_time > avg_sector * 1.15:  # 15% slower than average
                    self.add_event("anomalous_slow_sector", {
                        "driver_name": driver_name,
                        "driver_number": driver_number,
                        "sector": sector,
                        "sector_time": sector_time,
                        "average_sector_time": avg_sector,
                        "time_loss": sector_time - avg_sector,
                        "lap": lap,
                        "elapsed_time": event['elapsed_race_time'],
                        "message": f"{driver_name} (#{driver_number}) struggles in sector {sector}, losing {sector_time - avg_sector:.3f}s"
                    })

    def _detect_personal_best(self, event: Dict):
        """Detect personal best sectors and laps"""
        driver_name = event['driver_name']
        driver_number = event['driver_number']
        sector = event['sector']
        sector_time = event['sector_time']
        lap = event['lap_number']

        # Update personal best tracking
        self.driver_personal_bests[driver_number]['sectors'][sector] = sector_time

        # Only report personal bests after minimum lap threshold
        if lap >= self.MIN_LAP_FOR_PERSONAL_BEST:
            self.add_event("personal_best_sector", {
                "driver_name": driver_name,
                "driver_number": driver_number,
                "sector": sector,
                "sector_time": sector_time,
                "lap": lap,
                "elapsed_time": event['elapsed_race_time'],
                "message": f"{driver_name} (#{driver_number}) sets personal best in sector {sector} with {sector_time:.3f}s"
            })

    def _detect_race_best_sector(self, event: Dict):
        """Detect race-best sector times"""
        sector = event['sector']
        sector_time = event['sector_time']
        driver_name = event['driver_name']
        driver_number = event['driver_number']
        lap = event['lap_number']

        # Check if this is a race best
        if sector not in self.race_best_sectors or sector_time < self.race_best_sectors[sector][0]:
            self.race_best_sectors[sector] = (sector_time, driver_number, lap)

            self.add_event("race_best_sector", {
                "driver_name": driver_name,
                "driver_number": driver_number,
                "sector": sector,
                "sector_time": sector_time,
                "lap": lap,
                "elapsed_time": event['elapsed_race_time'],
                "message": f"{driver_name} (#{driver_number}) sets the fastest sector {sector} of the race with {sector_time:.3f}s"
            })

    def _analyze_gaps(self, event: Dict):
        """Analyze gaps to cars ahead and behind"""
        driver_name = event['driver_name']
        driver_number = event['driver_number']
        deltas = event.get('deltas', {})
        position = event['race_position']
        lap = event['lap_number']

        # Gap to car ahead - track for battle detection
        if 'to_car_ahead' in deltas and deltas['to_car_ahead'] is not None:
            gap_ahead = abs(deltas['to_car_ahead'])
            car_ahead = deltas.get('car_ahead_number')

            # Track close battles (within threshold)
            if gap_ahead < self.CLOSE_BATTLE_GAP_THRESHOLD and position > 1:
                battle_key = f"{driver_number}-{car_ahead}"
                self.close_battles[battle_key].append({
                    'lap': lap,
                    'sector': event['sector'],
                    'gap': gap_ahead,
                    'elapsed_time': event['elapsed_race_time'],
                    'driver_name': driver_name,
                    'position': position
                })

                # Check if this battle has persisted long enough to report
                battle_history = self.close_battles[battle_key]
                if len(battle_history) >= self.CLOSE_BATTLE_MIN_DURATION:
                    # Check if we haven't reported this battle recently
                    last_reported_lap = self.reported_battles.get(battle_key, 0)
                    
                    if lap - last_reported_lap >= self.CLOSE_BATTLE_COOLDOWN_LAPS:
                        # Calculate average gap over the battle
                        avg_gap = sum(b['gap'] for b in battle_history[-self.CLOSE_BATTLE_MIN_DURATION:]) / self.CLOSE_BATTLE_MIN_DURATION
                        
                        self.add_event("close_battle", {
                            "driver_name": driver_name,
                            "driver_number": driver_number,
                            "position": position,
                            "car_ahead_number": car_ahead,
                            "gap_seconds": gap_ahead,
                            "average_gap_seconds": round(avg_gap, 3),
                            "battle_duration_sectors": len(battle_history),
                            "lap": lap,
                            "sector": event['sector'],
                            "elapsed_time": event['elapsed_race_time'],
                            "message": f"{driver_name} (#{driver_number}) in sustained battle with #{car_ahead}, gap just {gap_ahead:.3f}s"
                        })
                        
                        # Mark this battle as reported
                        self.reported_battles[battle_key] = lap

        # Gap to leader for non-leaders
        if position > 1 and 'to_all_cars' in deltas:
            all_cars = deltas['to_all_cars']
            if len(all_cars) > 0:
                # Find the leader (smallest delta or negative largest)
                leader_gap = min([abs(v) for v in all_cars.values()])

                # Report significant gaps to leader
                if leader_gap > 15.0 and lap > 5:
                    self.add_event("large_gap_to_leader", {
                        "driver_name": driver_name,
                        "driver_number": driver_number,
                        "position": position,
                        "gap_to_leader_seconds": leader_gap,
                        "lap": lap,
                        "elapsed_time": event['elapsed_race_time'],
                        "message": f"{driver_name} (#{driver_number}) running in P{position}, {leader_gap:.1f}s behind the leader"
                    })

    def _detect_battles(self, event: Dict):
        """Track battle data (actual detection happens in _analyze_gaps)"""
        # This method is now just a placeholder - battle detection moved to _analyze_gaps
        # Keeping it for backwards compatibility
        pass

    def _process_lap_complete(self, event: Dict):
        """Process lap completion events"""
        driver_name = event['driver_name']
        driver_number = event['driver_number']
        lap = event['lap_number']
        lap_time = event['cumulative_lap_time']
        position = event['race_position']

        self.driver_lap_complete[driver_number].append(lap_time)

        # Check if this is a personal best lap (full lap time, not sector)
        if lap_time < self.driver_best_lap_times[driver_number]:
            self.driver_best_lap_times[driver_number] = lap_time
            
            # Only report personal best laps after minimum lap threshold
            if lap >= self.MIN_LAP_FOR_PERSONAL_BEST:
                self.add_event("personal_best_lap", {
                    "driver_name": driver_name,
                    "driver_number": driver_number,
                    "lap": lap,
                    "lap_time": lap_time,
                    "position": position,
                    "elapsed_time": event['elapsed_race_time'],
                    "message": f"{driver_name} (#{driver_number}) completes lap {lap} with personal best time of {lap_time:.3f}s"
                })

    def _detect_laps_down_change(self, event: Dict):
        """Detect when drivers go laps down or rejoin lead lap"""
        driver_name = event['driver_name']
        driver_number = event['driver_number']
        laps_behind = event['laps_behind_leader']
        on_lead_lap = event['on_same_lap_as_leader']

        # Only report if going a lap down (simple detection)
        if laps_behind > 0 and not on_lead_lap:
            # Check if this is first time being laps down
            prev_events = [e for e in self.commentary_events 
                          if e['event_type'] == 'laps_down' 
                          and e['event_meta'].get('driver_number') == driver_number]

            if not prev_events:
                self.add_event("laps_down", {
                    "driver_name": driver_name,
                    "driver_number": driver_number,
                    "laps_behind": laps_behind,
                    "lap": event['lap_number'],
                    "elapsed_time": event['elapsed_race_time'],
                    "message": f"{driver_name} (#{driver_number}) goes a lap down to the leader"
                })

    def _detect_trends(self, race_metadata: Dict):
        """Post-process to detect trends over multiple laps"""

        # Analyze position trends
        for driver, positions in self.driver_positions_history.items():
            if len(positions) < 5:
                continue

            # Get positions at key intervals
            early_positions = [p for l, p in positions if l <= 5]
            late_positions = [p for l, p in positions if l > race_metadata['total_laps'] - 5]

            if not early_positions or not late_positions:
                continue

            avg_early = sum(early_positions) / len(early_positions)
            avg_late = sum(late_positions) / len(late_positions)

            position_change = avg_early - avg_late  # Positive = moved forward

            # Significant forward progress
            if position_change >= 3:
                driver_name = next((e['event_meta']['driver_name'] for e in self.commentary_events 
                                  if e['event_meta'].get('driver_number') == driver), f"Driver #{driver}")

                self.add_event("strong_race_pace", {
                    "driver_name": driver_name,
                    "driver_number": driver,
                    "positions_gained_overall": int(position_change),
                    "average_early_position": avg_early,
                    "average_late_position": avg_late,
                    "message": f"{driver_name} (#{driver}) showing strong race pace, moving forward through the field"
                })

            # Significant backward movement
            elif position_change <= -3:
                driver_name = next((e['event_meta']['driver_name'] for e in self.commentary_events 
                                  if e['event_meta'].get('driver_number') == driver), f"Driver #{driver}")

                self.add_event("falling_back", {
                    "driver_name": driver_name,
                    "driver_number": driver,
                    "positions_lost_overall": int(abs(position_change)),
                    "average_early_position": avg_early,
                    "average_late_position": avg_late,
                    "message": f"{driver_name} (#{driver}) has fallen back through the field as the race progresses"
                })


def process_race_file(input_file: str, output_file: str = None):
    """
    Process race data file and generate commentary events

    Args:
        input_file: Path to input JSON file with race timing data
        output_file: Path to output JSON file (optional, defaults to input_commentary.json)

    Returns:
        Dictionary with commentary events and metadata
    """

    # Load race data
    with open(input_file, 'r') as f:
        race_data = json.load(f)

    # Generate commentary
    generator = RaceCommentaryGenerator()
    commentary_events = generator.process_race_data(race_data)

    # Prepare output
    output_data = {
        "commentary_events": commentary_events,
        "total_commentary_events": len(commentary_events),
        "race_metadata": race_data['race_metadata']
    }

    # Save output if path provided
    if output_file:
        with open(output_file, 'w') as f:
            json.dump(output_data, f, indent=2)
        print(f"✓ Generated {len(commentary_events)} commentary events")
        print(f"✓ Output saved to: {output_file}")

    return output_data


if __name__ == "__main__":
    import sys

    if len(sys.argv) < 2:
        print("Usage: python race_commentary_generator.py <input_file.json> [output_file.json]")
        print("\nExample:")
        print("  python race_commentary_generator.py race_data.json commentary_events.json")
        sys.exit(1)

    input_file = sys.argv[1]
    output_file = sys.argv[2] if len(sys.argv) > 2 else input_file.replace('.json', '_commentary.json')

    try:
        process_race_file(input_file, output_file)
    except FileNotFoundError:
        print(f"Error: Input file '{input_file}' not found")
        sys.exit(1)
    except json.JSONDecodeError:
        print(f"Error: Invalid JSON in '{input_file}'")
        sys.exit(1)
    except Exception as e:
        print(f"Error: {str(e)}")
        sys.exit(1)