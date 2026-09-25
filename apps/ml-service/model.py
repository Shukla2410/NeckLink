"""
NECKLINK Disruption Risk Scoring Model
Trained on synthetic dataset representing North Eastern Region terrain & meteorological triggers.
Features:
- rainfall_mm: float (0.0 - 250.0 mm/24hr)
- rainfall_trend: int (0: falling, 1: stable, 2: rising)
- slope_deg: float (0.0 - 50.0 degrees)
- historical_incidents: int (0 - 40 past landslides/blockades)
- vehicle_speed_anomaly: float (-50.0 to +10.0 km/h drop vs baseline)
- season: int (0: winter/dry, 1: pre-monsoon, 2: monsoon peak)
"""

import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.preprocessing import StandardScaler

class RiskPredictor:
    def __init__(self):
        self.model = RandomForestRegressor(n_estimators=100, random_state=42, max_depth=6)
        self.scaler = StandardScaler()
        self.feature_names = [
            "rainfall_mm",
            "rainfall_trend",
            "slope_deg",
            "historical_incidents",
            "vehicle_speed_anomaly",
            "season"
        ]
        self._train_initial_model()

    def _generate_synthetic_data(self, n_samples=600, seed=42):
        np.random.seed(seed)
        rainfall = np.random.exponential(scale=35.0, size=n_samples).clip(0, 220)
        rainfall_trend = np.random.choice([0, 1, 2], size=n_samples, p=[0.25, 0.45, 0.30])
        slope = np.random.normal(loc=18.0, scale=8.0, size=n_samples).clip(2, 48)
        hist_incidents = np.random.poisson(lam=5, size=n_samples).clip(0, 30)
        speed_anomaly = np.random.normal(loc=-4.0, scale=8.0, size=n_samples).clip(-45, 10)
        season = np.random.choice([0, 1, 2], size=n_samples, p=[0.3, 0.2, 0.5])

        # Domain physics ground truth formula for hazard probability:
        # High rainfall + steep slope + rising trend + negative speed anomaly (congestion/blockage)
        raw_score = (
            0.35 * (rainfall / 150.0) +
            0.20 * (slope / 45.0) +
            0.15 * (rainfall_trend / 2.0) +
            0.12 * (hist_incidents / 25.0) +
            0.18 * np.maximum(0, -speed_anomaly / 35.0)
        )
        # Non-linear threshold triggering for extreme combinations
        critical_interaction = ((rainfall > 60) & (slope > 22)).astype(float) * 0.20
        y = np.clip(raw_score + critical_interaction, 0.05, 0.98)

        df = pd.DataFrame({
            "rainfall_mm": rainfall,
            "rainfall_trend": rainfall_trend,
            "slope_deg": slope,
            "historical_incidents": hist_incidents,
            "vehicle_speed_anomaly": speed_anomaly,
            "season": season
        })
        return df, y

    def _train_initial_model(self):
        X, y = self._generate_synthetic_data()
        self.model.fit(X, y)

    def predict(self, features: dict):
        df_in = pd.DataFrame([{
            "rainfall_mm": float(features.get("rainfall_mm", 10.0)),
            "rainfall_trend": int(features.get("rainfall_trend", 1)),
            "slope_deg": float(features.get("slope_deg", 15.0)),
            "historical_incidents": int(features.get("historical_incidents", 3)),
            "vehicle_speed_anomaly": float(features.get("vehicle_speed_anomaly", 0.0)),
            "season": int(features.get("season", 2))
        }])

        pred_score = float(self.model.predict(df_in)[0])
        pred_score = max(0.05, min(0.99, round(pred_score, 3)))

        if pred_score < 0.35:
            level = "LOW"
            color = "#10B981"
        elif pred_score < 0.65:
            level = "MEDIUM"
            color = "#F59E0B"
        elif pred_score < 0.85:
            level = "HIGH"
            color = "#EF4444"
        else:
            level = "CRITICAL"
            color = "#E879F9"

        # Signal attribution estimation
        rf_val = float(features.get("rainfall_mm", 10.0))
        slope_val = float(features.get("slope_deg", 15.0))
        anomaly_val = float(features.get("vehicle_speed_anomaly", 0.0))

        signals = {
            "meteorological_weight": round(min(1.0, rf_val / 100.0) * 0.45, 2),
            "topographical_weight": round(min(1.0, slope_val / 40.0) * 0.25, 2),
            "vehicle_telematics_weight": round(min(1.0, max(0.0, -anomaly_val) / 25.0) * 0.30, 2)
        }

        explanation = []
        if rf_val > 50.0:
            explanation.append(f"Heavy precipitation detected ({rf_val} mm/24h)")
        if slope_val > 25.0:
            explanation.append(f"Steep gradient terrain ({slope_val}° slope)")
        if anomaly_val < -10.0:
            explanation.append(f"Vehicle speed anomaly alert ({anomaly_val:.1f} km/h below baseline)")

        if not explanation:
            explanation.append("Normal operational parameters within safe envelope")

        return {
            "source": "SYNTHETIC_RANDOM_FOREST",
            "model_version": "ner-synthetic-v1",
            "calibrated_probability": False,
            "prediction_horizon_hours": 24,
            "risk_score": pred_score,
            "risk_level": level,
            "badge_color": color,
            "contributing_signals": signals,
            "explanation": " • ".join(explanation)
        }

predictor = RiskPredictor()
