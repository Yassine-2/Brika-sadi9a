from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import engine, Base
from app.routers import auth, products, tasks, raspberry_pi

# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Smart Warehouse API",
    description="Backend API for Smart Warehouse management with Raspberry Pi integration",
    version="1.0.0"
)

# CORS middleware for frontend access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router)
app.include_router(products.router)
app.include_router(tasks.router)
app.include_router(raspberry_pi.router)


@app.get("/")
async def root():
    return {
        "message": "Smart Warehouse API",
        "version": "1.0.0",
        "docs": "/docs",
        "modes": ["business", "industrial"]
    }


@app.get("/health")
async def health_check():
    return {"status": "healthy"}
