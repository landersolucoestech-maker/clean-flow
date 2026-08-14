from pathlib import Path
from urllib.parse import urlencode
from urllib.request import Request, urlopen
import hashlib
import json
import re
import time
import unicodedata

REPORT = Path("i18n-unmatched-literals.txt")
CATALOG_DIR = Path("apps/web/src/app/i18n")
TARGETS = ("en", "pt", "es")
INTENTIONAL = {
    "AD", "G", "X", "CLEAN", "FLOW", "Clean Flow", "CRM", "SMS", "MMS", "PDF", "GPS",
    "QuickBooks", "Facebook", "Instagram", "Nextdoor", "English", "Português", "Español",
}


def parse_report():
    entries = []
    for raw in REPORT.read_text().splitlines():
        if ": " not in raw:
            continue
        path, value = raw.split(": ", 1)
        value = value.strip()
        if not value or value in INTENTIONAL:
            continue
        if "&&" in value or "=>" in value or value.startswith("v) "):
            continue
        if len(re.findall(r"[A-Za-zÀ-ÿ]", value)) < 2:
            continue
        entries.append((path, value))
    return entries


def slugify(value: str):
    normalized = unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode("ascii")
    slug = re.sub(r"[^a-zA-Z0-9]+", "_", normalized).strip("_").lower()
    return (slug[:44] or "text")


def module_name(path: str):
    parts = Path(path).parts
    try:
        idx = parts.index("modules")
        return re.sub(r"[^a-z0-9]+", "_", parts[idx + 1].lower())
    except (ValueError, IndexError):
        return "app"


def translate_request(text: str, target: str, retries=5):
    params = urlencode({"client": "gtx", "sl": "auto", "tl": target, "dt": "t", "q": text})
    url = "https://translate.googleapis.com/translate_a/single?" + params
    last = None
    for attempt in range(retries):
        try:
            req = Request(url, headers={"User-Agent": "Mozilla/5.0"})
            with urlopen(req, timeout=25) as response:
                data = json.loads(response.read().decode("utf-8"))
            return "".join(segment[0] for segment in data[0] if segment and segment[0])
        except Exception as exc:
            last = exc
            time.sleep(1.5 * (attempt + 1))
    raise RuntimeError(f"translation request failed for {target}: {last}")


def translate_batch(values: list[str], target: str, chunk_size=12):
    result = {}
    for start in range(0, len(values), chunk_size):
        chunk = values[start:start + chunk_size]
        payload = "\n".join(f"[{i:04d}] {value}" for i, value in enumerate(chunk))
        translated = translate_request(payload, target)
        lines = [line.strip() for line in translated.splitlines() if line.strip()]
        parsed = {}
        for line in lines:
            m = re.match(r"^\[(\d{4})\]\s*(.*)$", line)
            if m:
                parsed[int(m.group(1))] = m.group(2).strip()
        if len(parsed) != len(chunk):
            for i, value in enumerate(chunk):
                result[value] = translate_request(value, target).strip()
        else:
            for i, value in enumerate(chunk):
                result[value] = parsed[i]
        print(f"{target}: translated {min(start + len(chunk), len(values))}/{len(values)}")
        time.sleep(0.15)
    return result


def read_catalog(lang: str):
    path = CATALOG_DIR / f"{lang}.ts"
    text = path.read_text()
    keys = set(re.findall(r'^\s*"([^"]+)"\s*:', text, flags=re.M))
    return path, text, keys


def append_catalog(lang: str, mapping: dict[str, str]):
    path, text, keys = read_catalog(lang)
    lines = []
    for key, value in mapping.items():
        if key in keys:
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


entries = parse_report()
first_path = {}
for path, value in entries:
    first_path.setdefault(value, path)
values = sorted(first_path)
print(f"Residual translatable literals: {len(values)}")

translations = {target: translate_batch(values, target) for target in TARGETS}

key_for = {}
for value in values:
    digest = hashlib.sha1(value.encode("utf-8")).hexdigest()[:8]
    key_for[value] = f"literal.{module_name(first_path[value])}.{slugify(value)}.{digest}"

for target in TARGETS:
    mapping = {key_for[value]: translations[target][value] for value in values}
    append_catalog(target, mapping)

Path("i18n-generated-literal-keys.json").write_text(
    json.dumps({value: key_for[value] for value in values}, ensure_ascii=False, indent=2)
)
print(f"Generated {len(values)} static trilanguage keys")
