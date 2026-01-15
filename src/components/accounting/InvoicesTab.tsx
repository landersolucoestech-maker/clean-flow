import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Search,
  DollarSign,
  CreditCard,
  AlertCircle,
  Clock,
  CheckCircle,
  Loader2,
} from "lucide-react";
import { CreateInvoiceModal } from "@/components/billing/CreateInvoiceModal";
import { EditInvoiceModal } from "@/components/billing/EditInvoiceModal";
import { useInvoices, Invoice } from "@/hooks/useInvoices";
import { format } from "date-fns";

export function InvoicesTab() {
  const [searchTerm, setSearchTerm] = useState("");
  const [searchField, setSearchField] = useState("all");
  const [createInvoiceOpen, setCreateInvoiceOpen] = useState(false);
  const [editInvoiceOpen, setEditInvoiceOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  const { data: invoices = [], isLoading } = useInvoices();

  // Calculate stats from real data
  const stats = useMemo(() => {
    const totalRevenue = invoices
      .filter(inv => inv.status === 'paid' || inv.status === 'complete')
      .reduce((sum, inv) => sum + (inv.total || 0), 0);
    
    const paid = invoices.filter(inv => inv.status === 'paid' || inv.status === 'complete');
    const totalInvoices = invoices.length;
    const collectionRate = totalInvoices > 0 ? ((paid.length / totalInvoices) * 100).toFixed(1) : '0';
    
    const pending = invoices.filter(inv => inv.status === 'sent' || inv.status === 'pending' || inv.status === 'payment_pending');
    const pendingTotal = pending.reduce((sum, inv) => sum + (inv.total || 0), 0);
    
    const overdue = invoices.filter(inv => {
      if (inv.status === 'paid' || inv.status === 'complete') return false;
      if (!inv.due_date) return false;
      return new Date(inv.due_date) < new Date();
    });
    const overdueTotal = overdue.reduce((sum, inv) => sum + (inv.total || 0), 0);

    return {
      totalRevenue,
      paidCount: paid.length,
      collectionRate,
      pendingCount: pending.length,
      pendingTotal,
      overdueCount: overdue.length,
      overdueTotal,
    };
  }, [invoices]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const handleEditInvoice = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setEditInvoiceOpen(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "paid": return "default";
      case "sent": return "secondary";
      case "payment_pending": return "secondary";
      case "complete": return "default";
      case "overdue": return "destructive";
      case "draft": return "outline";
      default: return "default";
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Revenue</p>
                <p className="text-2xl font-bold text-foreground">{formatCurrency(stats.totalRevenue)}</p>
                <p className="text-sm text-success">From paid invoices</p>
              </div>
              <div className="p-3 bg-primary/10 rounded-lg">
                <DollarSign className="w-6 h-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Paid Invoices</p>
                <p className="text-2xl font-bold text-foreground">{stats.paidCount}</p>
                <p className="text-sm text-success">{stats.collectionRate}% collection rate</p>
              </div>
              <div className="p-3 bg-success/10 rounded-lg">
                <CreditCard className="w-6 h-6 text-success" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Payment Pending</p>
                <p className="text-2xl font-bold text-foreground">{stats.pendingCount}</p>
                <p className="text-sm text-warning">{formatCurrency(stats.pendingTotal)} awaiting payment</p>
              </div>
              <div className="p-3 bg-warning/10 rounded-lg">
                <Clock className="w-6 h-6 text-warning" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Overdue</p>
                <p className="text-2xl font-bold text-foreground">{stats.overdueCount}</p>
                <p className="text-sm text-destructive">{formatCurrency(stats.overdueTotal)} past due</p>
              </div>
              <div className="p-3 bg-destructive/10 rounded-lg">
                <AlertCircle className="w-6 h-6 text-destructive" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Invoices Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Invoices</CardTitle>
            <Button variant="hero" size="sm" onClick={() => setCreateInvoiceOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create Invoice
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search invoices..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-background border-border"
              />
            </div>
            <Select value={searchField} onValueChange={setSearchField}>
              <SelectTrigger className="w-[160px] bg-background border-border">
                <SelectValue placeholder="Search by" />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border">
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="invoice">Invoice ID</SelectItem>
                <SelectItem value="customer">Customer</SelectItem>
                <SelectItem value="jobId">Job ID</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice ID</TableHead>
                <TableHead>Job ID</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Issue Date</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Auto-Gen</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : invoices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                    No invoices found
                  </TableCell>
                </TableRow>
              ) : (
                invoices
                  .filter((invoice) => {
                    const search = searchTerm.toLowerCase();
                    if (!searchTerm) return true;
                    const customerName = invoice.customer?.name || '';
                    if (searchField === "all") {
                      return (
                        invoice.invoice_number.toLowerCase().includes(search) ||
                        customerName.toLowerCase().includes(search) ||
                        (invoice.job_id || '').toLowerCase().includes(search)
                      );
                    }
                    if (searchField === "invoice") return invoice.invoice_number.toLowerCase().includes(search);
                    if (searchField === "customer") return customerName.toLowerCase().includes(search);
                    if (searchField === "jobId") return (invoice.job_id || '').toLowerCase().includes(search);
                    return true;
                  })
                  .map((invoice) => (
                    <TableRow 
                      key={invoice.id} 
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleEditInvoice(invoice)}
                    >
                      <TableCell className="font-mono">{invoice.invoice_number}</TableCell>
                      <TableCell className="font-mono text-sm">{invoice.job_id ? invoice.job_id.slice(0, 8) : '-'}</TableCell>
                      <TableCell className="font-medium">{invoice.customer?.name || 'Unknown'}</TableCell>
                      <TableCell>
                        {invoice.job_id ? (
                          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                            Cleaning Revenue
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="font-semibold">{formatCurrency(invoice.total || 0)}</TableCell>
                      <TableCell>{invoice.issue_date ? format(new Date(invoice.issue_date), 'MM/dd/yyyy') : '-'}</TableCell>
                      <TableCell>{invoice.due_date ? format(new Date(invoice.due_date), 'MM/dd/yyyy') : '-'}</TableCell>
                      <TableCell>{invoice.due_date ? format(new Date(invoice.due_date), 'MM/dd/yyyy') : '-'}</TableCell>
                      <TableCell>
                        <Badge variant={getStatusColor(invoice.status)}>
                          {invoice.status.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center">
                          <span className="text-xs text-muted-foreground">-</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <CreateInvoiceModal open={createInvoiceOpen} onOpenChange={setCreateInvoiceOpen} />
      <EditInvoiceModal 
        open={editInvoiceOpen} 
        onOpenChange={setEditInvoiceOpen} 
        invoice={selectedInvoice}
      />
    </div>
  );
}
