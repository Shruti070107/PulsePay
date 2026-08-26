from fastapi import FastAPI, HTTPException
from app.schemas import PredictRequest, PredictResponse, TrainRequest, FeatureVector
from app.model import ModelManager
from typing import List

app = FastAPI(title="PulsePay ML Anomaly Detection Service")
model_manager = ModelManager()

@app.get("/health")
def health():
    return {
        "status": "healthy",
        "model_loaded": model_manager.model is not None
    }

@app.post("/predict", response_model=PredictResponse)
def predict(request: PredictRequest):
    try:
        result = model_manager.predict(request.features)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/batch-predict", response_model=List[PredictResponse])
def batch_predict(request: List[FeatureVector]):
    try:
        result = model_manager.batch_predict(request)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/train")
def train(request: TrainRequest):
    if len(request.dataset) < 5:
        raise HTTPException(status_code=400, detail="Dataset must contain at least 5 samples to train.")
    try:
        stats = model_manager.train(
            dataset=request.dataset,
            contamination=request.contamination,
            n_estimators=request.n_estimators,
            random_state=request.random_state
        )
        return {
            "success": True,
            "message": "Model trained and saved successfully.",
            "metrics": stats
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
