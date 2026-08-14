from pathlib import Path
import re


def read(path: str) -> str:
    return Path(path).read_text()


def write(path: str, text: str) -> None:
    Path(path).write_text(text)


# Billing: global route header owns title/actions; body starts at KPI/data workspace.
path = "apps/web/src/modules/billing/pages/BillingPage.tsx"
text = read(path)
text = text.replace(
    '    <PageLayout>\n      <div className="space-y-6">',
    '''    <PageLayout
      headerActions={
        <>
          {qbConnected && (
            <Button variant="outline" size="sm" onClick={handleSyncWithQB} disabled={syncInvoices.isPending}>
              <RefreshCw className={`mr-2 h-4 w-4 ${syncInvoices.isPending ? "animate-spin" : ""}`} />
              Sync QuickBooks
            </Button>
          )}
          <Button size="sm" onClick={() => setCreateInvoiceOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            <span>{t("billing.createInvoice")}</span>
          </Button>
        </>
      }
    >
      <div className="space-y-4">''',
    1,
)
text = re.sub(
    r'\n\s*\{\/\* Page Header \*\/\}.*?\n\s*\{\/\* Modals \*\/\}',
    '\n\n          {/* Modals */}',
    text,
    count=1,
    flags=re.S,
)
text = text.replace('grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4', 'grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4', 1)
text = text.replace('className="p-6"', 'className="p-4"')
text = text.replace('className="flex items-center gap-4 mb-6"', 'className="mb-3 flex items-center gap-3"')
write(path, text)

# Payroll: route header owns title; keep secondary actions as a compact toolbar.
path = "apps/web/src/modules/payroll/pages/PayrollPage.tsx"
text = read(path)
text = text.replace('return <PageLayout>\n      <div className="space-y-6">', 'return <PageLayout>\n      <div className="space-y-4">', 1)
text = text.replace(
    '''          {/* Page Title */}
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">{t("payroll.title")}</h1>
            <div className="flex flex-wrap gap-2 lg:justify-end">''',
    '''          {/* Payroll actions */}
          <div className="flex flex-wrap justify-end gap-2">''',
    1,
)
text = text.replace(
    '''            </div>
          </div>

          {/* Filter Card */}''',
    '''          </div>

          {/* Filter Card */}''',
    1,
)
text = text.replace('<Card className="border-border/80 shadow-sm">', '<Card>')
text = text.replace('flex flex-col gap-4 lg:flex-row lg:flex-wrap lg:items-end', 'flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-end')
write(path, text)

# Reports: remove duplicate title block; retain export as compact toolbar.
path = "apps/web/src/modules/reports/pages/ReportsPage.tsx"
text = read(path)
text = text.replace('<div className="space-y-6">', '<div className="space-y-4">', 1)
text = re.sub(
    r'(\s*\{\/\* Page Header \*\/\}\s*<div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">)\s*<div>\s*<h1.*?</h1>\s*<p.*?</p>\s*</div>',
    '\n          {/* Report actions */}\n          <div className="flex justify-end">',
    text,
    count=1,
    flags=re.S,
)
write(path, text)

# Settings: route header is already descriptive; internal header was redundant.
path = "apps/web/src/modules/settings/pages/SettingsPage.tsx"
text = read(path)
text = text.replace('<div className="space-y-6">', '<div className="space-y-4">', 1)
text = re.sub(
    r'\s*\{\/\* Header \*\/\}\s*<div>\s*<h1.*?</h1>\s*<p.*?</p>\s*</div>\s*',
    '\n',
    text,
    count=1,
    flags=re.S,
)
write(path, text)

# Support: action belongs to route header; remove duplicate PageHeader and soften workspace density.
path = "apps/web/src/modules/support/pages/SupportPage.tsx"
text = read(path)
text = text.replace('import { PageHeader } from "@/components/shared/PageHeader";\n', '')
text = text.replace(
    '''    <PageLayout>
      <div className="space-y-6">
        <PageHeader
          title={t("support.title")}
          description={t("support.page_description")}
          actions={
            <Button onClick={() => setShowCreateModal(true)}>
              <Plus className="w-4 h-4 mr-2" />
              {t("support.new_ticket")}
            </Button>
          }
        />
''',
    '''    <PageLayout
      headerActions={
        <Button size="sm" onClick={() => setShowCreateModal(true)}>
          <Plus className="mr-2 h-4 w-4" />
          {t("support.new_ticket")}
        </Button>
      }
    >
      <div className="space-y-4">
''',
    1,
)
text = text.replace('grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4', 'grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4', 1)
text = text.replace('<Card className="border-border/80 shadow-sm">', '<Card>')
text = text.replace('flex flex-col gap-3 rounded-2xl border border-border/80 bg-card p-4 shadow-sm sm:flex-row sm:items-center', 'flex flex-col gap-3 rounded-lg border border-border bg-card p-3 sm:flex-row sm:items-center')
text = text.replace('<Card className="overflow-hidden border-border/80 shadow-sm">', '<Card className="overflow-hidden">')
write(path, text)
