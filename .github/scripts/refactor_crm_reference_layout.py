from pathlib import Path

path = Path('apps/web/src/modules/crm/customers/pages/CustomersPageContent.tsx')
text = path.read_text(encoding='utf-8')

def replace_once(old: str, new: str):
    global text
    if old not in text:
        raise SystemExit(f'Expected block not found: {old[:140]!r}')
    text = text.replace(old, new, 1)

replace_once(
    'import { readSpreadsheetFile } from "@/lib/spreadsheet";',
    'import { readSpreadsheetFile } from "@/lib/spreadsheet";\nimport { CrmTabs } from "../../components/CrmTabs";'
)

replace_once(
'''  return <PageLayout
      headerActions={
        <Button variant="hero" size="sm" onClick={() => setIsCustomerModalOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          {t("customers.addCustomer")}
        </Button>
      }
      contentClassName="space-y-7"
    >
      <div className="space-y-6">
          {/* Page Header */}
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">{t("customers.title")}</h1>
              <p className="text-muted-foreground">
                {t("customers.subtitle")}
              </p>
            </div>
            <div className="md:hidden">
              <Button variant="hero" onClick={() => setIsCustomerModalOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                {t("customers.addCustomer")}
              </Button>
            </div>
          </div>''',
'''  return <PageLayout
      headerActions={
        <Button variant="hero" size="sm" onClick={() => setIsCustomerModalOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          {t("customers.addCustomer")}
        </Button>
      }
      contentClassName="gap-5"
    >
      <div className="space-y-5">
          {/* CRM Page Header */}
          <section className="flex flex-col gap-1 border-b border-border/70 pb-4">
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">CRM</h1>
            <p className="text-sm text-muted-foreground">Manage customers, leads and contacts from one unified workspace.</p>
            <div className="mt-3 md:hidden">
              <Button variant="hero" onClick={() => setIsCustomerModalOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                {t("customers.addCustomer")}
              </Button>
            </div>
          </section>'''
)

replace_once(
    '<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">',
    '<div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">'
)

# Flatten the five KPI cards to match the compact reference layout.
text = text.replace('<Card>\n              <CardContent className="p-4">', '<Card className="rounded-md border-border/80 shadow-sm">\n              <CardContent className="p-4">', 5)
text = text.replace('className="text-2xl font-bold text-foreground"', 'className="mt-2 text-2xl font-semibold tracking-tight text-foreground"', 5)

# Insert the CRM tab navigation directly under KPI cards.
needle = '''          </div>\n\n          {/* Search and Filter Bar */}'''
replace_once(needle, '''          </div>\n\n          <CrmTabs />\n\n          {/* Customer workspace */}''')

# Turn the old standalone toolbar + directory card into one unified bordered workspace.
replace_once(
'''          <div className="flex flex-col gap-3 rounded-2xl border border-border/80 bg-card p-4 shadow-sm lg:flex-row lg:items-center">''',
'''          <Card className="overflow-hidden rounded-md border-border/80 shadow-sm">
            <CardHeader className="border-b border-border/70 px-5 py-4">
              <div className="flex flex-col gap-1">
                <CardTitle className="text-base">{t("customers.title")}</CardTitle>
                <p className="text-sm text-muted-foreground">Search, filter and manage the customer directory.</p>
              </div>
            </CardHeader>
            <div className="flex flex-col gap-3 border-b border-border/70 bg-muted/10 p-4 lg:flex-row lg:items-center">'''
)

replace_once(
'''          </div>\n\n          {/* Customer Directory */}\n          <Card className="border-border/80 shadow-sm">\n            <CardHeader className="flex flex-row items-center justify-between gap-3 pb-4">\n              <CardTitle>{t("customers.contactList")}</CardTitle>''',
'''            </div>\n\n            <CardHeader className="flex flex-row items-center justify-between gap-3 border-b border-border/60 px-5 py-3">\n              <CardTitle className="text-sm font-semibold">{t("customers.contactList")}</CardTitle>'''
)

# Make table area flush with the reference panel.
text = text.replace('<CardContent>\n              {viewMode === "table" ?', '<CardContent className="p-0">\n              {viewMode === "table" ?', 1)

path.write_text(text, encoding='utf-8')
print('CRM reference layout applied')
