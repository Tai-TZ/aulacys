FROM python:3.11-slim

WORKDIR /svc

COPY packages/shared/requirements.txt /tmp/shared-requirements.txt
COPY services/orchestrator-svc/requirements.txt /tmp/orchestrator-requirements.txt
RUN pip install --no-cache-dir -r /tmp/shared-requirements.txt -r /tmp/orchestrator-requirements.txt

COPY packages/shared/aulacys ./aulacys
COPY services/orchestrator-svc/app ./app
COPY services/orchestrator-svc/alembic.ini ./alembic.ini
COPY services/orchestrator-svc/migrations ./migrations

ENV PYTHONPATH=/svc
EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
