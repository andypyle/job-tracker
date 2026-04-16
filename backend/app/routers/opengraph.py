from fastapi import APIRouter

from app.models.opengraph import OpenGraphData, OpenGraphRequest, OpenGraphResponse
from app.services.opengraph import fetch_opengraph

router = APIRouter()


@router.post("", response_model=OpenGraphResponse)
async def get_opengraph(body: OpenGraphRequest) -> OpenGraphResponse:
    result = await fetch_opengraph(body.url)
    return OpenGraphResponse(data=OpenGraphData(**result))
