from pathlib import Path
import re

ROOTS = [Path("apps/web/src/app"), Path("apps/web/src/modules"), Path("apps/web/src/shared")]
ATTRS = ("placeholder", "title", "aria-label", "aria-description", "alt")
intentional = {
    "Clean Flow", "CRM", "SMS", "MMS", "PDF", "GPS", "QuickBooks", "Facebook", "Instagram", "Nextdoor",
    "English", "Português", "Español", "USD", "BRL", "EUR", "GBP", "X",
}
technical_patterns = [
    re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$"),
    re.compile(r"^https?://", re.I),
    re.compile(r"^@\w+$"),
    re.compile(r"^(?:INV|JOB)-\d+$", re.I),
    re.compile(r"^[A-Z]{1,3}$"),
    re.compile(r"^\+?[\d\s().-]+$"),
]

def is_intentional(value: str) -> bool:
    return value in intentional or any(pattern.search(value) for pattern in technical_patterns)

attribute_findings = []
toast_findings = []
locale_findings = []


def quoted_values(prefix_pattern: str, text: str):
    # Match double and single quoted literals independently. This prevents apostrophes
    # inside double-quoted UI text (e.g. "Customer's file") from truncating the value.
    patterns = [
        re.compile(prefix_pattern + r'"((?:\\.|[^"\\])*)"'),
        re.compile(prefix_pattern + r"'((?:\\.|[^'\\])*)'"),
    ]
    for pattern in patterns:
        for match in pattern.finditer(text):
            yield bytes(match.group(1), "utf-8").decode("unicode_escape") if "\\" in match.group(1) else match.group(1)


for root in ROOTS:
    for path in root.rglob("*.tsx"):
        text = path.read_text()
        for attr in ATTRS:
            prefix = rf'\b{re.escape(attr)}\s*=\s*'
            for raw_value in quoted_values(prefix, text):
                value = raw_value.strip()
                if value and re.search(r"[A-Za-zÀ-ÿ]", value) and not is_intentional(value):
                    attribute_findings.append((path.as_posix(), attr, value))

        toast_prefixes = [
            r'\btoast\.(?:success|error|info|warning)\(\s*',
            r'\btoast\(\s*\{[\s\S]{0,300}?\btitle:\s*',
            r'\btoast\(\s*\{[\s\S]{0,500}?\bdescription:\s*',
        ]
        for prefix in toast_prefixes:
            for raw_value in quoted_values(prefix, text):
                value = raw_value.strip()
                if value and re.search(r"[A-Za-zÀ-ÿ]", value):
                    toast_findings.append((path.as_posix(), value))

        for m in re.finditer(r'toLocale(?:String|DateString|TimeString)\(\s*["\'](en-US|pt-BR|es-ES)["\']', text):
            locale_findings.append((path.as_posix(), m.group(0)))
        for m in re.finditer(r'new Intl\.(?:NumberFormat|DateTimeFormat)\(\s*["\'](en-US|pt-BR|es-ES)["\']', text):
            locale_findings.append((path.as_posix(), m.group(0)))

attribute_findings = sorted(set(attribute_findings))
toast_findings = sorted(set(toast_findings))
locale_findings = sorted(set(locale_findings))

print(f"STATIC_ATTRIBUTE_FINDINGS={len(attribute_findings)}")
for item in attribute_findings[:300]: print("ATTR", *item, sep=" | ")
print(f"STATIC_TOAST_FINDINGS={len(toast_findings)}")
for item in toast_findings[:300]: print("TOAST", *item, sep=" | ")
print(f"HARDCODED_LOCALE_FINDINGS={len(locale_findings)}")
for item in locale_findings[:300]: print("LOCALE", *item, sep=" | ")

Path("i18n-extended-audit.txt").write_text(
    "\n".join([*(f"ATTR | {p} | {a} | {v}" for p,a,v in attribute_findings),
               *(f"TOAST | {p} | {v}" for p,v in toast_findings),
               *(f"LOCALE | {p} | {v}" for p,v in locale_findings)])
)
