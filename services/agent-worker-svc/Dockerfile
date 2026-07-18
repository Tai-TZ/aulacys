FROM python:3.12-slim
WORKDIR /svc

COPY services/agent-worker-svc/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY services/agent-worker-svc/app ./app
COPY packages/shared/aulacys ./aulacys

ENV PYTHONPATH=/svc
EXPOSE 8400
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8400"]
