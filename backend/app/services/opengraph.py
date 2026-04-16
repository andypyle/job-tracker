import re
from urllib.parse import urlparse

import httpx
from bs4 import BeautifulSoup

_USER_AGENT = "Mozilla/5.0 (compatible; JobTrackerBot/1.0)"
_TIMEOUT = 5.0
_TITLE_SUFFIX_RE = re.compile(r"\s*[\|\-\u2013\u2014]\s*\S.*$")


def _extract_company(value: str) -> str | None:
    """
    Return a clean company name, or None if the value looks like a domain/URL.

    Real company names don't contain dots ("Acme Corp", "Google", "Y Combinator").
    Domain names always do ("linkedin.com", "boards.greenhouse.io").
    If the value is a URL, strip it to the hostname first, then apply the same check.
    """
    # Unwrap full URLs to just the hostname
    if "://" in value or value.startswith("www."):
        parsed = urlparse(value if "://" in value else f"https://{value}")
        value = parsed.hostname or value
        if value.startswith("www."):
            value = value[4:]

    # If it still looks like a domain, it's not a useful company name
    if "." in value:
        return None

    return value or None


async def fetch_opengraph(url: str) -> dict:
    result = {"title": None, "company": None, "logo_url": None}

    try:
        async with httpx.AsyncClient(
            timeout=_TIMEOUT,
            follow_redirects=True,
            headers={"User-Agent": _USER_AGENT},
        ) as client:
            response = await client.get(url)
            response.raise_for_status()
            html = response.text

        soup = BeautifulSoup(html, "html.parser")

        # title: og:title -> <title> with suffix stripped
        og_title = soup.find("meta", property="og:title")
        if og_title and og_title.get("content"):
            result["title"] = og_title["content"].strip()
        else:
            title_tag = soup.find("title")
            if title_tag and title_tag.string:
                raw = title_tag.string.strip()
                result["title"] = _TITLE_SUFFIX_RE.sub("", raw).strip() or None

        # company: og:site_name -> domain name from URL
        og_site_name = soup.find("meta", property="og:site_name")
        if og_site_name and og_site_name.get("content"):
            raw_company = og_site_name["content"].strip()
            # Some job boards set og:site_name to a URL — extract just the domain in that case
            result["company"] = _extract_company(raw_company)
        else:
            # No og:site_name — don't fall back to the hostname since job board
            # domains (jobs.lever.co, boards.greenhouse.io) aren't company names
            result["company"] = None

        # logo_url: og:image only, no fallback
        og_image = soup.find("meta", property="og:image")
        if og_image and og_image.get("content"):
            result["logo_url"] = og_image["content"].strip()

    except Exception:
        return {"title": None, "company": None, "logo_url": None}

    return result
