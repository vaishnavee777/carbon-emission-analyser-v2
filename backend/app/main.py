from contextlib import asynccontextmanager

from fastapi import FastAPI
from sqlalchemy import text

from app import models  # noqa: F401  (registers tables on Base.metadata)
from app.database import Base, engine
from app.routers.activities import router as activities_router
from app.routers.auth import router as auth_router
from app.routers.emission_factors import router as emission_factors_router
from app.routers.grid import router as grid_router
from app.routers.notifications import router as notifications_router
from app.routers.offsets import router as offsets_router
from app.routers.predictions import router as predictions_router
from app.routers.trips import router as trips_router
from app.scheduler import create_scheduler


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    scheduler = create_scheduler()
    scheduler.start()
    yield
    scheduler.shutdown(wait=False)


app = FastAPI(
    title="Carbon Emission Analyser API",
    description="Backend API for the Carbon Emission Analyser",
    version="1.0.0",
    lifespan=lifespan,
)


app.include_router(auth_router)
app.include_router(activities_router)
app.include_router(emission_factors_router)
app.include_router(grid_router)
app.include_router(predictions_router)
app.include_router(notifications_router)
app.include_router(trips_router)
app.include_router(offsets_router)


@app.get("/")
def root():
    return {
        "message": "Carbon Emission Analyser API is running"
    }


@app.get("/database-test")
def database_test():

    with engine.connect() as connection:

        result = connection.execute(
            text("SELECT 1")
        )

        value = result.scalar()

    return {
        "database": "MySQL",
        "status": "connected",
        "test": value,
    }
