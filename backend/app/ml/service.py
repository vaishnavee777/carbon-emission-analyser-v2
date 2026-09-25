import json
import math
import os
import time
from datetime import date, datetime, timedelta
from pathlib import Path

import numpy as np
import torch
from codecarbon import OfflineEmissionsTracker
from sqlalchemy.orm import Session

from app import grid
from app.ml.features import build_dataset, build_histories, features_for_day
from app.ml.model import EmissionNet, count_parameters
from app.models import Activity, Prediction

ARTIFACT_DIR = Path(__file__).parent / "artifacts"
WEIGHTS_PATH = ARTIFACT_DIR / "emission_net.pt"
METADATA_PATH = ARTIFACT_DIR / "metadata.json"
MODEL_NAME = "emission_net"

MAX_EPOCHS = 300
PATIENCE = 15

torch.set_num_threads(1)

_cached_model: EmissionNet | None = None


def train_model(db: Session) -> dict:
    global _cached_model

    activities = db.query(Activity).all()
    histories = build_histories(activities)
    x, y = build_dataset(histories, end_day=date.today())
    if len(x) < 50:
        raise ValueError("Not enough activity history to train the model.")

    rng = np.random.default_rng(42)
    order = rng.permutation(len(x))
    split = int(len(x) * 0.8)
    x_train, y_train = torch.from_numpy(x[order[:split]]), torch.from_numpy(y[order[:split]])
    x_val, y_val = torch.from_numpy(x[order[split:]]), torch.from_numpy(y[order[split:]])

    torch.manual_seed(42)
    model = EmissionNet()
    optimizer = torch.optim.Adam(model.parameters(), lr=0.01)
    loss_fn = torch.nn.MSELoss()

    tracker = OfflineEmissionsTracker(
        country_iso_code=os.getenv("CODECARBON_COUNTRY", "IND"),
        save_to_file=False,
        log_level="error",
        allow_multiple_runs=True,
    )

    best_val = math.inf
    best_state = None
    epochs_without_improvement = 0
    epochs_run = 0

    tracker.start()
    started = time.perf_counter()
    try:
        for epoch in range(1, MAX_EPOCHS + 1):
            epochs_run = epoch
            model.train()
            optimizer.zero_grad()
            loss = loss_fn(model(x_train), y_train)
            loss.backward()
            optimizer.step()

            model.eval()
            with torch.no_grad():
                val_loss = loss_fn(model(x_val), y_val).item()

            if val_loss < best_val - 1e-5:
                best_val = val_loss
                best_state = {k: v.clone() for k, v in model.state_dict().items()}
                epochs_without_improvement = 0
            else:
                epochs_without_improvement += 1
                if epochs_without_improvement >= PATIENCE:
                    break
    finally:
        duration_s = time.perf_counter() - started
        training_emissions_kg = tracker.stop() or 0.0

    model.load_state_dict(best_state)
    model.eval()

    with torch.no_grad():
        val_pred = torch.expm1(model(x_val)).clamp(min=0)
        val_true = torch.expm1(y_val)
        val_mae_kg = torch.mean(torch.abs(val_pred - val_true)).item()
        ss_res = torch.sum((val_true - val_pred) ** 2).item()
        ss_tot = torch.sum((val_true - val_true.mean()) ** 2).item() or 1.0
        val_r2 = 1 - ss_res / ss_tot

    energy_kwh = float(getattr(tracker.final_emissions_data, "energy_consumed", 0.0) or 0.0)

    metadata = {
        "model": MODEL_NAME,
        "trained_at": datetime.utcnow().isoformat(),
        "parameters": count_parameters(model),
        "training_samples": int(split),
        "epochs_run": epochs_run,
        "max_epochs": MAX_EPOCHS,
        "val_mae_kg": round(val_mae_kg, 3),
        "val_r2": round(val_r2, 4),
        "training_duration_s": round(duration_s, 3),
        "training_energy_kwh": energy_kwh,
        "training_emissions_kg": float(training_emissions_kg),
    }

    ARTIFACT_DIR.mkdir(exist_ok=True)
    torch.save(model.state_dict(), WEIGHTS_PATH)
    METADATA_PATH.write_text(json.dumps(metadata, indent=2))
    _cached_model = model

    return metadata


def load_metadata() -> dict | None:
    if not METADATA_PATH.exists():
        return None
    return json.loads(METADATA_PATH.read_text())


def _get_model(db: Session) -> EmissionNet:
    global _cached_model
    if _cached_model is not None:
        return _cached_model
    if not WEIGHTS_PATH.exists():
        train_model(db)
        return _cached_model
    model = EmissionNet()
    model.load_state_dict(torch.load(WEIGHTS_PATH, weights_only=True))
    model.eval()
    _cached_model = model
    return model


def grid_adjustment(db: Session, activities: list[Activity]) -> dict:
    """
    The network predicts totals at the grid intensity the user's history was logged at.
    Rescale only the grid-electricity share to today's intensity.
    """
    since = datetime.utcnow() - timedelta(days=28)
    recent = [a for a in activities if a.activity_date >= since]
    total_kg = sum(float(a.emissions) for a in recent)
    grid_rows = [a for a in recent if (a.category, a.activity, a.unit) == grid.GRID_ACTIVITY]
    grid_kg = sum(float(a.emissions) for a in grid_rows)
    grid_kwh = sum(float(a.quantity) for a in grid_rows)

    current = grid.current_intensity(db)
    share = grid_kg / total_kg if total_kg else 0.0
    historical = grid_kg / grid_kwh * 1000 if grid_kwh else current.g_per_kwh
    ratio = current.g_per_kwh / historical if historical else 1.0

    return {
        "electricity_share": round(share, 4),
        "historical_g_per_kwh": round(historical, 1),
        "current_g_per_kwh": round(current.g_per_kwh, 1),
        "source": current.source,
        "zone": current.zone,
        "multiplier": round(1 + share * (ratio - 1), 4),
    }


def forecast(db: Session, user_id: int, days: int) -> dict:
    model = _get_model(db)
    activities = db.query(Activity).filter(Activity.user_id == user_id).all()
    history = build_histories(activities)[user_id]
    adjustment = grid_adjustment(db, activities)

    today = date.today()
    started = time.perf_counter()
    points = []

    # Autoregressive: each predicted day feeds into the next day's features.
    with torch.inference_mode():
        for offset in range(1, days + 1):
            day = today + timedelta(days=offset)
            features = torch.from_numpy(features_for_day(history, day)).unsqueeze(0)
            value = max(0.0, float(torch.expm1(model(features)).item()))
            # Feed back the unadjusted value: the model's inputs are in historical-intensity terms.
            history.totals[day] = value
            points.append({
                "date": day.isoformat(),
                "behavioural_emissions": round(value, 3),
                "predicted_emissions": round(value * adjustment["multiplier"], 3),
            })

    inference_ms = (time.perf_counter() - started) * 1000

    db.query(Prediction).filter(
        Prediction.user_id == user_id,
        Prediction.model_used == MODEL_NAME,
        Prediction.predicted_date > today,
    ).delete(synchronize_session=False)

    metadata = load_metadata() or {}
    confidence = max(0.0, min(1.0, metadata.get("val_r2", 0.0)))
    db.add_all(
        Prediction(
            user_id=user_id,
            predicted_date=date.fromisoformat(p["date"]),
            predicted_emissions=p["predicted_emissions"],
            model_used=MODEL_NAME,
            confidence_score=round(confidence, 4),
        )
        for p in points
    )
    db.commit()

    return {
        "user_id": user_id,
        "forecast": points,
        "total_predicted_kg": round(sum(p["predicted_emissions"] for p in points), 3),
        "inference_ms": round(inference_ms, 3),
        "grid_adjustment": adjustment,
        "model": metadata,
    }
