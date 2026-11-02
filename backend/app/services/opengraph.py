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


def _to_number(value) -> float | None:
    """Parse a JSON-LD amount, which sites give as 120000, 120000.0, "120000" or "120,000"."""
    if isinstance(value, bool):
        return None
    if isinstance(value, (int, float)):
        return float(value)
    if isinstance(value, str):
        try:
            return float(value.replace(",", "").replace("$", "").strip())
        except ValueError:
            return None
    return None


# Currency codes we can show as a symbol; others show as the code ("CHF 150k")
_CURRENCY_SYMBOLS = {"USD": "$", "CAD": "CA$", "AUD": "A$", "EUR": "€", "GBP": "£"}
# JSON-LD unitText and page-text periods; a year is the default, so it's left off
_UNIT_SUFFIXES = {"HOUR": "/hr", "DAY": "/day", "WEEK": "/wk", "MONTH": "/mo"}


def _format_amount(amount: float) -> str:
    """150000 → 150k, 152500 → 152.5k; hourly-sized amounts stay as they are (45, 45.50)."""
    if amount >= 1000:
        return f"{round(amount / 1000, 1):g}k"
    return f"{amount:g}" if amount == int(amount) else f"{amount:.2f}"


def _format_range(currency: str, low: float | None, high: float | None, unit: str = "") -> str | None:
    """
    The one compensation format: "$180k - $200k", "$180k", "$45 - $60/hr". A one-ended range,
    or low == high, is a single figure.
    """
    code = (currency or "USD").upper()
    symbol = _CURRENCY_SYMBOLS.get(code, f"{code} ")
    suffix = _UNIT_SUFFIXES.get((unit or "").upper(), "")
    if low and high and low != high:
        low, high = sorted((low, high))
        return f"{symbol}{_format_amount(low)} - {symbol}{_format_amount(high)}{suffix}"
    amount = low or high
    return f"{symbol}{_format_amount(amount)}{suffix}" if amount else None


def _format_salary(base_salary) -> str | None:
    """
    Format a JSON-LD baseSalary object.
    Handles both MonetaryAmountDistribution (min/max) and plain MonetaryAmount,
    and a list of either (the first usable one wins).
    """
    if isinstance(base_salary, list):
        for item in base_salary:
            formatted = _format_salary(item)
            if formatted:
                return formatted
        return None
    if not isinstance(base_salary, dict):
        return None

    currency = base_salary.get("currency", "")
    value = base_salary.get("value", {})

    if isinstance(value, dict):
        unit = value.get("unitText", "")
        single = _to_number(value.get("value"))
        if single:
            return _format_range(currency, single, None, unit)
        return _format_range(currency, _to_number(value.get("minValue")), _to_number(value.get("maxValue")), unit)
    return _format_range(currency, _to_number(value), None)


def _parse_salary_text(found: str) -> str | None:
    """
    Reformat a salary found in page text ("$180,000-$200,000", "USD 120K to 150K per year"),
    or None if it's too small to be pay (a "$100 fitness stipend") and isn't hourly or in thousands.
    """
    currency = re.match(r"\$|[A-Z]{3}", found.upper())
    currency = "USD" if not currency or currency.group(0) == "$" else currency.group(0)
    amounts = [
        float(digits.replace(",", "")) * (1000 if k else 1)
        for digits, k in re.findall(r"(\d[\d,]*(?:\.\d+)?)\s*([Kk])?", found)
    ]
    hourly = re.search(r"h(?:ou)?r", found, re.IGNORECASE)
    if not amounts or (not hourly and max(amounts) < 1000):
        return None
    return _format_range(currency, amounts[0], amounts[1] if len(amounts) > 1 else None, "HOUR" if hourly else "")


def _scan_salary(soup: BeautifulSoup, ld: dict) -> str | None:
    """
    Find a salary in the posting's text: the JSON-LD description, then the meta descriptions,
    then the visible page. Client-rendered boards (Ashby) have an empty body, so the description
    is often the only place the range appears. Skips scripts and styles.
    """
    texts = []
    if isinstance(ld.get("description"), str):
        texts.append(BeautifulSoup(ld["description"], "html.parser").get_text(" ", strip=True))
    for attrs in ({"property": "og:description"}, {"name": "description"}):
        meta = soup.find("meta", attrs=attrs)
        if meta and meta.get("content"):
            texts.append(meta["content"])
    for tag in soup(["script", "style", "noscript"]):
        tag.decompose()
    texts.append(soup.get_text(" ", strip=True))

    for text in texts:
        for m in _SALARY_RE.finditer(text):
            formatted = _parse_salary_text(m.group(0).strip())
            if formatted:
                return formatted
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
        # Guarded on its own, so an odd salary never costs the fields found above
        try:
            # 1. JSON-LD baseSalary (structured, accurate when present)
            if ld.get("baseSalary"):
                result["compensation"] = _format_salary(ld["baseSalary"])

            # 2. Regex scan of the posting's text (imprecise but better than nothing)
            if not result["compensation"]:
                result["compensation"] = _scan_salary(soup, ld)
        except Exception:
            result["compensation"] = None

    except Exception:
        return {"title": None, "company": None, "logo_url": None, "compensation": None}

    return result
