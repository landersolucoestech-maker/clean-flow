from pathlib import Path
import json
import re

REPORT = Path("i18n-extended-audit.txt")
KEYS = Path("i18n-generated-presentation-keys.json")
USE_LANGUAGE_IMPORT = 'import { useLanguage } from "@/contexts/useLanguage";\n'

key_for: dict[str, str] = json.loads(KEYS.read_text()) if KEYS.exists() else {}

technical_patterns = [
    re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$"),
    re.compile(r"^https?://", re.I),
    re.compile(r"^@\w+$"),
    re.compile(r"^(?:INV|JOB)-\d+$", re.I),
    re.compile(r"^[A-Z]{1,3}$"),
    re.compile(r"^\+?[\d\s().-]+$"),
]
intentional = {"CRM", "SMS", "MMS", "PDF", "GPS", "QuickBooks", "Facebook", "Instagram", "Nextdoor", "English", "Português", "Español", "USD", "BRL", "EUR", "GBP", "X"}


def technical(value: str) -> bool:
    return value in intentional or any(p.search(value) for p in technical_patterns)


def parse_audit():
    attrs: dict[str, list[tuple[str, str]]] = {}
    toasts: dict[str, list[str]] = {}
    locales: set[str] = set()
    for raw in REPORT.read_text().splitlines():
        parts = raw.split(" | ")
        if not parts:
            continue
        if parts[0] == "ATTR" and len(parts) >= 4:
            path, attr, value = parts[1], parts[2], " | ".join(parts[3:]).strip()
            if not technical(value) and value in key_for:
                attrs.setdefault(path, []).append((attr, value))
        elif parts[0] == "TOAST" and len(parts) >= 3:
            path, value = parts[1], " | ".join(parts[2:]).strip()
            if value in key_for:
                toasts.setdefault(path, []).append(value)
        elif parts[0] == "LOCALE" and len(parts) >= 2:
            locales.add(parts[1])
    return attrs, toasts, locales


def js_string(value: str) -> str:
    return json.dumps(value, ensure_ascii=False)


def find_matching_brace(text: str, start: int) -> int:
    depth = 0
    quote = None
    escape = False
    line_comment = False
    block_comment = False
    i = start
    while i < len(text):
        ch = text[i]
        nxt = text[i + 1] if i + 1 < len(text) else ""
        if line_comment:
            if ch == "\n": line_comment = False
            i += 1; continue
        if block_comment:
            if ch == "*" and nxt == "/": block_comment = False; i += 2; continue
            i += 1; continue
        if quote:
            if escape: escape = False
            elif ch == "\\": escape = True
            elif ch == quote: quote = None
            i += 1; continue
        if ch == "/" and nxt == "/": line_comment = True; i += 2; continue
        if ch == "/" and nxt == "*": block_comment = True; i += 2; continue
        if ch in ('"', "'", "`"): quote = ch; i += 1; continue
        if ch == "{": depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0: return i
        i += 1
    return -1


def component_bodies(text: str):
    candidates: list[tuple[int, int]] = []
    patterns = [
        re.compile(r"(?:export\s+default\s+|export\s+)?function\s+[A-Z][A-Za-z0-9_]*[\s\S]*?\{"),
        re.compile(r"(?:export\s+)?const\s+[A-Z][A-Za-z0-9_]*[\s\S]*?=>\s*\{"),
    ]
    for pat in patterns:
        for m in pat.finditer(text):
            brace = m.end() - 1
            end = find_matching_brace(text, brace)
            if end > brace:
                candidates.append((brace, end))
    return sorted(set(candidates), key=lambda x: (x[0], x[1]))


def ensure_binding(text: str, name: str) -> str:
    bodies = component_bodies(text)
    insertions = []
    for start, end in bodies:
        body = text[start + 1:end]
        if not re.search(rf"\b{name}\b", body):
            continue
        needs = (name == "t" and 't("' in body) or (name == "locale" and re.search(r"\blocale\b", body))
        if not needs:
            continue
        binding = re.search(r"const\s*\{([^}]*)\}\s*=\s*useLanguage\(\)\s*;", body)
        if binding:
            fields = [x.strip() for x in binding.group(1).split(",") if x.strip()]
            if name not in fields:
                new_fields = ", ".join(fields + [name])
                abs_start = start + 1 + binding.start(1)
                abs_end = start + 1 + binding.end(1)
                text = text[:abs_start] + new_fields + text[abs_end:]
                return ensure_binding(text, name)
            continue
        insertions.append(start + 1)
    for pos in reversed(insertions):
        text = text[:pos] + f"\n  const {{ {name} }} = useLanguage();" + text[pos:]
    return text


def replace_attribute(text: str, attr: str, value: str, key: str) -> str:
    # Literal attributes can contain apostrophes/quotes that make a backreference regex
    # brittle. Match either quote style independently and replace every occurrence.
    escaped = re.escape(value)
    pattern = re.compile(
        rf'\b{re.escape(attr)}\s*=\s*(?:"{escaped}"|\'{escaped}\')'
    )
    return pattern.sub(f'{attr}={{t({js_string(key)})}}', text)


def replace_toast(text: str, value: str, key: str) -> str:
    qvalue = re.escape(value)
    # Do not use a numeric backreference after a variable-width alternation: when the
    # same message appears more than once it can leave one literal behind. Match quote
    # styles independently and replace all direct/object-style occurrences.
    direct = re.compile(
        rf'(toast\.(?:success|error|info|warning)\(\s*)(?:"{qvalue}"|\'{qvalue}\')'
    )
    text = direct.sub(lambda m: m.group(1) + f"t({js_string(key)})", text)
    obj = re.compile(
        rf'((?:title|description)\s*:\s*)(?:"{qvalue}"|\'{qvalue}\')'
    )
    return obj.sub(lambda m: m.group(1) + f"t({js_string(key)})", text)


attrs, toasts, locale_files = parse_audit()
files = sorted(set(attrs) | set(toasts) | locale_files)
changed = 0
for file_path in files:
    path = Path(file_path)
    text = path.read_text()
    original = text

    for attr, value in attrs.get(file_path, []):
        text = replace_attribute(text, attr, value, key_for[value])
    for value in toasts.get(file_path, []):
        text = replace_toast(text, value, key_for[value])

    if file_path in locale_files:
        text = re.sub(r'(\.toLocale(?:String|DateString|TimeString)\()\s*["\'](?:en-US|pt-BR|es-ES)["\']', r'\1locale', text)
        text = re.sub(r'(new Intl\.(?:NumberFormat|DateTimeFormat)\()\s*["\'](?:en-US|pt-BR|es-ES)["\']', r'\1locale', text)

    if text != original:
        if "t(" in text:
            text = ensure_binding(text, "t")
        if file_path in locale_files and "locale" in text:
            text = ensure_binding(text, "locale")
        if "useLanguage()" in text and '@/contexts/useLanguage' not in text:
            text = USE_LANGUAGE_IMPORT + text
        path.write_text(text)
        changed += 1

print(f"Extended source files changed: {changed}")
