from pathlib import Path
import sys

from fastapi import FastAPI

BACKEND_DIR = Path(__file__).resolve().parents[1] / "backend"
sys.path.insert(0, str(BACKEND_DIR))

from app.main import app as backend_app  # noqa: E402

app = FastAPI(title="ShopMind Vercel API")
app.mount("/api", backend_app)
app.mount("/", backend_app)
