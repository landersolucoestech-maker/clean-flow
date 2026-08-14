from pathlib import Path
import re

# Leads: remove page header and pipeline cards because the CRM shell now owns both.
path = Path('apps/web/src/modules/crm/leads/pages/LeadsPageContent.tsx')
text = path.read_text(encoding='utf-8')
start = text.find('          {/* Page Header */}')
end = text.find('          {/* Filters and Search */}')
if start == -1 or end == -1 or end <= start:
    raise SystemExit('Leads header/KPI block not found')
text = text[:start] + '          <Card className="overflow-hidden rounded-md border-border/80 shadow-sm">\n            <div className="border-b border-border/70 px-5 py-4">\n              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">\n                <div>\n                  <h2 className="text-base font-semibold text-foreground">Leads</h2>\n                  <p className="mt-0.5 text-sm text-muted-foreground">Manage the sales pipeline from first contact through conversion.</p>\n                </div>\n                <Button variant="hero" size="sm" className="flex items-center gap-2" onClick={() => setCreateModalOpen(true)}>\n                  <Plus className="h-4 w-4" />\n                  <span>{t("leads.newLead")}</span>\n                </Button>\n              </div>\n            </div>\n\n' + text[end:]
text = text.replace('          <div className="flex flex-col gap-3 rounded-2xl border border-border/80 bg-card p-4 shadow-sm lg:flex-row lg:flex-wrap lg:items-center">', '          <div className="flex flex-col gap-3 border-b border-border/70 bg-muted/10 p-4 lg:flex-row lg:flex-wrap lg:items-center">', 1)
text = text.replace('          {/* Leads Table */}\n          <Card className="overflow-hidden border-border/80 shadow-sm">\n            <CardContent className="p-0">', '          {/* Leads Table */}\n            <CardContent className="p-0">', 1)
# Close only the content Card once; convert the old nested Card closing into the outer card close.
needle = '            </CardContent>\n          </Card>'
idx = text.find(needle, text.find('{/* Leads Table */}'))
if idx == -1:
    raise SystemExit('Leads table card closing not found')
text = text[:idx] + '            </CardContent>\n          </Card>' + text[idx+len(needle):]
path.write_text(text, encoding='utf-8')

# Contacts: remove duplicated CRM tabs and internal page heading, then unify filters/table into one panel.
path = Path('apps/web/src/modules/crm/contacts/pages/ContactsPage.tsx')
text = path.read_text(encoding='utf-8')
text = text.replace('import { CrmTabs } from "../../components/CrmTabs";\n', '')
text = text.replace('        <CrmTabs />\n\n', '', 1)
header_pattern = re.compile(r'''            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">.*?            </div>\n\n            <Card>\n              <CardContent className="p-4 sm:p-5">''', re.S)
replacement = '''            <Card className="overflow-hidden rounded-md border-border/80 shadow-sm">\n              <div className="border-b border-border/70 px-5 py-4">\n                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">\n                  <div>\n                    <h2 className="text-base font-semibold text-foreground">Contacts</h2>\n                    <p className="mt-0.5 text-sm text-muted-foreground">Manage suppliers, partners, service providers and other business contacts.</p>\n                  </div>\n                  {mayCreate && <Button size="sm" onClick={openCreate}><Plus className="mr-2 h-4 w-4" />Create Contact</Button>}\n                </div>\n              </div>\n              <CardContent className="border-b border-border/70 bg-muted/10 p-4">'''
text, count = header_pattern.subn(replacement, text, count=1)
if count != 1:
    raise SystemExit('Contacts header/filter card block not found')
text = text.replace('            </Card>\n\n            {error && (', '            </CardContent>\n\n            {error && (', 1)
# Turn the existing table card into continuation of the same outer card.
text = text.replace('            <Card>\n              <CardContent className="p-0">', '              <CardContent className="p-0">', 1)
# Close the outer card after table content.
marker = '              </CardContent>\n            </Card>\n\n            {!isLoading && filteredContacts.length > 0'
if marker not in text:
    raise SystemExit('Contacts table close block not found')
text = text.replace(marker, '              </CardContent>\n            </Card>\n\n            {!isLoading && filteredContacts.length > 0', 1)
path.write_text(text, encoding='utf-8')

# Customers: remove the redundant secondary "Contact List" header so table is not visually nested.
path = Path('apps/web/src/modules/crm/customers/pages/CustomersPageContent.tsx')
text = path.read_text(encoding='utf-8')
pattern = re.compile(r'''\n            <CardHeader className="flex flex-row items-center justify-between gap-3 border-b border-border/60 px-5 py-3">\n              <CardTitle className="text-sm font-semibold">\{t\("customers.contactList"\)\}</CardTitle>\n              \{selectedIds.size > 0 && \(.*?\n              \)\}\n            </CardHeader>''', re.S)
text, count = pattern.subn('', text, count=1)
if count != 1:
    raise SystemExit('Customers secondary table header not found')
path.write_text(text, encoding='utf-8')

print('CRM tab content normalized')
