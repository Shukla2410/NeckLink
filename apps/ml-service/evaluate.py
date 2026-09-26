"""Reproducible synthetic regression check; NOT real-world hazard validation."""
import json
import numpy as np
from model import predictor

X, targets = predictor._generate_synthetic_data(1000, seed=20260925)
predictions = predictor.model.predict(X)
print(json.dumps({
    'model_version': 'ner-synthetic-v1',
    'evaluation_source': 'INDEPENDENT_SYNTHETIC_SEED',
    'samples': len(targets),
    'mean_absolute_error': round(float(np.mean(np.abs(predictions-targets))),4),
    'root_mean_squared_error': round(float(np.sqrt(np.mean((predictions-targets)**2))),4),
    'warning': 'Measures approximation of a synthetic formula only. Requires historical event labels, spatial/time holdouts and probability calibration before real hazard claims.'
}, indent=2))
