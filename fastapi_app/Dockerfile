FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PYTHONPATH=/app

WORKDIR /app

COPY fastapi_app/requirements.txt ./fastapi_app/requirements.txt
RUN pip install --no-cache-dir -r fastapi_app/requirements.txt

COPY fastapi_app ./fastapi_app

EXPOSE 8000

CMD ["python", "-m", "uvicorn", "fastapi_app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1", "--proxy-headers", "--forwarded-allow-ips", "*"]
