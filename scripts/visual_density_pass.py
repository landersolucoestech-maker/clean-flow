from pathlib import Path

REPLACEMENTS = {
    "apps/web/src/modules/transactions/pages/TransactionsPage.tsx": [
        ('contentClassName="space-y-4"', 'contentClassName="space-y-3"'),
        ('grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5', 'grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-5'),
        ('className="border-border/80 shadow-sm"', 'className="border-border/90 shadow-none"'),
        ('<CardContent className="p-4">', '<CardContent className="p-3.5">'),
        ('text-2xl font-bold tracking-tight', 'text-lg font-semibold tracking-tight'),
        ('flex flex-col gap-3 rounded-lg border border-border bg-card p-3 lg:flex-row lg:flex-wrap lg:items-center', 'flex flex-col gap-2.5 rounded-md border border-border bg-card p-2.5 lg:flex-row lg:flex-wrap lg:items-center'),
        ('min-w-[820px] items-center gap-4 border-b border-border bg-surface-muted/80 px-6 py-3', 'min-w-[820px] items-center gap-3 border-b border-border bg-muted/30 px-3 py-2.5'),
        ('min-w-[820px] items-center gap-4 px-6 py-4 transition-colors', 'min-w-[820px] items-center gap-3 px-3 py-2.5 transition-colors'),
        ('text-center py-12 text-muted-foreground', 'text-center py-9 text-sm text-muted-foreground'),
        ('text-sm font-medium text-muted-foreground', 'text-[11px] font-medium text-muted-foreground'),
    ],
    "apps/web/src/modules/schedule/pages/SchedulePage.tsx": [
        ('contentClassName="gap-4"', 'contentClassName="gap-3"'),
        ('<Button variant="outline" onClick={() => setFilterModal(true)}>', '<Button variant="outline" size="sm" onClick={() => setFilterModal(true)}>'),
        ('<Button variant="destructive"\n                    onClick', '<Button variant="destructive" size="sm"\n                    onClick'),
        ('<Button variant="outline" onClick={toggleSelectionMode}>', '<Button variant="outline" size="sm" onClick={toggleSelectionMode}>'),
    ],
    "apps/web/src/modules/communications/pages/CommunicationsPage.tsx": [
        ('contentClassName="gap-0 pb-4"', 'contentClassName="gap-0 pb-3.5"'),
        ('overflow-hidden rounded-lg border border-border bg-card', 'overflow-hidden rounded-md border border-border bg-card'),
        ('border-b border-border/80 p-4', 'border-b border-border/80 p-3'),
        ('rounded-md px-3 py-2.5 text-left text-sm', 'rounded-md px-2.5 py-2 text-left text-[13px]'),
        ('space-y-3 border-b border-border/80 p-3.5', 'space-y-2.5 border-b border-border/80 p-3'),
        ('mb-1 w-full rounded-md p-3 text-left', 'mb-1 w-full rounded-md p-2.5 text-left'),
        ('flex min-h-16 items-center justify-between gap-3 border-b border-border/80 px-4 py-3 sm:px-5', 'flex min-h-14 items-center justify-between gap-3 border-b border-border/80 px-3 py-2.5 sm:px-4'),
        ('mx-auto flex w-full max-w-4xl flex-col gap-3 p-4 sm:p-6', 'mx-auto flex w-full max-w-4xl flex-col gap-2.5 p-3 sm:p-4'),
        ('max-w-[82%] rounded-lg px-4 py-2.5 text-sm', 'max-w-[82%] rounded-md px-3 py-2 text-[13px]'),
        ('border-t border-border/80 bg-card p-3 sm:p-4', 'border-t border-border/80 bg-card p-2.5 sm:p-3'),
        ('space-y-5 p-4', 'space-y-4 p-3'),
    ],
    "apps/web/src/modules/payroll/pages/PayrollPage.tsx": [
        ('<div className="space-y-4">', '<div className="space-y-3">'),
        ('<CardContent className="p-4">', '<CardContent className="p-3.5">'),
        ('flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-end', 'flex flex-col gap-2.5 lg:flex-row lg:flex-wrap lg:items-end'),
        ('space-y-2 lg:min-w-[250px]', 'space-y-1.5 lg:min-w-[220px]'),
        ('space-y-2 lg:min-w-[150px]', 'space-y-1.5 lg:min-w-[140px]'),
        ('<div className="space-y-2">\n                  <Label>{t("payroll.startDate")}', '<div className="space-y-1.5">\n                  <Label>{t("payroll.startDate")}'),
        ('<div className="space-y-2">\n                  <Label>{t("payroll.endDate")}', '<div className="space-y-1.5">\n                  <Label>{t("payroll.endDate")}'),
        ('className="w-full justify-start text-left font-normal lg:w-[200px]"', 'className="w-full justify-start text-left font-normal lg:w-[170px]"'),
        ('<CardHeader className="pb-3">', '<CardHeader className="pb-2">'),
        ('<CardTitle className="text-base font-semibold tracking-tight">', '<CardTitle className="text-sm font-semibold tracking-tight">'),
        ('<CardContent className="px-4 pb-4">', '<CardContent className="px-3.5 pb-3.5">'),
        ('className="text-center text-muted-foreground py-8"', 'className="py-6 text-center text-xs text-muted-foreground"'),
    ],
    "apps/web/src/modules/billing/pages/BillingPage.tsx": [
        ('<div className="space-y-4">', '<div className="space-y-3">'),
        ('grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4', 'grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-4'),
        ('<CardContent className="p-4">', '<CardContent className="p-3.5">'),
        ('text-2xl font-bold text-foreground', 'text-lg font-semibold text-foreground'),
        ('text-sm font-medium text-muted-foreground', 'text-[11px] font-medium text-muted-foreground'),
        ('text-sm text-warning', 'text-[11px] text-warning'),
        ('text-sm text-primary', 'text-[11px] text-primary'),
        ('text-sm text-success', 'text-[11px] text-success'),
        ('text-sm text-destructive', 'text-[11px] text-destructive'),
        ('p-3 bg-warning/10 rounded-lg', 'flex h-8 w-8 items-center justify-center rounded-md bg-warning/10'),
        ('p-3 bg-primary/10 rounded-lg', 'flex h-8 w-8 items-center justify-center rounded-md bg-primary/10'),
        ('p-3 bg-success/10 rounded-lg', 'flex h-8 w-8 items-center justify-center rounded-md bg-success/10'),
        ('p-3 bg-destructive/10 rounded-lg', 'flex h-8 w-8 items-center justify-center rounded-md bg-destructive/10'),
        ('w-6 h-6 text-warning', 'h-4 w-4 text-warning'),
        ('w-6 h-6 text-primary', 'h-4 w-4 text-primary'),
        ('w-6 h-6 text-success', 'h-4 w-4 text-success'),
        ('w-6 h-6 text-destructive', 'h-4 w-4 text-destructive'),
        ('mb-3 flex items-center gap-3', 'mb-2.5 flex items-center gap-2.5'),
        ('text-center py-8', 'py-6 text-center'),
    ],
}

changed = []
for file_name, replacements in REPLACEMENTS.items():
    path = Path(file_name)
    text = path.read_text()
    original = text
    for old, new in replacements:
        text = text.replace(old, new)
    if text != original:
        path.write_text(text)
        changed.append(file_name)

print("VISUAL_DENSITY_CHANGED", len(changed))
for item in changed:
    print(item)
