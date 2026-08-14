from pathlib import Path
import re

# Leads: remove page header and pipeline cards because the CRM shell now owns both.
path = Path('apps/web/src/modules/crm/leads/pages/LeadsPageContent.tsx')
text = path.read_text(encoding='utf-8')
start = text.find('          {/* Page Header */}')
end = text.find('          {/* Filters and Search */}')
if start == -1 or end == -1 or end <= start:
    raise SystemExit('Leads header/KPI block not found')
text = text[:start] + '''          <Card className="overflow-hidden rounded-md border-border/80 shadow-sm">
            <div className="border-b border-border/70 px-5 py-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-base font-semibold text-foreground">Leads</h2>
                  <p className="mt-0.5 text-sm text-muted-foreground">Manage the sales pipeline from first contact through conversion.</p>
                </div>
                <Button variant="hero" size="sm" className="flex items-center gap-2" onClick={() => setCreateModalOpen(true)}>
                  <Plus className="h-4 w-4" />
                  <span>{t("leads.newLead")}</span>
                </Button>
              </div>
            </div>

''' + text[end:]
text = text.replace('          <div className="flex flex-col gap-3 rounded-2xl border border-border/80 bg-card p-4 shadow-sm lg:flex-row lg:flex-wrap lg:items-center">', '          <div className="flex flex-col gap-3 border-b border-border/70 bg-muted/10 p-4 lg:flex-row lg:flex-wrap lg:items-center">', 1)
text = text.replace('          {/* Leads Table */}\n          <Card className="overflow-hidden border-border/80 shadow-sm">\n            <CardContent className="p-0">', '          {/* Leads Table */}\n            <CardContent className="p-0">', 1)
path.write_text(text, encoding='utf-8')

# Contacts: remove duplicated CRM tabs and page heading only. Keep the existing filter and table cards
# as sibling sections; this avoids nested-page appearance without risky JSX re-parenting.
path = Path('apps/web/src/modules/crm/contacts/pages/ContactsPage.tsx')
text = path.read_text(encoding='utf-8')
text = text.replace('import { CrmTabs } from "../../components/CrmTabs";\n', '')
text = text.replace('        <CrmTabs />\n\n', '', 1)
header_pattern = re.compile(r'''            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">.*?            </div>\n\n''', re.S)
replacement = '''            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-base font-semibold text-foreground">Contacts</h2>
                <p className="mt-0.5 text-sm text-muted-foreground">Manage suppliers, partners, service providers and other business contacts.</p>
              </div>
              {mayCreate && <Button size="sm" onClick={openCreate}><Plus className="mr-2 h-4 w-4" />Create Contact</Button>}
            </div>

'''
text, count = header_pattern.subn(replacement, text, count=1)
if count != 1:
    raise SystemExit('Contacts page heading not found')
path.write_text(text, encoding='utf-8')

# Customers: remove the redundant secondary "Contact List" header so the directory is a single panel.
path = Path('apps/web/src/modules/crm/customers/pages/CustomersPageContent.tsx')
text = path.read_text(encoding='utf-8')
pattern = re.compile(r'''\n            <CardHeader className="flex flex-row items-center justify-between gap-3 border-b border-border/60 px-5 py-3">\n              <CardTitle className="text-sm font-semibold">\{t\("customers.contactList"\)\}</CardTitle>\n              \{selectedIds.size > 0 && \(.*?\n              \)\}\n            </CardHeader>''', re.S)
text, count = pattern.subn('', text, count=1)
if count != 1:
    raise SystemExit('Customers secondary table header not found')
path.write_text(text, encoding='utf-8')

print('CRM tab content normalized')
