# Brika - Smart Warehouse Management System

A full-stack warehouse management application with React frontend and FastAPI backend.

## Prerequisites

- [Anaconda](https://www.anaconda.com/download) or [Miniconda](https://docs.conda.io/en/latest/miniconda.html)
- [Node.js](https://nodejs.org/) (v18 or higher)
- [PostgreSQL](https://www.postgresql.org/download/)

## Setup

### 1. Database Setup

1. Install PostgreSQL and create a database:
   ```sql
   CREATE DATABASE smart_warehouse;
   ```

2. Copy the environment example file and configure it:
   ```bash
   cp .env.example .env
   ```

3. Edit `.env` with your PostgreSQL credentials:
   ```dotenv
   DATABASE_URL=postgresql://your_username:your_password@localhost:5432/smart_warehouse
   SECRET_KEY=your-super-secret-key-change-in-production
   ACCESS_TOKEN_EXPIRE_MINUTES=30
   ```

### 2. Backend Setup

The `requirements.txt` was generated with **Conda**. To set up the backend:

```bash
# Create a new conda environment
conda create -n brika python=3.11

# Activate the environment
conda activate brika

# Install core dependencies (recommended approach)
pip install fastapi uvicorn sqlalchemy psycopg2-binary python-jose passlib python-multipart alembic pydantic

# Or install from requirements.txt (may have compatibility issues due to conda-specific paths)
# pip install -r requirements.txt
```

### 3. Run the Backend

```bash
# From the project root directory
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at `http://localhost:8000`

API documentation: `http://localhost:8000/docs`

### 4. Frontend Setup

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install
```

### 5. Run the Frontend

```bash
# From the frontend directory
npm run dev
```

The frontend will be available at `http://localhost:5173`

## Project Structure

```
Brika/
├── main.py                 # FastAPI application entry point
├── requirements.txt        # Python dependencies (conda)
├── .env.example           # Environment variables template
├── app/
│   ├── auth.py            # Authentication logic
│   ├── database.py        # Database connection
│   ├── models.py          # SQLAlchemy models
│   ├── schemas.py         # Pydantic schemas
│   └── routers/           # API route handlers
│       ├── auth.py
│       ├── forklifts.py
│       ├── products.py
│       ├── raspberry_pi.py
│       ├── tasks.py
│       └── video.py
└── frontend/
    ├── package.json
    ├── vite.config.js
    └── src/
        ├── components/    # Reusable React components
        ├── pages/         # Page components
        ├── services/      # API service layer
        ├── context/       # React context providers
        └── styles/        # CSS stylesheets
```

## Features

- **Business Mode**: Inventory management, product tracking, warehouse map visualization
- **Industrial Mode**: Forklift fleet management, live video feeds, sensor alerts
- User authentication with JWT
- Real-time dashboard with storage analytics
- Task management system
- QR code generation for products

## Environment Variables

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `SECRET_KEY` | JWT signing secret (change in production) |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | JWT token expiration time |

## License

MIT
