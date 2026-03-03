#!/usr/bin/env python3
"""
Comparative Analytics Generator for Two-Race Analysis

Generates comprehensive comparative analytics across two race events including:
- Technical compliance analysis (outlier detection, pace jumps)
- Talent development metrics (teammate comparisons, consistency, improvement)
- Battle performance analysis (traffic vs clean air, position changes)
- Field dynamics (competitive balance)

Input: Race data from multiple race folders (auto-detected)
Output: Comprehensive JSON analytics files
"""

import json
import os
import statistics
from pathlib import Path
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass, asdict
from collections import defaultdict
import math


# --- CONFIGURATION ---
class AnalyticsConfig:
    INPUT_DIR = 'input'
    OUTPUT_DIR = 'output'
    
    # Analysis thresholds
    OUTLIER_Z_SCORE_THRESHOLD = -2.5  # Flag drivers faster than 2.5 SD
    PACE_JUMP_THRESHOLD = 0.5  # Seconds above field median improvement
    TRAFFIC_DISTANCE_THRESHOLD = 15.0  # meters - considered "in traffic"
    CLEAN_AIR_DISTANCE_THRESHOLD = 30.0  # meters - considered "clean air"
    
    # Outlier removal for consistency calculations
    CONSISTENCY_Z_THRESHOLD = 3.0


# --- UTILITY FUNCTIONS ---
def time_to_seconds(time_str: str) -> float:
    """Convert time string (MM:SS.mmm or SS.mmm) to seconds"""
    if isinstance(time_str, (int, float)):
        return float(time_str)
    
    time_str = str(time_str).replace(',', '.')
    parts = time_str.split(':')
    
    if len(parts) == 2:
        return float(parts[0]) * 60 + float(parts[1])
    else:
        return float(parts[0])


def calculate_z_score(value: float, mean: float, std_dev: float) -> float:
    """Calculate Z-score for a value"""
    if std_dev == 0:
        return 0.0
    return (value - mean) / std_dev


def calculate_median(values: List[float]) -> Optional[float]:
    """Calculate median of a list"""
    if not values:
        return None
    return statistics.median(values)


def calculate_std_dev(values: List[float]) -> float:
    """Calculate standard deviation"""
    if len(values) < 2:
        return 0.0
    return statistics.stdev(values)


def remove_outliers(values: List[float], z_threshold: float = 3.0) -> List[float]:
    """Remove outliers from a list based on Z-score"""
    if len(values) < 3:
        return values
    
    mean = statistics.mean(values)
    std_dev = calculate_std_dev(values)
    
    if std_dev == 0:
        return values
    
    return [v for v in values if abs((v - mean) / std_dev) < z_threshold]


# --- DATA STRUCTURES ---
@dataclass
class DriverRaceData:
    """Data for a single driver in a single race"""
    driver_number: str
    driver_name: str
    team: str
    race_id: str
    
    # Lap times
    all_lap_times: List[float]
    median_lap_time: Optional[float]
    
    # Sector times
    sector_1_times: List[float]
    sector_2_times: List[float]
    sector_3_times: List[float]
    median_s1: Optional[float]
    median_s2: Optional[float]
    median_s3: Optional[float]
    
    # Consistency
    lap_time_std_dev: float
    
    # Position data
    starting_position: Optional[int] = None
    finishing_position: Optional[int] = None
    
    # Traffic data
    traffic_lap_times: List[float] = None
    clean_air_lap_times: List[float] = None
    
    def __post_init__(self):
        if self.traffic_lap_times is None:
            self.traffic_lap_times = []
        if self.clean_air_lap_times is None:
            self.clean_air_lap_times = []


# --- MAIN ANALYTICS CLASS ---
class ComparativeAnalyticsGenerator:
    """Generates comparative analytics across multiple races"""
    
    def __init__(self, config: AnalyticsConfig):
        self.config = config
        self.races: Dict[str, Dict] = {}  # race_id -> race data
        self.driver_data: Dict[str, Dict[str, DriverRaceData]] = defaultdict(dict)  # driver_number -> race_id -> data
        self.team_mapping: Dict[str, str] = {}  # driver_number -> team
        
    def discover_races(self) -> List[str]:
        """Auto-discover race folders in input directory"""
        input_path = Path(self.config.INPUT_DIR)
        race_folders = []
        
        if not input_path.exists():
            print(f"ERROR: Input directory {self.config.INPUT_DIR} not found")
            return []
        
        for folder in sorted(input_path.iterdir()):
            if folder.is_dir():
                # Check if folder contains required files
                raw_data = folder / 'raw_data.csv'
                if raw_data.exists():
                    race_folders.append(folder.name)
                    print(f"  Discovered race: {folder.name}")
        
        return race_folders
    
    def load_race_data(self, race_id: str) -> bool:
        """Load all data for a single race"""
        print(f"\nLoading data for {race_id}...")
        
        race_folder = Path(self.config.INPUT_DIR) / race_id
        output_folder = Path(self.config.OUTPUT_DIR) / race_id
        
        # Load report.json for team mappings (map by driver name)
        driver_name_to_team = {}
        report_file = race_folder / 'report.json'
        if report_file.exists():
            with open(report_file, 'r') as f:
                report_data = json.load(f)
                for driver in report_data.get('driver_performance', []):
                    driver_name = driver.get('driver_name', '')
                    team = driver.get('team', 'Unknown')
                    if driver_name:
                        driver_name_to_team[driver_name] = team
        
        # Load event timeline files
        timeline_files = list(output_folder.glob('event_timeline_driver_*.json'))
        
        if not timeline_files:
            print(f"  WARNING: No event timeline files found for {race_id}")
            return False
        
        race_driver_data = {}
        
        for timeline_file in timeline_files:
            try:
                with open(timeline_file, 'r') as f:
                    timeline_data = json.load(f)
                    
                driver_number = timeline_data.get('driver_number')
                driver_name = timeline_data.get('driver_name')
                team = driver_name_to_team.get(driver_name, 'Unknown')
                
                # Store team mapping by driver number for later use
                if driver_number:
                    self.team_mapping[driver_number] = team
                
                # Extract lap and sector times from events
                lap_times = []
                sector_1_times = []
                sector_2_times = []
                sector_3_times = []
                
                traffic_laps = []
                clean_air_laps = []
                
                current_lap_sectors = {}
                
                for event in timeline_data.get('events', []):
                    lap_num = event.get('lap_number')
                    sector = event.get('sector')
                    sector_time = event.get('sector_time')
                    event_type = event.get('event_type')
                    gap_distance = event.get('gap_distance_meters')
                    
                    # Collect sector times
                    if sector == 1:
                        sector_1_times.append(sector_time)
                        current_lap_sectors[lap_num] = {'s1': sector_time}
                    elif sector == 2:
                        sector_2_times.append(sector_time)
                        if lap_num in current_lap_sectors:
                            current_lap_sectors[lap_num]['s2'] = sector_time
                    elif event_type == 'lap_complete':
                        # Sector 3 time and complete lap
                        sector_3_times.append(sector_time)
                        if lap_num in current_lap_sectors:
                            current_lap_sectors[lap_num]['s3'] = sector_time
                            
                            # Calculate full lap time
                            lap_time = (current_lap_sectors[lap_num].get('s1', 0) +
                                       current_lap_sectors[lap_num].get('s2', 0) +
                                       current_lap_sectors[lap_num].get('s3', 0))
                            lap_times.append(lap_time)
                            
                            # Classify by traffic
                            if gap_distance is not None:
                                if gap_distance < self.config.TRAFFIC_DISTANCE_THRESHOLD:
                                    traffic_laps.append(lap_time)
                                elif gap_distance > self.config.CLEAN_AIR_DISTANCE_THRESHOLD:
                                    clean_air_laps.append(lap_time)
                
                # Calculate medians
                median_lap = calculate_median(lap_times) if lap_times else None
                median_s1 = calculate_median(sector_1_times) if sector_1_times else None
                median_s2 = calculate_median(sector_2_times) if sector_2_times else None
                median_s3 = calculate_median(sector_3_times) if sector_3_times else None
                
                # Calculate consistency (std dev of clean laps)
                clean_laps = remove_outliers(lap_times, self.config.CONSISTENCY_Z_THRESHOLD)
                std_dev = calculate_std_dev(clean_laps) if len(clean_laps) >= 2 else 0.0
                
                # Create driver race data
                driver_race_data = DriverRaceData(
                    driver_number=driver_number,
                    driver_name=driver_name,
                    team=team,
                    race_id=race_id,
                    all_lap_times=lap_times,
                    median_lap_time=median_lap,
                    sector_1_times=sector_1_times,
                    sector_2_times=sector_2_times,
                    sector_3_times=sector_3_times,
                    median_s1=median_s1,
                    median_s2=median_s2,
                    median_s3=median_s3,
                    lap_time_std_dev=std_dev,
                    traffic_lap_times=traffic_laps,
                    clean_air_lap_times=clean_air_laps
                )
                
                self.driver_data[driver_number][race_id] = driver_race_data
                race_driver_data[driver_number] = driver_race_data
                
            except Exception as e:
                print(f"  ERROR loading {timeline_file.name}: {e}")
                continue
        
        self.races[race_id] = {
            'race_id': race_id,
            'driver_data': race_driver_data
        }
        
        print(f"  Loaded data for {len(race_driver_data)} drivers")
        return True
    
    def generate_technical_compliance_analysis(self) -> Dict:
        """
        Feature 1: Technical Compliance Analysis
        - Sector-level outlier detection
        - Race-to-race pace jump detection
        """
        print("\nGenerating Technical Compliance Analysis...")
        
        analysis = {
            'sector_outliers_by_race': {},
            'persistent_outliers': [],
            'pace_jump_analysis': {
                'driver_improvements': [],
                'flagged_drivers': []
            },
            'visualization_data': {
                'sector_distributions': {},
                'pace_jump_chart': []
            }
        }
        
        # 1.1 Sector-Level Outlier Detection
        for race_id, race_data in self.races.items():
            race_outliers = []
            
            for sector_num in [1, 2, 3]:
                sector_key = f's{sector_num}'
                sector_times = []
                driver_sector_medians = {}
                
                # Collect all sector medians
                for driver_num, driver_data in race_data['driver_data'].items():
                    median = getattr(driver_data, f'median_s{sector_num}')
                    if median is not None:
                        sector_times.append(median)
                        driver_sector_medians[driver_num] = median
                
                if len(sector_times) < 3:
                    continue
                
                # Calculate field statistics
                mean = statistics.mean(sector_times)
                std_dev = calculate_std_dev(sector_times)
                
                # Store distribution data for visualization
                if race_id not in analysis['visualization_data']['sector_distributions']:
                    analysis['visualization_data']['sector_distributions'][race_id] = {}
                
                analysis['visualization_data']['sector_distributions'][race_id][sector_key] = {
                    'mean': round(mean, 3),
                    'std_dev': round(std_dev, 3),
                    'min': round(min(sector_times), 3),
                    'max': round(max(sector_times), 3),
                    'median': round(statistics.median(sector_times), 3),
                    'all_times': [round(t, 3) for t in sorted(sector_times)]
                }
                
                # Find outliers
                for driver_num, median_time in driver_sector_medians.items():
                    z_score = calculate_z_score(median_time, mean, std_dev)
                    
                    if z_score < self.config.OUTLIER_Z_SCORE_THRESHOLD:
                        driver_data = race_data['driver_data'][driver_num]
                        race_outliers.append({
                            'driver': driver_num,
                            'driver_name': driver_data.driver_name,
                            'team': driver_data.team,
                            'sector': sector_num,
                            'median_time': round(median_time, 3),
                            'field_mean': round(mean, 3),
                            'field_std_dev': round(std_dev, 3),
                            'z_score': round(z_score, 3),
                            'seconds_faster': round(mean - median_time, 3)
                        })
            
            analysis['sector_outliers_by_race'][race_id] = race_outliers
        
        # Find persistent outliers (appear in multiple races)
        outlier_counts = defaultdict(int)
        outlier_details = {}
        
        for race_id, outliers in analysis['sector_outliers_by_race'].items():
            for outlier in outliers:
                driver = outlier['driver']
                outlier_counts[driver] += 1
                if driver not in outlier_details:
                    outlier_details[driver] = {
                        'driver': driver,
                        'driver_name': outlier['driver_name'],
                        'team': outlier['team'],
                        'occurrences': [],
                        'total_flags': 0
                    }
                outlier_details[driver]['occurrences'].append({
                    'race': race_id,
                    'sector': outlier['sector'],
                    'z_score': outlier['z_score']
                })
                outlier_details[driver]['total_flags'] += 1
        
        # Persistent outliers appear in 2+ races
        analysis['persistent_outliers'] = [
            details for driver, details in outlier_details.items()
            if len(set(occ['race'] for occ in details['occurrences'])) >= 2
        ]
        
        # 1.2 Race-to-Race Pace Jump Detection
        if len(self.races) >= 2:
            race_ids = sorted(self.races.keys())
            improvements = []
            
            for driver_num in self.driver_data.keys():
                driver_races = self.driver_data[driver_num]
                
                # Need data from at least 2 races
                if len(driver_races) < 2:
                    continue
                
                # Compare first and last race
                first_race = driver_races.get(race_ids[0])
                last_race = driver_races.get(race_ids[-1])
                
                if first_race and last_race:
                    if first_race.median_lap_time and last_race.median_lap_time:
                        improvement = first_race.median_lap_time - last_race.median_lap_time
                        
                        improvements.append({
                            'driver': driver_num,
                            'driver_name': first_race.driver_name,
                            'team': first_race.team,
                            'race_1_median': round(first_race.median_lap_time, 3),
                            'race_2_median': round(last_race.median_lap_time, 3),
                            'improvement': round(improvement, 3),
                            'improvement_percent': round((improvement / first_race.median_lap_time) * 100, 2)
                        })
            
            # Calculate field median improvement
            if improvements:
                field_improvements = [imp['improvement'] for imp in improvements]
                field_median_improvement = statistics.median(field_improvements)
                
                # Flag anomalous improvements
                for imp in improvements:
                    delta_from_field = imp['improvement'] - field_median_improvement
                    imp['field_median_improvement'] = round(field_median_improvement, 3)
                    imp['delta_from_field'] = round(delta_from_field, 3)
                    imp['flagged'] = delta_from_field > self.config.PACE_JUMP_THRESHOLD
                    
                    if imp['flagged']:
                        analysis['pace_jump_analysis']['flagged_drivers'].append(imp['driver'])
                
                # Sort by improvement
                improvements.sort(key=lambda x: x['improvement'], reverse=True)
                analysis['pace_jump_analysis']['driver_improvements'] = improvements
                analysis['pace_jump_analysis']['field_median_improvement'] = round(field_median_improvement, 3)
        
        return analysis

    def generate_talent_development_metrics(self) -> Dict:
        """
        Feature 2: Talent Development Metrics
        - Teammate head-to-head comparison
        - Consistency scores
        - Race-to-race improvement deltas
        """
        print("\nGenerating Talent Development Metrics...")
        
        analysis = {
            'teammate_pairs': [],
            'consistency_rankings': [],
            'improvement_rankings': [],
            'visualization_data': {
                'consistency_quadrant': [],
                'improvement_trends': []
            }
        }
        
        # 2.1 Teammate Head-to-Head Comparison
        # Group drivers by team
        teams = defaultdict(list)
        for driver_num, races in self.driver_data.items():
            # Get team from first available race
            team = next(iter(races.values())).team
            teams[team].append(driver_num)
        
        # Analyze teammate pairs
        for team, drivers in teams.items():
            if len(drivers) >= 2:
                # Analyze all pairs within the team
                for i in range(len(drivers)):
                    for j in range(i + 1, len(drivers)):
                        driver_a = drivers[i]
                        driver_b = drivers[j]
                        
                        pair_analysis = self._analyze_teammate_pair(driver_a, driver_b, team)
                        if pair_analysis:
                            analysis['teammate_pairs'].append(pair_analysis)
        
        # 2.2 Consistency Score (Standard Deviation)
        race_ids = sorted(self.races.keys())
        
        for driver_num, races in self.driver_data.items():
            for race_id in race_ids:
                if race_id in races:
                    driver_data = races[race_id]
                    
                    analysis['consistency_rankings'].append({
                        'driver': driver_num,
                        'driver_name': driver_data.driver_name,
                        'team': driver_data.team,
                        'race': race_id,
                        'std_dev': round(driver_data.lap_time_std_dev, 3),
                        'median_lap_time': round(driver_data.median_lap_time, 3) if driver_data.median_lap_time else None,
                        'lap_count': len(driver_data.all_lap_times)
                    })
        
        # Calculate consistency improvement between races
        if len(race_ids) >= 2:
            consistency_improvements = []
            
            for driver_num, races in self.driver_data.items():
                first_race = races.get(race_ids[0])
                last_race = races.get(race_ids[-1])
                
                if first_race and last_race:
                    improvement = first_race.lap_time_std_dev - last_race.lap_time_std_dev
                    
                    consistency_improvements.append({
                        'driver': driver_num,
                        'driver_name': first_race.driver_name,
                        'team': first_race.team,
                        'race_1_std_dev': round(first_race.lap_time_std_dev, 3),
                        'race_2_std_dev': round(last_race.lap_time_std_dev, 3),
                        'improvement': round(improvement, 3),
                        'race_1_median': round(first_race.median_lap_time, 3) if first_race.median_lap_time else None,
                        'race_2_median': round(last_race.median_lap_time, 3) if last_race.median_lap_time else None
                    })
            
            # Rank by race 2 consistency
            consistency_improvements.sort(key=lambda x: x['race_2_std_dev'])
            for rank, item in enumerate(consistency_improvements, 1):
                item['race_2_rank'] = rank
            
            analysis['consistency_rankings'] = consistency_improvements
            
            # Prepare consistency quadrant data
            for item in consistency_improvements:
                if item['race_2_median'] is not None:
                    analysis['visualization_data']['consistency_quadrant'].append({
                        'driver': item['driver'],
                        'driver_name': item['driver_name'],
                        'speed': item['race_2_median'],
                        'consistency': item['race_2_std_dev']
                    })
        
        # 2.3 Race-to-Race Improvement Deltas
        if len(race_ids) >= 2:
            improvements = []
            
            for driver_num, races in self.driver_data.items():
                first_race = races.get(race_ids[0])
                last_race = races.get(race_ids[-1])
                
                if first_race and last_race:
                    if first_race.median_lap_time and last_race.median_lap_time:
                        improvement_seconds = first_race.median_lap_time - last_race.median_lap_time
                        improvement_percent = (improvement_seconds / first_race.median_lap_time) * 100
                        
                        improvements.append({
                            'driver': driver_num,
                            'driver_name': first_race.driver_name,
                            'team': first_race.team,
                            'improvement_seconds': round(improvement_seconds, 3),
                            'improvement_percent': round(improvement_percent, 2),
                            'race_1_median': round(first_race.median_lap_time, 3),
                            'race_2_median': round(last_race.median_lap_time, 3)
                        })
            
            # Sort by improvement percentage
            improvements.sort(key=lambda x: x['improvement_percent'], reverse=True)
            
            for rank, item in enumerate(improvements, 1):
                item['rank'] = rank
            
            analysis['improvement_rankings'] = improvements
        
        return analysis
    
    def _analyze_teammate_pair(self, driver_a: str, driver_b: str, team: str) -> Optional[Dict]:
        """Analyze head-to-head comparison between two teammates"""
        races_a = self.driver_data.get(driver_a, {})
        races_b = self.driver_data.get(driver_b, {})
        
        if not races_a or not races_b:
            return None
        
        race_ids = sorted(self.races.keys())
        
        pair_data = {
            'team': team,
            'driver_a': driver_a,
            'driver_b': driver_b,
            'driver_a_name': None,
            'driver_b_name': None,
            'race_comparisons': [],
            'sector_advantages': {'S1': {}, 'S2': {}, 'S3': {}},
            'momentum': 'neutral'
        }
        
        wins_a = 0
        wins_b = 0
        
        for race_id in race_ids:
            data_a = races_a.get(race_id)
            data_b = races_b.get(race_id)
            
            if data_a and data_b:
                if pair_data['driver_a_name'] is None:
                    pair_data['driver_a_name'] = data_a.driver_name
                    pair_data['driver_b_name'] = data_b.driver_name
                
                if data_a.median_lap_time and data_b.median_lap_time:
                    gap = abs(data_a.median_lap_time - data_b.median_lap_time)
                    winner = driver_a if data_a.median_lap_time < data_b.median_lap_time else driver_b
                    
                    if winner == driver_a:
                        wins_a += 1
                    else:
                        wins_b += 1
                    
                    pair_data['race_comparisons'].append({
                        'race': race_id,
                        'winner': winner,
                        'winner_name': data_a.driver_name if winner == driver_a else data_b.driver_name,
                        'gap': round(gap, 3),
                        'driver_a_median': round(data_a.median_lap_time, 3),
                        'driver_b_median': round(data_b.median_lap_time, 3)
                    })
                    
                    # Sector advantages
                    for sector_num in [1, 2, 3]:
                        median_a = getattr(data_a, f'median_s{sector_num}')
                        median_b = getattr(data_b, f'median_s{sector_num}')
                        
                        if median_a and median_b:
                            sector_key = f'S{sector_num}'
                            if race_id not in pair_data['sector_advantages'][sector_key]:
                                pair_data['sector_advantages'][sector_key][race_id] = {}
                            
                            leader = driver_a if median_a < median_b else driver_b
                            gap = abs(median_a - median_b)
                            
                            pair_data['sector_advantages'][sector_key][race_id] = {
                                'leader': leader,
                                'leader_name': data_a.driver_name if leader == driver_a else data_b.driver_name,
                                'gap': round(gap, 3)
                            }
        
        # Determine momentum
        if len(pair_data['race_comparisons']) >= 2:
            first_winner = pair_data['race_comparisons'][0]['winner']
            last_winner = pair_data['race_comparisons'][-1]['winner']
            
            if first_winner != last_winner:
                if last_winner == driver_a:
                    pair_data['momentum'] = 'driver_a_improving'
                else:
                    pair_data['momentum'] = 'driver_b_improving'
            elif wins_a > wins_b:
                pair_data['momentum'] = 'driver_a_dominant'
            elif wins_b > wins_a:
                pair_data['momentum'] = 'driver_b_dominant'
        
        pair_data['total_wins_a'] = wins_a
        pair_data['total_wins_b'] = wins_b
        
        return pair_data if pair_data['race_comparisons'] else None
    
    def generate_battle_performance_analysis(self) -> Dict:
        """
        Feature 3: Battle Performance Analysis
        - Pace in traffic vs clean air
        - Position change efficiency
        """
        print("\nGenerating Battle Performance Analysis...")
        
        analysis = {
            'battle_performance': [],
            'position_analysis': [],
            'visualization_data': {
                'traffic_penalty_comparison': [],
                'position_timelines': []
            }
        }
        
        # 3.1 Pace in Traffic vs Clean Air
        race_ids = sorted(self.races.keys())
        
        for driver_num, races in self.driver_data.items():
            for race_id in race_ids:
                if race_id in races:
                    driver_data = races[race_id]
                    
                    traffic_median = calculate_median(driver_data.traffic_lap_times) if driver_data.traffic_lap_times else None
                    clean_median = calculate_median(driver_data.clean_air_lap_times) if driver_data.clean_air_lap_times else None
                    
                    traffic_penalty = None
                    if traffic_median and clean_median:
                        traffic_penalty = traffic_median - clean_median
                    
                    analysis['battle_performance'].append({
                        'driver': driver_num,
                        'driver_name': driver_data.driver_name,
                        'team': driver_data.team,
                        'race': race_id,
                        'traffic_median': round(traffic_median, 3) if traffic_median else None,
                        'clean_air_median': round(clean_median, 3) if clean_median else None,
                        'traffic_penalty': round(traffic_penalty, 3) if traffic_penalty else None,
                        'traffic_lap_count': len(driver_data.traffic_lap_times),
                        'clean_air_lap_count': len(driver_data.clean_air_lap_times)
                    })
        
        # Calculate traffic penalty improvement between races
        if len(race_ids) >= 2:
            penalty_improvements = []
            
            for driver_num, races in self.driver_data.items():
                first_race = races.get(race_ids[0])
                last_race = races.get(race_ids[-1])
                
                if first_race and last_race:
                    traffic_1 = calculate_median(first_race.traffic_lap_times) if first_race.traffic_lap_times else None
                    clean_1 = calculate_median(first_race.clean_air_lap_times) if first_race.clean_air_lap_times else None
                    traffic_2 = calculate_median(last_race.traffic_lap_times) if last_race.traffic_lap_times else None
                    clean_2 = calculate_median(last_race.clean_air_lap_times) if last_race.clean_air_lap_times else None
                    
                    penalty_1 = (traffic_1 - clean_1) if (traffic_1 and clean_1) else None
                    penalty_2 = (traffic_2 - clean_2) if (traffic_2 and clean_2) else None
                    
                    if penalty_1 is not None and penalty_2 is not None:
                        improvement = penalty_1 - penalty_2
                        
                        penalty_improvements.append({
                            'driver': driver_num,
                            'driver_name': first_race.driver_name,
                            'team': first_race.team,
                            'race_1_traffic_penalty': round(penalty_1, 3),
                            'race_2_traffic_penalty': round(penalty_2, 3),
                            'improvement': round(improvement, 3),
                            'clean_air_median': round(clean_2, 3) if clean_2 else None,
                            'traffic_median': round(traffic_2, 3) if traffic_2 else None
                        })
            
            # Sort by lowest penalty in race 2
            penalty_improvements.sort(key=lambda x: x['race_2_traffic_penalty'])
            analysis['visualization_data']['traffic_penalty_comparison'] = penalty_improvements
        
        # 3.2 Position Change Efficiency
        # Load position data from event timelines
        for race_id, race_data in self.races.items():
            output_folder = Path(self.config.OUTPUT_DIR) / race_id
            timeline_files = list(output_folder.glob('event_timeline_driver_*.json'))
            
            for timeline_file in timeline_files:
                try:
                    with open(timeline_file, 'r') as f:
                        timeline_data = json.load(f)
                    
                    driver_number = timeline_data.get('driver_number')
                    driver_name = timeline_data.get('driver_name')
                    team = self.team_mapping.get(driver_number, 'Unknown')
                    
                    events = timeline_data.get('events', [])
                    
                    if not events:
                        continue
                    
                    # Track positions throughout race
                    positions = []
                    position_changes = []
                    
                    for event in events:
                        position = event.get('race_position')
                        position_change = event.get('position_change', 0)
                        elapsed_time = event.get('elapsed_race_time')
                        
                        positions.append({
                            'elapsed_time': elapsed_time,
                            'position': position
                        })
                        
                        if position_change != 0:
                            position_changes.append(position_change)
                    
                    starting_position = positions[0]['position'] if positions else None
                    finishing_position = positions[-1]['position'] if positions else None
                    
                    positions_gained = sum(1 for pc in position_changes if pc < 0)
                    positions_lost = sum(1 for pc in position_changes if pc > 0)
                    net_change = starting_position - finishing_position if (starting_position and finishing_position) else 0
                    
                    analysis['position_analysis'].append({
                        'driver': driver_number,
                        'driver_name': driver_name,
                        'team': team,
                        'race': race_id,
                        'starting_position': starting_position,
                        'finishing_position': finishing_position,
                        'net_change': net_change,
                        'positions_gained': positions_gained,
                        'positions_lost': positions_lost,
                        'position_changes_count': len(position_changes)
                    })
                    
                    # Store position timeline for visualization
                    analysis['visualization_data']['position_timelines'].append({
                        'driver': driver_number,
                        'driver_name': driver_name,
                        'race': race_id,
                        'timeline': positions
                    })
                    
                except Exception as e:
                    print(f"  ERROR processing position data from {timeline_file.name}: {e}")
                    continue
        
        return analysis
    
    def generate_field_dynamics_analysis(self) -> Dict:
        """
        Feature 4: Field Dynamics
        - Competitive balance index
        """
        print("\nGenerating Field Dynamics Analysis...")
        
        analysis = {
            'field_balance': {},
            'race_comparisons': [],
            'visualization_data': {
                'gap_funnel': [],
                'field_spread_timeline': []
            }
        }
        
        race_ids = sorted(self.races.keys())
        
        for race_id in race_ids:
            race_data = self.races[race_id]
            
            # Collect all median lap times
            all_medians = []
            for driver_num, driver_data in race_data['driver_data'].items():
                if driver_data.median_lap_time:
                    all_medians.append(driver_data.median_lap_time)
            
            if len(all_medians) < 10:
                print(f"  WARNING: Not enough drivers in {race_id} for field balance analysis")
                continue
            
            all_medians.sort()
            
            # P1 to P10 gap
            p1_to_p10_gap = all_medians[9] - all_medians[0] if len(all_medians) >= 10 else None
            
            # Field standard deviation
            field_std_dev = calculate_std_dev(all_medians)
            
            # P1, P5, P10 times
            p1_time = all_medians[0]
            p5_time = all_medians[4] if len(all_medians) >= 5 else None
            p10_time = all_medians[9] if len(all_medians) >= 10 else None
            
            analysis['field_balance'][race_id] = {
                'race': race_id,
                'p1_to_p10_gap': round(p1_to_p10_gap, 3) if p1_to_p10_gap else None,
                'field_std_dev': round(field_std_dev, 3),
                'p1_time': round(p1_time, 3),
                'p5_time': round(p5_time, 3) if p5_time else None,
                'p10_time': round(p10_time, 3) if p10_time else None,
                'driver_count': len(all_medians)
            }
            
            # Store for gap funnel visualization
            analysis['visualization_data']['gap_funnel'].append({
                'race': race_id,
                'p1': round(p1_time, 3),
                'p5': round(p5_time, 3) if p5_time else None,
                'p10': round(p10_time, 3) if p10_time else None
            })
            
            # Store for field spread timeline
            analysis['visualization_data']['field_spread_timeline'].append({
                'race': race_id,
                'std_dev': round(field_std_dev, 3)
            })
        
        # Calculate trend between races
        if len(race_ids) >= 2:
            first_race = analysis['field_balance'][race_ids[0]]
            last_race = analysis['field_balance'][race_ids[-1]]
            
            trend_magnitude = last_race['field_std_dev'] - first_race['field_std_dev']
            trend = 'converging' if trend_magnitude < 0 else 'diverging'
            
            analysis['race_comparisons'].append({
                'from_race': race_ids[0],
                'to_race': race_ids[-1],
                'trend': trend,
                'trend_magnitude': round(trend_magnitude, 3),
                'gap_change': round(last_race['p1_to_p10_gap'] - first_race['p1_to_p10_gap'], 3) if (last_race['p1_to_p10_gap'] and first_race['p1_to_p10_gap']) else None
            })
        
        return analysis
    
    def generate_executive_summary(self, technical_compliance: Dict, talent_development: Dict, 
                                   battle_performance: Dict, field_dynamics: Dict) -> Dict:
        """Generate executive summary report"""
        print("\nGenerating Executive Summary...")
        
        race_ids = sorted(self.races.keys())
        
        summary = {
            'report_title': f'Race Comparison Report: {" vs ".join(race_ids)}',
            'races_analyzed': race_ids,
            'total_drivers': len(self.driver_data),
            'technical_compliance_alerts': {
                'sector_outlier_count': sum(len(outliers) for outliers in technical_compliance['sector_outliers_by_race'].values()),
                'persistent_outlier_count': len(technical_compliance['persistent_outliers']),
                'anomalous_improvement_count': len(technical_compliance['pace_jump_analysis']['flagged_drivers'])
            },
            'talent_development_insights': {},
            'field_health': {}
        }
        
        # Talent insights
        if talent_development['improvement_rankings']:
            top_improver = talent_development['improvement_rankings'][0]
            summary['talent_development_insights']['most_improved_driver'] = {
                'driver': top_improver['driver'],
                'driver_name': top_improver['driver_name'],
                'improvement_percent': top_improver['improvement_percent']
            }
        
        if talent_development['consistency_rankings']:
            most_consistent = min(talent_development['consistency_rankings'], 
                                 key=lambda x: x.get('race_2_std_dev', float('inf')))
            summary['talent_development_insights']['most_consistent_driver'] = {
                'driver': most_consistent['driver'],
                'driver_name': most_consistent['driver_name'],
                'std_dev': most_consistent['race_2_std_dev']
            }
        
        # Field health
        if field_dynamics['race_comparisons']:
            comparison = field_dynamics['race_comparisons'][0]
            summary['field_health'] = {
                'competitive_balance': comparison['trend'].upper(),
                'trend_magnitude': comparison['trend_magnitude'],
                'gap_change': comparison['gap_change']
            }
        
        return summary
    
    def generate_all_analytics(self) -> Dict:
        """Generate all analytics and return complete dataset"""
        print("\n" + "="*70)
        print("  COMPARATIVE ANALYTICS GENERATOR")
        print("="*70)
        
        # Discover and load races
        race_ids = self.discover_races()
        
        if len(race_ids) < 2:
            print(f"\nERROR: Need at least 2 races for comparison. Found {len(race_ids)}")
            return None
        
        print(f"\nFound {len(race_ids)} races for analysis")
        
        # Load data for each race
        for race_id in race_ids:
            if not self.load_race_data(race_id):
                print(f"ERROR: Failed to load data for {race_id}")
                return None
        
        # Generate all analytics
        technical_compliance = self.generate_technical_compliance_analysis()
        talent_development = self.generate_talent_development_metrics()
        battle_performance = self.generate_battle_performance_analysis()
        field_dynamics = self.generate_field_dynamics_analysis()
        executive_summary = self.generate_executive_summary(
            technical_compliance, talent_development, battle_performance, field_dynamics
        )
        
        # Compile complete analytics
        complete_analytics = {
            'executive_summary': executive_summary,
            'technical_compliance': technical_compliance,
            'talent_development': talent_development,
            'battle_performance': battle_performance,
            'field_dynamics': field_dynamics,
            'metadata': {
                'races_analyzed': race_ids,
                'total_drivers': len(self.driver_data),
                'generation_timestamp': None  # Will be set during save
            }
        }
        
        return complete_analytics
    
    def save_outputs(self, analytics: Dict):
        """Save analytics to JSON files"""
        print("\nSaving analytics outputs...")
        
        from datetime import datetime
        analytics['metadata']['generation_timestamp'] = datetime.now().isoformat()
        
        output_dir = Path(self.config.OUTPUT_DIR)
        output_dir.mkdir(exist_ok=True)
        
        # Save complete analytics
        complete_file = output_dir / 'comparative_analytics_complete.json'
        with open(complete_file, 'w') as f:
            json.dump(analytics, f, indent=2)
        print(f"  ✓ {complete_file}")
        
        # Save individual modules
        modules = [
            ('executive_summary', 'comparative_analytics_executive_summary.json'),
            ('technical_compliance', 'comparative_analytics_technical_compliance.json'),
            ('talent_development', 'comparative_analytics_talent_development.json'),
            ('battle_performance', 'comparative_analytics_battle_performance.json'),
            ('field_dynamics', 'comparative_analytics_field_dynamics.json')
        ]
        
        for key, filename in modules:
            module_file = output_dir / filename
            with open(module_file, 'w') as f:
                json.dump({key: analytics[key], 'metadata': analytics['metadata']}, f, indent=2)
            print(f"  ✓ {module_file}")


def main():
    """Main execution function"""
    config = AnalyticsConfig()
    generator = ComparativeAnalyticsGenerator(config)
    
    analytics = generator.generate_all_analytics()
    
    if analytics:
        generator.save_outputs(analytics)
        print("\n" + "="*70)
        print("  ANALYTICS GENERATION COMPLETE")
        print("="*70)
        return 0
    else:
        print("\n" + "="*70)
        print("  ANALYTICS GENERATION FAILED")
        print("="*70)
        return 1


if __name__ == "__main__":
    import sys
    sys.exit(main())
