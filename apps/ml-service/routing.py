"""
NECKLINK Risk-Weighted Routing Engine
Uses NetworkX graph with Dijkstra and A* to find optimal routes balancing
physical transit distance against live topographical and weather risk.
Cost function:
  Edge_Cost = Distance_km * (1.0 + lambda_weight * Risk_Score)
"""

import networkx as nx

class RoutingEngine:
    def __init__(self):
        self.graph = nx.Graph()
        self.node_locations = {
            "Siliguri": (88.43, 26.72),
            "Gangtok": (88.60, 27.33),
            "Nathu La": (88.83, 27.38),
            "Algarah": (88.58, 27.12),
            "Guwahati": (91.75, 26.15),
            "Goalpara": (90.62, 26.17),
            "Dhubri": (89.98, 26.02),
            "Phulbari": (90.10, 25.75),
            "Tura": (90.22, 25.51),
            "Shillong": (91.89, 25.58),
            "Jowai": (92.20, 25.45),
            "Silchar": (92.80, 24.82),
            "Aizawl": (92.72, 23.73),
            "Agartala": (91.28, 23.83),
            "Dimapur": (93.73, 25.90),
            "Kohima": (94.11, 25.67),
            "Imphal": (93.94, 24.82),
            "Moreh": (94.30, 24.25),
            "Tezpur": (92.80, 26.65),
            "Kaziranga": (93.40, 26.60),
            "Jorhat": (94.20, 26.75),
            "Dibrugarh": (94.91, 27.48),
            "North Lakhimpur": (94.10, 27.23),
            "Pasighat": (95.33, 28.07),
            "Roing": (95.83, 28.14),
            "Tezu": (96.17, 27.92),
            "Itanagar": (93.61, 27.08)
        }
        self._build_corridor_graph()

    def _build_corridor_graph(self):
        # Base edges with distance and standard corridor ID
        edges = [
            ("Siliguri", "Guwahati", {"corridor_id": "CORR-NH27", "distance_km": 472.0, "risk_score": 0.12}),
            ("Siliguri", "Gangtok", {"corridor_id": "CORR-NH10", "distance_km": 114.0, "risk_score": 0.74}),
            ("Siliguri", "Algarah", {"corridor_id": "CORR-NH717A", "distance_km": 92.0, "risk_score": 0.20}),
            ("Algarah", "Gangtok", {"corridor_id": "CORR-NH717B", "distance_km": 58.0, "risk_score": 0.25}),
            ("Gangtok", "Nathu La", {"corridor_id": "CORR-NH310", "distance_km": 54.0, "risk_score": 0.52}),
            ("Guwahati", "Shillong", {"corridor_id": "CORR-NH06A", "distance_km": 99.0, "risk_score": 0.18}),
            ("Shillong", "Jowai", {"corridor_id": "CORR-NH06B", "distance_km": 64.0, "risk_score": 0.22}),
            ("Jowai", "Silchar", {"corridor_id": "CORR-NH06C", "distance_km": 145.0, "risk_score": 0.25}),
            ("Silchar", "Aizawl", {"corridor_id": "CORR-NH306", "distance_km": 165.0, "risk_score": 0.28}),
            ("Silchar", "Agartala", {"corridor_id": "CORR-NH208", "distance_km": 260.0, "risk_score": 0.16}),
            ("Guwahati", "Tezpur", {"corridor_id": "CORR-NH15A", "distance_km": 178.0, "risk_score": 0.14}),
            ("Tezpur", "Kaziranga", {"corridor_id": "CORR-NH37A", "distance_km": 65.0, "risk_score": 0.15}),
            ("Kaziranga", "Jorhat", {"corridor_id": "CORR-NH37B", "distance_km": 90.0, "risk_score": 0.16}),
            ("Jorhat", "Dibrugarh", {"corridor_id": "CORR-NH37C", "distance_km": 138.0, "risk_score": 0.15}),
            ("Tezpur", "North Lakhimpur", {"corridor_id": "CORR-NH15B", "distance_km": 170.0, "risk_score": 0.18}),
            ("North Lakhimpur", "Pasighat", {"corridor_id": "CORR-NH15C", "distance_km": 175.0, "risk_score": 0.20}),
            ("Pasighat", "Roing", {"corridor_id": "CORR-NH13A", "distance_km": 105.0, "risk_score": 0.40}),
            ("Roing", "Tezu", {"corridor_id": "CORR-NH13B", "distance_km": 93.0, "risk_score": 0.45}),
            ("Jorhat", "Dimapur", {"corridor_id": "CORR-LINK-JD", "distance_km": 128.0, "risk_score": 0.20}),
            ("Dimapur", "Kohima", {"corridor_id": "CORR-NH29A", "distance_km": 74.0, "risk_score": 0.68}),
            ("Kohima", "Imphal", {"corridor_id": "CORR-NH29B", "distance_km": 142.0, "risk_score": 0.65}),
            ("Silchar", "Imphal", {"corridor_id": "CORR-NH37-IMP", "distance_km": 240.0, "risk_score": 0.35}),
            ("Imphal", "Moreh", {"corridor_id": "CORR-NH102", "distance_km": 107.0, "risk_score": 0.25}),
            ("Guwahati", "Goalpara", {"corridor_id": "CORR-NH17", "distance_km": 130.0, "risk_score": 0.14}),
            ("Goalpara", "Dhubri", {"corridor_id": "CORR-NH17B", "distance_km": 70.0, "risk_score": 0.15}),
            ("Dhubri", "Phulbari", {"corridor_id": "CORR-NH127B", "distance_km": 72.0, "risk_score": 0.19}),
            ("Phulbari", "Tura", {"corridor_id": "CORR-NH217A", "distance_km": 68.0, "risk_score": 0.24}),
            ("Guwahati", "Itanagar", {"corridor_id": "CORR-NH415", "distance_km": 320.0, "risk_score": 0.20})
        ]

        for u, v, data in edges:
            self.graph.add_edge(u, v, **data)

    def calculate_route(self, origin: str, destination: str, risk_weight: float = 3.5, corridor_risks: dict = None,
                        closed_corridors=None, vehicle_weight_tonnes=0, corridor_limits=None, corridor_speeds=None, network_edges=None, use_demo_links=True):
        """
        Calculates optimal route and compares it with shortest distance route.
        risk_weight = lambda factor weighting risk vs pure distance
        """
        # Clone graph to apply dynamic real-time risk scores
        G = self.graph.copy() if use_demo_links else nx.Graph()
        for edge in network_edges or []:
            G.add_edge(edge['origin'], edge['destination'], corridor_id=edge['corridor_id'],
                       distance_km=edge['distance_km'],risk_score=edge['risk_score'],
                       coordinates=edge.get('coordinates',[]),coordinate_origin=edge['origin'])
        if origin not in G or destination not in G:
            return {"error": f"Node {origin} or {destination} not in graph network"}
        def matches(edge_id, supplied_id):
            key = supplied_id if supplied_id.startswith("CORR-") else "CORR-" + supplied_id
            return edge_id == key or (edge_id.startswith(key) and edge_id[len(key):] in ("A", "B", "C"))

        for u, v, data in list(G.edges(data=True)):
            cid = data["corridor_id"]
            closed = any(matches(cid, key) for key in (closed_corridors or []))
            restricted = any(matches(cid, key) and 0 < limit < vehicle_weight_tonnes
                             for key, limit in (corridor_limits or {}).items())
            if closed or restricted:
                G.remove_edge(u, v)
                continue
            for key, speed in (corridor_speeds or {}).items():
                if matches(cid, key):
                    data["current_speed"] = max(5, float(speed))
        if not nx.has_path(G, origin, destination):
            return {"error": "No accessible route is available for this vehicle. Contact your dispatcher; do not enter a closed road."}
        if corridor_risks:
            for u, v, data in G.edges(data=True):
                cid = data.get("corridor_id")
                # Also check matching prefix or exact
                matched_risk = None
                for key, val in corridor_risks.items():
                    if matches(cid, key):
                        matched_risk = val
                        break
                if matched_risk is not None:
                    data["risk_score"] = float(matched_risk)

        # 1. Pure Shortest Route (Distance only)
        shortest_path = nx.dijkstra_path(G, origin, destination, weight="distance_km")
        shortest_dist = sum(G[u][v]["distance_km"] for u, v in zip(shortest_path[:-1], shortest_path[1:]))
        shortest_risks = [G[u][v]["risk_score"] for u, v in zip(shortest_path[:-1], shortest_path[1:])]
        shortest_avg_risk = sum(shortest_risks) / max(1, len(shortest_risks))
        shortest_max_risk = max(shortest_risks) if shortest_risks else 0.0

        # 2. Risk-Weighted Optimal Route
        def risk_cost_fn(u, v, data):
            dist = data.get("distance_km", 10.0)
            r = data.get("risk_score", 0.1)
            # High non-linear penalty for critical risk (> 0.70)
            penalty = 1.0 + risk_weight * (r ** 1.5)
            if r > 0.75:
                penalty += 10.0 * r
            return dist * penalty

        optimal_path = nx.dijkstra_path(G, origin, destination, weight=risk_cost_fn)
        optimal_dist = sum(G[u][v]["distance_km"] for u, v in zip(optimal_path[:-1], optimal_path[1:]))
        optimal_risks = [G[u][v]["risk_score"] for u, v in zip(optimal_path[:-1], optimal_path[1:])]
        optimal_avg_risk = sum(optimal_risks) / max(1, len(optimal_risks))
        optimal_max_risk = max(optimal_risks) if optimal_risks else 0.0

        is_rerouted = (optimal_path != shortest_path)

        # Speeds: baseline 45 km/h, reduced if high risk
        eff_speed = max(20.0, 50.0 * (1.0 - 0.5 * optimal_avg_risk))
        eta_hours = round(sum(G[u][v]["distance_km"] / G[u][v].get("current_speed", eff_speed)
                              for u, v in zip(optimal_path[:-1], optimal_path[1:])), 2)

        shortest_speed = max(15.0, 50.0 * (1.0 - 0.6 * shortest_avg_risk))
        shortest_eta = round(shortest_dist / shortest_speed, 1)

        # Construct path coordinates for frontend Leaflet rendering
        def get_coordinates(path_nodes):
            coords = []
            for u,v in zip(path_nodes[:-1],path_nodes[1:]):
                data=G[u][v]
                edge_coords=data.get('coordinates')
                if edge_coords:
                    points=edge_coords if data.get('coordinate_origin')==u else list(reversed(edge_coords))
                    coords.extend([[lat,lng] for lng,lat in points])
                else:
                    for n in [u,v]:
                        if n in self.node_locations:
                            lng,lat=self.node_locations[n]
                            coords.append([lat,lng])
            return coords

        return {
            "source": "DATABASE_CORRIDORS_WITH_DEMO_LINKS" if use_demo_links else "DATABASE_CORRIDORS",
            "advisory": "Planning estimate on a simplified network. Follow verified road restrictions and local directions." if use_demo_links else "Planning estimate using imported corridors. Verify recent road conditions before departure.",
            "closed_corridors_excluded": closed_corridors or [],
            "origin": origin,
            "destination": destination,
            "is_rerouted": is_rerouted,
            "reroute_reason": "High risk/hazard avoidance along shortest physical corridor" if is_rerouted else "Direct corridor within safe operational envelope",
            "optimal_route": {
                "path_nodes": optimal_path,
                "coordinates": get_coordinates(optimal_path),
                "distance_km": round(optimal_dist, 1),
                "eta_hours": eta_hours,
                "average_risk_score": round(optimal_avg_risk, 3),
                "peak_risk_score": round(optimal_max_risk, 3),
                "recommendation": "RECOMMENDED_BY_AI"
            },
            "shortest_unweighted_route": {
                "path_nodes": shortest_path,
                "coordinates": get_coordinates(shortest_path),
                "distance_km": round(shortest_dist, 1),
                "eta_hours": shortest_eta,
                "average_risk_score": round(shortest_avg_risk, 3),
                "peak_risk_score": round(shortest_max_risk, 3),
                "recommendation": "HIGH_HAZARD_AVOID" if (shortest_max_risk > 0.65) else "VIABLE"
            }
        }

routing_engine = RoutingEngine()
