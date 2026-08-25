import json
import re
from urllib.parse import urlparse

import httpx
from bs4 import BeautifulSoup

_USER_AGENT = "Mozilla/5.0 (compatible; JobTrackerBot/1.0)"
_TIMEOUT = 5.0
_TITLE_SUFFIX_RE = re.compile(r"\s*[\|\-–—]\s*\S.*$")
# Matches "at Company Name" inside a page title, stopping at common separators
_TITLE_AT_RE = re.compile(r"\bat\s+([^|\-–—]{2,60})", re.IGNORECASE)
# Salary patterns: $100,000 or $100K, optional range, optional period label
_SALARY_RE = re.compile(
    r"(?:\$|USD\s*|CAD\s*|GBP\s*)"
    r"\d[\d,]*(?:\.\d+)?[Kk]?"
    r"(?:\s*[-–—to]+\s*(?:\$|USD\s*|CAD\s*|GBP\s*)?\d[\d,]*(?:\.\d+)?[Kk]?)?"
    r"(?:\s*(?:per\s+)?(?:year|yr|annual(?:ly)?|hour|hr|\/hr|\/hour|\/year|\/yr))?",
    re.IGNORECASE,
)


def _extract_company(value: str) -> str | None:
    """
    Return a clean company name, or None if the value looks like a domain/URL.

    Real company names don't contain dots ("Acme Corp", "Google", "Y Combinator").
    Domain names always do ("linkedin.com", "boards.greenhouse.io").
    If the value is a URL, strip it to the hostname first, then apply the same check.
    """
    if "://" in value or value.startswith("www."):
        parsed = urlparse(value if "://" in value else f"https://{value}")
        value = parsed.hostname or value
        if value.startswith("www."):
            value = value[4:]

    if "." in value:
        return None

    return value.strip() or None


def _extract_job_ld(soup: BeautifulSoup) -> dict:
    """Return the first JobPosting JSON-LD block on the page, or {}."""
    for script in soup.find_all("script", type="application/ld+json"):
        try:
            data = json.loads(script.string or "")
            candidates = data if isinstance(data, list) else [data]
            for item in candidates:
                if not isinstance(item, dict):
                    continue
                if item.get("@type") == "JobPosting":
                    return item
                for node in item.get("@graph", []):
                    if isinstance(node, dict) and node.get("@type") == "JobPosting":
                        return node
        except Exception:
            continue
    return {}


def _format_salary(base_salary: dict) -> str | None:
    """
    Format a JSON-LD baseSalary object into a human-readable string.
    Handles both MonetaryAmountDistribution (min/max) and plain MonetaryAmount.
    """
    if not isinstance(base_salary, dict):
        return None

    currency = base_salary.get("currency", "")
    prefix = f"{currency} " if currency else "$"
    value = base_salary.get("value", {})

    if isinstance(value, dict):
        min_v = value.get("minValue")
        max_v = value.get("maxValue")
        single = value.get("value")
        unit = value.get("unitText", "")
        unit_suffix = f" / {unit}" if unit else ""

        if min_v is not None and max_v is not None:
            return f"{prefix}{int(min_v):,} – {int(max_v):,}{unit_suffix}"
        if single is not None:
            return f"{prefix}{int(single):,}{unit_suffix}"
    elif isinstance(value, (int, float)):
        unit_suffix = ""
        return f"{prefix}{int(value):,}{unit_suffix}"

    return None


async def fetch_opengraph(url: str) -> dict:
    result = {"title": None, "company": None, "logo_url": None, "compensation": None}

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
        ld = _extract_job_ld(soup)

        # ── title ────────────────────────────────────────────────────────────
        # Prefer LD title over og:title for job postings (often cleaner)
        if ld.get("title"):
            result["title"] = str(ld["title"]).strip()
        else:
            og_title = soup.find("meta", property="og:title")
            if og_title and og_title.get("content"):
                result["title"] = og_title["content"].strip()
            else:
                title_tag = soup.find("title")
                if title_tag and title_tag.string:
                    raw = title_tag.string.strip()
                    result["title"] = _TITLE_SUFFIX_RE.sub("", raw).strip() or None

        # ── company ──────────────────────────────────────────────────────────
        # 1. JSON-LD hiringOrganization (most reliable — used by Greenhouse, Lever, etc.)
        hiring_org = ld.get("hiringOrganization", {})
        if isinstance(hiring_org, dict) and hiring_org.get("name"):
            result["company"] = str(hiring_org["name"]).strip()

        # 2. og:site_name (works for company career sites that set it properly)
        if not result["company"]:
            og_site = soup.find("meta", property="og:site_name")
            if og_site and og_site.get("content"):
                result["company"] = _extract_company(og_site["content"].strip())

        # 3. "Title at Company Name" pattern in page <title>
        if not result["company"]:
            title_tag = soup.find("title")
            if title_tag and title_tag.string:
                m = _TITLE_AT_RE.search(title_tag.string)
                if m:
                    candidate = m.group(1).strip().rstrip(".,")
                    if candidate:
                        result["company"] = candidate

        # ── logo ─────────────────────────────────────────────────────────────
        # Prefer LD logo over og:image for more reliable brand marks
        hiring_org_logo = hiring_org.get("logo") if isinstance(hiring_org, dict) else None
        if isinstance(hiring_org_logo, dict):
            hiring_org_logo = hiring_org_logo.get("url")
        if hiring_org_logo:
            result["logo_url"] = str(hiring_org_logo).strip()
        else:
            og_image = soup.find("meta", property="og:image")
            if og_image and og_image.get("content"):
                result["logo_url"] = og_image["content"].strip()

        # ── compensation ─────────────────────────────────────────────────────
        # 1. JSON-LD baseSalary (structured, accurate when present)
        if ld.get("baseSalary"):
            result["compensation"] = _format_salary(ld["baseSalary"])

        # 2. Regex scan of visible page text (imprecise but better than nothing)
        if not result["compensation"]:
            text = soup.get_text(" ", strip=True)
            m = _SALARY_RE.search(text)
            if m:
                result["compensation"] = m.group(0).strip()

    except Exception:
        return {"title": None, "company": None, "logo_url": None, "compensation": None}

    return result
