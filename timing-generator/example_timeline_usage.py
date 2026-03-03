#!/usr/bin/env python3
"""
Example script demonstrating how to use the event timeline data
for various visualization and analysis purposes.
"""

import json
from pathlib import Path
from collections import defaultdict
from typing import List, Dict


def load_timeline(filepath: str = 'output/event_timeline_complete.json') -> Dict:
    """Load the complete event timeline"""
    with open(filepath, 'r') as f:
        return json.load(f)


def load_statistics(filepath: str = 'output/event_timeline_statistics.json') -> Dict:
    """Load timeline statistics"""
    with open(filepath, 'r') as f:
        return json.load(f)


# ============================================================================
# EXAMPLE 1: Find all overtakes
# ============================================================================
def find_overtakes(timeline: Dict) -> List[Dict]:
    """
    Identify overtakes by tracking position changes.
    An overtake occurs when a driver gains position.
    """
    overtakes = []
    
    for event in timeline['events']:
        if event['position_change'] > 0:  # Gained position(s)
            overtakes.append({
                'lap': event['lap_number'],
                'sector': event['sector'],
                'elapsed_time': event['elapsed_race_time'],
                'driver': f"{event['driver_number']} - {event['driver_name']}",
                'new_position': event['race_position'],
                'positions_gained': event['position_change']
            })
    
    return overtakes


# ============================================================================
# EXAMPLE 2: Track a specific driver's race
# ============================================================================
def get_driver_race_summary(timeline: Dict, driver_number: str) -> Dict:
    """
    Get a complete race summary for a specific driver.
    """
    driver_events = [e for e in timeline['events'] if e['driver_number'] == driver_number]
    
    if not driver_events:
        return None
    
    # Track position throughout race
    positions = [e['race_position'] for e in driver_events if e['event_type'] == 'lap_complete']
    
    # Count personal bests
    personal_bests = sum(1 for e in driver_events if e['is_personal_best'])
    
    # Find best sectors
    best_sectors = {1: float('inf'), 2: float('inf'), 3: float('inf')}
    for event in driver_events:
        if event['sector_time'] < best_sectors[event['sector']]:
            best_sectors[event['sector']] = event['sector_time']
    
    # Count performance by color
    performance_counts = defaultdict(int)
    for event in driver_events:
        performance_counts[event['sector_performance']] += 1
    
    return {
        'driver': f"{driver_events[0]['driver_number']} - {driver_events[0]['driver_name']}",
        'total_events': len(driver_events),
        'laps_completed': len([e for e in driver_events if e['event_type'] == 'lap_complete']),
        'starting_position': positions[0] if positions else None,
        'finishing_position': positions[-1] if positions else None,
        'positions_gained': positions[0] - positions[-1] if len(positions) >= 2 else 0,
        'best_sectors': best_sectors,
        'personal_bests_set': personal_bests,
        'performance_distribution': dict(performance_counts)
    }


# ============================================================================
# EXAMPLE 3: Find closest battles
# ============================================================================
def find_close_battles(timeline: Dict, gap_threshold: float = 1.0) -> List[Dict]:
    """
    Find moments where cars are within a specified gap (in seconds).
    """
    battles = []
    
    for event in timeline['events']:
        deltas = event.get('deltas', {})
        
        # Check gap to car ahead
        if 'to_car_ahead' in deltas:
            gap = abs(deltas['to_car_ahead'])
            if gap <= gap_threshold:
                battles.append({
                    'elapsed_time': event['elapsed_race_time'],
                    'lap': event['lap_number'],
                    'sector': event['sector'],
                    'driver': event['driver_number'],
                    'car_ahead': deltas.get('car_ahead_number'),
                    'gap_seconds': gap,
                    'gap_meters': event.get('gap_distance_meters')
                })
    
    return battles


# ============================================================================
# EXAMPLE 4: Sector performance analysis
# ============================================================================
def analyze_sector_performance(timeline: Dict, sector: int) -> Dict:
    """
    Analyze performance for a specific sector across all drivers.
    """
    sector_events = [e for e in timeline['events'] if e['sector'] == sector]
    
    # Group by driver
    driver_times = defaultdict(list)
    for event in sector_events:
        driver_times[event['driver_number']].append(event['sector_time'])
    
    # Calculate statistics per driver
    driver_stats = {}
    for driver, times in driver_times.items():
        driver_stats[driver] = {
            'best': min(times),
            'worst': max(times),
            'average': sum(times) / len(times),
            'consistency': max(times) - min(times)  # Range as consistency metric
        }
    
    # Find most consistent driver (smallest range)
    most_consistent = min(driver_stats.items(), key=lambda x: x[1]['consistency'])
    
    # Find fastest driver
    fastest = min(driver_stats.items(), key=lambda x: x[1]['best'])
    
    return {
        'sector': sector,
        'total_completions': len(sector_events),
        'fastest_driver': fastest[0],
        'fastest_time': fastest[1]['best'],
        'most_consistent_driver': most_consistent[0],
        'consistency_range': most_consistent[1]['consistency'],
        'driver_statistics': driver_stats
    }


# ============================================================================
# EXAMPLE 5: Generate race timeline for visualization
# ============================================================================
def generate_visualization_timeline(timeline: Dict, time_interval: float = 10.0) -> List[Dict]:
    """
    Generate snapshots of race state at regular time intervals.
    Useful for creating a scrubber/timeline UI.
    """
    max_time = max(e['elapsed_race_time'] for e in timeline['events'])
    snapshots = []
    
    current_time = 0.0
    while current_time <= max_time:
        # Find most recent event for each driver before this time
        driver_states = {}
        
        for event in timeline['events']:
            if event['elapsed_race_time'] <= current_time:
                driver_num = event['driver_number']
                # Keep most recent event for this driver
                if driver_num not in driver_states or event['elapsed_race_time'] > driver_states[driver_num]['elapsed_race_time']:
                    driver_states[driver_num] = {
                        'driver_number': driver_num,
                        'driver_name': event['driver_name'],
                        'position': event['race_position'],
                        'lap': event['lap_number'],
                        'sector': event['sector'],
                        'elapsed_race_time': event['elapsed_race_time']
                    }
        
        # Sort by position
        positions = sorted(driver_states.values(), key=lambda x: x['position'])
        
        snapshots.append({
            'timestamp': current_time,
            'positions': positions
        })
        
        current_time += time_interval
    
    return snapshots


# ============================================================================
# MAIN DEMO
# ============================================================================
def main():
    """Run all examples"""
    print("=" * 70)
    print("EVENT TIMELINE USAGE EXAMPLES")
    print("=" * 70)
    
    # Load data
    try:
        timeline = load_timeline()
        stats = load_statistics()
    except FileNotFoundError:
        print("\nERROR: Timeline files not found.")
        print("Please run 'python generate_all.py' first to generate the data.")
        return
    
    print(f"\nLoaded timeline with {len(timeline['events'])} events")
    print(f"Race duration: {timeline['race_metadata']['race_duration_seconds']:.1f} seconds")
    print(f"Total drivers: {timeline['race_metadata']['total_drivers']}")
    
    # Example 1: Overtakes
    print("\n" + "-" * 70)
    print("EXAMPLE 1: Finding Overtakes")
    print("-" * 70)
    overtakes = find_overtakes(timeline)
    print(f"Found {len(overtakes)} overtakes during the race")
    if overtakes:
        print("\nFirst 5 overtakes:")
        for overtake in overtakes[:5]:
            print(f"  Lap {overtake['lap']}, Sector {overtake['sector']}: "
                  f"{overtake['driver']} moved to P{overtake['new_position']} "
                  f"(+{overtake['positions_gained']} positions)")
    
    # Example 2: Driver summary
    print("\n" + "-" * 70)
    print("EXAMPLE 2: Driver Race Summary")
    print("-" * 70)
    # Get first driver from timeline
    first_driver = timeline['events'][0]['driver_number']
    summary = get_driver_race_summary(timeline, first_driver)
    if summary:
        print(f"\nDriver: {summary['driver']}")
        print(f"  Laps completed: {summary['laps_completed']}")
        print(f"  Start position: P{summary['starting_position']}")
        print(f"  Finish position: P{summary['finishing_position']}")
        print(f"  Positions gained: {summary['positions_gained']}")
        print(f"  Personal bests set: {summary['personal_bests_set']}")
        print(f"  Best sectors: S1={summary['best_sectors'][1]:.3f}s, "
              f"S2={summary['best_sectors'][2]:.3f}s, S3={summary['best_sectors'][3]:.3f}s")
    
    # Example 3: Close battles
    print("\n" + "-" * 70)
    print("EXAMPLE 3: Close Battles (within 1.0 second)")
    print("-" * 70)
    battles = find_close_battles(timeline, gap_threshold=1.0)
    print(f"Found {len(battles)} moments with cars within 1.0 second")
    if battles:
        print("\nFirst 5 close battles:")
        for battle in battles[:5]:
            print(f"  Lap {battle['lap']}, Sector {battle['sector']}: "
                  f"Car {battle['driver']} within {battle['gap_seconds']:.3f}s "
                  f"({battle['gap_meters']:.1f}m) of car {battle['car_ahead']}")
    
    # Example 4: Sector analysis
    print("\n" + "-" * 70)
    print("EXAMPLE 4: Sector 1 Performance Analysis")
    print("-" * 70)
    sector_analysis = analyze_sector_performance(timeline, sector=1)
    print(f"Total Sector 1 completions: {sector_analysis['total_completions']}")
    print(f"Fastest driver: {sector_analysis['fastest_driver']} "
          f"({sector_analysis['fastest_time']:.3f}s)")
    print(f"Most consistent driver: {sector_analysis['most_consistent_driver']} "
          f"(range: {sector_analysis['consistency_range']:.3f}s)")
    
    # Example 5: Visualization timeline
    print("\n" + "-" * 70)
    print("EXAMPLE 5: Visualization Timeline (10-second intervals)")
    print("-" * 70)
    viz_timeline = generate_visualization_timeline(timeline, time_interval=10.0)
    print(f"Generated {len(viz_timeline)} snapshots")
    if viz_timeline:
        print("\nFirst snapshot (t=0s):")
        for pos in viz_timeline[0]['positions'][:5]:
            print(f"  P{pos['position']}: Car {pos['driver_number']} - {pos['driver_name']}")
    
    print("\n" + "=" * 70)
    print("Examples complete! Use these patterns in your visualization code.")
    print("=" * 70)


if __name__ == "__main__":
    main()
