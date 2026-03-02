import pandas as pd
import numpy as np
import json
import os
import copy

class SROReportGenerator:
    """
    Processes and analyzes SRO GT America timing data from CSV files for a single 
    race session. Includes advanced metrics like Alpha Score, Pace Profiles, and 
    capabilities for cross-session comparison. This version includes defensive checks
    to prevent NaN values in the final report.
    """
    
    LAP_TIME_OUTLIER_THRESHOLD = 1.15

    def __init__(self, session_path, session_type='practice', prior_report_path=None):
        if not os.path.isdir(session_path):
            raise FileNotFoundError(f"Session directory not found: {session_path}")

        self.session_path = session_path
        self.session_type = session_type.lower()
        self.raw_data_path = os.path.join(session_path, 'raw_data.csv')
        self.weather_data_path = os.path.join(session_path, 'weather_report.csv')

        self.driver_stats = []
        self.team_stats = []
        self.session_summary = {}
        self.final_report = {}
        
        self.prior_report = None
        if prior_report_path and os.path.exists(prior_report_path):
            print(f"Loading prior report for comparison from: {prior_report_path}")
            with open(prior_report_path, 'r') as f:
                self.prior_report = json.load(f)
        elif prior_report_path:
            print(f"Warning: Prior report path specified but not found: {prior_report_path}")

    @staticmethod
    def _time_to_seconds(time_str):
        if isinstance(time_str, (int, float)): return float(time_str)
        if not isinstance(time_str, str): return None
        try:
            return sum(float(x) * 60 ** i for i, x in enumerate(reversed(time_str.split(':'))))
        except (ValueError, TypeError):
            return None
            
    def _process_lap_data(self):
        if not os.path.exists(self.raw_data_path):
            print(f"Warning: Raw data file not found: {self.raw_data_path}")
            return pd.DataFrame()
        try:
            laps_df = pd.read_csv(self.raw_data_path, sep=';', encoding='utf-8-sig', low_memory=False)
            laps_df.columns = [col.lower().strip() for col in laps_df.columns]
            laps_df['lap_time_seconds'] = laps_df['lap_time'].apply(self._time_to_seconds)
            for col in ['s1_seconds', 's2_seconds', 's3_seconds']:
                laps_df[col] = pd.to_numeric(laps_df[col], errors='coerce')

            required_cols = ['driver_name', 'team', 'lap_time_seconds', 's1_seconds', 's2_seconds', 's3_seconds', 'crossing_finish_line_in_pit', 'lap_number']
            for col in required_cols:
                if col not in laps_df.columns: raise KeyError(f"Required column '{col}' not found.")

            laps_df.dropna(subset=['lap_time_seconds', 's1_seconds', 's2_seconds', 's3_seconds'], inplace=True)
            laps_df = laps_df[pd.isnull(laps_df['crossing_finish_line_in_pit'])].copy()
            if not laps_df.empty:
                session_median = laps_df['lap_time_seconds'].median()
                if pd.notna(session_median):
                    laps_df = laps_df[laps_df['lap_time_seconds'] <= session_median * self.LAP_TIME_OUTLIER_THRESHOLD]
            
            print(f"Processed {len(laps_df)} valid laps from {self.raw_data_path}")
            return laps_df
        except Exception as e:
            print(f"Error processing CSV file {self.raw_data_path}: {e}")
            return pd.DataFrame()

    def _process_weather_data(self):
        if not os.path.exists(self.weather_data_path):
            self.session_summary['weather'] = {"error": "Weather report not found."}
            return
        try:
            weather_df = pd.read_csv(self.weather_data_path, sep=';', encoding='utf-8-sig')
            weather_df.columns = [col.lower().strip() for col in weather_df.columns]
            def safe_mean(series): return series.mean() if not series.dropna().empty else None
            avg_track_temp = safe_mean(weather_df['track_temp'])
            self.session_summary['weather'] = {
                'average_air_temp': safe_mean(weather_df['air_temp']),
                'average_track_temp': avg_track_temp if avg_track_temp is not None and avg_track_temp > 0 else None,
                'average_humidity': safe_mean(weather_df['humidity']),
                'was_rain_reported': bool(weather_df['rain'].sum() > 0)
            }
        except Exception as e:
            self.session_summary['weather'] = {"error": f"Could not process weather file: {e}"}
    
    @staticmethod
    def _calculate_stats(df_slice, time_column):
        df = df_slice[[time_column]].dropna().sort_values(by=time_column)
        if df.empty: return {}
        fastest = df.iloc[0][time_column]
        best_3_avg = df.head(3)[time_column].mean() if len(df) >= 3 else None
        best_5_avg = df.head(5)[time_column].mean() if len(df) >= 5 else None
        return {
            'fastest': fastest, 'best_3_avg': best_3_avg, 'best_5_avg': best_5_avg,
            'consistency_best_5': best_5_avg - fastest if best_5_avg is not None else None,
            'lap_count': len(df)
        }

    @staticmethod
    def _calculate_optimal_lap(df_slice):
        if df_slice.empty: return {}
        s1, s2, s3 = df_slice['s1_seconds'].min(), df_slice['s2_seconds'].min(), df_slice['s3_seconds'].min()
        return {'optimal_lap_time': s1 + s2 + s3 if pd.notna(s1) and pd.notna(s2) and pd.notna(s3) else None}

    def _calculate_driver_stats(self, laps_df):
        if laps_df.empty: return
        for (driver_name, team_name), group_df in laps_df.groupby(['driver_name', 'team']):
            driver_data = {
                'driver_name': driver_name, 'team': team_name, 'total_valid_laps': len(group_df),
                'lap_times': self._calculate_stats(group_df, 'lap_time_seconds'),
                's1_times': self._calculate_stats(group_df, 's1_seconds'),
                's2_times': self._calculate_stats(group_df, 's2_seconds'),
                's3_times': self._calculate_stats(group_df, 's3_seconds'),
            }
            driver_data['lap_times'].update(self._calculate_optimal_lap(group_df))
            self.driver_stats.append(driver_data)
        print(f"Calculated statistics for {len(self.driver_stats)} drivers.")

    def _calculate_team_stats(self, laps_df):
        if laps_df.empty: return
        for team_name, team_laps_df in laps_df.groupby('team'):
            team_data = {
                'team_name': team_name,
                'driver_count': team_laps_df['driver_name'].nunique(),
                'total_valid_laps': len(team_laps_df),
                'lap_times': self._calculate_stats(team_laps_df, 'lap_time_seconds'),
                's1_times': self._calculate_stats(team_laps_df, 's1_seconds'),
                's2_times': self._calculate_stats(team_laps_df, 's2_seconds'),
                's3_times': self._calculate_stats(team_laps_df, 's3_seconds'),
            }
            team_data['lap_times'].update(self._calculate_optimal_lap(team_laps_df))
            self.team_stats.append(team_data)
        print(f"Calculated detailed statistics for {len(self.team_stats)} teams.")

    def _calculate_pace_profile(self, laps_df):
        print("Calculating race-session pace profile...")
        profiles = {d['driver_name']: {'p1_laps': 0, 'top_3_laps': 0, 'top_5_laps': 0, 'top_10_laps': 0} for d in self.driver_stats}
        for _, group in laps_df.groupby('lap_number'):
            sorted_group = group.sort_values('lap_time_seconds').reset_index()
            for rank, row in sorted_group.head(10).iterrows():
                if row['driver_name'] in profiles:
                    if rank == 0: profiles[row['driver_name']]['p1_laps'] += 1
                    if rank < 3: profiles[row['driver_name']]['top_3_laps'] += 1
                    if rank < 5: profiles[row['driver_name']]['top_5_laps'] += 1
                    profiles[row['driver_name']]['top_10_laps'] += 1
        for driver in self.driver_stats:
            driver['pace_profile'] = profiles.get(driver['driver_name'], {})

    def _calculate_lap_by_lap_leaders(self, laps_df):
        """
        For each lap in a race session, rank ALL drivers by their lap time and sector times.
        Creates comprehensive leaderboards showing who was fastest on track for each lap.
        """
        print("Calculating lap-by-lap leaders for race session...")
        lap_leaders = {}
        
        for lap_num, lap_group in laps_df.groupby('lap_number'):
            lap_key = f"lap_{int(lap_num)}"
            lap_leaders[lap_key] = {}
            
            # Rank by overall lap time
            lap_time_ranking = lap_group[['driver_name', 'lap_time_seconds']].dropna()
            lap_time_ranking = lap_time_ranking.sort_values('lap_time_seconds')
            lap_leaders[lap_key]['fastest_lap'] = [
                {'driver': row['driver_name'], 'time': row['lap_time_seconds']}
                for _, row in lap_time_ranking.iterrows()
            ]
            
            # Rank by S1
            s1_ranking = lap_group[['driver_name', 's1_seconds']].dropna()
            s1_ranking = s1_ranking.sort_values('s1_seconds')
            lap_leaders[lap_key]['fastest_s1'] = [
                {'driver': row['driver_name'], 'time': row['s1_seconds']}
                for _, row in s1_ranking.iterrows()
            ]
            
            # Rank by S2
            s2_ranking = lap_group[['driver_name', 's2_seconds']].dropna()
            s2_ranking = s2_ranking.sort_values('s2_seconds')
            lap_leaders[lap_key]['fastest_s2'] = [
                {'driver': row['driver_name'], 'time': row['s2_seconds']}
                for _, row in s2_ranking.iterrows()
            ]
            
            # Rank by S3
            s3_ranking = lap_group[['driver_name', 's3_seconds']].dropna()
            s3_ranking = s3_ranking.sort_values('s3_seconds')
            lap_leaders[lap_key]['fastest_s3'] = [
                {'driver': row['driver_name'], 'time': row['s3_seconds']}
                for _, row in s3_ranking.iterrows()
            ]
        
        print(f"Calculated lap-by-lap leaders for {len(lap_leaders)} laps.")
        return lap_leaders

    def _calculate_alpha_score(self):
        print("Calculating driver Alpha Scores...")
        if not self.driver_stats: return
        df = pd.json_normalize(self.driver_stats).set_index('driver_name')
        pillars = {
            'z_fastest': ('lap_times.fastest', 1.5), 'z_optimal': ('lap_times.optimal_lap_time', 1.2),
            'z_consistency': ('lap_times.consistency_best_5', 1.0), 'z_s1': ('s1_times.fastest', 0.8),
            'z_s2': ('s2_times.fastest', 0.8), 'z_s3': ('s3_times.fastest', 0.8),
        }
        df['alpha_score'] = 0.0
        total_weight = sum(w for _, w in pillars.values())
        for col, (path, weight) in pillars.items():
            if path in df.columns and df[path].notna().any():
                mean, std = df[path].mean(), df[path].std()
                if pd.notna(std) and std > 0:
                    z_score = (mean - df[path]) / std
                    df['alpha_score'] += z_score.fillna(0) * weight
        if total_weight > 0: df['alpha_score'] /= total_weight
        scores = df['alpha_score'].to_dict()
        for driver in self.driver_stats: driver['alpha_score'] = scores.get(driver['driver_name'])

    def _compare_with_prior_session(self):
        if not self.prior_report: return
        prior_drivers = {d['driver_name']: d for d in self.prior_report.get('driver_performance', [])}
        prior_teams = {t['team_name']: t for t in self.prior_report.get('team_performance', [])}
        def get_delta(current, prior, path):
            try:
                c_val, p_val = current, prior
                for k in path: c_val = c_val[k]
                for k in path: p_val = p_val[k]
                return c_val - p_val if c_val is not None and p_val is not None else None
            except (KeyError, TypeError): return None

        for d in self.driver_stats:
            if d['driver_name'] in prior_drivers:
                p_d = prior_drivers[d['driver_name']]
                d['lap_times']['fastest_delta'] = get_delta(d, p_d, ('lap_times', 'fastest'))
        for t in self.team_stats:
            if t['team_name'] in prior_teams:
                p_t = prior_teams[t['team_name']]
                t['lap_times']['fastest_delta'] = get_delta(t, p_t, ('lap_times', 'fastest'))
        print("Cross-session comparison complete.")

    def _generate_rankings(self):
        def create_ranking(data, key_path, reverse=False, name_key='driver_name'):
            items = []
            for item in data:
                val = item
                try:
                    for k in key_path: val = val[k]
                    if val is not None and pd.notna(val):
                        items.append({name_key: item.get(name_key), 'value': val})
                except (KeyError, TypeError): continue
            return sorted(items, key=lambda x: x['value'], reverse=reverse)
        
        dr, tr = {}, {}
        dr['by_alpha_score'] = create_ranking(self.driver_stats, ['alpha_score'], reverse=True)
        dr['by_fastest_lap'] = create_ranking(self.driver_stats, ('lap_times', 'fastest'))
        dr['by_optimal_lap'] = create_ranking(self.driver_stats, ('lap_times', 'optimal_lap_time'))
        dr['by_best_5_avg'] = create_ranking(self.driver_stats, ('lap_times', 'best_5_avg'))
        dr['by_consistency'] = create_ranking(self.driver_stats, ('lap_times', 'consistency_best_5'))
        dr['by_lap_improvement'] = create_ranking(self.driver_stats, ('lap_times', 'fastest_delta'))
        
        for category in ['lap_times', 's1_times', 's2_times', 's3_times']:
            prefix = 'lap' if category == 'lap_times' else category.split('_')[0]
            tr[f'by_{prefix}_fastest'] = create_ranking(self.team_stats, [category, 'fastest'], name_key='team_name')
            tr[f'by_{prefix}_best_3_avg'] = create_ranking(self.team_stats, [category, 'best_3_avg'], name_key='team_name')
            tr[f'by_{prefix}_best_5_avg'] = create_ranking(self.team_stats, [category, 'best_5_avg'], name_key='team_name')
        
        tr['by_lap_optimal'] = create_ranking(self.team_stats, ['lap_times', 'optimal_lap_time'], name_key='team_name')
        tr['by_lap_improvement'] = create_ranking(self.team_stats, ['lap_times', 'fastest_delta'], name_key='team_name')
        
        return {'drivers': dr, 'teams': tr}

    def generate_report(self):
        print("Generating single-session analysis report...")
        laps_df = self._process_lap_data()
        self._process_weather_data()
        self._calculate_driver_stats(laps_df)
        self._calculate_team_stats(laps_df)
        
        # Race-specific analysis
        lap_by_lap_data = None
        if self.session_type == 'race' and not laps_df.empty:
            self._calculate_pace_profile(laps_df)
            lap_by_lap_data = self._calculate_lap_by_lap_leaders(laps_df)
        
        self._calculate_alpha_score()
        self._compare_with_prior_session()

        self.final_report = {
            'session_summary': self.session_summary,
            'driver_performance': self.driver_stats,
            'team_performance': self.team_stats,
            'rankings': self._generate_rankings()
        }
        
        # Add lap-by-lap leaders only for race sessions
        if lap_by_lap_data is not None:
            self.final_report['lap_by_lap_leaders'] = lap_by_lap_data
        
        print("Report generation complete.")
        return self.final_report

    def save_report(self, output_path):
        if not self.final_report:
            print("Error: Report not generated.")
            return
        print(f"Saving report to {output_path}...")
        try:
            class NpEncoder(json.JSONEncoder):
                def default(self, obj):
                    if isinstance(obj, np.integer): return int(obj)
                    if isinstance(obj, np.floating): return float(obj) if np.isfinite(obj) else None
                    if isinstance(obj, np.ndarray): return obj.tolist()
                    if isinstance(obj, float): return obj if np.isfinite(obj) else None
                    return super(NpEncoder, self).default(obj)
            with open(output_path, 'w') as f:
                json.dump(self.final_report, f, indent=2, cls=NpEncoder)
            print("Report saved successfully.")
        except Exception as e:
            print(f"Error saving report: {e}")