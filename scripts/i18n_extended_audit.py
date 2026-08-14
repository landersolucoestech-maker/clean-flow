from pathlib import Path
import re

ROOTS = [Path("apps/web/src/app"), Path("apps/web/src/modules"), Path("apps/web/src/shared")]
ATTRS = ("placeholder", "title", "aria-label", "aria-description", "alt")
intentional = {
    "Clean Flow", "CRM", "SMS", "MMS", "PDF", "GPS", "QuickBooks", "Facebook", "Instagram", "Nextdoor",
    "English", "Português", "Español", "USD", "BRL", "EUR", "GBP",
}

attribute_findings = []
toast_findings = []
locale_findings = []

for root in ROOTS:
    for path in root.rglob("*.tsx"):
        text = path.read_text()
        for attr in ATTRS:
            for m in re.finditer(rf'\b{re.escape(attr)}\s*=\s*["\']([^"\']*[A-Za-zÀ-ÿ][^"\']*)["\']', text):
                value = m.group(1).strip()
                if value and value not in intentional and not value.startswith("http"):
                    attribute_findings.append((path.as_posix(), attr, value))
        patterns = [
            r'\btoast\.(?:success|error|info|warning)\(\s*["\']([^"\']*[A-Za-zÀ-ÿ][^"\']*)["\']',
            r'\btoast\(\s*\{[\s\S]{0,300}?\btitle:\s*["\']([^"\']*[A-Za-zÀ-ÿ][^"\']*)["\']',
            r'\btoast\(\s*\{[\s\S]{0,500}?\bdescription:\s*["\']([^"\']*[A-Za-zÀ-ÿ][^"\']*)["\']',
        ]
        for pattern in patterns:
            for m in re.finditer(pattern, text):
                toast_findings.append((path.as_posix(), m.group(1).strip()))
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
