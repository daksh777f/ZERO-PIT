import pandas as pd
import numpy as np
import json
import os
import time

# --- 1. CONFIGURATION ---
class Config:
    # --- File Paths ---
    INPUT_DIR = 'input'
    OUTPUT_DIR = 'output'
    RACE_DATA_FILE = 'raw_data.csv'
    SIM_TELEMETRY_FILE = 'iracing_gr86.csv' # Replace with your sim file name

    # --- Processing Parameters ---
    OUTPUT_FREQUENCY_HZ = 10
    SPEED_MODE = 'scaled'  # 'scaled' or 'reference'
    PIT_LAP_THRESHOLD_PERCENT = 1.2 # Laps > 20% slower than ref are considered off-pace

    # --- Track Geometry (Lat/Lon) ---
    SECTOR_LINES = {
        'start_finish': (
            (33.53270383997383, -86.61975590491157), # Outer point
            (33.53254342041025, -86.61956613861798)  # Inner point
        ),
        's1_end': (
            (33.53213029171994, -86.61933781765559),
            (33.53234381279065, -86.61958256923566)
        ),
        's2_end': (
            (33.52985752266561, -86.62110439017047),
            (33.53029072415627, -86.62136791721422)
        )
    }

# --- 2. HELPER FUNCTIONS ---

def line_intersection(line1, line2):
    def on_segment(p, q, r):
        return (q[0] <= max(p[0], r[0]) and q[0] >= min(p[0], r[0]) and
                q[1] <= max(p[1], r[1]) and q[1] >= min(p[1], r[1]))

    def orientation(p, q, r):
        val = (q[1] - p[1]) * (r[0] - q[0]) - (q[0] - p[0]) * (r[1] - q[1])
        if val == 0: return 0
        return 1 if val > 0 else 2

    p1, q1 = line1
    p2, q2 = line2
    o1, o2, o3, o4 = orientation(p1, q1, p2), orientation(p1, q1, q2), orientation(p2, q2, p1), orientation(p2, q2, q1)

    if o1 != o2 and o3 != o4: return True
    if o1 == 0 and on_segment(p1, p2, q1): return True
    if o2 == 0 and on_segment(p1, q2, q1): return True
    if o3 == 0 and on_segment(p2, p1, q2): return True
    if o4 == 0 and on_segment(p2, q1, q2): return True
    return False

# --- 3. CORE CLASSES ---

class ReferenceBuilder:
    """Analyzes simulator telemetry to build the 'golden reference' lap trace."""
    def __init__(self, config):
        self.config = config
        self.sim_df = None
        self.reference_lap = None
        self.sector_indices = {}

    def load_data(self):
        print("Loading simulator telemetry...")
        filepath = os.path.join(self.config.INPUT_DIR, self.config.SIM_TELEMETRY_FILE)
        try:
            self.sim_df = pd.read_csv(filepath, header=0, skiprows=[1], encoding='utf-8-sig')
            self.sim_df.columns = self.sim_df.columns.str.strip().str.lower()

            required_cols = ['lat', 'lon', 'speed', 'lap', 'sessiontime', 'lapdistpct']
            missing_cols = [col for col in required_cols if col not in self.sim_df.columns]
            if missing_cols:
                print(f"ERROR: Simulator telemetry is missing required columns: {missing_cols}")
                return False

            self.sim_df.rename(columns={'speed': 'speed_kph'}, inplace=True)
            
            if self.sim_df['speed_kph'].max() < 80:
                self.sim_df['speed_kph'] *= 3.6
                print("Converted sim speed from m/s to kph.")

        except FileNotFoundError:
            print(f"ERROR: Simulator telemetry file not found at {filepath}")
            return False
        except Exception as e:
            print(f"An unexpected error occurred while loading sim data: {e}")
            return False
        return True

    def build(self):
        print("Building reference lap from sim data...")
        self._find_fastest_lap()
        if self.reference_lap is None:
            print("ERROR: Could not build a valid reference lap. Check sim data for complete laps crossing the start/finish line.")
            return None
            
        self._segment_sectors()
        print(f"Reference lap built successfully. Lap time: {self.reference_lap['lap_time']:.3f}s")
        return {
            'trace': self.reference_lap['trace'],
            'sector_indices': self.sector_indices,
            'lap_time': self.reference_lap['lap_time']
        }

    def _find_fastest_lap(self):
        """
        Robustly finds the fastest lap by identifying all start/finish line crossings.
        This is more reliable than using the 'Lap' column changing.
        """
        print("Finding all start/finish line crossings to identify valid laps...")
        points = list(zip(self.sim_df['lat'], self.sim_df['lon']))
        sf_line = self.config.SECTOR_LINES['start_finish']
        
        crossing_indices = []
        for i in range(len(points) - 1):
            car_segment = (points[i], points[i+1])
            if line_intersection(car_segment, sf_line):
                # Store the index of the point BEFORE crossing (so lap includes the crossing)
                crossing_indices.append(i)
        
        if len(crossing_indices) < 2:
            print("ERROR: Not enough start/finish crossings detected to define a lap.")
            return

        print(f"Found {len(crossing_indices) - 1} potential laps based on S/F crossings.")
        
        laps = []
        for i in range(len(crossing_indices) - 1):
            start_idx = crossing_indices[i]
            # Include the endpoint to capture the full lap through the finish line
            end_idx = crossing_indices[i+1] + 1
            lap_df = self.sim_df.iloc[start_idx:end_idx].copy()
            
            start_time = lap_df['sessiontime'].iloc[0]
            end_time = lap_df['sessiontime'].iloc[-1]
            duration = end_time - start_time
            
            # Sanity check: lap time should be reasonable (e.g., > 80 seconds for this track)
            if duration > 80: 
                laps.append({'duration': duration, 'df': lap_df})

        if not laps:
            print("ERROR: No valid flying laps found after filtering for reasonable lap times.")
            return
            
        fastest_lap = min(laps, key=lambda x: x['duration'])
        
        fastest_lap_df = fastest_lap['df']
        fastest_lap_df['laptime'] = fastest_lap_df['sessiontime'] - fastest_lap_df['sessiontime'].iloc[0]

        self.reference_lap = {
            'trace': fastest_lap_df,
            'lap_time': fastest_lap['duration']
        }

    def _segment_sectors(self):
        trace = self.reference_lap['trace']
        points = list(zip(trace['lat'], trace['lon']))
        
        # The lap starts at start/finish (index 0) and ends at start/finish (last index)
        self.sector_indices['s0_start'] = 0
        self.sector_indices['s3_end'] = len(trace) - 1
        
        print(f"Lap starts at index 0 (start/finish) and ends at index {len(trace) - 1} (start/finish)")

        # Only search for intermediate sector lines (s1_end and s2_end)
        for name, line_coords in self.config.SECTOR_LINES.items():
            if name == 'start_finish':
                # Skip start/finish - we already know it's at index 0 and len-1
                continue
                
            found = False
            for i in range(len(points) - 1):
                car_segment = (points[i], points[i+1])
                if line_intersection(car_segment, line_coords):
                    self.sector_indices[name] = i
                    print(f"Found intersection for {name} at index {i}")
                    found = True
                    break
            if not found:
                 print(f"WARNING: Could not find intersection for sector line: {name}")

# ==============================================================================
# REPLACE THE ENTIRE TelemetryGenerator CLASS WITH THIS NEW VERSION
# ==============================================================================
class TelemetryGenerator:
    """Generates telemetry for real race laps based on the reference trace."""
    def __init__(self, config, reference_data):
        self.config = config
        self.reference = reference_data
        self.race_df = None

    def load_data(self):
        print("Loading race data...")
        filepath = os.path.join(self.config.INPUT_DIR, self.config.RACE_DATA_FILE)
        try:
            self.race_df = pd.read_csv(filepath, sep=';', encoding='utf-8-sig')
            # V3 FIX: Clean column names aggressively
            self.race_df.columns = self.race_df.columns.str.strip().str.replace(r'^\ufeff', '', regex=True)
        except FileNotFoundError:
            print(f"ERROR: Race data file not found at {filepath}")
            return False
        return True

    def generate_all(self):
        print("Starting telemetry generation for all drivers...")
        all_drivers_data = []
        # V3 FIX: Group by 'NUMBER' which is the unique car identifier
        drivers = self.race_df['NUMBER'].unique()

        for driver_num in drivers:
            # V3 FIX: Filter by 'NUMBER'
            driver_race_data = self.race_df[self.race_df['NUMBER'] == driver_num].copy()
            driver_name = driver_race_data['DRIVER_NAME'].iloc[0]
            print(f"\nProcessing Driver: {driver_num} - {driver_name}")

            driver_output = {
                # V3 FIX: Use the correct, unique car number
                "driver_number": str(driver_num).strip(),
                "driver_name": driver_name,
                "laps": []
            }

            for _, lap_row in driver_race_data.iterrows():
                lap_telemetry = self._generate_lap(lap_row)
                driver_output["laps"].append({
                    "lap_number": int(lap_row['LAP_NUMBER']),
                    "lap_time": lap_row['LAP_TIME'],
                    "sector_1": float(lap_row['S1_SECONDS']),
                    "sector_2": float(lap_row['S2_SECONDS']),
                    "sector_3": float(lap_row['S3_SECONDS']),
                    "telemetry": lap_telemetry
                })
            
            all_drivers_data.append(driver_output)
            self._save_driver_file(driver_output)

        self._save_complete_race_file(all_drivers_data)
        self._create_manifest(all_drivers_data)
        print("\nTelemetry generation complete.")

    def _generate_lap(self, lap_row):
        is_pit_lap = pd.notna(lap_row['CROSSING_FINISH_LINE_IN_PIT'])
        is_slow_lap = lap_row['LAP_TIME_SECONDS'] > (self.reference['lap_time'] * self.config.PIT_LAP_THRESHOLD_PERCENT)

        if is_pit_lap or is_slow_lap:
            print(f"  Lap {lap_row['LAP_NUMBER']}: Detected as pit/slow lap. Generating static telemetry.")
            return self._generate_static_lap(lap_row)
        else:
            print(f"  Lap {lap_row['LAP_NUMBER']}: Processing standard lap...")
            return self._generate_warped_lap(lap_row)

    def _generate_static_lap(self, lap_row):
        static_point = self.reference['trace'].iloc[0]
        telemetry = []
        num_points = int(lap_row['LAP_TIME_SECONDS'] * self.config.OUTPUT_FREQUENCY_HZ)
        
        for i in range(num_points):
            current_time = i / self.config.OUTPUT_FREQUENCY_HZ
            telemetry.append({
                "timestamp": round(current_time, 3),
                "lat": static_point['lat'],
                "lon": static_point['lon'],
                "speed_kph": 0.0,
                "elapsed_race_time": round(lap_row['ELAPSED_SECONDS'] - lap_row['LAP_TIME_SECONDS'] + current_time, 3)
            })
        return telemetry
        
    def _generate_warped_lap(self, lap_row):
        ref_trace = self.reference['trace']
        ref_indices = self.reference['sector_indices']
        
        real_sector_times = {'s1': lap_row['S1_SECONDS'], 's2': lap_row['S2_SECONDS'], 's3': lap_row['S3_SECONDS']}
        
        # Sector boundaries: each sector goes from one line to the next
        # S1: start/finish (index 0) to s1_end
        # S2: s1_end to s2_end  
        # S3: s2_end to start/finish (last index)
        sector_boundaries = [
            ('s1', ref_indices['s0_start'], ref_indices['s1_end']),
            ('s2', ref_indices['s1_end'], ref_indices['s2_end']),
            ('s3', ref_indices['s2_end'], ref_indices['s3_end'])
        ]
        
        full_lap_telemetry = []
        lap_start_elapsed_time = lap_row['ELAPSED_SECONDS'] - lap_row['LAP_TIME_SECONDS']
        current_lap_time = 0.0

        for sector_name, start_idx, end_idx in sector_boundaries:
            if start_idx >= end_idx: continue
            sector_trace = ref_trace.iloc[start_idx:end_idx].copy()
            if sector_trace.empty: continue
            
            ref_sector_time = sector_trace['laptime'].iloc[-1] - sector_trace['laptime'].iloc[0]
            real_time = real_sector_times[sector_name]
            
            scale_factor = (real_time / ref_sector_time) if ref_sector_time > 0 and real_time > 0 else 1.0
            num_points = int(real_time * self.config.OUTPUT_FREQUENCY_HZ)
            if num_points == 0: continue

            # Use array indices for interpolation instead of lapdistpct
            # This avoids issues with non-monotonic or corrupted lapdistpct data
            original_indices = np.arange(len(sector_trace))
            target_indices = np.linspace(0, len(sector_trace) - 1, num_points, endpoint=False)
            
            interp_lat = np.interp(target_indices, original_indices, sector_trace['lat'].values)
            interp_lon = np.interp(target_indices, original_indices, sector_trace['lon'].values)
            interp_ref_speed = np.interp(target_indices, original_indices, sector_trace['speed_kph'].values)
            target_timestamps = np.linspace(0, real_time, num_points, endpoint=False)

            for i in range(num_points):
                speed = (interp_ref_speed[i] / scale_factor) if self.config.SPEED_MODE == 'scaled' and scale_factor > 0 else interp_ref_speed[i]
                full_lap_telemetry.append({
                    "timestamp": round(current_lap_time + target_timestamps[i], 3),
                    "lat": interp_lat[i], "lon": interp_lon[i], "speed_kph": round(speed, 2),
                    "elapsed_race_time": round(lap_start_elapsed_time + current_lap_time + target_timestamps[i], 3)
                })
            current_lap_time += real_time
            
        return full_lap_telemetry

    def _save_driver_file(self, data):
        # V3 FIX: use driver_number from the data dict which is now correct
        filename = f"driver_{data['driver_number']}.json"
        filepath = os.path.join(self.config.OUTPUT_DIR, filename)
        with open(filepath, 'w') as f: json.dump(data, f, indent=2)
        print(f"  Saved data for driver {data['driver_number']} to {filepath}")

    def _save_complete_race_file(self, all_data):
        filepath = os.path.join(self.config.OUTPUT_DIR, "complete_race.json")
        with open(filepath, 'w') as f: json.dump(all_data, f)
        print(f"\nSaved complete race data to {filepath}")
    
    def _create_manifest(self, all_data):
        manifest = {"total_drivers": len(all_data), "drivers": []}
        for driver_data in all_data:
            manifest['drivers'].append({
                "driver_number": driver_data['driver_number'], "driver_name": driver_data['driver_name'],
                "total_laps": len(driver_data['laps']), "file": f"driver_{driver_data['driver_number']}.json"
            })
        filepath = os.path.join(self.config.OUTPUT_DIR, "manifest.json")
        with open(filepath, 'w') as f: json.dump(manifest, f, indent=2)
        print(f"Saved manifest file to {filepath}")

    def prepare_race_data(self):
        def time_to_seconds(t_str):
            try:
                parts = str(t_str).replace(',', '.').split(':')
                if len(parts) == 3: return float(parts[0]) * 3600 + float(parts[1]) * 60 + float(parts[2])
                if len(parts) == 2: return float(parts[0]) * 60 + float(parts[1])
                if len(parts) == 1: return float(parts[0])
            except (ValueError, AttributeError): return 0.0
            return 0.0

        print("Preparing race data (converting times to seconds)...")
        for col in ['LAP_TIME', 'S1', 'S2', 'S3', 'ELAPSED']:
            if col in self.race_df.columns:
                self.race_df[f'{col}_SECONDS'] = self.race_df[col].apply(time_to_seconds)

def main():
    start_time = time.time()
    config = Config()
    if not os.path.exists(config.OUTPUT_DIR): os.makedirs(config.OUTPUT_DIR)
    
    ref_builder = ReferenceBuilder(config)
    if not ref_builder.load_data(): return
    reference_data = ref_builder.build()
    if reference_data is None: return

    generator = TelemetryGenerator(config, reference_data)
    if not generator.load_data(): return
    generator.prepare_race_data()
    generator.generate_all()
    
    end_time = time.time()
    print(f"\nTotal execution time: {end_time - start_time:.2f} seconds.")

if __name__ == "__main__":
    main()