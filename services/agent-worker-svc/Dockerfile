FROM python:3.12-slim
WORKDIR /svc

COPY packages/shared/requirements.txt /tmp/shared-requirements.txt
COPY services/agent-worker-svc/requirements.txt /tmp/agent-requirements.txt
RUN pip install --no-cache-dir -r /tmp/shared-requirements.txt -r /tmp/agent-requirements.txt

COPY services/agent-worker-svc/app ./app
COPY packages/shared/aulacys ./aulacys

ENV PYTHONPATH=/svc
EXPOSE 8400
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8400"]
