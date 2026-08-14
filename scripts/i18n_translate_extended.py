from pathlib import Path
from urllib.parse import urlencode
from urllib.request import Request, urlopen
import hashlib
import json
import re
import time
import unicodedata

REPORT = Path("i18n-extended-audit.txt")
CATALOG_DIR = Path("apps/web/src/app/i18n")
OUTPUT = Path("i18n-generated-presentation-keys.json")
TARGETS = ("en", "pt", "es")

TECHNICAL_PATTERNS = [
    re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$"),
    re.compile(r"^https?://", re.I),
    re.compile(r"^@\w+$"),
    re.compile(r"^(?:INV|JOB)-\d+$", re.I),
    re.compile(r"^[A-Z]{1,3}$"),
    re.compile(r"^\+?[\d\s().-]+$"),
]
INTENTIONAL = {
    "CRM", "SMS", "MMS", "PDF", "GPS", "QuickBooks", "Facebook", "Instagram", "Nextdoor",
    "English", "Português", "Español", "USD", "BRL", "EUR", "GBP", "X",
}


def is_technical(value: str) -> bool:
    if value in INTENTIONAL:
        return True
    return any(pattern.search(value) for pattern in TECHNICAL_PATTERNS)


def parse_report():
    values: dict[str, str] = {}
    for raw in REPORT.read_text().splitlines():
        parts = raw.split(" | ")
        if not parts:
            continue
        kind = parts[0]
        if kind == "ATTR" and len(parts) >= 4:
            path, value = parts[1], " | ".join(parts[3:]).strip()
        elif kind == "TOAST" and len(parts) >= 3:
            path, value = parts[1], " | ".join(parts[2:]).strip()
        else:
            continue
        if not value or is_technical(value):
            continue
        values.setdefault(value, path)
    return values


def slugify(value: str) -> str:
    normalized = unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode("ascii")
    slug = re.sub(r"[^a-zA-Z0-9]+", "_", normalized).strip("_").lower()
    return slug[:42] or "text"


def module_name(path: str) -> str:
    parts = Path(path).parts
    if "modules" in parts:
        idx = parts.index("modules")
        if idx + 1 < len(parts):
            return re.sub(r"[^a-z0-9]+", "_", parts[idx + 1].lower())
    if "shared" in parts:
        return "shared"
    return "app"


def translate_request(text: str, target: str, retries: int = 5) -> str:
    params = urlencode({"client": "gtx", "sl": "auto", "tl": target, "dt": "t", "q": text})
    url = "https://translate.googleapis.com/translate_a/single?" + params
    last = None
    for attempt in range(retries):
        try:
            req = Request(url, headers={"User-Agent": "Mozilla/5.0"})
            with urlopen(req, timeout=25) as response:
                data = json.loads(response.read().decode("utf-8"))
            return "".join(segment[0] for segment in data[0] if segment and segment[0]).strip()
        except Exception as exc:
            last = exc
            time.sleep(1.25 * (attempt + 1))
    raise RuntimeError(f"translation failed ({target}): {last}")


def translate_batch(values: list[str], target: str, chunk_size: int = 10) -> dict[str, str]:
    result: dict[str, str] = {}
    for start in range(0, len(values), chunk_size):
        chunk = values[start:start + chunk_size]
        payload = "\n".join(f"[{i:04d}] {value}" for i, value in enumerate(chunk))
        translated = translate_request(payload, target)
        parsed: dict[int, str] = {}
        for line in translated.splitlines():
            match = re.match(r"^\[(\d{4})\]\s*(.*)$", line.strip())
            if match:
                parsed[int(match.group(1))] = match.group(2).strip()
        if len(parsed) == len(chunk):
            for i, value in enumerate(chunk):
                result[value] = parsed[i]
        else:
            for value in chunk:
                result[value] = translate_request(value, target)
        print(f"{target}: {min(start + len(chunk), len(values))}/{len(values)}")
        time.sleep(0.1)
    return result


def append_catalog(lang: str, mapping: dict[str, str]) -> None:
    path = CATALOG_DIR / f"{lang}.ts"
    text = path.read_text()
    existing = set(re.findall(r'^\s*"([^"]+)"\s*:', text, flags=re.M))
    lines = []
    for key, value in mapping.items():
        if key in existing:
            continue
        escaped = value.replace("\\", "\\\\").replace('"', '\\"').replace("\n", "\\n")
        lines.append(f'    "{key}": "{escaped}",')
    if not lines:
        return
    marker = "} as const;"
    idx = text.rfind(marker)
    if idx < 0:
        raise RuntimeError(f"catalog closing marker not found: {lang}")
    path.write_text(text[:idx] + "\n" + "\n".join(lines) + "\n" + text[idx:])


source_paths = parse_report()
values = sorted(source_paths)
print(f"Extended strings to translate: {len(values)}")
translations = {lang: translate_batch(values, lang) for lang in TARGETS}

key_for: dict[str, str] = {}
for value in values:
    digest = hashlib.sha1(value.encode("utf-8")).hexdigest()[:8]
    key_for[value] = f"presentation.{module_name(source_paths[value])}.{slugify(value)}.{digest}"

for lang in TARGETS:
    append_catalog(lang, {key_for[value]: translations[lang][value] for value in values})

OUTPUT.write_text(json.dumps(key_for, ensure_ascii=False, indent=2))
print(f"Generated {len(key_for)} presentation keys")
