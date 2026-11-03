from fastapi import APIRouter, Depends

from app.dependencies import get_current_user
from app.models.opengraph import OpenGraphData, OpenGraphRequest, OpenGraphResponse
from app.services.opengraph import fetch_opengraph

router = APIRouter()


# Signed-in users only: this makes the server fetch a URL it's given
@router.post("", response_model=OpenGraphResponse)
async def get_opengraph(
    body: OpenGraphRequest, _user_id: str = Depends(get_current_user)
) -> OpenGraphResponse:
    result = await fetch_opengraph(body.url)
    return OpenGraphResponse(data=OpenGraphData(**result))
