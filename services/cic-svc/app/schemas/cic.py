from pydantic import BaseModel

class LookupRequest(BaseModel):
    customer_name: str
