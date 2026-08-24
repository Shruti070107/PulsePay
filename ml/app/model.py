import os
import joblib
import pandas as pd
import numpy as np
from sklearn.ensemble import IsolationForest

MODEL_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "models")
MODEL_PATH = os.path.join(MODEL_DIR, "isolation_forest.pkl")

class ModelManager:
    def __init__(self):
        self.model = None
        self.load_model()

    def load_model(self):
        if os.path.exists(MODEL_PATH):
            try:
                self.model = joblib.load(MODEL_PATH)
                print(f"Model loaded successfully from {MODEL_PATH}")
            except Exception as e:
                print(f"Error loading model from {MODEL_PATH}: {e}")
                self.model = None
        else:
            print(f"No trained model found at {MODEL_PATH}. Ready to train.")
            self.model = None

    def train(self, dataset, contamination=0.05, n_estimators=100, random_state=42):
        # Convert List[FeatureVector] to DataFrame
        data = [v.model_dump() for v in dataset]
        df = pd.DataFrame(data)

        # Fit Isolation Forest
        clf = IsolationForest(
            contamination=contamination,
            n_estimators=n_estimators,
            random_state=random_state
        )
        clf.fit(df)
        self.model = clf

        # Save model
        os.makedirs(MODEL_DIR, exist_ok=True)
        joblib.dump(self.model, MODEL_PATH)
        print(f"Model saved successfully to {MODEL_PATH}")

        # Return fitting stats
        predictions = clf.predict(df)
        anomalies_count = int((predictions == -1).sum())
        return {
            "total_samples": len(df),
            "anomalies_detected": anomalies_count,
            "normal_samples": len(df) - anomalies_count
        }

    def predict(self, feature_vector):
        if not self.model:
            # Return safe default if model is not trained
            return {
                "raw_score": 0.0,
                "normalized_anomaly_score": 0.0,
                "is_anomaly": False
            }

        # Convert FeatureVector to DataFrame row
        df = pd.DataFrame([feature_vector.model_dump()])
        
        raw_score = float(self.model.decision_function(df)[0])
        prediction = int(self.model.predict(df)[0])

        # Normalize score: scikit-learn outputs decision_function in [-0.5, 0.5] range
        # where negative scores denote outliers, positive denote inliers.
        # We transform this to [0.0, 1.0] where 1.0 represents highly anomalous.
        normalized_score = float(np.clip(0.5 - raw_score, 0.0, 1.0))
        is_anomaly = bool(prediction == -1)

        return {
            "raw_score": raw_score,
            "normalized_anomaly_score": normalized_score,
            "is_anomaly": is_anomaly
        }
        
    def batch_predict(self, dataset):
        if not self.model:
            return [{
                "raw_score": 0.0,
                "normalized_anomaly_score": 0.0,
                "is_anomaly": False
            } for _ in dataset]
            
        data = [v.model_dump() for v in dataset]
        df = pd.DataFrame(data)
        
        raw_scores = self.model.decision_function(df)
        predictions = self.model.predict(df)
        
        results = []
        for raw_score, pred in zip(raw_scores, predictions):
            normalized_score = float(np.clip(0.5 - raw_score, 0.0, 1.0))
            results.append({
                "raw_score": float(raw_score),
                "normalized_anomaly_score": normalized_score,
                "is_anomaly": bool(pred == -1)
            })
        return results
