from pathlib import Path

CHANGES = {
    "apps/web/src/modules/settings/pages/SyncLogsPage.tsx": [
        ('<PageLayout>\n      <div className="space-y-6">', '<PageLayout>\n      <div className="space-y-3">'),
        ('text-2xl font-bold tracking-tight text-foreground sm:text-3xl', 'text-lg font-semibold tracking-tight text-foreground'),
        ('flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between', 'flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between'),
        ('grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4', 'grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-4'),
        ('className="border-border/80 shadow-sm"', 'className="border-border/90 shadow-none"'),
        ('<CardContent className="p-6">', '<CardContent className="p-3.5">'),
        ('text-sm font-medium text-muted-foreground', 'text-[11px] font-medium text-muted-foreground'),
        ('text-2xl font-bold text-foreground', 'text-lg font-semibold text-foreground'),
        ('text-2xl font-bold text-success', 'text-lg font-semibold text-success'),
        ('text-2xl font-bold text-destructive', 'text-lg font-semibold text-destructive'),
        ('text-lg font-bold text-foreground', 'text-sm font-semibold text-foreground'),
        ('w-8 h-8 text-primary', 'h-4 w-4 text-primary'),
        ('w-8 h-8 text-success', 'h-4 w-4 text-success'),
        ('w-8 h-8 text-destructive', 'h-4 w-4 text-destructive'),
        ('w-8 h-8 text-muted-foreground', 'h-4 w-4 text-muted-foreground'),
        ('<CardHeader className="pb-4">', '<CardHeader className="pb-2">'),
        ('md:items-center md:justify-between gap-4', 'gap-3 md:items-center md:justify-between'),
        ('<CardTitle className="text-lg">', '<CardTitle className="text-sm">'),
        ('className="text-center py-12 text-muted-foreground"', 'className="py-7 text-center text-xs text-muted-foreground"'),
        ('className="w-12 h-12 mx-auto mb-4 opacity-50"', 'className="mx-auto mb-2 h-6 w-6 opacity-50"'),
        ('className="text-lg font-medium"', 'className="text-sm font-medium"'),
    ],
    "apps/web/src/modules/reports/components/AIConsultantCard.tsx": [
        ('bg-gradient-to-br from-violet-500/5 via-purple-500/10 to-fuchsia-500/5 border-purple-500/20', 'border-primary/20 bg-primary/[0.025] shadow-none'),
        ('className="p-2 bg-purple-500/10 rounded-lg"', 'className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10"'),
        ('className="w-6 h-6 text-purple-500"', 'className="h-4 w-4 text-primary"'),
        ('<CardTitle className="text-xl flex items-center gap-2">', '<CardTitle className="flex items-center gap-2 text-sm">'),
        ('className="text-purple-500 border-purple-500/30"', 'className="border-primary/20 text-primary"'),
        ('className="text-sm text-muted-foreground"', 'className="text-xs text-muted-foreground"'),
        ('className="bg-purple-500 hover:bg-purple-600"', 'size="sm"'),
        ('className="flex flex-col items-center justify-center py-8 text-center"', 'className="flex flex-col items-center justify-center py-6 text-center"'),
        ('className="p-4 bg-purple-500/10 rounded-full mb-4"', 'className="mb-2 flex h-8 w-8 items-center justify-center rounded-md bg-primary/10"'),
        ('className="w-12 h-12 text-purple-500"', 'className="h-4 w-4 text-primary"'),
        ('className="text-lg font-semibold mb-2"', 'className="mb-1.5 text-sm font-semibold"'),
        ('className="text-muted-foreground max-w-md"', 'className="max-w-md text-xs text-muted-foreground"'),
        ('className="h-[400px] pr-4"', 'className="h-[320px] pr-3"'),
    ],
    "apps/web/src/modules/payroll/components/PayrollPDFPreviewModal.tsx": [
        ('sm:max-w-3xl max-h-[90vh]', 'max-h-[86vh] sm:max-w-3xl'),
        ('flex flex-col items-center justify-center py-4 gap-4 min-h-[400px]', 'flex min-h-[280px] flex-col items-center justify-center gap-3 py-3'),
        ('w-12 h-12 animate-spin text-primary', 'h-7 w-7 animate-spin text-primary'),
        ('flex flex-col items-center gap-4 w-full', 'flex w-full flex-col items-center gap-3'),
        ('border rounded-lg overflow-hidden bg-muted/30 max-h-[50vh] overflow-y-auto', 'max-h-[48vh] overflow-y-auto rounded-md border bg-muted/20'),
        ('className="flex items-center justify-center p-8"', 'className="flex items-center justify-center p-5"'),
        ('className="flex flex-col items-center justify-center p-8 gap-2"', 'className="flex flex-col items-center justify-center gap-2 p-5"'),
        ('w-8 h-8', 'h-6 w-6'),
        ('<Page \n                    pageNumber={pageNumber} \n                    width={500}', '<Page \n                    pageNumber={pageNumber} \n                    width={460}'),
        ('w-12 h-12 text-muted-foreground', 'h-7 w-7 text-muted-foreground'),
    ],
    "apps/web/src/modules/crm/customers/components/CustomerDetailsModal.tsx": [
        ('p-4 rounded-lg', 'rounded-md p-3'),
        ('grid grid-cols-2 gap-4', 'grid grid-cols-2 gap-3'),
        ('flex items-center justify-center py-8', 'flex items-center justify-center py-6'),
        ('border rounded-lg p-8 text-center', 'rounded-md border p-5 text-center'),
        ('"p-4 rounded-lg border"', '"rounded-md border p-3"'),
        ('w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold', 'flex h-7 w-7 items-center justify-center rounded-md text-[10px] font-semibold'),
        ('flex items-center gap-3 p-4 rounded-lg bg-muted/30', 'flex items-center gap-2.5 rounded-md bg-muted/30 p-3'),
        ('py-8', 'py-6'),
        ('p-8', 'p-5'),
        ('w-12 h-12', 'h-8 w-8'),
    ],
    "apps/web/src/modules/crm/customers/components/CustomerDetailsChrome.tsx": [
        ('w-14 h-14', 'h-9 w-9'),
        ('rounded-full', 'rounded-md'),
    ],
    "apps/web/src/modules/crm/customers/components/CustomerChatTab.tsx": [
        ('w-12 h-12', 'h-8 w-8'),
        ('rounded-full', 'rounded-md'),
    ],
    "apps/web/src/modules/jobs/components/JobDetailsModal.tsx": [
        ('h-12 w-12', 'h-8 w-8'),
        ('h-14', 'h-9'),
        ('rounded-full', 'rounded-md'),
    ],
}

changed = []
for name, replacements in CHANGES.items():
    path = Path(name)
    if not path.exists():
        continue
    text = path.read_text()
    original = text
    for old, new in replacements:
        text = text.replace(old, new)
    if text != original:
        path.write_text(text)
        changed.append(name)

print("FINAL_HOTSPOTS_CHANGED", len(changed))
for item in changed:
    print(item)
