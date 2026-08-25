from typing import Optional

from pydantic import BaseModel, HttpUrl


class OpenGraphRequest(BaseModel):
    url: str


class OpenGraphData(BaseModel):
    title: Optional[str] = None
    company: Optional[str] = None
    logo_url: Optional[str] = None
    compensation: Optional[str] = None


class OpenGraphResponse(BaseModel):
    data: OpenGraphData
    error: None = None
