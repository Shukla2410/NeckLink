"""
NECKLINK AI & Routing FastAPI Service
Provides machine learning hazard risk scoring and risk-weighted graph routing
for disaster resilience and supply continuity across India's North Eastern Region.
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Dict, List, Optional
from model import predictor
from routing import routing_engine

app = FastAPI(
    title="NECKLINK AI & Routing Engine",
    description="Risk prediction & routing microservice for North Eastern Region Logistics Intelligence",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class RiskPredictionRequest(BaseModel):
    corridor_id: Optional[str] = "CORR-NH10"
    rainfall_mm: float = Field(default=25.0, description="Precipitation accumulation in mm over 24h")
    rainfall_trend: int = Field(default=1, description="0: Falling, 1: Stable, 2: Rising")
    slope_deg: float = Field(default=15.0, description="Slope inclination in degrees")
    historical_incidents: int = Field(default=3, description="Historical landslide/blockage frequency")
    vehicle_speed_anomaly: float = Field(default=0.0, description="Delta in km/h compared to baseline speed")
    season: int = Field(default=2, description="0: Dry, 1: Pre-Monsoon, 2: Peak Monsoon")

class RouteRequest(BaseModel):
    origin: str = Field(default="Siliguri", description="Origin hub city")
    destination: str = Field(default="Gangtok", description="Destination city")
    risk_weight: float = Field(default=3.5, description="Lambda penalty coefficient for risk")
    corridor_risks: Optional[Dict[str, float]] = None

class GLOFTravelTimeRequest(BaseModel):
    lake_id: str = "LAKE-SLHONAK"
    lake_name: str = "South Lhonak Glacial Lake"
    estimated_volume_m3: float = Field(default=45000000.0, description="Estimated outburst flood volume")
    downstream_targets: Optional[List[Dict[str, float]]] = None

@app.get("/health")
def health():
    return {
        "status": "healthy",
        "service": "NECKLINK ML & Routing Engine",
        "model_version": "RandomForest-v1.0-NER-Synthetic",
        "routing_graph_nodes": len(routing_engine.graph.nodes),
        "routing_graph_edges": len(routing_engine.graph.edges)
    }

@app.post("/predict-risk")
def predict_risk(req: RiskPredictionRequest):
    result = predictor.predict(req.model_dump())
    result["corridor_id"] = req.corridor_id
    return result

@app.post("/route")
def calculate_route(req: RouteRequest):
    result = routing_engine.calculate_route(
        origin=req.origin,
        destination=req.destination,
        risk_weight=req.risk_weight,
        corridor_risks=req.corridor_risks
    )
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    return result

@app.post("/downstream-travel-time")
def calculate_glof_travel_time(req: GLOFTravelTimeRequest):
    """
    Computes flood surge propagation wave and travel-time to downstream settlements
    and road crossings based on hydro-topographic gradient.
    """
    # Teesta River / Lhonak cascade settlements
    default_targets = [
        {"name": "Lachen Settlement & Bridge", "distance_km": 28.5, "elevation_drop_m": 2400.0},
        {"name": "Chungthang Dam & Hub", "distance_km": 62.0, "elevation_drop_m": 3400.0},
        {"name": "Mangan District Center", "distance_km": 88.0, "elevation_drop_m": 4100.0},
        {"name": "Dikchu Bridge Crossing", "distance_km": 115.0, "elevation_drop_m": 4600.0},
        {"name": "Singtam NH-10 Confluence", "distance_km": 142.0, "elevation_drop_m": 4850.0},
        {"name": "Rangpo Border Checkpost", "distance_km": 164.0, "elevation_drop_m": 4900.0}
    ]

    targets = req.downstream_targets or default_targets
    # Average debris flow surge velocity: ~8.5 m/s to 12.0 m/s depending on gradient
    cascade_timeline = []
    accumulated_mins = 0.0

    prev_dist = 0.0
    for target in targets:
        delta_dist_km = target["distance_km"] - prev_dist
        # Faster in steep upper reaches (40 km/h), slows to 25 km/h downstream
        avg_speed_kmh = max(26.0, 48.0 - (target["distance_km"] / 170.0) * 20.0)
        leg_time_mins = (delta_dist_km / avg_speed_kmh) * 60.0
        accumulated_mins += leg_time_mins

        cascade_timeline.append({
            "target": target["name"],
            "distance_from_origin_km": target["distance_km"],
            "estimated_arrival_minutes": round(accumulated_mins, 1),
            "estimated_arrival_formatted": f"{int(accumulated_mins // 60)}h {int(accumulated_mins % 60)}m" if accumulated_mins >= 60 else f"{int(accumulated_mins)} mins",
            "evacuation_status": "IMMEDIATE_ACTION" if accumulated_mins < 60 else "STANDBY_EVACUATION",
            "threat_level": "EXTREME" if accumulated_mins < 90 else "HIGH"
        })
        prev_dist = target["distance_km"]

    return {
        "lake_id": req.lake_id,
        "lake_name": req.lake_name,
        "surge_velocity_range_kmh": "26 - 48 km/h",
        "downstream_cascade": cascade_timeline,
        "first_settlement_eta_mins": cascade_timeline[0]["estimated_arrival_minutes"],
        "critical_evacuation_window": f"{cascade_timeline[0]['estimated_arrival_formatted']} to first population center"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
