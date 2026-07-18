FROM python:3.12-slim
WORKDIR /svc

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app ./app
COPY seed ./seed

EXPOSE 8360
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8360"]
