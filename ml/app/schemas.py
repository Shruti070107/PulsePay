from pydantic import BaseModel
from typing import List, Optional

class FeatureVector(BaseModel):
    amount: float
    processing_time_ms: float
    webhook_failure_count: float
    webhook_retry_count: float
    webhook_delay_ms: float
    event_count: float
    event_order_violation: float
    duplicate_similarity: float
    merchant_failure_rate: float
    payment_failure_rate: float
    hour_of_day: float

class PredictRequest(BaseModel):
    features: FeatureVector

class PredictResponse(BaseModel):
    raw_score: float
    normalized_anomaly_score: float
    is_anomaly: bool
    threshold: float
    feature_contributions: dict
    feature_influence_disclaimer: str = "Approximate feature influence via perturbation (not native feature attribution)"

class TrainRequest(BaseModel):
    dataset: List[FeatureVector]
    contamination: Optional[float] = 0.05
    n_estimators: Optional[int] = 100
    random_state: Optional[int] = 42
