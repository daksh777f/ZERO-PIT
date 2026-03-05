"""
Track Reconstruction Configuration Template
Copy and modify for each track you process
"""

from track_reconstruction_enhanced import ReconstructionConfig

# =============================================================================
# TRACK: Road Atlanta (Example)
# =============================================================================
ROAD_ATLANTA_CONFIG = ReconstructionConfig(
    # Start/Finish Line
    start_finish_point1=(34.1523, -84.2496),
    start_finish_point2=(34.1525, -84.2494),
    track_length_meters=4088.0,  # 2.54 miles

    # Vehicle: Porsche 718 Cayman GT4 Clubsport
    wheelbase_meters=2.475,
    max_steering_angle_deg=540.0,
    steering_ratio=14.0,

    speed_unit="kph",
    sampling_rate_hz=10.0,

    use_loop_closure=True,
    use_g_force_correction=True,
    g_force_weight=0.3,
)


# =============================================================================
# TRACK: Template for New Track
# =============================================================================
YOUR_TRACK_CONFIG = ReconstructionConfig(
    # Start/Finish Line (get from Google Maps or GPS logger)
    # Mark two points across the track at start/finish
    start_finish_point1=(0.0, 0.0),  # TODO: Left side of track
    start_finish_point2=(0.0, 0.0),  # TODO: Right side of track

    # Track Parameters
    track_length_meters=0.0,  # TODO: Official track length in meters

    # Vehicle Parameters
    # Check your car's spec sheet or use estimates below
    wheelbase_meters=2.65,         # TODO: Distance between axles (meters)
    max_steering_angle_deg=540.0,  # TODO: Lock-to-lock (usually 450-540)
    steering_ratio=14.5,           # TODO: Steering ratio (usually 12-16)

    # Data Configuration
    speed_unit="kph",              # TODO: "kph" or "mph"
    sampling_rate_hz=10.0,         # TODO: Your telemetry frequency

    # Processing Options (recommended defaults)
    use_loop_closure=True,
    use_g_force_correction=True,
    g_force_weight=0.3,
)


# =============================================================================
# Common Vehicle Parameters Reference
# =============================================================================
VEHICLE_PARAMETERS = {
    # GT4 Cars
    "Porsche 718 Cayman GT4": {
        "wheelbase_meters": 2.475,
        "steering_ratio": 14.0,
        "max_steering_angle_deg": 540.0,
    },
    "BMW M4 GT4": {
        "wheelbase_meters": 2.857,
        "steering_ratio": 15.0,
        "max_steering_angle_deg": 540.0,
    },
    "McLaren 570S GT4": {
        "wheelbase_meters": 2.670,
        "steering_ratio": 14.5,
        "max_steering_angle_deg": 540.0,
    },
    "Audi R8 LMS GT4": {
        "wheelbase_meters": 2.650,
        "steering_ratio": 14.0,
        "max_steering_angle_deg": 540.0,
    },

    # GT3 Cars
    "Porsche 911 GT3 R": {
        "wheelbase_meters": 2.457,
        "steering_ratio": 13.5,
        "max_steering_angle_deg": 540.0,
    },
    "Audi R8 LMS GT3": {
        "wheelbase_meters": 2.650,
        "steering_ratio": 14.0,
        "max_steering_angle_deg": 540.0,
    },
    "BMW M4 GT3": {
        "wheelbase_meters": 2.857,
        "steering_ratio": 15.0,
        "max_steering_angle_deg": 540.0,
    },
    "Lamborghini Huracan GT3": {
        "wheelbase_meters": 2.620,
        "steering_ratio": 13.0,
        "max_steering_angle_deg": 540.0,
    },

    # Super Trofeo
    "Lamborghini Huracan Super Trofeo": {
        "wheelbase_meters": 2.620,
        "steering_ratio": 13.5,
        "max_steering_angle_deg": 540.0,
    },
}


# =============================================================================
# Common Track Lengths Reference (in meters)
# =============================================================================
TRACK_LENGTHS = {
    # North America
    "Road Atlanta": 4088,
    "Sebring International": 6019,
    "Watkins Glen": 5552,
    "Circuit of the Americas": 5513,
    "Laguna Seca": 3602,
    "Road America": 6515,
    "VIRginia International Raceway": 5263,
    "Indianapolis GP": 4192,
    "Daytona Road Course": 5729,

    # Europe
    "Spa-Francorchamps": 7004,
    "Nürburgring GP": 5148,
    "Monza": 5793,
    "Silverstone GP": 5891,
    "Barcelona-Catalunya": 4655,
    "Imola": 4909,
    "Paul Ricard": 5842,

    # Add your tracks here
}


# =============================================================================
# Usage Example
# =============================================================================
def get_config_for_track_and_vehicle(track_name: str, vehicle_name: str) -> ReconstructionConfig:
    """
    Helper function to create config from track and vehicle names.
    You'll still need to provide start/finish line coordinates.
    """
    vehicle = VEHICLE_PARAMETERS.get(vehicle_name, {})
    track_length = TRACK_LENGTHS.get(track_name, 0)

    return ReconstructionConfig(
        # You must set these manually for each track
        start_finish_point1=(0.0, 0.0),  # TODO
        start_finish_point2=(0.0, 0.0),  # TODO

        track_length_meters=track_length,
        wheelbase_meters=vehicle.get("wheelbase_meters", 2.65),
        max_steering_angle_deg=vehicle.get("max_steering_angle_deg", 540.0),
        steering_ratio=vehicle.get("steering_ratio", 14.5),

        speed_unit="kph",
        sampling_rate_hz=10.0,
        use_loop_closure=True,
        use_g_force_correction=True,
        g_force_weight=0.3,
    )


# =============================================================================
# Quick Start Example
# =============================================================================
if __name__ == "__main__":
    from track_reconstruction_enhanced import TrackReconstructor

    # Option 1: Use predefined config
    config = ROAD_ATLANTA_CONFIG

    # Option 2: Create custom config
    # config = YOUR_TRACK_CONFIG

    # Option 3: Use helper function
    # config = get_config_for_track_and_vehicle("Sebring International", "Porsche 718 Cayman GT4")
    # config.start_finish_point1 = (27.4515, -81.3488)  # Set manually
    # config.start_finish_point2 = (27.4517, -81.3490)  # Set manually

    reconstructor = TrackReconstructor(config)

    # Load and process your telemetry
    # telemetry_points = your_load_function()
    # updated_points = reconstructor.reconstruct(telemetry_points)

    print("Configuration loaded successfully!")
    print(f"Track length: {config.track_length_meters}m")
    print(f"Wheelbase: {config.wheelbase_meters}m")
    print(f"Steering ratio: {config.steering_ratio}:1")