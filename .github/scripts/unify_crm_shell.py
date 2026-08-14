from pathlib import Path

# Customers route wrapper: use the same CRM shell as Leads/Contacts.
p = Path('apps/web/src/modules/crm/customers/pages/CustomersPage.tsx')
p.write_text('''import { Customers as CustomersPageContent } from "./CustomersPageContent";\nimport { CrmPageBridge } from "../../components/CrmPageBridge";\n\nexport function Customers() {\n  return (\n    <CrmPageBridge>\n      <CustomersPageContent />\n    </CrmPageBridge>\n  );\n}\n''', encoding='utf-8')

# Customers content: remove its duplicate CRM shell/header/tabs.
p = Path('apps/web/src/modules/crm/customers/pages/CustomersPageContent.tsx')
text = p.read_text(encoding='utf-8')
text = text.replace('import { CrmTabs } from "../../components/CrmTabs";\n', '')
header_start = '          {/* CRM Page Header */}\n'
header_end = '          {/* Customer Modal - Create */}\n'
if header_start in text and header_end in text:
    before, rest = text.split(header_start, 1)
    _, after = rest.split(header_end, 1)
    text = before + header_end + after
text = text.replace('          <CrmTabs />\n\n', '', 1)
p.write_text(text, encoding='utf-8')

# Contacts: same CRM shell; remove its local duplicate tabs.
p = Path('apps/web/src/modules/crm/contacts/pages/ContactsPage.tsx')
text = p.read_text(encoding='utf-8')
text = text.replace('import { CrmTabs } from "../../components/CrmTabs";\n', 'import { CrmPageBridge } from "../../components/CrmPageBridge";\n')
text = text.replace('  return (\n    <PageLayout>\n', '  return (\n    <CrmPageBridge>\n      <PageLayout>\n', 1)
text = text.replace('      <div className="space-y-6">\n        <CrmTabs />\n\n', '      <div className="space-y-6">\n', 1)
text = text.replace('    </PageLayout>\n  );\n}\n', '      </PageLayout>\n    </CrmPageBridge>\n  );\n}\n', 1)
p.write_text(text, encoding='utf-8')

print('Unified CRM shell applied to Customers, Leads and Contacts')
