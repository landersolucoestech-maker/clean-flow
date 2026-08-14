import { useState, useRef } from "react";
import { PageLayout } from "@/components/layout/PageLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Plus, Search, MoreHorizontal, UserPlus, Users, UserCheck, UserX, Repeat, Eye, Pencil, Trash2, LayoutGrid, List, Phone, Mail, MapPin, Upload, Download, Loader2 } from "lucide-react";
import { CustomerModal } from "@/components/customers/CustomerModal";
import { CustomerDetailsModal } from "@/components/customers/CustomerDetailsModal";
import { useCustomers, useDeleteCustomer, useBulkDeleteCustomers, useImportCustomers, Customer, ImportedCustomerRow } from "@/hooks/useCustomers";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/useLanguage";
import { readSpreadsheetFile } from "@/lib/spreadsheet";
import { CrmTabs } from "../../components/CrmTabs";

export function Customers() {
  const { t } = useLanguage();
  const [searchTerm, setSearchTerm] = useState("");
  const [searchField, setSearchField] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [customerToEdit, setCustomerToEdit] = useState<Customer | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const { data: customers = [], isLoading, error } = useCustomers();
  const deleteCustomer = useDeleteCustomer();
  const bulkDeleteCustomers = useBulkDeleteCustomers();
  const importCustomers = useImportCustomers();

  const handleViewDetails = (customer: Customer) => {
    setSelectedCustomer(customer);
    setIsDetailsModalOpen(true);
  };

  const handleEdit = (customer: Customer) => {
    setCustomerToEdit(customer);
    setIsEditModalOpen(true);
  };

  const handleDelete = (customer: Customer) => {
    deleteCustomer.mutate(customer.id);
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExportExcel = async () => {
    // Map source values to readable labels
    const sourceLabels: Record<string, string> = {
      "website": "Website",
      "phone": "Phone",
      "google": "Google",
      "facebook": "Facebook",
      "instagram": "Instagram",
      "nextdoor": "Nextdoor",
      "walk-in": "Walk-in",
      "referral": "Referral",
    };

    // Map frequency values to readable labels using centralized enums
    // New values are stored as-is (e.g., "Weekly", "Regular Cleaning 2 Weeks")
    // Legacy values are mapped to new standardized values
    const frequencyLabels: Record<string, string> = {
      // New standardized values (value = display)
      "Daily": "Daily",
      "Weekly": "Weekly",
      "Regular Cleaning 2 Weeks": "Regular Cleaning 2 Weeks",
      "Regular Cleaning 3 Weeks": "Regular Cleaning 3 Weeks",
      "Regular Cleaning 4 Weeks": "Regular Cleaning 4 Weeks",
      // "Once a Month" removed - use "Regular Cleaning 4 Weeks" instead
      "One-Time": "One-Time",
      // Legacy values for backwards compatibility
      "one-time": "One-Time",
      "daily": "Daily",
      "weekly": "Weekly",
      "every-2-weeks": "Regular Cleaning 2 Weeks",
      "every-3-weeks": "Regular Cleaning 3 Weeks",
      "every-4-weeks": "Regular Cleaning 4 Weeks",
      "every-other-day": "Every Other Day",
      "every-5-weeks": "Every 5 Weeks",
      "every-6-weeks": "Every 6 Weeks",
      "every-7-weeks": "Every 7 Weeks",
      "every-8-weeks": "Every 8 Weeks",
      "first-of-month": "First of Month",
      "second-of-month": "Second of Month",
      "third-of-month": "Third of Month",
      "fourth-of-month": "Fourth of Month",
      "last-of-month": "Last of Month",
    };

    // Map day values to readable labels
    const dayLabels: Record<string, string> = {
      "monday": "Monday",
      "tuesday": "Tuesday",
      "wednesday": "Wednesday",
      "thursday": "Thursday",
      "friday": "Friday",
      "saturday": "Saturday",
      "sunday": "Sunday",
    };

    const exportData = customers.map(customer => {
      const nameParts = customer.name.split(" ");
      const firstName = nameParts[0] || "";
      const lastName = nameParts.slice(1).join(" ") || "";

      // Parse source and referral name
      let sourceValue = customer.source || "";
      let referralName = "";
      if (sourceValue.startsWith("referral:")) {
        referralName = sourceValue.replace("referral:", "");
        sourceValue = "referral";
      }

      const baseData: Record<string, string | number | null> = {
        "First Name": firstName,
        "Last Name": lastName,
        "Email": customer.email || "",
        "Phone 1": customer.phone || "",
        "Phone 2": customer.phone2 || "",
        "Status": customer.status || "",
        "Payment Method": customer.payment_method || "",
        "Source": sourceValue ? (sourceLabels[sourceValue] || sourceValue) : "",
        "Referral Name": referralName,
        "Customer Since": customer.customer_since || "",
        "Last Service": customer.last_service || "",
        "Total Jobs": customer.total_jobs || 0,
        "Revenue": customer.revenue || 0,
        "Rating": customer.rating || 0,
        "Notes": customer.notes || ""
      };

      // Add each address as separate columns
      customer.addresses?.forEach((addr, index) => {
        const num = index + 1;
        baseData[`Address ${num} - Name`] = addr.name || "";
        baseData[`Address ${num} - Street`] = addr.street || "";
        baseData[`Address ${num} - Complement`] = addr.complement || "";
        baseData[`Address ${num} - City`] = addr.city || "";
        baseData[`Address ${num} - State`] = addr.state || "";
        baseData[`Address ${num} - Postal Code`] = addr.postal_code || "";
        baseData[`Address ${num} - Frequency`] = addr.frequency ? (frequencyLabels[addr.frequency] || addr.frequency) : "";
        baseData[`Address ${num} - Preferred Day`] = addr.preferred_day ? (dayLabels[addr.preferred_day] || addr.preferred_day) : "";
        baseData[`Address ${num} - Notes`] = addr.notes || "";
        baseData[`Address ${num} - Additional Notes`] = addr.additional_notes || "";
      });

      return baseData;
    });

    const XLSX = await import("xlsx-js-style");
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Customers");
    
    // Auto-size columns
    const columnWidths = [
      { wch: 20 }, // First Name
      { wch: 20 }, // Last Name
      { wch: 30 }, // Email
      { wch: 15 }, // Phone 1
      { wch: 15 }, // Phone 2
      { wch: 10 }, // Status
      { wch: 15 }, // Payment Method
      { wch: 20 }, // Source
      { wch: 25 }, // Referral Name
      { wch: 12 }, // Customer Since
      { wch: 12 }, // Last Service
      { wch: 10 }, // Total Jobs
      { wch: 12 }, // Revenue
      { wch: 8 },  // Rating
      { wch: 40 }, // Notes
      { wch: 15 }, // Address 1 - Name
      { wch: 40 }, // Address 1 - Street
      { wch: 20 }, // Address 1 - Complement
      { wch: 20 }, // Address 1 - City
      { wch: 10 }, // Address 1 - State
      { wch: 12 }, // Address 1 - Postal Code
      { wch: 18 }, // Address 1 - Frequency
      { wch: 15 }, // Address 1 - Preferred Day
      { wch: 40 }, // Address 1 - Notes
      { wch: 40 }, // Address 1 - Additional Notes
    ];
    worksheet["!cols"] = columnWidths;

    XLSX.writeFile(workbook, `customers_${new Date().toISOString().split('T')[0]}.xlsx`);
    toast.success("Customer list exported successfully!");
  };

  const handleImportExcel = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
        const jsonData = await readSpreadsheetFile(file) as ImportedCustomerRow[];
        
        if (jsonData.length === 0) {
          toast.error("No data found in the file.");
          return;
        }

        // Validate that required columns exist (either First Name/Last Name or Name)
        const firstRow = jsonData[0];
        const hasFirstLastName = firstRow["First Name"] || firstRow["Last Name"];
        const hasName = firstRow["Name"];
        
        if (!hasFirstLastName && !hasName) {
          toast.error("Invalid file format. 'First Name'/'Last Name' or 'Name' column is required.");
          return;
        }

        // Import customers to database
        importCustomers.mutate(jsonData);
    } catch (error) {
      console.error("Import error:", error);
      toast.error(error instanceof Error ? error.message : "Error importing file. Please check the format.");
    }
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Filter customers
  const filteredCustomers = customers.filter(customer => {
    // Status filter
    if (statusFilter === "active" && customer.status !== "Active") return false;
    if (statusFilter === "inactive" && customer.status !== "Inactive") return false;
    
    // Search filter
    const search = searchTerm.toLowerCase();
    if (!searchTerm) return true;
    if (searchField === "all") {
      return (
        (customer.name || "").toLowerCase().includes(search) || 
        (customer.phone || "").toLowerCase().includes(search) || 
        (customer.email || "").toLowerCase().includes(search) || 
        (customer.address || "").toLowerCase().includes(search)
      );
    }
    if (searchField === "name") return (customer.name || "").toLowerCase().includes(search);
    if (searchField === "phone") return (customer.phone || "").toLowerCase().includes(search);
    if (searchField === "email") return (customer.email || "").toLowerCase().includes(search);
    if (searchField === "address") return (customer.address || "").toLowerCase().includes(search);
    return true;
  });

  // Selection handlers (must come after filteredCustomers is defined)
  const isAllSelected = filteredCustomers.length > 0 && selectedIds.size === filteredCustomers.length;
  const isSomeSelected = selectedIds.size > 0 && selectedIds.size < filteredCustomers.length;

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(filteredCustomers.map((c) => c.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    const next = new Set(selectedIds);
    if (checked) {
      next.add(id);
    } else {
      next.delete(id);
    }
    setSelectedIds(next);
  };

  const handleBulkDelete = () => {
    if (selectedIds.size === 0) return;
    const confirmed = window.confirm(`Are you sure you want to delete ${selectedIds.size} customer(s)? This action cannot be undone.`);
    if (confirmed) {
      bulkDeleteCustomers.mutate(Array.from(selectedIds), {
        onSuccess: () => setSelectedIds(new Set()),
      });
    }
  };

  // Stats - Real data calculations
  const activeCount = customers.filter(c => c.status === "Active").length;
  const inactiveCount = customers.filter(c => c.status === "Inactive").length;
  const totalCount = customers.length;
  
  // New customers this month
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  
  const newCustomersThisMonth = customers.filter(c => {
    if (!c.customer_since) return false;
    const customerDate = new Date(c.customer_since);
    return customerDate >= startOfMonth;
  }).length;
  
  const newCustomersThisWeek = customers.filter(c => {
    if (!c.customer_since) return false;
    const customerDate = new Date(c.customer_since);
    return customerDate >= startOfWeek;
  }).length;
  
  // Recurring customers (frequency not 'one-time' AND status Active)
  const recurringCount = customers.filter(c => 
    c.frequency && c.frequency !== "one-time" && c.status === "Active"
  ).length;
  
  // Percentages
  const activePercentage = totalCount > 0 ? ((activeCount / totalCount) * 100).toFixed(1) : "0";
  const inactivePercentage = totalCount > 0 ? ((inactiveCount / totalCount) * 100).toFixed(1) : "0";
  const recurringPercentage = activeCount > 0 ? ((recurringCount / activeCount) * 100).toFixed(1) : "0";

  if (isLoading) {
    return (
      <PageLayout>
        <div className="flex min-h-[50vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </PageLayout>
    );
  }

  return <PageLayout
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
          </section>

          {/* Customer Modal - Create */}
          <CustomerModal open={isCustomerModalOpen} onOpenChange={setIsCustomerModalOpen} mode="create" />

          {/* Customer Modal - Edit */}
          <CustomerModal open={isEditModalOpen} onOpenChange={setIsEditModalOpen} mode="edit" customer={customerToEdit} />

          {/* Customer Details Modal */}
          <CustomerDetailsModal open={isDetailsModalOpen} onOpenChange={setIsDetailsModalOpen} customer={selectedCustomer} />

          {/* Stats Cards */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <Card className="rounded-md border-border/80 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">{t("customers.newCustomers")}</p>
                    <p className="mt-2 text-2xl font-semibold tracking-tight text-foreground">{newCustomersThisMonth}</p>
                    <p className="text-xs text-success">+{newCustomersThisWeek} {t("common.thisWeek")}</p>
                  </div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-success/10">
                    <UserPlus className="w-5 h-5 text-success" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-md border-border/80 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">{t("customers.activeCustomers")}</p>
                    <p className="mt-2 text-2xl font-semibold tracking-tight text-foreground">{activeCount}</p>
                    <p className="text-xs text-success">{activePercentage}% {t("common.ofTotal")}</p>
                  </div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-light">
                    <UserCheck className="w-5 h-5 text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-md border-border/80 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">{t("customers.inactiveCustomers")}</p>
                    <p className="mt-2 text-2xl font-semibold tracking-tight text-foreground">{inactiveCount}</p>
                    <p className="text-xs text-muted-foreground">{inactivePercentage}% {t("common.ofTotal")}</p>
                  </div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10">
                    <UserX className="w-5 h-5 text-destructive" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-md border-border/80 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">{t("customers.totalCustomers")}</p>
                    <p className="mt-2 text-2xl font-semibold tracking-tight text-foreground">{totalCount}</p>
                    <p className="text-xs text-muted-foreground">{t("common.registered")}</p>
                  </div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary-light">
                    <Users className="w-5 h-5 text-foreground" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-md border-border/80 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">{t("customers.recurringCustomers")}</p>
                    <p className="mt-2 text-2xl font-semibold tracking-tight text-foreground">{recurringCount}</p>
                    <p className="text-xs text-success">{recurringPercentage}% {t("common.ofActive")}</p>
                  </div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-warning/10">
                    <Repeat className="w-5 h-5 text-warning" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <CrmTabs />

          {/* Customer workspace */}
          <Card className="overflow-hidden rounded-md border-border/80 shadow-sm">
            <CardHeader className="border-b border-border/70 px-5 py-4">
              <div className="flex flex-col gap-1">
                <CardTitle className="text-base">{t("customers.title")}</CardTitle>
                <p className="text-sm text-muted-foreground">Search, filter and manage the customer directory.</p>
              </div>
            </CardHeader>
            <div className="flex flex-col gap-3 border-b border-border/70 bg-muted/10 p-4 lg:flex-row lg:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder={searchField === "all" ? "Search by name, phone, email or address..." : searchField === "name" ? "Search by name..." : searchField === "phone" ? "Search by phone..." : searchField === "email" ? "Search by email..." : "Search by address..."} value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-10" />
            </div>
            <Select value={searchField} onValueChange={setSearchField}>
              <SelectTrigger className="w-full lg:w-[160px]">
                <SelectValue placeholder="Search by" />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border">
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="name">Name</SelectItem>
                <SelectItem value="phone">Phone</SelectItem>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="address">Address</SelectItem>
              </SelectContent>
            </Select>
            <input type="file" ref={fileInputRef} onChange={handleImportExcel} accept=".xlsx,.csv" className="hidden" />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full lg:w-[140px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border">
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
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

            <CardHeader className="flex flex-row items-center justify-between gap-3 border-b border-border/60 px-5 py-3">
              <CardTitle className="text-sm font-semibold">{t("customers.contactList")}</CardTitle>
              {selectedIds.size > 0 && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleBulkDelete}
                  disabled={bulkDeleteCustomers.isPending}
                >
                  {bulkDeleteCustomers.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4 mr-2" />
                  )}
                  {t("common.deleteSelected")} ({selectedIds.size})
                </Button>
              )}
            </CardHeader>
            <CardContent className="p-0">
              {viewMode === "table" ? (/* Customer Table */
            <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[40px]">
                        <Checkbox
                          checked={isAllSelected}
                          onCheckedChange={(checked) => handleSelectAll(!!checked)}
                          aria-label="Select all"
                          className={isSomeSelected ? "data-[state=checked]:bg-primary/50" : ""}
                        />
                      </TableHead>
                      <TableHead>{t("common.customer")}</TableHead>
                      <TableHead>{t("common.contact")}</TableHead>
                      <TableHead>{t("common.location")}</TableHead>
                      <TableHead>{t("common.paymentType")}</TableHead>
                      <TableHead>{t("common.status")}</TableHead>
                      <TableHead>{t("customers.lastService")}</TableHead>
                      <TableHead>{t("customers.totalJobs")}</TableHead>
                      <TableHead>{t("common.actions")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCustomers.map(customer => <TableRow key={customer.id} className={selectedIds.has(customer.id) ? "bg-muted/50" : ""}>
                        <TableCell className="w-[40px]">
                          <Checkbox
                            checked={selectedIds.has(customer.id)}
                            onCheckedChange={(checked) => handleSelectOne(customer.id, !!checked)}
                            aria-label={`Select ${customer.name}`}
                          />
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{customer.name}</div>
                            
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="text-sm">{customer.email}</div>
                            <div className="text-sm text-muted-foreground">{customer.phone}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">{customer.address}</div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">{customer.payment_method}</div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={customer.status === "Active" ? "default" : "secondary"}>
                            {customer.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{customer.last_service || "-"}</TableCell>
                        <TableCell>{customer.total_jobs || 0}</TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" aria-label="Customer actions">
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="bg-popover border-border">
                              <DropdownMenuItem className="flex items-center gap-2 cursor-pointer" onClick={() => handleViewDetails(customer)}>
                                <Eye className="w-4 h-4" />
                                {t("common.viewDetails")}
                              </DropdownMenuItem>
                              <DropdownMenuItem className="flex items-center gap-2 cursor-pointer" onClick={() => handleEdit(customer)}>
                                <Pencil className="w-4 h-4" />
                                {t("common.edit")}
                              </DropdownMenuItem>
                              <DropdownMenuItem className="flex items-center gap-2 cursor-pointer text-destructive" onClick={() => handleDelete(customer)}>
                                <Trash2 className="w-4 h-4" />
                                {t("common.delete")}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>)}
                  </TableBody>
                </Table>) : (/* Customer Grid */
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {filteredCustomers.map(customer => <Card key={customer.id} className="relative border-border/80 shadow-sm transition-shadow hover:shadow-md">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-light">
                              <span className="text-primary font-semibold text-sm">
                                {(customer.name || "").split(' ').map(n => n[0]).join('').slice(0, 2) || "?"}
                              </span>
                            </div>
                            <div>
                              <h3 className="font-medium text-foreground">{customer.name || "Unknown"}</h3>
                              <div className="text-xs text-muted-foreground">
                                {"★".repeat(customer.rating)}
                              </div>
                            </div>
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Customer actions">
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="bg-popover border-border">
                              <DropdownMenuItem className="flex items-center gap-2 cursor-pointer" onClick={() => handleViewDetails(customer)}>
                                <Eye className="w-4 h-4" />
                                {t("common.viewDetails")}
                              </DropdownMenuItem>
                              <DropdownMenuItem className="flex items-center gap-2 cursor-pointer" onClick={() => handleEdit(customer)}>
                                <Pencil className="w-4 h-4" />
                                {t("common.edit")}
                              </DropdownMenuItem>
                              <DropdownMenuItem className="flex items-center gap-2 cursor-pointer text-destructive" onClick={() => handleDelete(customer)}>
                                <Trash2 className="w-4 h-4" />
                                {t("common.delete")}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                        <div className="space-y-2 text-sm">
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Mail className="w-4 h-4" />
                            <span className="truncate">{customer.email}</span>
                          </div>
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Phone className="w-4 h-4" />
                            <span>{customer.phone}</span>
                          </div>
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <MapPin className="w-4 h-4" />
                            <span className="truncate">{customer.address}</span>
                          </div>
                        </div>
                        <div className="mt-4 flex items-center justify-between border-t border-border/80 pt-3">
                          <Badge variant={customer.status === "Active" ? "default" : "secondary"}>
                            {customer.status}
                          </Badge>
                          <div className="text-xs text-muted-foreground">
                            {customer.total_jobs || 0} jobs
                          </div>
                        </div>
                      </CardContent>
                    </Card>)}
                </div>)}
            </CardContent>
          </Card>
      </div>
    </PageLayout>;
}
