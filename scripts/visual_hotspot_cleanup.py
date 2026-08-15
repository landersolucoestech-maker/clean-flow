from pathlib import Path

CHANGES = {
    "apps/web/src/modules/support/pages/SupportPage.tsx": [
        ('<div className="space-y-4">', '<div className="space-y-3">'),
        ('grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4', 'grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-4'),
        ('className="flex items-center gap-4 p-5"', 'className="flex items-center gap-3 p-3.5"'),
        ('flex h-12 w-12 items-center justify-center rounded-full', 'flex h-8 w-8 items-center justify-center rounded-md'),
        ('className="h-6 w-6', 'className="h-4 w-4'),
        ('className="text-2xl font-bold"', 'className="text-lg font-semibold leading-6"'),
        ('className="text-sm text-muted-foreground"', 'className="text-xs text-muted-foreground"'),
        ('<TabsContent value="tickets" className="space-y-4">', '<TabsContent value="tickets" className="space-y-3">'),
        ('flex flex-col gap-3 rounded-lg border border-border bg-card p-3 sm:flex-row', 'flex flex-col gap-2.5 rounded-md border border-border bg-card p-2.5 sm:flex-row'),
    ],
    "apps/web/src/modules/dashboard/components/RecentActivity.tsx": [
        ('className="border-border/80 shadow-sm transition-shadow hover:shadow-md"', 'className="border-border/90 shadow-none"'),
        ('<CardHeader className="pb-3">', '<CardHeader className="pb-2">'),
        ('<CardTitle className="text-base font-semibold tracking-tight">', '<CardTitle className="text-sm font-semibold tracking-tight">'),
        ('className="flex items-center justify-center py-12"', 'className="flex items-center justify-center py-8"'),
        ('<CardContent className="space-y-3">', '<CardContent className="space-y-2">'),
        ('className="text-center py-8 text-muted-foreground"', 'className="py-6 text-center text-xs text-muted-foreground"'),
        ('rounded-xl border border-transparent p-2.5', 'rounded-md border border-transparent p-2'),
        ('flex h-9 w-9 shrink-0 items-center justify-center rounded-full', 'flex h-7 w-7 shrink-0 items-center justify-center rounded-md'),
        ('className="text-sm font-medium text-foreground"', 'className="text-[13px] font-medium text-foreground"'),
    ],
    "apps/web/src/modules/dashboard/components/UpcomingJobs.tsx": [
        ('className="border-border/80 shadow-sm transition-shadow hover:shadow-md"', 'className="border-border/90 shadow-none"'),
        ('className="flex flex-row items-center justify-between gap-3 pb-3"', 'className="flex flex-row items-center justify-between gap-3 pb-2"'),
        ('<CardTitle className="text-base font-semibold tracking-tight">', '<CardTitle className="text-sm font-semibold tracking-tight">'),
        ('className="flex items-center justify-center py-12"', 'className="flex items-center justify-center py-8"'),
        ('<CardContent className="space-y-3">', '<CardContent className="space-y-2">'),
        ('className="text-center py-8 text-muted-foreground"', 'className="py-6 text-center text-xs text-muted-foreground"'),
        ('flex items-center justify-between gap-4 rounded-xl border border-border/70 bg-card p-4 shadow-sm transition-colors', 'flex items-center justify-between gap-3 rounded-md border border-border/70 bg-card p-2.5 transition-colors'),
        ('className="space-y-1.5 text-sm text-muted-foreground"', 'className="space-y-1 text-xs text-muted-foreground"'),
        ('className="ml-4 flex-shrink-0"', 'className="ml-2 flex-shrink-0"'),
    ],
    "apps/web/src/modules/reports/components/AnalyticsTab.tsx": [
        ('<Card className="hover:shadow-lg transition-all duration-200">', '<Card className="border-border/90 shadow-none">'),
        ('<CardContent className="p-4">', '<CardContent className="p-3.5">'),
        ('className="p-2 bg-primary/10 rounded-lg shrink-0"', 'className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/10"'),
        ('className="text-sm text-muted-foreground font-medium"', 'className="text-[11px] font-medium text-muted-foreground"'),
        ('className="text-xl font-bold text-foreground mt-1"', 'className="mt-0.5 text-lg font-semibold text-foreground"'),
        ('<div className="flex items-center justify-center py-12">', '<div className="flex items-center justify-center py-8">'),
        ('<div className="space-y-8">', '<div className="space-y-4">'),
        ('className="bg-gradient-to-br from-primary/5 via-primary/10 to-primary/5 border-primary/20"', 'className="border-primary/20 bg-primary/[0.035] shadow-none"'),
        ('<Trophy className="w-6 h-6 text-primary" />', '<Trophy className="h-4 w-4 text-primary" />'),
        ('<CardTitle className="text-xl">', '<CardTitle className="text-sm">'),
        ('flex flex-col md:flex-row md:items-center gap-6', 'flex flex-col gap-4 md:flex-row md:items-center'),
        ('<div className="flex items-center gap-6">', '<div className="flex items-center gap-4">'),
        ('w-32 h-32 rounded-full border-8 border-primary/20 flex items-center justify-center bg-background', 'flex h-20 w-20 items-center justify-center rounded-md border border-primary/20 bg-background'),
        ('className="text-4xl font-bold text-primary"', 'className="text-2xl font-semibold text-primary"'),
        ('className="flex flex-wrap gap-2 mt-3"', 'className="mt-2 flex flex-wrap gap-1.5"'),
        ('className="flex items-center gap-2 mb-4"', 'className="mb-2.5 flex items-center gap-2"'),
    ],
    "apps/web/src/modules/settings/components/ProfileSettingsSection.tsx": [
        ('<CardContent className="space-y-6">', '<CardContent className="space-y-3">'),
        ('<div className="flex items-center gap-4">', '<div className="flex items-center gap-3">'),
        ('flex h-16 w-16 items-center justify-center rounded-full bg-muted text-2xl', 'flex h-9 w-9 items-center justify-center rounded-md bg-muted text-sm'),
        ('grid grid-cols-1 gap-6 md:grid-cols-2', 'grid grid-cols-1 gap-3 md:grid-cols-2'),
        ('<div className="space-y-2">', '<div className="space-y-1.5">'),
        ('<div className="max-w-md space-y-2">', '<div className="max-w-md space-y-1.5">'),
    ],
    "apps/web/src/modules/settings/components/TeamSettingsSection.tsx": [
        ('space-y-6', 'space-y-3'),
        ('py-8', 'py-6'),
    ],
    "apps/web/src/modules/settings/components/SecuritySettingsSection.tsx": [
        ('space-y-6', 'space-y-3'),
    ],
    "apps/web/src/modules/settings/components/NotificationSettingsSection.tsx": [
        ('space-y-6', 'space-y-3'),
    ],
    "apps/web/src/modules/settings/components/IntegrationsTab.tsx": [
        ('space-y-6', 'space-y-3'),
    ],
    "apps/web/src/modules/settings/components/IntegrationsTabContent.tsx": [
        ('gap-6', 'gap-3'),
    ],
    "apps/web/src/modules/settings/components/AuditTab.tsx": [
        ('space-y-6', 'space-y-3'),
        ('<CardContent className="p-6">', '<CardContent className="p-3.5">'),
        ('text-2xl', 'text-lg'),
        ('w-12 h-12', 'h-8 w-8'),
    ],
    "apps/web/src/modules/schedule/components/JobStatusTracker.tsx": [
        ('p-8', 'p-5'),
        ('p-6', 'p-4'),
        ('h-12 w-12', 'h-8 w-8'),
        ('transition-all', 'transition-colors'),
    ],
    "apps/web/src/modules/payroll/components/CalculatePayrollModal.tsx": [
        ('py-12', 'py-8'),
    ],
    "apps/web/src/modules/payroll/components/PayrollRulesModal.tsx": [
        ('p-6', 'p-4'),
        ('space-y-6', 'space-y-3'),
        ('text-2xl', 'text-lg'),
        ('min-h-[500px]', 'min-h-[360px]'),
    ],
    "apps/web/src/modules/transactions/pages/RulesPage.tsx": [
        ('gap-6', 'gap-3'),
        ('py-8', 'py-6'),
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

print("VISUAL_HOTSPOTS_CHANGED", len(changed))
for item in changed:
    print(item)
