"""
Enhanced Dead Reckoning Track Reconstruction Script with G-Force Correction
Backfills latitude, longitude, and distance values for telemetry data using vehicle dynamics integration
with optional g-force based validation and correction for improved accuracy.
"""

import dataclasses
from dataclasses import dataclass
from typing import List, Tuple, Optional
import numpy as np
import math


@dataclass
class ReconstructionConfig:
    """Configuration for track reconstruction."""
    # Start/Finish Line (2 lat/lng points defining a line across track)
    start_finish_point1: Tuple[float, float]  # (lat, lng)
    start_finish_point2: Tuple[float, float]  # (lat, lng)

    # Track Parameters
    track_length_meters: float  # Total track length in meters

    # Vehicle Parameters
    wheelbase_meters: float = 2.7  # Distance between front and rear axle (typical GT car)
    max_steering_angle_deg: float = 540.0  # Max steering wheel angle (lock-to-lock)
    steering_ratio: float = 14.0  # Steering wheel to road wheel ratio

    # Speed Configuration
    speed_unit: str = "kph"  # "kph" or "mph"

    # Sampling Rate
    sampling_rate_hz: float = 10.0

    # Processing Options
    use_loop_closure: bool = True  # Correct drift by forcing path back to start/finish
    use_g_force_correction: bool = True  # Use lateral g-force to improve accuracy
    g_force_weight: float = 0.3  # Weight for g-force correction (0-1, higher = more g-force influence)
    cross_track_tolerance_meters: float = 20.0  # Tolerance for start/finish line crossing detection


class TrackReconstructor:
    """Reconstructs track map and backfills GPS coordinates using dead reckoning with g-force correction."""

    def __init__(self, config: ReconstructionConfig):
        self.config = config
        self.dt = 1.0 / config.sampling_rate_hz

        # Calculate reference point and bearing from start/finish line
        self.ref_lat, self.ref_lng = config.start_finish_point1
        self.sf_bearing = self._calculate_bearing(
            config.start_finish_point1,
            config.start_finish_point2
        )

    def _calculate_bearing(self, point1: Tuple[float, float], point2: Tuple[float, float]) -> float:
        """Calculate bearing between two lat/lng points in radians."""
        lat1, lng1 = math.radians(point1[0]), math.radians(point1[1])
        lat2, lng2 = math.radians(point2[0]), math.radians(point2[1])

        dlon = lng2 - lng1
        x = math.sin(dlon) * math.cos(lat2)
        y = math.cos(lat1) * math.sin(lat2) - math.sin(lat1) * math.cos(lat2) * math.cos(dlon)
        bearing = math.atan2(x, y)
        return bearing

    def _speed_to_mps(self, speed: float) -> float:
        """Convert speed to meters per second."""
        if self.config.speed_unit == "kph":
            return speed / 3.6
        elif self.config.speed_unit == "mph":
            return speed * 0.44704
        return speed

    def _steering_to_road_wheel_angle(self, steering_deg: float) -> float:
        """Convert steering wheel angle to road wheel angle in radians."""
        # Normalize steering input to road wheel angle
        road_wheel_deg = steering_deg / self.config.steering_ratio
        # Clamp to physical limits
        max_road_wheel = self.config.max_steering_angle_deg / self.config.steering_ratio
        road_wheel_deg = np.clip(road_wheel_deg, -max_road_wheel, max_road_wheel)
        return math.radians(road_wheel_deg)

    def _calculate_expected_lateral_g(self, speed_mps: float, turn_radius: float) -> float:
        """
        Calculate expected lateral g-force from speed and turn radius.
        g_lat = v^2 / (r * g) where g = 9.81 m/s^2
        """
        if abs(turn_radius) < 0.1:  # Avoid division by zero
            return 0.0
        g_earth = 9.81
        return (speed_mps ** 2) / (abs(turn_radius) * g_earth)

    def _bicycle_model_step(self, x: float, y: float, heading: float, 
                           speed_mps: float, steering_deg: float,
                           measured_g_lat: Optional[float] = None) -> Tuple[float, float, float]:
        """
        Single step of kinematic bicycle model with optional g-force correction.
        Returns new (x, y, heading).
        """
        delta = self._steering_to_road_wheel_angle(steering_deg)
        L = self.config.wheelbase_meters

        # Calculate turn radius from bicycle model
        if abs(delta) > 1e-6:  # Avoid division by zero
            turn_radius = L / math.tan(delta)
        else:
            turn_radius = float('inf')

        # Calculate heading change rate
        if abs(turn_radius) > 0.1 and turn_radius != float('inf'):
            dheading_dt = speed_mps / turn_radius
        else:
            dheading_dt = 0.0

        # G-force correction if available
        if (measured_g_lat is not None and 
            self.config.use_g_force_correction and 
            abs(turn_radius) > 0.1 and 
            turn_radius != float('inf')):

            # Calculate expected g-force from kinematic model
            expected_g = self._calculate_expected_lateral_g(speed_mps, turn_radius)

            # If measured g-force differs significantly, adjust turn radius
            if abs(expected_g) > 0.01:  # Avoid division by zero
                g_ratio = abs(measured_g_lat) / abs(expected_g)

                # Blend the correction based on g_force_weight
                corrected_ratio = 1.0 + (g_ratio - 1.0) * self.config.g_force_weight

                # Adjust turn radius (if g_lat is higher, turn is tighter)
                turn_radius = turn_radius / corrected_ratio
                dheading_dt = speed_mps / turn_radius if abs(turn_radius) > 0.1 else 0.0

        # Apply heading change
        dheading = dheading_dt * self.dt
        new_heading = heading + dheading

        # Calculate position change (use average heading for better accuracy)
        avg_heading = heading + dheading / 2.0
        dx = speed_mps * self.dt * math.cos(avg_heading)
        dy = speed_mps * self.dt * math.sin(avg_heading)

        return x + dx, y + dy, new_heading

    def _integrate_path(self, telemetry_points: List) -> Tuple[np.ndarray, np.ndarray, np.ndarray]:
        """
        Integrate vehicle path using dead reckoning with g-force correction.
        Returns arrays of (x, y, heading) in local coordinates.
        """
        n = len(telemetry_points)
        x = np.zeros(n)
        y = np.zeros(n)
        heading = np.zeros(n)

        # Initialize at origin with heading aligned to start/finish line
        x[0] = 0.0
        y[0] = 0.0
        heading[0] = self.sf_bearing

        for i in range(1, n):
            speed_mps = self._speed_to_mps(telemetry_points[i].speed)
            steering = telemetry_points[i].steering
            g_lat = telemetry_points[i].g_lat if hasattr(telemetry_points[i], 'g_lat') else None

            x[i], y[i], heading[i] = self._bicycle_model_step(
                x[i-1], y[i-1], heading[i-1], speed_mps, steering, g_lat
            )

        return x, y, heading

    def _apply_loop_closure(self, x: np.ndarray, y: np.ndarray, 
                           lap_segments: List[Tuple[int, int]]) -> Tuple[np.ndarray, np.ndarray]:
        """
        Apply loop closure correction to each lap segment.
        Forces the path to return to start/finish, redistributing drift.
        """
        x_corrected = x.copy()
        y_corrected = y.copy()

        for start_idx, end_idx in lap_segments:
            if start_idx >= end_idx:
                continue

            # Calculate drift at end of lap
            drift_x = x[end_idx] - x[start_idx]
            drift_y = y[end_idx] - y[start_idx]

            drift_magnitude = math.sqrt(drift_x**2 + drift_y**2)

            # Linearly redistribute drift across the lap
            lap_length = end_idx - start_idx
            for i in range(start_idx, end_idx + 1):
                progress = (i - start_idx) / lap_length
                x_corrected[i] = x[i] - drift_x * progress
                y_corrected[i] = y[i] - drift_y * progress

        return x_corrected, y_corrected

    def _scale_path_to_track_length(self, x: np.ndarray, y: np.ndarray,
                                    lap_segments: List[Tuple[int, int]]) -> Tuple[np.ndarray, np.ndarray]:
        """
        Scale each lap to match the known track length.
        """
        x_scaled = x.copy()
        y_scaled = y.copy()

        for start_idx, end_idx in lap_segments:
            if start_idx >= end_idx:
                continue

            # Calculate integrated lap distance
            lap_x = x[start_idx:end_idx+1]
            lap_y = y[start_idx:end_idx+1]

            distances = np.sqrt(np.diff(lap_x)**2 + np.diff(lap_y)**2)
            integrated_distance = np.sum(distances)

            if integrated_distance > 0:
                scale_factor = self.config.track_length_meters / integrated_distance

                # Scale this lap segment relative to start point
                centroid_x = x[start_idx]
                centroid_y = y[start_idx]

                for i in range(start_idx, end_idx + 1):
                    x_scaled[i] = centroid_x + (x[i] - centroid_x) * scale_factor
                    y_scaled[i] = centroid_y + (y[i] - centroid_y) * scale_factor

        return x_scaled, y_scaled

    def _detect_lap_crossings(self, x: np.ndarray, y: np.ndarray, 
                             lap_numbers: np.ndarray) -> List[Tuple[int, int]]:
        """
        Detect lap segments based on lap numbers.
        Returns list of (start_idx, end_idx) tuples.
        """
        segments = []

        # Group by lap number
        unique_laps = np.unique(lap_numbers)

        for lap_num in unique_laps:
            if lap_num is None or (isinstance(lap_num, float) and np.isnan(lap_num)):
                continue
            lap_indices = np.where(lap_numbers == lap_num)[0]
            if len(lap_indices) > 0:
                segments.append((int(lap_indices[0]), int(lap_indices[-1])))

        return segments

    def _xy_to_latlong(self, x: float, y: float) -> Tuple[float, float]:
        """
        Convert local XY coordinates (meters) to WGS84 lat/lng.
        Uses equirectangular approximation (sufficient for race track distances).
        """
        # Earth radius in meters
        R = 6371000.0

        # Convert reference point to radians
        lat0 = math.radians(self.ref_lat)
        lng0 = math.radians(self.ref_lng)

        # Rotate XY by start/finish bearing to align with lat/lng grid
        cos_bearing = math.cos(self.sf_bearing)
        sin_bearing = math.sin(self.sf_bearing)

        # Apply rotation (align local coordinates with geographic north)
        x_rot = x * cos_bearing - y * sin_bearing
        y_rot = x * sin_bearing + y * cos_bearing

        # Convert to lat/lng offsets
        dlat = y_rot / R
        dlng = x_rot / (R * math.cos(lat0))

        # Add to reference point
        lat = math.degrees(lat0 + dlat)
        lng = math.degrees(lng0 + dlng)

        return lat, lng

    def _calculate_distances(self, x: np.ndarray, y: np.ndarray, 
                            lap_segments: List[Tuple[int, int]]) -> Tuple[np.ndarray, np.ndarray]:
        """
        Calculate dist_lap and dist_lap_percent for all points.
        dist_lap resets each lap (cumulative within lap).
        """
        n = len(x)
        dist_lap = np.zeros(n)
        dist_lap_percent = np.zeros(n)

        for start_idx, end_idx in lap_segments:
            if start_idx >= end_idx:
                continue

            # Calculate cumulative distance for this lap
            lap_x = x[start_idx:end_idx+1]
            lap_y = y[start_idx:end_idx+1]

            distances = np.sqrt(np.diff(lap_x)**2 + np.diff(lap_y)**2)
            cumulative = np.concatenate([[0], np.cumsum(distances)])

            dist_lap[start_idx:end_idx+1] = cumulative

            # Calculate percentage
            total_dist = cumulative[-1] if cumulative[-1] > 0 else self.config.track_length_meters
            if total_dist > 0:
                dist_lap_percent[start_idx:end_idx+1] = (cumulative / total_dist) * 100.0

        return dist_lap, dist_lap_percent

    def reconstruct(self, telemetry_points: List) -> List:
        """
        Main reconstruction method. Backfills lat/lng and distance values.
        Returns list of updated TelemetryPoint objects.
        """
        if not telemetry_points:
            return []

        print(f"\n{'='*60}")
        print(f"TRACK RECONSTRUCTION - {len(telemetry_points)} points")
        print(f"{'='*60}")

        # Step 1: Dead reckoning integration
        print("\n[1/6] Integrating path using bicycle model...")
        if self.config.use_g_force_correction:
            print("      ↳ G-force correction enabled (weight: {:.1%})".format(self.config.g_force_weight))
        x, y, heading = self._integrate_path(telemetry_points)
        print(f"      ✓ Path integrated")

        # Step 2: Detect lap segments
        print("\n[2/6] Detecting lap segments...")
        lap_numbers = np.array([p.lap_number if p.lap_number is not None else 0 
                               for p in telemetry_points])
        lap_segments = self._detect_lap_crossings(x, y, lap_numbers)
        print(f"      ✓ Found {len(lap_segments)} lap segments")
        for i, (start, end) in enumerate(lap_segments):
            print(f"         Lap {i+1}: indices {start}-{end} ({end-start+1} points)")

        # Step 3: Apply loop closure correction
        if self.config.use_loop_closure and len(lap_segments) > 0:
            print("\n[3/6] Applying loop closure correction...")
            x_before = x.copy()
            y_before = y.copy()
            x, y = self._apply_loop_closure(x, y, lap_segments)

            # Calculate average drift corrected
            total_drift = 0
            for start_idx, end_idx in lap_segments:
                drift = math.sqrt((x_before[end_idx] - x_before[start_idx])**2 + 
                                (y_before[end_idx] - y_before[start_idx])**2)
                total_drift += drift
            avg_drift = total_drift / len(lap_segments) if lap_segments else 0
            print(f"      ✓ Average drift per lap: {avg_drift:.2f}m")
        else:
            print("\n[3/6] Loop closure disabled")

        # Step 4: Scale to known track length
        if self.config.track_length_meters > 0 and len(lap_segments) > 0:
            print("\n[4/6] Scaling path to match track length...")
            x, y = self._scale_path_to_track_length(x, y, lap_segments)
            print(f"      ✓ Scaled to {self.config.track_length_meters}m")
        else:
            print("\n[4/6] Track length scaling disabled")

        # Step 5: Convert to lat/lng
        print("\n[5/6] Converting to lat/lng coordinates...")
        updated_points = []
        for i, point in enumerate(telemetry_points):
            lat, lng = self._xy_to_latlong(x[i], y[i])

            # Create updated point with new lat/lng
            updated_point = dataclasses.replace(
                point,
                latitude=lat,
                longitude=lng
            )
            updated_points.append(updated_point)
        print(f"      ✓ Converted {len(updated_points)} points")

        # Step 6: Calculate distances
        print("\n[6/6] Calculating distances...")
        dist_lap, dist_lap_percent = self._calculate_distances(x, y, lap_segments)

        final_points = []
        for i, point in enumerate(updated_points):
            final_point = dataclasses.replace(
                point,
                dist_lap=float(dist_lap[i]),
                dist_lap_percent=float(dist_lap_percent[i])
            )
            final_points.append(final_point)
        print(f"      ✓ Distance calculations complete")

        print(f"\n{'='*60}")
        print("RECONSTRUCTION COMPLETE")
        print(f"{'='*60}\n")

        return final_points


def example_usage():
    """Example usage of the reconstruction script."""

    # Define configuration
    config = ReconstructionConfig(
        # Example: Road Atlanta start/finish line
        start_finish_point1=(34.1523, -84.2496),
        start_finish_point2=(34.1525, -84.2494),
        track_length_meters=4088.0,  # 2.54 miles

        # Vehicle parameters (typical GT4 car)
        wheelbase_meters=2.65,
        max_steering_angle_deg=540.0,
        steering_ratio=14.5,

        # Speed in kph
        speed_unit="kph",

        # 10 Hz sampling
        sampling_rate_hz=10.0,

        # Processing options
        use_loop_closure=True,
        use_g_force_correction=True,
        g_force_weight=0.3,  # 30% weight to g-force measurements
        cross_track_tolerance_meters=20.0
    )

    # Create reconstructor
    reconstructor = TrackReconstructor(config)

    print("="*60)
    print("TRACK RECONSTRUCTION CONFIGURATION")
    print("="*60)
    print(f"Track Length:        {config.track_length_meters}m")
    print(f"Speed Unit:          {config.speed_unit}")
    print(f"Sampling Rate:       {config.sampling_rate_hz} Hz")
    print(f"Wheelbase:           {config.wheelbase_meters}m")
    print(f"Steering Ratio:      {config.steering_ratio}:1")
    print(f"Loop Closure:        {'Enabled' if config.use_loop_closure else 'Disabled'}")
    print(f"G-Force Correction:  {'Enabled' if config.use_g_force_correction else 'Disabled'}")
    if config.use_g_force_correction:
        print(f"G-Force Weight:      {config.g_force_weight:.1%}")
    print("="*60)

    # Example: Load and process your telemetry
    # from your_telemetry_module import TelemetryPoint, load_telemetry
    # telemetry_points = load_telemetry("race_data.csv")
    # updated_points = reconstructor.reconstruct(telemetry_points)
    # save_telemetry(updated_points, "race_data_with_gps.csv")


if __name__ == "__main__":
    example_usage()