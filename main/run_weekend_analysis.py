# run_weekend_analysis.py

import yaml
import os
import sys
import json
from sro_analyzer import SROReportGenerator
# MODIFICATION: Import the main function from the new summary module
from weekend_summary_generator import main as generate_weekend_summary

def main():
    """
    Main orchestrator function to run analysis on all sessions and then
    generate a final weekend summary report.
    """
    # MODIFICATION: Handle command-line arguments and flags
    args = [arg for arg in sys.argv[1:] if not arg.startswith('--')]
    flags = {arg for arg in sys.argv[1:] if arg.startswith('--')}

    if not args:
        print("Usage: python run_weekend_analysis.py <path_to_weekend_directory> [--skip-summary]")
        sys.exit(1)
    
    weekend_path = args[0]
    
    config_path = os.path.join(weekend_path, 'weekend_config.yaml')
    if not os.path.exists(config_path):
        print(f"FATAL: 'weekend_config.yaml' not found in: {weekend_path}")
        sys.exit(1)

    with open(config_path, 'r') as f:
        config = yaml.safe_load(f)

    event_name = config.get('event_name', 'Unknown Event')
    sessions = config.get('sessions', [])
    
    if not sessions:
        print("Warning: No sessions defined in 'weekend_config.yaml'.")
        return

    print(f"--- Starting Analysis for Event: {event_name} ---")

    for session_config in sessions:
        session_name = session_config.get('name')
        if not session_name:
            print("Warning: Found a session entry without a 'name'. Skipping.")
            continue
            
        session_path = os.path.join(weekend_path, session_name)
        print(f"\n[+] Processing session: {session_name}")

        if not os.path.isdir(session_path):
            print(f"  -> Error: Directory for '{session_name}' not found. Skipping.")
            continue

        session_type = session_config.get('type', 'practice')
        prior_report_path = None
        compare_session_name = session_config.get('compare_with')

        if compare_session_name:
            prior_report_path = os.path.join(weekend_path, compare_session_name, 'report.json')
            if os.path.exists(prior_report_path):
                print(f"  -> Comparing with results from: {compare_session_name}")
            else:
                print(f"  -> Warning: Comparison report for '{compare_session_name}' not found.")
                prior_report_path = None
        
        try:
            generator = SROReportGenerator(
                session_path=session_path, 
                session_type=session_type, 
                prior_report_path=prior_report_path
            )
            report = generator.generate_report()
            output_path = os.path.join(session_path, 'report.json')
            generator.save_report(output_path)
        except Exception as e:
            print(f"  -> An unexpected error occurred while processing '{session_name}': {e}")
            continue

    print(f"\n--- All Sessions Processed ---")

    # MODIFICATION: Check flag before running the summary generator
    if '--skip-summary' in flags:
        print("Skipping weekend summary generation as requested.")
    else:
        print("\n--- Generating Weekend Summary Report ---")
        try:
            generate_weekend_summary(weekend_path)
        except Exception as e:
            print(f"An unexpected error occurred during summary generation: {e}")

    print(f"\n--- Full Weekend Analysis for '{event_name}' Complete ---")


if __name__ == '__main__':
    main()