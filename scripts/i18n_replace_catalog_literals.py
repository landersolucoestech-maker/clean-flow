from pathlib import Path
import re

ROOT = Path("apps/web/src")
CATALOG = ROOT / "app/i18n/en.ts"

catalog_text = CATALOG.read_text()
pairs = re.findall(r'^\s*"([^"]+)"\s*:\s*"((?:\\.|[^"])*)"\s*,?$', catalog_text, flags=re.M)
value_to_keys: dict[str, list[str]] = {}
for key, raw_value in pairs:
    value = bytes(raw_value, "utf-8").decode("unicode_escape") if "\\" in raw_value else raw_value
    value_to_keys.setdefault(value, []).append(key)

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
            return sorted(matching, key=lambda x: (len(x), x))[0]
    return sorted(keys, key=lambda x: (len(x), x))[0]

literal_pattern = re.compile(r'>(\s*)([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ0-9 &/+().,:;!?\-#]*?)(\s*)<')
allow = {"Clean Flow", "CLEAN", "FLOW", "CRM", "SMS", "PDF", "QuickBooks", "Nextdoor", "Facebook", "Instagram"}

files_changed = 0
replacements = 0
unmatched: list[tuple[str, str]] = []

for path in ROOT.rglob("*.tsx"):
    if "/i18n/" in path.as_posix():
        continue
    text = path.read_text()
    changed = False

    def replace_match(match: re.Match[str]) -> str:
        nonlocal_dummy = None
        global replacements
        leading, value, trailing = match.groups()
        normalized = " ".join(value.split())
        if normalized in allow:
            return match.group(0)
        keys = value_to_keys.get(normalized)
        if not keys:
            unmatched.append((path.as_posix(), normalized))
            return match.group(0)
        key = choose_key(path.as_posix(), keys)
        replacements += 1
        return f'>{leading}<T k="{key}" />{trailing}<'

    new_text = literal_pattern.sub(replace_match, text)
    if new_text != text:
        changed = True
        if 'from "@/components/i18n/T"' not in new_text:
            import_lines = list(re.finditer(r'^import .*?;\s*$', new_text, flags=re.M))
            if not import_lines:
                raise RuntimeError(f"No import insertion point for {path}")
            pos = import_lines[-1].end()
            new_text = new_text[:pos] + '\nimport { T } from "@/components/i18n/T";' + new_text[pos:]
        path.write_text(new_text)
        files_changed += 1

Path("i18n-unmatched-literals.txt").write_text(
    "\n".join(f"{path}: {value}" for path, value in sorted(set(unmatched)))
)
print(f"Changed files: {files_changed}")
print(f"Catalog-backed replacements: {replacements}")
print(f"Unmatched unique literals: {len(set(unmatched))}")
