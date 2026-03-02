import os
import sys
import json
import yaml
import numpy as np
from collections import defaultdict
import pandas as pd
class SafeNpEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, np.integer):
            return int(obj)
        elif isinstance(obj, np.floating):
            return float(obj) if np.isfinite(obj) else None
        elif isinstance(obj, np.ndarray):
            return obj.tolist()
        elif isinstance(obj, float):
            return obj if np.isfinite(obj) else None
        return super(SafeNpEncoder, self).default(obj)

def get_nested(data, keys, default=None):
    for key in keys:
        if isinstance(data, dict):
            data = data.get(key)
        else:
            return default
    return data

def load_session_reports(weekend_path, session_order):
    all_data = {}
    print("--- Loading Session Reports ---")
    for session_name in session_order:
        report_path = os.path.join(weekend_path, session_name, 'report.json')
        if os.path.exists(report_path):
            try:
                with open(report_path, 'r') as f:
                    all_data[session_name] = json.load(f)
                print(f"  [OK] Loaded report for: {session_name}")
            except json.JSONDecodeError:
                print(f"  [ERROR] Could not parse JSON for: {session_name}. Skipping.")
        else:
            print(f"  [WARN] Report not found for: {session_name}. Skipping.")
    return all_data

def analyze_performance_trajectory(all_data, session_order):
    print("Analyzing performance trajectories...")
    all_drivers = set(d['driver_name'] for s in all_data.values() for d in s.get('driver_performance', []))
    all_teams = set(t['team_name'] for s in all_data.values() for t in s.get('team_performance', []))
    
    driver_trajectories = []
    for driver_name in sorted(list(all_drivers)):
        trajectory = {'driver_name': driver_name, 'sessions': {}}
        for session in session_order:
            if session in all_data:
                driver_data = next((d for d in all_data[session].get('driver_performance', []) if d['driver_name'] == driver_name), None)
                trajectory['sessions'][session] = {
                    'fastest_lap': get_nested(driver_data, ['lap_times', 'fastest']),
                    'optimal_lap': get_nested(driver_data, ['lap_times', 'optimal_lap_time']),
                    'alpha_score': get_nested(driver_data, ['alpha_score'])
                }
        driver_trajectories.append(trajectory)
        
    team_trajectories = []
    for team_name in sorted(list(all_teams)):
        trajectory = {'team_name': team_name, 'sessions': {}}
        for session in session_order:
            if session in all_data:
                team_data = next((t for t in all_data[session].get('team_performance', []) if t['team_name'] == team_name), None)
                trajectory['sessions'][session] = {
                    'best_lap': get_nested(team_data, ['lap_times', 'fastest']),
                    'optimal_lap': get_nested(team_data, ['lap_times', 'optimal_lap_time'])
                }
        team_trajectories.append(trajectory)
        
    return {'drivers': driver_trajectories, 'teams': team_trajectories}

def find_weekend_champions(all_data):
    print("Finding 'Weekend Champion' leaderboards...")
    champions = {
        'ultimate_fastest_lap': {'value': float('inf'), 'driver': None, 'session': None},
        'ultimate_optimal_lap': {'value': float('inf'), 'driver': None, 'session': None},
        'best_s1': {'value': float('inf'), 'driver': None, 'session': None},
        'best_s2': {'value': float('inf'), 'driver': None, 'session': None},
        'best_s3': {'value': float('inf'), 'driver': None, 'session': None},
        'top_alpha_score': {'value': float('-inf'), 'driver': None, 'session': None},
    }

    for session_name, data in all_data.items():
        for driver in data.get('driver_performance', []):
            fastest = get_nested(driver, ['lap_times', 'fastest'])
            if fastest and fastest < champions['ultimate_fastest_lap']['value']:
                champions['ultimate_fastest_lap'] = {'value': fastest, 'driver': driver['driver_name'], 'session': session_name}
            optimal = get_nested(driver, ['lap_times', 'optimal_lap_time'])
            if optimal and optimal < champions['ultimate_optimal_lap']['value']:
                champions['ultimate_optimal_lap'] = {'value': optimal, 'driver': driver['driver_name'], 'session': session_name}
            s1 = get_nested(driver, ['s1_times', 'fastest'])
            if s1 and s1 < champions['best_s1']['value']: 
                champions['best_s1'] = {'value': s1, 'driver': driver['driver_name'], 'session': session_name}
            s2 = get_nested(driver, ['s2_times', 'fastest'])
            if s2 and s2 < champions['best_s2']['value']: 
                champions['best_s2'] = {'value': s2, 'driver': driver['driver_name'], 'session': session_name}
            s3 = get_nested(driver, ['s3_times', 'fastest'])
            if s3 and s3 < champions['best_s3']['value']: 
                champions['best_s3'] = {'value': s3, 'driver': driver['driver_name'], 'session': session_name}
            alpha = get_nested(driver, ['alpha_score'])
            if alpha and alpha > champions['top_alpha_score']['value']:
                champions['top_alpha_score'] = {'value': alpha, 'driver': driver['driver_name'], 'session': session_name}
    
    for key, champ_data in champions.items():
        if champ_data['value'] in [float('inf'), float('-inf')]:
            champ_data['value'] = None
    return champions

def analyze_improvement(all_data):
    print("Analyzing improvement from Practice to Qualifying...")
    practice_sessions = sorted([s for s in all_data.keys() if 'practice' in s])
    if not practice_sessions or 'qualifying' not in all_data:
        return {"error": "Requires at least one 'practice' and one 'qualifying' report."}

    first_practice_session = practice_sessions[0]
    p1_drivers = {d['driver_name']: d for d in all_data[first_practice_session].get('driver_performance', [])}
    q_drivers = all_data['qualifying'].get('driver_performance', [])
    deltas = []
    for q_driver in q_drivers:
        driver_name = q_driver['driver_name']
        if driver_name in p1_drivers:
            p1_lap = get_nested(p1_drivers[driver_name], ['lap_times', 'fastest'])
            q_lap = get_nested(q_driver, ['lap_times', 'fastest'])
            if p1_lap and q_lap:
                deltas.append({'driver_name': driver_name, 'improvement': q_lap - p1_lap, 'from_session': first_practice_session})
    if not deltas: return {}

    most_improved = sorted(deltas, key=lambda x: x['improvement'])
    improvements = np.array([d['improvement'] for d in deltas])
    mean_improvement, std_improvement = improvements.mean(), improvements.std()
    watchlist = []
    if std_improvement > 0:
      threshold = mean_improvement - (2 * std_improvement)
      watchlist = [d for d in deltas if d['improvement'] < threshold]
    return {'most_improved_p1_to_q': most_improved, 'sandbagging_watchlist': watchlist}

def analyze_teammate_head_to_head(all_data, session_order):
    print("Running teammate head-to-head analysis...")
    teams = defaultdict(list)
    drivers_in_last_session = all_data.get(session_order[-1], {}).get('driver_performance', [])
    for driver in drivers_in_last_session:
        teams[driver['team']].append(driver['driver_name'])
        
    results = []
    for team_name, driver_names in teams.items():
        if len(driver_names) < 2: continue
        h2h_result = {'team_name': team_name, 'drivers': driver_names, 'sessions': {}, 'weekend_score': defaultdict(int)}
        all_gaps = []
        for session in session_order:
            if session in all_data:
                session_laps = {name: get_nested(next((d for d in all_data[session].get('driver_performance', []) if d['driver_name'] == name), None), ['lap_times', 'fastest']) for name in driver_names}
                valid_laps = {k: v for k, v in session_laps.items() if v is not None}
                if len(valid_laps) > 1:
                    winner = min(valid_laps, key=valid_laps.get)
                    laps_sorted = sorted(valid_laps.values())
                    gap = laps_sorted[1] - laps_sorted[0]
                    all_gaps.append(gap)
                    h2h_result['sessions'][session] = {'winner': winner, 'gap': gap}
                    h2h_result['weekend_score'][winner] += 1
        h2h_result['average_gap'] = np.mean(all_gaps) if all_gaps else None
        results.append(h2h_result)
    return results

def analyze_weekend_alpha_score(all_data, session_order):
    print("Calculating Weekend Alpha Score...")
    driver_ranks = defaultdict(list)
    for session in session_order:
        if session in all_data:
            ranking = get_nested(all_data[session], ['rankings', 'drivers', 'by_fastest_lap'], [])
            for i, entry in enumerate(ranking):
                driver_ranks[entry['driver_name']].append(i + 1)
    if not driver_ranks: return []

    avg_ranks = [{'driver_name': name, 'avg_rank': np.mean(ranks)} for name, ranks in driver_ranks.items()]
    ranks_series = pd.Series({d['driver_name']: d['avg_rank'] for d in avg_ranks})
    mean_rank, std_rank = ranks_series.mean(), ranks_series.std()

    if std_rank > 0:
        for driver in avg_ranks:
            driver['weekend_alpha_score'] = (mean_rank - driver['avg_rank']) / std_rank
    else:
        for driver in avg_ranks:
            driver['weekend_alpha_score'] = 0.0
    return sorted(avg_ranks, key=lambda x: x['weekend_alpha_score'], reverse=True)

def main(weekend_path):
    config_path = os.path.join(weekend_path, 'weekend_config.yaml')
    if not os.path.exists(config_path):
        print(f"FATAL: 'weekend_config.yaml' not found in: {weekend_path}"); sys.exit(1)
    with open(config_path, 'r') as f: config = yaml.safe_load(f)
    event_name, session_order = config.get('event_name', 'Unnamed Event'), [s['name'] for s in config.get('sessions', [])]
    all_session_data = load_session_reports(weekend_path, session_order)
    if not all_session_data: print("No session reports loaded. Exiting."); return

    weekend_summary = {
        "event_name": event_name,
        "weekend_champions": find_weekend_champions(all_session_data),
        "weekend_alpha_performance": analyze_weekend_alpha_score(all_session_data, session_order),
        "performance_progression": analyze_performance_trajectory(all_session_data, session_order),
        "improvement_analysis": analyze_improvement(all_session_data),
        "teammate_head_to_head": analyze_teammate_head_to_head(all_session_data, session_order),
    }

    summary_path = os.path.join(weekend_path, 'weekend_summary.json')
    print(f"\n--- Saving Weekend Summary Report ---")
    try:
        with open(summary_path, 'w') as f:
            json.dump(weekend_summary, f, indent=2, cls=SafeNpEncoder)
        print(f"Successfully generated weekend summary at: {summary_path}")
    except Exception as e:
        print(f"Error saving summary report: {e}")

if __name__ == '__main__':
    if len(sys.argv) != 2:
        print("Usage: python weekend_summary_generator.py <path_to_weekend_directory>"); sys.exit(1)
    main(sys.argv[1])