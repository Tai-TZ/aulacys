FROM python:3.12-slim
WORKDIR /svc

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app ./app

ENV LOS_DB=/data/los.db
VOLUME ["/data"]
EXPOSE 8310
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8310"]
