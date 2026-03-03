import pandas as pd
import numpy as np
import json
import os
from typing import Dict, List, Tuple, Optional
from dataclasses import dataclass, asdict
from collections import defaultdict

# --- CONFIGURATION ---
class TimelineConfig:
    # --- File Paths ---
    INPUT_DIR = 'input'
    OUTPUT_DIR = 'output'
    RACE_DATA_FILE = 'raw_data.csv'
    TELEMETRY_DIR = 'output'  # Where telemetry JSONs are stored
    
    # --- Delta Calculation Mode ---
    DELTA_MODE = 'adjacent'  # 'adjacent' (car ahead/behind) or 'leader' (delta to race leader)
    
    # --- Sector Performance Thresholds (percentiles) ---
    FASTEST_THRESHOLD = 0.02  # Top 2% = Purple (fastest)
    FAST_THRESHOLD = 0.25     # Top 25% = Green (fast)
    AVERAGE_THRESHOLD = 0.75  # Middle 50% = Yellow (average)
    # Anything above 75th percentile = Red (slow)

# --- DATA STRUCTURES ---
@dataclass
class SectorEvent:
    event_id: int
    elapsed_race_time: float
    driver_number: str
    driver_name: str
    event_type: str  # 'sector_1_complete', 'sector_2_complete', 'lap_complete'
    sector: int
    lap_number: int
    sector_time: float
    cumulative_lap_time: float
    race_position: int
    position_change: int
    on_same_lap_as_leader: bool
    laps_behind_leader: int
    deltas: Dict[str, float]
    gap_distance_meters: Optional[float]
    sector_performance: str  # 'fastest', 'fast', 'average', 'slow'
    is_personal_best: bool
    
    def to_dict(self):
        return asdict(self)

@dataclass
class RacePosition:
    """Tracks a driver's position at a specific moment in time"""
    driver_number: str
    elapsed_time: float
    lap_number: int
    sector_just_completed: int
    cumulative_time: float  # Total race time including all previous laps

# --- MAIN CLASS ---
class EventTimelineGenerator:
    """Generates a chronological event timeline with sector completions and deltas."""
    
    def __init__(self, config: TimelineConfig):
        self.config = config
        self.race_df = None
        self.events: List[SectorEvent] = []
        self.sector_times: Dict[int, List[float]] = {1: [], 2: [], 3: []}
        self.driver_best_sectors: Dict[str, Dict[int, float]] = defaultdict(lambda: {1: float('inf'), 2: float('inf'), 3: float('inf')})
        self.event_counter = 0
        
    def load_data(self) -> bool:
        """Load race data CSV"""
        print("Loading race data for timeline generation...")
        filepath = os.path.join(self.config.INPUT_DIR, self.config.RACE_DATA_FILE)
        try:
            self.race_df = pd.read_csv(filepath, sep=';', encoding='utf-8-sig')
            self.race_df.columns = self.race_df.columns.str.strip().str.replace(r'^\ufeff', '', regex=True)
            
            required_cols = ['NUMBER', 'DRIVER_NAME', 'LAP_NUMBER', 'LAP_TIME', 'S1', 'S2', 'S3', 'ELAPSED']
            missing_cols = [col for col in required_cols if col not in self.race_df.columns]
            if missing_cols:
                print(f"ERROR: Race data is missing required columns: {missing_cols}")
                return False
                
            return True
        except FileNotFoundError:
            print(f"ERROR: Race data file not found at {filepath}")
            return False
        except Exception as e:
            print(f"ERROR loading race data: {e}")
            return False
    
    def prepare_data(self):
        """Convert time strings to seconds"""
        print("Preparing race data (converting times to seconds)...")
        
        def time_to_seconds(t_str):
            try:
                parts = str(t_str).replace(',', '.').split(':')
                if len(parts) == 3:
                    return float(parts[0]) * 3600 + float(parts[1]) * 60 + float(parts[2])
                if len(parts) == 2:
                    return float(parts[0]) * 60 + float(parts[1])
                if len(parts) == 1:
                    return float(parts[0])
            except (ValueError, AttributeError):
                return 0.0
            return 0.0
        
        for col in ['LAP_TIME', 'S1', 'S2', 'S3', 'ELAPSED']:
            if col in self.race_df.columns:
                self.race_df[f'{col}_SECONDS'] = self.race_df[col].apply(time_to_seconds)
        
        # Sort by elapsed time to process events chronologically
        self.race_df = self.race_df.sort_values('ELAPSED_SECONDS').reset_index(drop=True)
        
    def generate_timeline(self):
        """Main method to generate the complete event timeline"""
        print("\nGenerating event timeline...")
        
        # First pass: collect all sector times for performance classification
        self._collect_sector_statistics()
        
        # Second pass: generate events with all metadata
        self._generate_events()
        
        # Sort events by elapsed time
        self.events.sort(key=lambda e: e.elapsed_race_time)
        
        # Reassign event IDs after sorting
        for idx, event in enumerate(self.events, start=1):
            event.event_id = idx
        
        print(f"Generated {len(self.events)} timeline events")
        
    def _collect_sector_statistics(self):
        """Collect all sector times for performance classification"""
        print("Collecting sector statistics...")
        
        for _, row in self.race_df.iterrows():
            s1_time = row['S1_SECONDS']
            s2_time = row['S2_SECONDS']
            s3_time = row['S3_SECONDS']
            
            # Only include valid sector times (not pit laps or errors)
            if s1_time > 0 and s1_time < 100:  # Reasonable sector time
                self.sector_times[1].append(s1_time)
            if s2_time > 0 and s2_time < 100:
                self.sector_times[2].append(s2_time)
            if s3_time > 0 and s3_time < 100:
                self.sector_times[3].append(s3_time)
    
    def _classify_sector_performance(self, sector: int, sector_time: float) -> str:
        """Classify sector time as fastest, fast, average, or slow"""
        if sector not in self.sector_times or not self.sector_times[sector]:
            return 'average'
        
        times = sorted(self.sector_times[sector])
        if not times:
            return 'average'
        
        # Find percentile of this time
        position = np.searchsorted(times, sector_time)
        percentile = position / len(times)
        
        if percentile <= self.config.FASTEST_THRESHOLD:
            return 'fastest'
        elif percentile <= self.config.FAST_THRESHOLD:
            return 'fast'
        elif percentile <= self.config.AVERAGE_THRESHOLD:
            return 'average'
        else:
            return 'slow'
    
    def _generate_events(self):
        """Generate all sector completion events"""
        print("Generating sector completion events...")
        
        # Group by lap to process chronologically
        for _, row in self.race_df.iterrows():
            driver_num = str(row['NUMBER']).strip()
            driver_name = row['DRIVER_NAME']
            lap_num = int(row['LAP_NUMBER'])
            
            s1_time = row['S1_SECONDS']
            s2_time = row['S2_SECONDS']
            s3_time = row['S3_SECONDS']
            lap_time = row['LAP_TIME_SECONDS']
            elapsed = row['ELAPSED_SECONDS']
            
            # Skip invalid laps
            if lap_time <= 0 or elapsed <= 0:
                continue
            
            # Calculate elapsed times for each sector completion
            # Sector 1 completes at: elapsed - lap_time + s1_time
            # Sector 2 completes at: elapsed - lap_time + s1_time + s2_time
            # Lap completes at: elapsed (which also completes sector 3)
            
            s1_elapsed = elapsed - lap_time + s1_time
            s2_elapsed = elapsed - lap_time + s1_time + s2_time
            lap_elapsed = elapsed
            
            # Generate Sector 1 event
            if s1_time > 0:
                event = self._create_sector_event(
                    driver_num, driver_name, lap_num, 1, s1_time, s1_time, s1_elapsed
                )
                if event:
                    self.events.append(event)
            
            # Generate Sector 2 event
            if s2_time > 0:
                event = self._create_sector_event(
                    driver_num, driver_name, lap_num, 2, s2_time, s1_time + s2_time, s2_elapsed
                )
                if event:
                    self.events.append(event)
            
            # Generate Lap Complete (Sector 3) event
            if s3_time > 0:
                event = self._create_sector_event(
                    driver_num, driver_name, lap_num, 3, s3_time, lap_time, lap_elapsed, is_lap_complete=True
                )
                if event:
                    self.events.append(event)
    
    def _create_sector_event(self, driver_num: str, driver_name: str, lap_num: int,
                            sector: int, sector_time: float, cumulative_lap_time: float,
                            elapsed_race_time: float, is_lap_complete: bool = False) -> Optional[SectorEvent]:
        """Create a single sector event with all metadata"""
        
        self.event_counter += 1
        
        # Determine event type
        if is_lap_complete:
            event_type = 'lap_complete'
        else:
            event_type = f'sector_{sector}_complete'
        
        # Calculate race position at this moment
        position_data = self._calculate_race_position(elapsed_race_time, driver_num, lap_num, sector)
        
        # Calculate deltas
        deltas, gap_distance = self._calculate_deltas(
            elapsed_race_time, driver_num, lap_num, sector, position_data
        )
        
        # Classify sector performance
        performance = self._classify_sector_performance(sector, sector_time)
        
        # Check if personal best
        is_pb = sector_time < self.driver_best_sectors[driver_num][sector]
        if is_pb:
            self.driver_best_sectors[driver_num][sector] = sector_time
        
        # Determine position change (compare to previous sector or lap)
        position_change = self._calculate_position_change(driver_num, lap_num, sector, position_data['position'])
        
        event = SectorEvent(
            event_id=self.event_counter,
            elapsed_race_time=round(elapsed_race_time, 3),
            driver_number=driver_num,
            driver_name=driver_name,
            event_type=event_type,
            sector=sector,
            lap_number=lap_num,
            sector_time=round(sector_time, 3),
            cumulative_lap_time=round(cumulative_lap_time, 3),
            race_position=position_data['position'],
            position_change=position_change,
            on_same_lap_as_leader=position_data['on_same_lap_as_leader'],
            laps_behind_leader=position_data['laps_behind_leader'],
            deltas=deltas,
            gap_distance_meters=gap_distance,
            sector_performance=performance,
            is_personal_best=is_pb
        )
        
        return event

    def _calculate_race_position(self, elapsed_time: float, driver_num: str, 
                                 lap_num: int, sector: int) -> Dict:
        """Calculate race position at a specific moment in time"""
        
        # Get all drivers' progress at this elapsed time
        positions = []
        
        for driver in self.race_df['NUMBER'].unique():
            driver_data = self.race_df[self.race_df['NUMBER'] == driver].copy()
            
            # Find where this driver was at this elapsed time
            # We need to find the most recent sector completion that happened at or before elapsed_time
            best_match = None
            
            for _, row in driver_data.iterrows():
                row_lap = int(row['LAP_NUMBER'])
                row_elapsed = row['ELAPSED_SECONDS']
                lap_time = row['LAP_TIME_SECONDS']
                s1_time = row['S1_SECONDS']
                s2_time = row['S2_SECONDS']
                
                # Calculate elapsed times for each sector completion in this lap
                s1_elapsed = row_elapsed - lap_time + s1_time
                s2_elapsed = row_elapsed - lap_time + s1_time + s2_time
                s3_elapsed = row_elapsed  # Lap complete
                
                # Check each sector completion
                candidates = []
                if s1_time > 0 and s1_elapsed <= elapsed_time:
                    candidates.append({'lap': row_lap, 'sector': 1, 'elapsed': s1_elapsed})
                if s2_time > 0 and s2_elapsed <= elapsed_time:
                    candidates.append({'lap': row_lap, 'sector': 2, 'elapsed': s2_elapsed})
                if s3_elapsed <= elapsed_time:
                    candidates.append({'lap': row_lap, 'sector': 3, 'elapsed': s3_elapsed})
                
                # Find the most recent (highest elapsed time) candidate
                for candidate in candidates:
                    if best_match is None or candidate['elapsed'] > best_match['elapsed']:
                        best_match = candidate
            
            if best_match:
                positions.append({
                    'driver': str(driver).strip(),
                    'lap': best_match['lap'],
                    'sector': best_match['sector'],
                    'elapsed': best_match['elapsed']
                })
        
        # Sort by lap (descending), then by sector (descending), then by elapsed time (ascending)
        positions.sort(key=lambda x: (-x['lap'], -x['sector'], x['elapsed']))
        
        # Find current driver's position
        current_position = 1
        leader_lap = positions[0]['lap'] if positions else lap_num
        
        for idx, pos in enumerate(positions, start=1):
            if pos['driver'] == driver_num:
                current_position = idx
                break
        
        laps_behind = max(0, leader_lap - lap_num)
        on_same_lap = (laps_behind == 0)
        
        return {
            'position': current_position,
            'on_same_lap_as_leader': on_same_lap,
            'laps_behind_leader': laps_behind,
            'all_positions': positions
        }
    
    def _calculate_deltas(self, elapsed_time: float, driver_num: str, 
                         lap_num: int, sector: int, position_data: Dict) -> Tuple[Dict[str, float], Optional[float]]:
        """Calculate time deltas to other cars at the same sector completion
        
        Delta convention:
        - Positive delta = you are BEHIND (took more time to reach this point)
        - Negative delta = you are AHEAD (took less time to reach this point)
        
        For 'to_car_ahead': positive means you're behind them (normal)
        For 'to_car_behind': negative means they're behind you (normal)
        
        IMPORTANT: We only calculate meaningful deltas when comparing the same sector completion.
        For example, when car A completes S3 of lap 10, we compare to when car B completed S3 of lap 10.
        """
        
        deltas = {}
        gap_distance = None
        
        all_positions = position_data['all_positions']
        current_position = position_data['position']
        
        # Find current driver in positions list
        current_driver_data = None
        for pos in all_positions:
            if pos['driver'] == driver_num:
                current_driver_data = pos
                break
        
        if not current_driver_data:
            return deltas, gap_distance
        
        current_elapsed = current_driver_data['elapsed']
        current_lap = current_driver_data['lap']
        current_sector = current_driver_data['sector']
        
        # Find other drivers at the same lap/sector completion for accurate deltas
        same_point_positions = []
        for pos in all_positions:
            if pos['lap'] == current_lap and pos['sector'] == current_sector:
                same_point_positions.append(pos)
        
        # Sort by elapsed time to get positions at this specific point
        same_point_positions.sort(key=lambda x: x['elapsed'])
        
        # Find current driver's position among those who completed this same point
        current_idx = None
        for idx, pos in enumerate(same_point_positions):
            if pos['driver'] == driver_num:
                current_idx = idx
                break
        
        if self.config.DELTA_MODE == 'leader':
            # Delta to race leader at this same sector
            if current_idx is not None and current_idx > 0:
                leader = same_point_positions[0]
                # Positive = you're behind the leader
                delta = current_elapsed - leader['elapsed']
                deltas['to_leader'] = round(delta, 3)
                
                # Estimate gap distance (assuming average speed of 150 kph = 41.67 m/s)
                gap_distance = round(abs(delta) * 41.67, 1)
        
        else:  # adjacent mode
            # Delta to car ahead (at same sector completion)
            if current_idx is not None and current_idx > 0:
                car_ahead = same_point_positions[current_idx - 1]
                # Positive = you're behind the car ahead (normal situation)
                delta = current_elapsed - car_ahead['elapsed']
                deltas['to_car_ahead'] = round(delta, 3)
                deltas['car_ahead_number'] = car_ahead['driver']
                
                # Estimate gap distance
                gap_distance = round(abs(delta) * 41.67, 1)
            
            # Delta to car behind (at same sector completion)
            if current_idx is not None and current_idx < len(same_point_positions) - 1:
                car_behind = same_point_positions[current_idx + 1]
                # Negative = they're behind you (normal situation)
                delta = current_elapsed - car_behind['elapsed']
                deltas['to_car_behind'] = round(-delta, 3)  # Negate so it's negative when they're behind
                deltas['car_behind_number'] = car_behind['driver']
        
        # Always include delta to all cars at the same sector completion
        # Positive = they're behind you (took longer), Negative = they're ahead of you (took less time)
        deltas['to_all_cars'] = {}
        for pos in same_point_positions:
            if pos['driver'] != driver_num:
                # Positive = you're ahead of them (they took longer to reach this point)
                # Negative = you're behind them (they were faster to this point)
                delta = pos['elapsed'] - current_elapsed
                deltas['to_all_cars'][pos['driver']] = round(delta, 3)
        
        return deltas, gap_distance
    
    def _calculate_position_change(self, driver_num: str, lap_num: int, 
                                   sector: int, current_position: int) -> int:
        """Calculate position change since last sector/lap"""
        
        # Find previous sector event for this driver
        previous_position = None
        
        for event in reversed(self.events):
            if event.driver_number == driver_num:
                # Found most recent event for this driver
                previous_position = event.race_position
                break
        
        if previous_position is None:
            return 0  # First event for this driver
        
        # Positive = gained positions, Negative = lost positions
        return previous_position - current_position
    
    def save_outputs(self):
        """Save all output files"""
        print("\nSaving event timeline outputs...")
        
        if not os.path.exists(self.config.OUTPUT_DIR):
            os.makedirs(self.config.OUTPUT_DIR)
        
        # 1. Complete chronological timeline (all drivers interleaved)
        self._save_complete_timeline()
        
        # 2. Per-driver timelines
        self._save_per_driver_timelines()
        
        # 3. Statistics and metadata
        self._save_statistics()
        
        print("Event timeline generation complete!")
    
    def _save_complete_timeline(self):
        """Save complete chronological timeline"""
        output = {
            'race_metadata': self._generate_race_metadata(),
            'configuration': {
                'delta_mode': self.config.DELTA_MODE,
                'performance_thresholds': {
                    'fastest': f'Top {self.config.FASTEST_THRESHOLD * 100}%',
                    'fast': f'Top {self.config.FAST_THRESHOLD * 100}%',
                    'average': f'{self.config.FAST_THRESHOLD * 100}% - {self.config.AVERAGE_THRESHOLD * 100}%',
                    'slow': f'Bottom {(1 - self.config.AVERAGE_THRESHOLD) * 100}%'
                }
            },
            'events': [event.to_dict() for event in self.events]
        }
        
        filepath = os.path.join(self.config.OUTPUT_DIR, 'event_timeline_complete.json')
        with open(filepath, 'w') as f:
            json.dump(output, f, indent=2)
        print(f"  Saved complete timeline to {filepath}")
    
    def _save_per_driver_timelines(self):
        """Save individual timeline for each driver"""
        
        # Group events by driver
        driver_events = defaultdict(list)
        for event in self.events:
            driver_events[event.driver_number].append(event)
        
        # Save each driver's timeline
        for driver_num, events in driver_events.items():
            driver_name = events[0].driver_name if events else "Unknown"
            
            output = {
                'driver_number': driver_num,
                'driver_name': driver_name,
                'total_events': len(events),
                'events': [event.to_dict() for event in events]
            }
            
            filename = f'event_timeline_driver_{driver_num}.json'
            filepath = os.path.join(self.config.OUTPUT_DIR, filename)
            with open(filepath, 'w') as f:
                json.dump(output, f, indent=2)
        
        print(f"  Saved {len(driver_events)} per-driver timeline files")
    
    def _save_statistics(self):
        """Save sector statistics and race metadata"""
        
        stats = {
            'race_metadata': self._generate_race_metadata(),
            'sector_statistics': self._generate_sector_statistics(),
            'driver_statistics': self._generate_driver_statistics()
        }
        
        filepath = os.path.join(self.config.OUTPUT_DIR, 'event_timeline_statistics.json')
        with open(filepath, 'w') as f:
            json.dump(stats, f, indent=2)
        print(f"  Saved statistics to {filepath}")
    
    def _generate_race_metadata(self) -> Dict:
        """Generate race metadata"""
        total_drivers = len(self.race_df['NUMBER'].unique())
        max_lap = self.race_df['LAP_NUMBER'].max()
        max_elapsed = self.race_df['ELAPSED_SECONDS'].max()
        
        return {
            'total_drivers': int(total_drivers),
            'total_laps': int(max_lap),
            'race_duration_seconds': round(float(max_elapsed), 3),
            'total_events': len(self.events)
        }
    
    def _generate_sector_statistics(self) -> Dict:
        """Generate sector statistics"""
        stats = {}
        
        for sector in [1, 2, 3]:
            if sector in self.sector_times and self.sector_times[sector]:
                times = self.sector_times[sector]
                fastest_time = min(times)
                
                # Find who set the fastest time
                fastest_driver = None
                for event in self.events:
                    if event.sector == sector and abs(event.sector_time - fastest_time) < 0.001:
                        fastest_driver = event.driver_number
                        break
                
                stats[f'sector_{sector}'] = {
                    'fastest_time': round(fastest_time, 3),
                    'fastest_driver': fastest_driver,
                    'average_time': round(np.mean(times), 3),
                    'median_time': round(np.median(times), 3),
                    'slowest_time': round(max(times), 3),
                    'total_completions': len(times)
                }
        
        return stats
    
    def _generate_driver_statistics(self) -> Dict:
        """Generate per-driver statistics"""
        stats = {}
        
        for driver_num in self.race_df['NUMBER'].unique():
            driver_num_str = str(driver_num).strip()
            driver_events = [e for e in self.events if e.driver_number == driver_num_str]
            
            if not driver_events:
                continue
            
            driver_name = driver_events[0].driver_name
            
            # Count sector completions
            sector_completions = {1: 0, 2: 0, 3: 0}
            personal_bests = {1: float('inf'), 2: float('inf'), 3: float('inf')}
            
            for event in driver_events:
                sector_completions[event.sector] += 1
                if event.sector_time < personal_bests[event.sector]:
                    personal_bests[event.sector] = event.sector_time
            
            stats[driver_num_str] = {
                'driver_name': driver_name,
                'total_events': len(driver_events),
                'sector_completions': sector_completions,
                'personal_best_sectors': {
                    f'sector_{k}': round(v, 3) if v != float('inf') else None 
                    for k, v in personal_bests.items()
                }
            }
        
        return stats


def main():
    """Main execution function"""
    import time
    start_time = time.time()
    
    print("=" * 60)
    print("EVENT TIMELINE GENERATOR")
    print("=" * 60)
    
    config = TimelineConfig()
    generator = EventTimelineGenerator(config)
    
    # Load and prepare data
    if not generator.load_data():
        return
    
    generator.prepare_data()
    
    # Generate timeline
    generator.generate_timeline()
    
    # Save outputs
    generator.save_outputs()
    
    end_time = time.time()
    print(f"\nTotal execution time: {end_time - start_time:.2f} seconds")
    print("=" * 60)


if __name__ == "__main__":
    main()
