FROM python:3.12-slim
WORKDIR /app
COPY pyproject.toml .
RUN pip install --no-cache-dir "fastapi>=0.115,<1" "uvicorn[standard]>=0.30,<1" "psycopg[binary]>=3.2,<4" "redis>=5,<6"
COPY app ./app
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
