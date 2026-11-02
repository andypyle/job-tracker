"""
Tests for OpenGraph service (fetch_opengraph) and the /opengraph endpoint.

httpx is mocked with respx or unittest.mock so no real HTTP requests are made.
"""
import json
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
    head="",
    body="",
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
{head}
</head>
<body>{body}</body>
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


def _patch_client(html: str):
    """Patch httpx.AsyncClient so get() returns a 200 with the given HTML."""
    patcher = patch("httpx.AsyncClient")
    MockClient = patcher.start()
    mock_client_instance = AsyncMock()
    mock_client_instance.get = AsyncMock(return_value=_mock_httpx_response(html))
    MockClient.return_value.__aenter__ = AsyncMock(return_value=mock_client_instance)
    MockClient.return_value.__aexit__ = AsyncMock(return_value=False)
    return patcher


@pytest.mark.asyncio
async def test_fetch_opengraph_does_not_use_domain_as_company():
    """Leaves company empty rather than guessing from the URL: job-board hosts
    (jobs.lever.co, boards.greenhouse.io) aren't company names."""
    patcher = _patch_client(_make_html_response(og_title="Engineer Role"))
    try:
        result = await fetch_opengraph("https://www.acme.com/jobs/123")
    finally:
        patcher.stop()

    assert result["title"] == "Engineer Role"
    assert result["company"] is None


@pytest.mark.asyncio
async def test_fetch_opengraph_ignores_site_name_that_is_a_domain():
    """An og:site_name that's a domain or URL isn't used as the company."""
    patcher = _patch_client(_make_html_response(og_title="Engineer", og_site_name="boards.greenhouse.io"))
    try:
        result = await fetch_opengraph("https://boards.greenhouse.io/acme/jobs/1")
    finally:
        patcher.stop()

    assert result["company"] is None


@pytest.mark.asyncio
async def test_fetch_opengraph_reads_job_posting_json_ld():
    """JSON-LD JobPosting wins: title, hiringOrganization name and logo, and baseSalary."""
    ld = """<script type="application/ld+json">{
      "@context": "https://schema.org",
      "@type": "JobPosting",
      "title": "Senior Product Designer",
      "hiringOrganization": {"@type": "Organization", "name": "Northwind Labs",
                             "logo": {"url": "https://northwindlabs.com/logo.png"}},
      "baseSalary": {"@type": "MonetaryAmount", "currency": "USD",
                     "value": {"minValue": 165000, "maxValue": 190000, "unitText": "YEAR"}}
    }</script>"""
    html = _make_html_response(og_title="Careers | Lever", og_site_name="Lever", head=ld)
    patcher = _patch_client(html)
    try:
        result = await fetch_opengraph("https://jobs.lever.co/northwind/123")
    finally:
        patcher.stop()

    assert result == {
        "title": "Senior Product Designer",
        "company": "Northwind Labs",
        "logo_url": "https://northwindlabs.com/logo.png",
        "compensation": "$165k - $190k",
    }


@pytest.mark.asyncio
async def test_fetch_opengraph_reads_company_from_title_at_pattern():
    """Without JSON-LD or og:site_name, "Role at Company | Board" gives the company."""
    html = _make_html_response(title_tag="Product Designer at Northwind Labs | Lever")
    patcher = _patch_client(html)
    try:
        result = await fetch_opengraph("https://jobs.lever.co/northwind/123")
    finally:
        patcher.stop()

    assert result["title"] == "Product Designer at Northwind Labs"
    assert result["company"] == "Northwind Labs"


@pytest.mark.asyncio
async def test_fetch_opengraph_scans_page_text_for_salary():
    """Without a JSON-LD baseSalary, a salary in the page text is used."""
    html = _make_html_response(og_title="Engineer", body="<p>Pay: $120K - $150K per year, plus equity.</p>")
    patcher = _patch_client(html)
    try:
        result = await fetch_opengraph("https://acme.com/jobs/1")
    finally:
        patcher.stop()

    assert result["compensation"] == "$120k - $150k"


@pytest.mark.asyncio
@pytest.mark.parametrize(
    ("base_salary", "expected"),
    [
        # Amounts as strings, with thousands separators
        ('{"currency": "USD", "value": {"minValue": "120,000", "maxValue": "150,000"}}', "$120k - $150k"),
        # One end of the range only
        ('{"currency": "USD", "value": {"minValue": 120000, "unitText": "YEAR"}}', "$120k"),
        # A list of amounts
        ('[{"currency": "USD", "value": {"minValue": 90000, "maxValue": 110000}}]', "$90k - $110k"),
    ],
)
async def test_fetch_opengraph_reads_loose_base_salary(base_salary, expected):
    """baseSalary shapes seen in the wild fill compensation, and don't cost the other fields."""
    ld = f"""<script type="application/ld+json">{{
      "@type": "JobPosting", "title": "Engineer",
      "hiringOrganization": {{"name": "Acme"}}, "baseSalary": {base_salary}
    }}</script>"""
    patcher = _patch_client(_make_html_response(head=ld))
    try:
        result = await fetch_opengraph("https://acme.com/jobs/1")
    finally:
        patcher.stop()

    assert result["title"] == "Engineer"
    assert result["company"] == "Acme"
    assert result["compensation"] == expected


@pytest.mark.asyncio
async def test_fetch_opengraph_salary_scan_skips_small_amounts_and_scripts():
    """The text scan ignores script contents and amounts too small to be pay."""
    body = (
        '<script>window.price = "$9"</script>'
        "<p>Enjoy a $5 lunch stipend.</p><p>Pay range $140,000 to $160,000 per year.</p>"
    )
    patcher = _patch_client(_make_html_response(og_title="Engineer", body=body))
    try:
        result = await fetch_opengraph("https://acme.com/jobs/1")
    finally:
        patcher.stop()

    assert result["compensation"] == "$140k - $160k"


@pytest.mark.asyncio
async def test_fetch_opengraph_scans_json_ld_description_for_salary():
    """Ashby renders client-side and often leaves baseSalary null: the range is only in the
    JSON-LD description, past a smaller stipend amount."""
    description = (
        "<ul><li><p>$100 monthly fitness stipend</p></li></ul>"
        "<p>Pay range: $180,000-$200,000 based on seniority.</p>"
    )
    ld = (
        '<script type="application/ld+json">'
        + json.dumps({"@type": "JobPosting", "title": "Senior Frontend Engineer", "description": description})
        + "</script>"
    )
    patcher = _patch_client(_make_html_response(head=ld, body='<div id="root"></div>'))
    try:
        result = await fetch_opengraph("https://jobs.ashbyhq.com/office-hours/1")
    finally:
        patcher.stop()

    assert result["compensation"] == "$180k - $200k"


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

    assert result == {"title": None, "company": None, "logo_url": None, "compensation": None}


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

    assert result == {"title": None, "company": None, "logo_url": None, "compensation": None}


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

    assert result == {"title": None, "company": None, "logo_url": None, "compensation": None}


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
