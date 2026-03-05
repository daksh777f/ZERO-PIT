import dataclasses
from typing import Optional, Dict, List, Any
from .base import PositionData

@dataclasses.dataclass
class TelemetryPoint:
    """
    Unified internal representation of a single telemetry data record AFTER mapping and basic preprocessing.
    All analysis logic should operate on objects of this type or DataFrames using these column names.
    """
    # --- REQUIRED CORE ---
    timestamp_sec: float      # Timestamp in seconds (relative to session start or epoch)
    speed: float              # Speed (use consistent units internally, e.g., m/s)
    throttle: float           # Throttle position (e.g., 0-100 or 0-1)
    throttle_raw: float       # Raw throttle position
    brake: float              # Brake pressure/position (e.g., bar, psi, 0-100, or 0-1)
    steering: float           # Steering angle (e.g., degrees, positive right or left?)

    # Backfill with generated data
    latitude: float           # WGS84 Latitude
    longitude: float          # WGS84 Longitude

    # --- REQUIRED FOR ADVANCED ANALYSIS (calculate if missing) ---
    dist_lap: Optional[float] = None
    dist_lap_percent: Optional[float] = None # Distance into lap (meters) - CRITICAL
    lap_number: Optional[int] = None

    # --- RECOMMENDED / HIGHLY USEFUL (raw or calculated) ---
    g_lat: Optional[float] = None # Lateral G-force
    g_lon: Optional[float] = None # Longitudinal G-force
    g_vrt: Optional[float] = None # Vertical G if available
    g_combo: Optional[float] = None # sqrt(g_lat^2 + g_lon^2) (calculated)

    # --- VEHICLE STATUS (raw telemetry) ---
    rpm: Optional[float] = None
    gear: Optional[int] = None


    brakeFront: Optional[float] = None
    brakeRear: Optional[float] = None
    brakeBiasCalculated: Optional[float] = None # Calculated brake bias if front and rear are available
    speed_gps: Optional[float] = None
    
    # Extension point for future telemetry data
    extensions: Dict[str, Any] = dataclasses.field(default_factory=dict)
    
    def validate(self) -> List[str]:
        """Validate the telemetry point and return a list of validation errors."""
        errors = []
        if not isinstance(self.timestamp_sec, (int, float)):
            errors.append("timestamp_sec must be a number")
        if not isinstance(self.latitude, (int, float)):
            errors.append("latitude must be a number")
        if not isinstance(self.longitude, (int, float)):
            errors.append("longitude must be a number")
        if not isinstance(self.speed, (int, float)):
            errors.append("speed must be a number")
        if not isinstance(self.throttle, (int, float)):
            errors.append("throttle must be a number")
        if not isinstance(self.brake, (int, float)):
            errors.append("brake must be a number")
        if not isinstance(self.steering, (int, float)):
            errors.append("steering must be a number")
        return errors