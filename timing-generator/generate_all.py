#!/usr/bin/env python3
"""
Wrapper script to generate all race data outputs:
1. Telemetry data (GPS traces, speeds, etc.)
2. Event timeline (sector completions, deltas, positions)
3. Commentary events (AI-ready race commentary triggers)
4. Comparative analytics (two-race comparative insights)

This script runs all generators in sequence to produce a complete
dataset for race replay visualization and series-level analytics.
"""

import sys
import time
import os
from pathlib import Path

# Import all generators
import telemetry_generator
import event_timeline_generator
import race_commentary_generator
import comparative_analytics_generator


def print_header(title: str):
    """Print a formatted header"""
    print("\n" + "=" * 70)
    print(f"  {title}")
    print("=" * 70 + "\n")


def print_section(title: str):
    """Print a formatted section divider"""
    print("\n" + "-" * 70)
    print(f"  {title}")
    print("-" * 70 + "\n")


def discover_races(input_dir: str = 'input') -> list:
    """Discover all race folders in input directory"""
    input_path = Path(input_dir)
    race_folders = []
    
    if not input_path.exists():
        print(f"ERROR: Input directory {input_dir} not found")
        return []
    
    for folder in sorted(input_path.iterdir()):
        if folder.is_dir():
            # Check if folder contains required files
            raw_data = folder / 'raw_data.csv'
            if raw_data.exists():
                race_folders.append(folder.name)
    
    return race_folders


def main():
    """Main execution function"""
    overall_start = time.time()
    
    print_header("RACE DATA GENERATOR - COMPLETE PIPELINE")
    print("This script will generate:")
    print("  1. Telemetry data (GPS traces with speed and position)")
    print("  2. Event timeline (sector times, deltas, and race positions)")
    print("  3. Commentary events (AI-ready race commentary triggers)")
    print("  4. Comparative analytics (two-race comparative insights)")
    print()
    
    # Discover races
    print("Discovering races...")
    race_folders = discover_races()
    
    if not race_folders:
        print("ERROR: No race folders found in input directory")
        return 1
    
    print(f"Found {len(race_folders)} race(s): {', '.join(race_folders)}")
    print()
    
    success = True
    race_timings = {}
    
    # ========================================================================
    # STEPS 1-3: Generate Data for Each Race
    # ========================================================================
    for race_idx, race_folder in enumerate(race_folders, 1):
        print_section(f"PROCESSING RACE: {race_folder} ({race_idx}/{len(race_folders)})")
        race_start = time.time()
        
        # ====================================================================
        # STEP 1: Generate Telemetry Data
        # ====================================================================
        try:
            print(f"\n  [1/3] Generating Telemetry Data for {race_folder}...")
            
            telemetry_start = time.time()
            
            # Configure paths for this race
            config = telemetry_generator.Config()
            config.INPUT_DIR = f'input/{race_folder}'
            config.OUTPUT_DIR = f'output/{race_folder}'
            
            # Create output directory
            Path(config.OUTPUT_DIR).mkdir(parents=True, exist_ok=True)
            
            # Build reference lap from simulator data
            ref_builder = telemetry_generator.ReferenceBuilder(config)
            if not ref_builder.load_data():
                print(f"  ERROR: Failed to load simulator data for {race_folder}")
                success = False
                continue
            
            reference_data = ref_builder.build()
            if reference_data is None:
                print(f"  ERROR: Failed to build reference lap for {race_folder}")
                success = False
                continue
            
            # Generate telemetry for all drivers
            generator = telemetry_generator.TelemetryGenerator(config, reference_data)
            if not generator.load_data():
                print(f"  ERROR: Failed to load race data for {race_folder}")
                success = False
                continue
            
            generator.prepare_race_data()
            generator.generate_all()
            
            telemetry_end = time.time()
            telemetry_duration = telemetry_end - telemetry_start
            
            print(f"  ✓ Telemetry completed in {telemetry_duration:.2f}s")
            
        except Exception as e:
            print(f"  ✗ ERROR in telemetry generation for {race_folder}: {e}")
            import traceback
            traceback.print_exc()
            success = False
            continue
        
        # ====================================================================
        # STEP 2: Generate Event Timeline
        # ====================================================================
        try:
            print(f"\n  [2/3] Generating Event Timeline for {race_folder}...")
            
            timeline_start = time.time()
            
            # Configure paths for this race
            timeline_config = event_timeline_generator.TimelineConfig()
            timeline_config.INPUT_DIR = f'input/{race_folder}'
            timeline_config.OUTPUT_DIR = f'output/{race_folder}'
            timeline_config.TELEMETRY_DIR = f'output/{race_folder}'
            
            timeline_gen = event_timeline_generator.EventTimelineGenerator(timeline_config)
            
            if not timeline_gen.load_data():
                print(f"  ERROR: Failed to load race data for timeline in {race_folder}")
                success = False
                continue
            
            timeline_gen.prepare_data()
            timeline_gen.generate_timeline()
            timeline_gen.save_outputs()
            
            timeline_end = time.time()
            timeline_duration = timeline_end - timeline_start
            
            print(f"  ✓ Event timeline completed in {timeline_duration:.2f}s")
            
        except Exception as e:
            print(f"  ✗ ERROR in event timeline generation for {race_folder}: {e}")
            import traceback
            traceback.print_exc()
            success = False
            continue
        
        # ====================================================================
        # STEP 3: Generate Commentary Events
        # ====================================================================
        try:
            print(f"\n  [3/3] Generating Commentary Events for {race_folder}...")
            
            commentary_start = time.time()
            
            # Run commentary generator on the complete timeline
            input_file = f"output/{race_folder}/event_timeline_complete.json"
            output_file = f"output/{race_folder}/race_commentary.json"
            
            commentary_data = race_commentary_generator.process_race_file(input_file, output_file)
            
            commentary_end = time.time()
            commentary_duration = commentary_end - commentary_start
            
            print(f"  ✓ Commentary completed in {commentary_duration:.2f}s")
            
        except Exception as e:
            print(f"  ✗ ERROR in commentary generation for {race_folder}: {e}")
            import traceback
            traceback.print_exc()
            success = False
            continue
        
        race_end = time.time()
        race_duration = race_end - race_start
        race_timings[race_folder] = race_duration
        
        print(f"\n  ✓ {race_folder} processing completed in {race_duration:.2f} seconds")
    
    # ========================================================================
    # STEP 4: Generate Comparative Analytics (if 2+ races)
    # ========================================================================
    if len(race_folders) >= 2:
        try:
            print_section("STEP 4/4: GENERATING COMPARATIVE ANALYTICS")
            
            analytics_start = time.time()
            
            # Run comparative analytics generator
            analytics_config = comparative_analytics_generator.AnalyticsConfig()
            analytics_gen = comparative_analytics_generator.ComparativeAnalyticsGenerator(analytics_config)
            
            analytics_data = analytics_gen.generate_all_analytics()
            
            if analytics_data:
                analytics_gen.save_outputs(analytics_data)
                
                analytics_end = time.time()
                analytics_duration = analytics_end - analytics_start
                
                print(f"\n✓ Comparative analytics completed in {analytics_duration:.2f} seconds")
            else:
                print("\n✗ Comparative analytics generation failed")
                success = False
            
        except Exception as e:
            print(f"\n✗ ERROR in comparative analytics generation: {e}")
            import traceback
            traceback.print_exc()
            success = False
    else:
        print_section("STEP 4/4: SKIPPING COMPARATIVE ANALYTICS")
        print("Comparative analytics requires at least 2 races.")
        print(f"Only {len(race_folders)} race(s) found.")
    
    # ========================================================================
    # SUMMARY
    # ========================================================================
    overall_end = time.time()
    overall_duration = overall_end - overall_start
    
    print_header("GENERATION COMPLETE")
    
    if success:
        print("✓ All data generated successfully!")
        print()
        print("Output structure:")
        print()
        
        for race_folder in race_folders:
            print(f"  {race_folder}/")
            print(f"    - Telemetry: output/{race_folder}/driver_*.json")
            print(f"    - Timeline: output/{race_folder}/event_timeline_*.json")
            print(f"    - Commentary: output/{race_folder}/race_commentary.json")
            if race_folder in race_timings:
                print(f"    - Processing time: {race_timings[race_folder]:.2f}s")
            print()
        
        if len(race_folders) >= 2:
            print("  Comparative Analytics:")
            print("    - output/comparative_analytics_complete.json")
            print("    - output/comparative_analytics_executive_summary.json")
            print("    - output/comparative_analytics_technical_compliance.json")
            print("    - output/comparative_analytics_talent_development.json")
            print("    - output/comparative_analytics_battle_performance.json")
            print("    - output/comparative_analytics_field_dynamics.json")
            print()
        
        print(f"Total execution time: {overall_duration:.2f} seconds")
        print()
        print("You can now use these files for race replay visualization and series analytics!")
        return 0
    else:
        print("✗ Generation completed with errors. Check the output above.")
        return 1


if __name__ == "__main__":
    sys.exit(main())
