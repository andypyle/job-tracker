"""
Tests for OpenGraph service (fetch_opengraph) and the /opengraph endpoint.

httpx is mocked with respx or unittest.mock so no real HTTP requests are made.
"""
from unittest.mock import AsyncMock, MagicMock, patch

import httpx
import pytest

from app.services.opengraph import fetch_opengraph

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _make_html_response(
    og_title=None,
    title_tag=None,
    og_site_name=None,
    og_image=None,
) -> str:
    """Build minimal HTML with whichever OG tags are provided."""
    meta_tags = ""
    if og_title:
        meta_tags += f'<meta property="og:title" content="{og_title}" />\n'
    if og_site_name:
        meta_tags += f'<meta property="og:site_name" content="{og_site_name}" />\n'
    if og_image:
        meta_tags += f'<meta property="og:image" content="{og_image}" />\n'

    title_element = f"<title>{title_tag}</title>" if title_tag else ""

    return f"""<!DOCTYPE html>
<html>
<head>
{meta_tags}
{title_element}
</head>
<body></body>
</html>"""


def _mock_httpx_response(html: str, status_code: int = 200):
    """Return a mock httpx.Response with the given HTML body."""
    response = MagicMock(spec=httpx.Response)
    response.status_code = status_code
    response.text = html
    response.raise_for_status = MagicMock()
    if status_code >= 400:
        response.raise_for_status.side_effect = httpx.HTTPStatusError(
            "error", request=MagicMock(), response=response
        )
    return response


# ---------------------------------------------------------------------------
# fetch_opengraph unit tests
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_fetch_opengraph_returns_og_tags():
    """Returns og:title, og:site_name, og:image when all present."""
    html = _make_html_response(
        og_title="Senior Software Engineer at Acme",
        og_site_name="Acme Inc",
        og_image="https://acme.com/logo.png",
    )

    async def mock_get(*args, **kwargs):
        return _mock_httpx_response(html)

    with patch("httpx.AsyncClient") as MockClient:
        mock_client_instance = AsyncMock()
        mock_client_instance.get = AsyncMock(return_value=_mock_httpx_response(html))
        MockClient.return_value.__aenter__ = AsyncMock(return_value=mock_client_instance)
        MockClient.return_value.__aexit__ = AsyncMock(return_value=False)

        result = await fetch_opengraph("https://acme.com/jobs/123")

    assert result["title"] == "Senior Software Engineer at Acme"
    assert result["company"] == "Acme Inc"
    assert result["logo_url"] == "https://acme.com/logo.png"


@pytest.mark.asyncio
async def test_fetch_opengraph_falls_back_to_title_tag():
    """Falls back to <title> tag when og:title is absent; strips site name suffix."""
    html = _make_html_response(
        og_site_name="Acme Inc",
        title_tag="Software Engineer | Acme Inc",
    )

    with patch("httpx.AsyncClient") as MockClient:
        mock_client_instance = AsyncMock()
        mock_client_instance.get = AsyncMock(return_value=_mock_httpx_response(html))
        MockClient.return_value.__aenter__ = AsyncMock(return_value=mock_client_instance)
        MockClient.return_value.__aexit__ = AsyncMock(return_value=False)

        result = await fetch_opengraph("https://acme.com/jobs/123")

    # Suffix after | should be stripped
    assert result["title"] == "Software Engineer"
    assert result["company"] == "Acme Inc"


@pytest.mark.asyncio
async def test_fetch_opengraph_falls_back_to_domain():
    """Falls back to domain name when og:site_name is absent."""
    html = _make_html_response(
        og_title="Engineer Role",
    )

    with patch("httpx.AsyncClient") as MockClient:
        mock_client_instance = AsyncMock()
        mock_client_instance.get = AsyncMock(return_value=_mock_httpx_response(html))
        MockClient.return_value.__aenter__ = AsyncMock(return_value=mock_client_instance)
        MockClient.return_value.__aexit__ = AsyncMock(return_value=False)

        result = await fetch_opengraph("https://www.acme.com/jobs/123")

    # www. prefix should be stripped
    assert result["company"] == "acme.com"


@pytest.mark.asyncio
async def test_fetch_opengraph_returns_nulls_on_http_error():
    """Returns all-None dict and never raises when httpx raises HTTPError."""
    with patch("httpx.AsyncClient") as MockClient:
        mock_client_instance = AsyncMock()
        mock_client_instance.get = AsyncMock(
            side_effect=httpx.ConnectError("connection refused")
        )
        MockClient.return_value.__aenter__ = AsyncMock(return_value=mock_client_instance)
        MockClient.return_value.__aexit__ = AsyncMock(return_value=False)

        result = await fetch_opengraph("https://unreachable.example.com")

    assert result == {"title": None, "company": None, "logo_url": None}


@pytest.mark.asyncio
async def test_fetch_opengraph_returns_nulls_on_invalid_url():
    """Returns all-None dict and never raises for a garbage URL."""
    # httpx will raise when trying to connect to a garbage URL
    with patch("httpx.AsyncClient") as MockClient:
        mock_client_instance = AsyncMock()
        mock_client_instance.get = AsyncMock(
            side_effect=Exception("Invalid URL")
        )
        MockClient.return_value.__aenter__ = AsyncMock(return_value=mock_client_instance)
        MockClient.return_value.__aexit__ = AsyncMock(return_value=False)

        result = await fetch_opengraph("not-a-valid-url")

    assert result == {"title": None, "company": None, "logo_url": None}


@pytest.mark.asyncio
async def test_fetch_opengraph_returns_nulls_on_non_200_response():
    """Returns all-None dict when the server returns a non-200 status."""
    with patch("httpx.AsyncClient") as MockClient:
        mock_client_instance = AsyncMock()
        error_response = _mock_httpx_response("", status_code=404)
        mock_client_instance.get = AsyncMock(return_value=error_response)
        MockClient.return_value.__aenter__ = AsyncMock(return_value=mock_client_instance)
        MockClient.return_value.__aexit__ = AsyncMock(return_value=False)

        result = await fetch_opengraph("https://example.com/not-found")

    assert result == {"title": None, "company": None, "logo_url": None}


# ---------------------------------------------------------------------------
# POST /opengraph endpoint test
# ---------------------------------------------------------------------------


def test_opengraph_endpoint_returns_envelope(client):
    """POST /opengraph returns {"data": {...}, "error": null} envelope."""
    html = _make_html_response(
        og_title="Software Engineer",
        og_site_name="Big Corp",
        og_image="https://bigcorp.com/logo.png",
    )

    with patch("httpx.AsyncClient") as MockClient:
        mock_client_instance = AsyncMock()
        mock_client_instance.get = AsyncMock(return_value=_mock_httpx_response(html))
        MockClient.return_value.__aenter__ = AsyncMock(return_value=mock_client_instance)
        MockClient.return_value.__aexit__ = AsyncMock(return_value=False)

        resp = client.post(
            "/opengraph",
            json={"url": "https://bigcorp.com/jobs/1"},
        )

    assert resp.status_code == 200
    body = resp.json()
    assert "data" in body
    assert body["error"] is None
    assert body["data"]["title"] == "Software Engineer"
    assert body["data"]["company"] == "Big Corp"
    assert body["data"]["logo_url"] == "https://bigcorp.com/logo.png"


def test_opengraph_endpoint_returns_nulls_on_fetch_failure(client):
    """POST /opengraph returns {"data": {nulls}, "error": null} — never a 5xx — on fetch failure."""
    with patch("httpx.AsyncClient") as MockClient:
        mock_client_instance = AsyncMock()
        mock_client_instance.get = AsyncMock(side_effect=Exception("timeout"))
        MockClient.return_value.__aenter__ = AsyncMock(return_value=mock_client_instance)
        MockClient.return_value.__aexit__ = AsyncMock(return_value=False)

        resp = client.post(
            "/opengraph",
            json={"url": "https://unreachable.example.com"},
        )

    assert resp.status_code == 200
    body = resp.json()
    assert body["error"] is None
    assert body["data"]["title"] is None
    assert body["data"]["company"] is None
    assert body["data"]["logo_url"] is None
