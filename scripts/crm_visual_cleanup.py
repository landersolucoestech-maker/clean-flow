from pathlib import Path

CHANGES = {
    "apps/web/src/modules/crm/customers/pages/CustomersPageContent.tsx": [
        ('''            <CardHeader className="border-b border-border px-4 py-3">\n              <div className="flex flex-col gap-1">\n                <CardTitle className="text-sm font-semibold"><T k="customers.title" /></CardTitle>\n                <p className="text-xs text-muted-foreground"><T k="literal.crm.search_filter_and_manage_the_customer_direct.f86b665e" /></p>\n              </div>\n            </CardHeader>\n''', ''),
        ('flex flex-col gap-3 border-b border-border bg-muted/20 p-3 lg:flex-row lg:items-center', 'flex flex-col gap-2.5 border-b border-border bg-muted/20 p-2.5 lg:flex-row lg:items-center'),
        ('grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3', 'grid grid-cols-1 gap-3 p-3 md:grid-cols-2 xl:grid-cols-3'),
        ('className="relative border-border/80 shadow-sm transition-shadow hover:shadow-md"', 'className="relative border-border/90 shadow-none transition-colors hover:border-primary/30"'),
        ('<CardContent className="p-4">\n                        <div className="flex items-start justify-between mb-3">', '<CardContent className="p-3">\n                        <div className="mb-2.5 flex items-start justify-between">'),
        ('flex h-10 w-10 items-center justify-center rounded-full bg-primary-light', 'flex h-8 w-8 items-center justify-center rounded-md bg-primary-light'),
        ('<div className="space-y-2 text-sm">', '<div className="space-y-1.5 text-xs">'),
        ('mt-4 flex items-center justify-between border-t border-border/80 pt-3', 'mt-3 flex items-center justify-between border-t border-border/80 pt-2.5'),
    ],
    "apps/web/src/modules/crm/leads/pages/LeadsPageContent.tsx": [
        ('''            <div className="border-b border-border px-4 py-3">\n              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">\n                <div>\n                  <h2 className="text-base font-semibold text-foreground"><T k="leads.title" /></h2>\n                  <p className="mt-0.5 text-sm text-muted-foreground"><T k="literal.crm.manage_the_sales_pipeline_from_first_contact.d637847e" /></p>\n                </div>\n              </div>\n            </div>\n\n''', ''),
        ('flex flex-col gap-3 border-b border-border bg-muted/20 p-3 lg:flex-row lg:flex-wrap lg:items-center', 'flex flex-col gap-2.5 border-b border-border bg-muted/20 p-2.5 lg:flex-row lg:flex-wrap lg:items-center'),
        ('className="flex items-center justify-center h-64"', 'className="flex h-40 items-center justify-center"'),
        ('className="w-8 h-8 animate-spin text-primary"', 'className="h-6 w-6 animate-spin text-primary"'),
        ('className="text-center py-8 text-muted-foreground"', 'className="py-6 text-center text-xs text-muted-foreground"'),
    ],
    "apps/web/src/modules/crm/contacts/pages/ContactsPage.tsx": [
        ('''            <div className="flex flex-col gap-3 border-b border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">\n              <div>\n                <h2 className="text-base font-semibold text-foreground"><T k="crm.tabs.contacts" /></h2>\n                <p className="mt-0.5 text-sm text-muted-foreground"><T k="literal.crm.manage_suppliers_partners_service_providers_.1ef718fb" /></p>\n              </div>\n            </div>\n\n''', ''),
        ('<CardContent className="border-b border-border bg-muted/20 p-3">', '<CardContent className="border-b border-border bg-muted/20 p-2.5">'),
        ('grid gap-3 md:grid-cols-[minmax(0,1fr)_220px_180px]', 'grid gap-2.5 md:grid-cols-[minmax(0,1fr)_200px_160px]'),
        ('''            {error && (\n              <Card className="border-destructive/40 bg-destructive/5">\n                <CardContent className="p-4">\n                  <p className="font-medium text-destructive"><T k="literal.crm.unable_to_load_contacts.543e081f" /></p>\n                  <p className="mt-1 text-sm text-muted-foreground">{error.message}</p>\n                </CardContent>\n              </Card>\n            )}\n''', '''            {error && (\n              <div className="border-b border-destructive/30 bg-destructive/5 px-3 py-2.5">\n                <p className="text-xs font-medium text-destructive"><T k="literal.crm.unable_to_load_contacts.543e081f" /></p>\n                <p className="mt-0.5 text-xs text-muted-foreground">{error.message}</p>\n              </div>\n            )}\n'''),
        ('<div className="space-y-3 p-5">', '<div className="space-y-2.5 p-4">'),
        ('className="h-12 w-full"', 'className="h-9 w-full"'),
        ('flex min-h-72 flex-col items-center justify-center px-6 py-12 text-center', 'flex min-h-44 flex-col items-center justify-center px-4 py-8 text-center'),
        ('<div className="rounded-full bg-muted p-4"><ContactRound className="h-7 w-7 text-muted-foreground" /></div>', '<div className="rounded-md bg-muted p-2.5"><ContactRound className="h-5 w-5 text-muted-foreground" /></div>'),
        ('className="mt-4 text-lg font-semibold"', 'className="mt-2.5 text-sm font-semibold"'),
        ('className="mt-1 max-w-md text-sm text-muted-foreground"', 'className="mt-1 max-w-md text-xs text-muted-foreground"'),
        ('className="mt-5"', 'className="mt-3"'),
        ('flex flex-col gap-3 text-sm text-muted-foreground sm:flex-row', 'flex flex-col gap-2 text-xs text-muted-foreground sm:flex-row'),
    ],
}

changed = []
for name, replacements in CHANGES.items():
    path = Path(name)
    text = path.read_text()
    original = text
    for old, new in replacements:
        text = text.replace(old, new)
    if text != original:
        path.write_text(text)
        changed.append(name)

print("CRM_VISUAL_CHANGED", len(changed))
for path in changed:
    print(path)
