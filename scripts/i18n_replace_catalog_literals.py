from pathlib import Path
import json
import re

SRC = Path("apps/web/src")
CATALOG_DIR = SRC / "app/i18n"
TARGET_ROOTS = [SRC / "app/layout", SRC / "modules"]
T_IMPORT = 'import { T } from "@/shared/components/i18n/T";\n'
GENERATED_MAP = Path("i18n-generated-literal-keys.json")

value_to_keys: dict[str, list[str]] = {}
for lang in ("en", "pt", "es"):
    catalog_text = (CATALOG_DIR / f"{lang}.ts").read_text()
    pairs = re.findall(r'^\s*"([^"]+)"\s*:\s*"((?:\\.|[^"])*)"\s*,?$', catalog_text, flags=re.M)
    for key, raw_value in pairs:
        value = raw_value.replace('\\"', '"').replace('\\n', '\n').replace('\\\\', '\\')
        value_to_keys.setdefault(value, []).append(key)

generated_source_keys: dict[str, str] = {}
if GENERATED_MAP.exists():
    generated_source_keys = json.loads(GENERATED_MAP.read_text())

module_prefixes = [
    ("/crm/customers/", "customers."),
    ("/crm/leads/", "leads."),
    ("/crm/contacts/", "contacts."),
    ("/communications/", "communications."),
    ("/payroll/", "payroll."),
    ("/billing/", "billing."),
    ("/reports/", "reports."),
    ("/support/", "support."),
    ("/settings/", "settings."),
    ("/schedule/", "schedule."),
    ("/transactions/", "transactions."),
    ("/dashboard/", "dashboard."),
    ("/admin/", "admin."),
]

def choose_key(path: str, keys: list[str]) -> str:
    normalized = path.replace("\\", "/")
    priorities: list[str] = []
    for marker, prefix in module_prefixes:
        if marker in normalized:
            priorities.append(prefix)
            break
    priorities.extend(["common.", "crm.", "header.", "sidebar."])
    for prefix in priorities:
        matching = [k for k in keys if k.startswith(prefix)]
        if matching:
            return sorted(set(matching), key=lambda x: (len(x), x))[0]
    return sorted(set(keys), key=lambda x: (len(x), x))[0]

literal_pattern = re.compile(r'>(\s*)([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ0-9 &/+().,:;!?\-#]*?)(\s*)<')
allow = {"Clean Flow", "CLEAN", "FLOW", "CRM", "SMS", "MMS", "PDF", "GPS", "QuickBooks", "Nextdoor", "Facebook", "Instagram", "AD", "G", "X", "English", "Português", "Español"}

files_changed = 0
replacements = 0
unmatched: set[tuple[str, str]] = set()

paths = []
for root in TARGET_ROOTS:
    paths.extend(root.rglob("*.tsx"))

for path in sorted(set(paths)):
    text = path.read_text()

    def replace_match(match: re.Match[str]) -> str:
        global replacements
        leading, value, trailing = match.groups()
        normalized = " ".join(value.split())
        if normalized in allow or "&&" in normalized or "=>" in normalized:
            return match.group(0)
        generated_key = generated_source_keys.get(normalized)
        keys = [generated_key] if generated_key else value_to_keys.get(normalized)
        if not keys:
            unmatched.add((path.as_posix(), normalized))
            return match.group(0)
        key = choose_key(path.as_posix(), keys)
        replacements += 1
        return f'>{leading}<T k="{key}" />{trailing}<'

    new_text = literal_pattern.sub(replace_match, text)
    if new_text == text:
        continue

    if '@/shared/components/i18n/T' not in new_text:
        new_text = T_IMPORT + new_text

    path.write_text(new_text)
    files_changed += 1

Path("i18n-unmatched-literals.txt").write_text(
    "\n".join(f"{path}: {value}" for path, value in sorted(unmatched))
)
print(f"Changed files: {files_changed}")
print(f"Catalog-backed replacements: {replacements}")
print(f"Unmatched unique literals: {len(unmatched)}")
