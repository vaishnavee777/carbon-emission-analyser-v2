from fastapi import FastAPI
from sqlalchemy import text

from app.database import engine
from app.routers.activities import router as activities_router


app = FastAPI(
    title="Carbon Emission Analyser API",
    description="Backend API for the Carbon Emission Analyser",
    version="1.0.0",
)


app.include_router(activities_router)


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