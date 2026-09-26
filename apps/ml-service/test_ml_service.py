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

def test_closed_corridor_never_used_even_with_zero_risk_weight():
    response = client.post('/route', json={'origin':'Siliguri','destination':'Gangtok','risk_weight':0,'closed_corridors':['CORR-NH10']})
    assert response.status_code == 200
    assert 'Algarah' in response.json()['optimal_route']['path_nodes']

def test_no_accessible_route():
    response = client.post('/route', json={'origin':'Gangtok','destination':'Nathu La','closed_corridors':['CORR-NH310']})
    assert response.status_code == 422
    assert 'No accessible route' in response.json()['detail']

def test_vehicle_weight_restriction():
    response = client.post('/route', json={'origin':'Siliguri','destination':'Gangtok','risk_weight':0,'vehicle_weight_tonnes':25,'corridor_limits':{'CORR-NH10':20}})
    assert response.status_code == 200
    assert 'Algarah' in response.json()['optimal_route']['path_nodes']

def test_closure_prefix_does_not_close_different_highway():
    response = client.post('/route', json={'origin':'Imphal','destination':'Moreh','closed_corridors':['CORR-NH10']})
    assert response.status_code == 200
    assert response.json()['optimal_route']['path_nodes']==['Imphal','Moreh']

def test_invalid_inputs_rejected():
    assert client.post('/predict-risk',json={'rainfall_mm':-1}).status_code == 422
    assert client.post('/route',json={'risk_weight':-2}).status_code == 422

def test_other_lake_does_not_reuse_teesta_scenario():
    assert client.post('/downstream-travel-time',json={'lake_id':'LAKE-DIBANG'}).status_code == 422

def test_scenario_targets_are_sorted_and_labelled():
    response=client.post('/downstream-travel-time',json={'downstream_targets':[{'name':'B','distance_km':40},{'name':'A','distance_km':20}]})
    assert response.status_code==200
    assert response.json()['downstream_cascade'][0]['target']=='A'
    assert response.json()['source']=='ILLUSTRATIVE_TRAVEL_TIME_SCENARIO'

def test_production_network_uses_only_supplied_edges_and_geometry():
    edges=[{'corridor_id':'NEW','origin':'Village A','destination':'Clinic B','distance_km':12,'risk_score':0.1,'coordinates':[[90,26],[90.1,26.1]]}]
    response=client.post('/route',json={'origin':'Village A','destination':'Clinic B','network_edges':edges,'use_demo_links':False})
    assert response.status_code==200
    assert response.json()['optimal_route']['coordinates']==[[26,90],[26.1,90.1]]
    assert client.post('/route',json={'origin':'Siliguri','destination':'Gangtok','network_edges':edges,'use_demo_links':False}).status_code==422
