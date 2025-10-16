import os

DB_URI = os.getenv("DATABASE_URL", "postgresql://postgres:password@localhost:5432/nyc_taxi")
