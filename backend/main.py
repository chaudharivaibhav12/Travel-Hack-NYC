import os

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

load_dotenv()

from api.routers import accommodations, auth, config, health, members, trips, weather  # noqa: E402
from api.routers import group_trips  # noqa: E402


def create_app() -> FastAPI:
    application = FastAPI(title="GroupGo API")
    origins = os.getenv(
        "CORS_ORIGINS",
        "http://localhost:5173,http://localhost:3000,http://localhost:3001",
    ).split(",")
    application.add_middleware(
        CORSMiddleware,
        allow_origins=[origin.strip() for origin in origins if origin.strip()],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    for router in (
        health.router, config.router, auth.router, trips.router,
        members.router, weather.router, accommodations.router,
        group_trips.router,
    ):
        application.include_router(router)
    return application


app = create_app()
