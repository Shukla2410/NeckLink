import pytest
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_health():
    res = client.get("/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "healthy"
    assert data["routing_graph_nodes"] > 10

def test_predict_risk_low_and_high():
    # Low risk test
    low_res = client.post("/predict-risk", json={
        "corridor_id": "CORR-NH27",
        "rainfall_mm": 5.0,
        "rainfall_trend": 1,
        "slope_deg": 4.0,
        "historical_incidents": 1,
        "vehicle_speed_anomaly": 0.0,
        "season": 0
    })
    assert low_res.status_code == 200
    low_data = low_res.json()
    assert low_data["risk_score"] < 0.40
    assert low_data["risk_level"] == "LOW"

    # Extreme rainfall spike test
    high_res = client.post("/predict-risk", json={
        "corridor_id": "CORR-NH10",
        "rainfall_mm": 135.0,
        "rainfall_trend": 2,
        "slope_deg": 35.0,
        "historical_incidents": 18,
        "vehicle_speed_anomaly": -22.0,
        "season": 2
    })
    assert high_res.status_code == 200
    high_data = high_res.json()
    assert high_data["risk_score"] >= 0.70
    assert high_data["risk_level"] in ["HIGH", "CRITICAL"]

def test_routing_and_rerouting():
    # Normal route
    res = client.post("/route", json={
        "origin": "Siliguri",
        "destination": "Gangtok",
        "risk_weight": 2.0,
        "corridor_risks": {"NH10": 0.15, "NH717A": 0.20}
    })
    assert res.status_code == 200
    data = res.json()
    assert "optimal_route" in data
    assert data["optimal_route"]["distance_km"] > 0

    # With high risk on NH-10, it should reroute or highlight elevated risk
    res_spike = client.post("/route", json={
        "origin": "Siliguri",
        "destination": "Gangtok",
        "risk_weight": 8.0,
        "corridor_risks": {"NH10": 0.95, "NH717": 0.15}
    })
    assert res_spike.status_code == 200
    spike_data = res_spike.json()
    assert spike_data["is_rerouted"] is True
    assert "Algarah" in spike_data["optimal_route"]["path_nodes"]

def test_glof_travel_time():
    res = client.post("/downstream-travel-time", json={
        "lake_id": "LAKE-SLHONAK",
        "lake_name": "South Lhonak Glacial Lake",
        "estimated_volume_m3": 45000000.0
    })
    assert res.status_code == 200
    data = res.json()
    assert len(data["downstream_cascade"]) >= 4
    assert data["first_settlement_eta_mins"] > 0
