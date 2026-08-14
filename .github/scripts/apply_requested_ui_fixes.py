from pathlib import Path


def replace_once(path: str, old: str, new: str):
    p = Path(path)
    text = p.read_text(encoding="utf-8")
    if old not in text:
        raise SystemExit(f"Expected block not found in {path}: {old[:100]!r}")
    p.write_text(text.replace(old, new, 1), encoding="utf-8")

# Schedule: main Create Job action belongs in the global header.
schedule = "apps/web/src/modules/schedule/pages/SchedulePage.tsx"
replace_once(
    schedule,
    'import { Plus, Upload, Download, Loader2, Trash2, CheckSquare, X, Filter } from "lucide-react";',
    'import { Plus, Upload, Download, Loader2, Trash2, CheckSquare, X, Filter, MoreHorizontal } from "lucide-react";\nimport { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";',
)
replace_once(
    schedule,
    '    <PageLayout fullHeight contentClassName="gap-4">',
    '''    <PageLayout
      fullHeight
      contentClassName="gap-4"
      headerActions={
        <Button variant="hero" size="sm" onClick={handleNewAppointment}>
          <Plus className="mr-2 h-4 w-4" />
          {t("common.createJob")}
        </Button>
      }
    >''',
)
old_schedule_buttons = '''                  <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={importJobs.isPending}>
                    {importJobs.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        {t("common.importing")}
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 mr-2" />
                        {t("common.import")}
                      </>
                    )}
                  </Button>

                  <Button variant="outline" onClick={handleExportExcel} disabled={isLoading}>
                    <Download className="w-4 h-4 mr-2" />
                    {t("common.exportExcel")}
                  </Button>

                  <Button variant="hero" className="flex items-center gap-2" onClick={handleNewAppointment}>
                    <Plus className="w-4 h-4" />
                    <span>{t("common.createJob")}</span>
                  </Button>'''
new_schedule_buttons = '''                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="icon" aria-label="Schedule data tools">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => fileInputRef.current?.click()} disabled={importJobs.isPending}>
                        {importJobs.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                        {importJobs.isPending ? t("common.importing") : t("common.import")}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => void handleExportExcel()} disabled={isLoading}>
                        <Download className="mr-2 h-4 w-4" />
                        {t("common.exportExcel")}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <Button variant="hero" className="md:hidden" onClick={handleNewAppointment}>
                    <Plus className="mr-2 h-4 w-4" />
                    {t("common.createJob")}
                  </Button>'''
replace_once(schedule, old_schedule_buttons, new_schedule_buttons)
replace_once(
    schedule,
    '          <div className="mb-4 flex shrink-0 flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">',
    '          <div className="flex shrink-0 flex-col gap-4 border-b border-border/60 pb-4 lg:flex-row lg:items-end lg:justify-between">',
)

# Transactions: Regras + Nova Transação in global header; Export becomes a data-toolbar action.
transactions = "apps/web/src/modules/transactions/pages/TransactionsPage.tsx"
old_return = '''  return (
    <PageLayout>
      {/* Page Header */}
      <PageHeader
        title={t("transactions.title")}
        description="Controle financeiro e fluxo de caixa"
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => navigate("/rules")}>
              <Settings2 className="w-4 h-4 mr-2" />
              Regras
            </Button>
            <Button variant="outline" size="sm" onClick={handleExport} disabled={filteredTransactions.length === 0}>
              <Download className="w-4 h-4 mr-2" />
              Exportar
            </Button>
            <Button onClick={() => setShowNewTransactionModal(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Nova Transação
            </Button>
          </>
        }
      />'''
new_return = '''  const primaryActions = (
    <>
      <Button variant="outline" size="sm" onClick={() => navigate("/rules")}>
        <Settings2 className="mr-2 h-4 w-4" />
        Regras
      </Button>
      <Button size="sm" onClick={() => setShowNewTransactionModal(true)}>
        <Plus className="mr-2 h-4 w-4" />
        Nova Transação
      </Button>
    </>
  );

  return (
    <PageLayout headerActions={primaryActions} contentClassName="space-y-7">
      {/* Page Header */}
      <PageHeader title={t("transactions.title")} description="Controle financeiro e fluxo de caixa" />
      <div className="flex flex-wrap gap-2 md:hidden">{primaryActions}</div>'''
replace_once(transactions, old_return, new_return)
replace_once(
    transactions,
    '        <FilterSelect value={categoryFilter} onValueChange={setCategoryFilter} options={categoryOptions} className="w-full sm:w-[160px]" />\n      </div>',
    '''        <FilterSelect value={categoryFilter} onValueChange={setCategoryFilter} options={categoryOptions} className="w-full sm:w-[160px]" />
        <Button variant="outline" size="sm" className="lg:ml-auto" onClick={handleExport} disabled={filteredTransactions.length === 0}>
          <Download className="mr-2 h-4 w-4" />
          Exportar dados
        </Button>
      </div>''',
)

# CRM Customers: Add Customer becomes a global primary action; import/export move into secondary data tools.
customers = "apps/web/src/modules/crm/customers/pages/CustomersPageContent.tsx"
replace_once(
    customers,
    '  return <PageLayout>\n      <div className="space-y-6">',
    '''  return <PageLayout
      headerActions={
        <Button variant="hero" size="sm" onClick={() => setIsCustomerModalOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          {t("customers.addCustomer")}
        </Button>
      }
      contentClassName="space-y-7"
    >
      <div className="space-y-6">''',
)
old_customer_actions = '''            <div className="flex flex-wrap items-center gap-2 lg:justify-end">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImportExcel}
                accept=".xlsx,.csv"
                className="hidden"
              />
              <Button 
                variant="outline" 
                onClick={() => fileInputRef.current?.click()}
                disabled={importCustomers.isPending}
              >
                {importCustomers.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {t("common.importing")}
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    {t("common.import")}
                  </>
                )}
              </Button>
              <Button variant="outline" onClick={handleExportExcel}>
                <Download className="w-4 h-4 mr-2" />
                {t("common.exportExcel")}
              </Button>
              <Button variant="hero" className="flex items-center gap-2" onClick={() => setIsCustomerModalOpen(true)}>
                <Plus className="w-4 h-4" />
                <span>{t("customers.addCustomer")}</span>
              </Button>
            </div>'''
new_customer_actions = '''            <div className="md:hidden">
              <Button variant="hero" onClick={() => setIsCustomerModalOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                {t("customers.addCustomer")}
              </Button>
            </div>'''
replace_once(customers, old_customer_actions, new_customer_actions)
replace_once(
    customers,
    '            <Select value={statusFilter} onValueChange={setStatusFilter}>',
    '''            <input type="file" ref={fileInputRef} onChange={handleImportExcel} accept=".xlsx,.csv" className="hidden" />
            <Select value={statusFilter} onValueChange={setStatusFilter}>''',
)
replace_once(
    customers,
    '''              </SelectContent>
            </Select>
          </div>

          {/* Customer Directory */}''',
    '''              </SelectContent>
            </Select>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" aria-label="Customer data tools">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => fileInputRef.current?.click()} disabled={importCustomers.isPending}>
                  {importCustomers.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                  {importCustomers.isPending ? t("common.importing") : t("common.import")}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => void handleExportExcel()}>
                  <Download className="mr-2 h-4 w-4" />
                  {t("common.exportExcel")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Customer Directory */}''',
)

print("UI fixes applied")
