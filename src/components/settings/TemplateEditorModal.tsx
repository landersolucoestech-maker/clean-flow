import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { 
  Upload, 
  Eye, 
  Save, 
  Palette, 
  Type, 
  Layout, 
  Image as ImageIcon,
  Building2,
  User,
  FileText,
  Mail,
  Phone,
  MapPin,
  Calendar,
  DollarSign,
  Hash,
} from "lucide-react";

interface TemplateConfig {
  // Header
  showLogo: boolean;
  logoPosition: "left" | "center" | "right";
  companyName: string;
  companyAddress: string;
  companyPhone: string;
  companyEmail: string;
  companyTaxId: string;
  
  // Styling
  primaryColor: string;
  secondaryColor: string;
  fontFamily: string;
  headerBgColor: string;
  
  // Content
  title: string;
  introText: string;
  footerText: string;
  termsAndConditions: string;
  notesText: string;
  legalText: string;
  
  // Options
  showTerms: boolean;
  showSignatureLine: boolean;
  showPaymentInfo: boolean;
  showDueDate: boolean;
  showNotes: boolean;
  showLegal: boolean;
}

interface TemplateEditorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  templateType: "estimate" | "contract" | "invoice" | "receipt";
  templateName: string;
}

const getDefaultConfigForType = (templateType: "estimate" | "contract" | "invoice" | "receipt"): TemplateConfig => {
  const baseConfig: TemplateConfig = {
    showLogo: true,
    logoPosition: "left",
    companyName: "CleanPro Services",
    companyAddress: "123 Business Center, City, State 12345",
    companyPhone: "(555) 987-6543",
    companyEmail: "info@cleanpro.com",
    companyTaxId: "",
    primaryColor: "#dc2626",
    secondaryColor: "#1f2937",
    fontFamily: "Inter",
    headerBgColor: "#f9fafb",
    title: "Invoice",
    introText: "Thank you for choosing our services. Please find the details below.",
    footerText: "Thank you for your business!",
    termsAndConditions: "Payment is due within 30 days of invoice date. Late payments may incur additional fees.",
    notesText: "",
    legalText: "",
    showTerms: true,
    showSignatureLine: false,
    showPaymentInfo: true,
    showDueDate: true,
    showNotes: false,
    showLegal: false,
  };

  switch (templateType) {
    case "estimate":
      return {
        ...baseConfig,
        title: "Estimate",
        introText: "Thank you for your interest in our services. Please find your estimate below.",
        footerText: "This estimate is valid for 30 days. Contact us to schedule your service!",
        termsAndConditions: "This is an estimate only. Final pricing may vary based on actual conditions. Estimate valid for 30 days.",
        showPaymentInfo: false,
        showDueDate: false,
      };
    case "contract":
      return {
        ...baseConfig,
        title: "Service Agreement",
        introText: "This agreement outlines the terms of service between the parties.",
        footerText: "By signing below, you agree to the terms outlined in this agreement.",
        showSignatureLine: true,
        showPaymentInfo: false,
        showDueDate: false,
      };
    case "receipt":
      return {
        ...baseConfig,
        title: "RECEIPT",
        primaryColor: "#16a34a",
        introText: "",
        footerText: "",
        termsAndConditions: "",
        notesText: "Thank you for doing business with us.\nThis receipt confirms that your payment has been successfully processed.\n\nFor support or billing inquiries, contact:\n📧 billing@company.com",
        legalText: "This document is a digital receipt and does not replace a fiscal invoice unless explicitly stated.",
        showTerms: false,
        showPaymentInfo: true,
        showDueDate: false,
        showNotes: true,
        showLegal: true,
      };
    case "invoice":
    default:
      return baseConfig;
  }
};

// Sample data for preview
const sampleInvoiceData = {
  clientName: "John Smith",
  clientCompany: "Smith Enterprises",
  clientEmail: "john.smith@email.com",
  clientPhone: "(555) 123-4567",
  clientAddress: "456 Customer St, City, State 67890",
  clientCountry: "United States",
  invoiceNumber: "INV-2024-001",
  invoiceDate: "January 12, 2026",
  dueDate: "February 12, 2026",
  jobDate: "January 15, 2026",
  items: [
    { description: "Deep Cleaning - Living Room", qty: 1, price: 150 },
    { description: "Deep Cleaning - Kitchen", qty: 1, price: 200 },
    { description: "Window Cleaning", qty: 4, price: 25 },
  ],
  subtotal: 450,
  tax: 36,
  discount: 0,
  total: 486,
};

// Sample data for receipt preview
const sampleReceiptData = {
  receiptNumber: "LST-000001",
  invoiceNumber: "INV-000001",
  date: "10/01/2026",
  paymentStatus: "Paid",
  paymentMethod: "Credit Card",
  clientName: "John Smith",
  clientCompany: "Smith Enterprises",
  clientEmail: "john.smith@email.com",
  clientPhone: "(555) 123-4567",
  clientAddress: "456 Customer St, City, State 67890",
  clientCountry: "United States",
  items: [
    { id: "01", description: "SaaS Subscription – Platform", qty: 1, price: 49 },
    { id: "02", description: "Website Development", qty: 1, price: 500 },
  ],
  subtotal: 549,
  tax: 0,
  discount: 0,
  total: 549,
  transactionId: "TXN-938402934",
  gateway: "Stripe",
  cardInfo: "**** 4582",
  paymentDate: "10/01/2026",
  currency: "USD",
};

// Store saved configs per template type
const savedConfigs: Record<string, TemplateConfig> = {};

export function TemplateEditorModal({ 
  open, 
  onOpenChange, 
  templateType,
  templateName 
}: TemplateEditorModalProps) {
  const [config, setConfig] = useState<TemplateConfig>(() => 
    savedConfigs[templateType] || getDefaultConfigForType(templateType)
  );
  
  const [activeTab, setActiveTab] = useState("header");

  // Reset config when templateType changes or modal opens
  useEffect(() => {
    if (open) {
      setConfig(savedConfigs[templateType] || getDefaultConfigForType(templateType));
      setActiveTab("header");
    }
  }, [open, templateType]);

  const updateConfig = (key: keyof TemplateConfig, value: any) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    // Save config for this specific template type
    savedConfigs[templateType] = config;
    toast.success("Template saved successfully!");
    onOpenChange(false);
  };

  const getTypeLabel = () => {
    switch (templateType) {
      case "estimate": return "Estimate";
      case "contract": return "Contract";
      case "invoice": return "Invoice";
      case "receipt": return "Receipt";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-7xl h-[90vh] flex flex-col p-0">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Edit {templateName}
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 flex overflow-hidden">
          {/* Editor Panel */}
          <div className="w-1/2 border-r border-border overflow-y-auto p-6">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-4 mb-6">
                <TabsTrigger value="header" className="flex items-center gap-1">
                  <Building2 className="w-3 h-3" />
                  Header
                </TabsTrigger>
                <TabsTrigger value="content" className="flex items-center gap-1">
                  <Type className="w-3 h-3" />
                  Content
                </TabsTrigger>
                <TabsTrigger value="styling" className="flex items-center gap-1">
                  <Palette className="w-3 h-3" />
                  Styling
                </TabsTrigger>
                <TabsTrigger value="options" className="flex items-center gap-1">
                  <Layout className="w-3 h-3" />
                  Options
                </TabsTrigger>
              </TabsList>

              {/* Header Tab */}
              <TabsContent value="header" className="space-y-4">
                <div className="space-y-4">
                  <h3 className="font-semibold">Company Information</h3>
                  
                  <div className="flex items-center justify-between">
                    <Label>Show Logo</Label>
                    <Switch 
                      checked={config.showLogo} 
                      onCheckedChange={(v) => updateConfig("showLogo", v)} 
                    />
                  </div>

                  {config.showLogo && (
                    <div className="space-y-2">
                      <Label>Logo Position</Label>
                      <Select 
                        value={config.logoPosition} 
                        onValueChange={(v) => updateConfig("logoPosition", v)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="left">Left</SelectItem>
                          <SelectItem value="center">Center</SelectItem>
                          <SelectItem value="right">Right</SelectItem>
                        </SelectContent>
                      </Select>
                      
                      <Button variant="outline" size="sm" className="w-full mt-2">
                        <Upload className="w-4 h-4 mr-2" />
                        Upload Logo
                      </Button>
                    </div>
                  )}

                  <Separator />

                  <div className="space-y-2">
                    <Label>Company Name</Label>
                    <Input 
                      value={config.companyName}
                      onChange={(e) => updateConfig("companyName", e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Address</Label>
                    <Textarea 
                      value={config.companyAddress}
                      onChange={(e) => updateConfig("companyAddress", e.target.value)}
                      rows={2}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Phone</Label>
                      <Input 
                        value={config.companyPhone}
                        onChange={(e) => updateConfig("companyPhone", e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Email</Label>
                      <Input 
                        value={config.companyEmail}
                        onChange={(e) => updateConfig("companyEmail", e.target.value)}
                      />
                    </div>
                  </div>

                </div>
              </TabsContent>

              {/* Content Tab */}
              <TabsContent value="content" className="space-y-4">
                <div className="space-y-2">
                  <Label>Document Title</Label>
                  <Input 
                    value={config.title}
                    onChange={(e) => updateConfig("title", e.target.value)}
                  />
                </div>

                {templateType !== "receipt" && (
                  <>
                    <div className="space-y-2">
                      <Label>Introduction Text</Label>
                      <Textarea 
                        value={config.introText}
                        onChange={(e) => updateConfig("introText", e.target.value)}
                        rows={3}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Footer Text</Label>
                      <Textarea 
                        value={config.footerText}
                        onChange={(e) => updateConfig("footerText", e.target.value)}
                        rows={2}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Terms & Conditions</Label>
                      <Textarea 
                        value={config.termsAndConditions}
                        onChange={(e) => updateConfig("termsAndConditions", e.target.value)}
                        rows={4}
                      />
                    </div>
                  </>
                )}

                {templateType === "receipt" && (
                  <>
                    <div className="space-y-2">
                      <Label>Notes Text</Label>
                      <p className="text-xs text-muted-foreground">Thank you message and contact information</p>
                      <Textarea 
                        value={config.notesText}
                        onChange={(e) => updateConfig("notesText", e.target.value)}
                        rows={5}
                        placeholder="Thank you for doing business with us.&#10;This receipt confirms that your payment has been successfully processed.&#10;&#10;For support or billing inquiries, contact:&#10;📧 billing@company.com"
                      />
                    </div>

                  </>
                )}

                <Separator />

                <div className="space-y-2">
                  <h4 className="font-medium text-sm">Available Variables</h4>
                  <div className="flex flex-wrap gap-2">
                    {templateType === "receipt" 
                      ? ["{ClientName}", "{CompanyName}", "{ReceiptNumber}", "{InvoiceNumber}", "{PaymentDate}", "{Total}", "{TransactionId}"].map((v) => (
                          <span key={v} className="px-2 py-1 bg-muted rounded text-xs font-mono">
                            {v}
                          </span>
                        ))
                      : ["{ClientName}", "{CompanyName}", "{InvoiceNumber}", "{JobDate}", "{DueDate}", "{Total}"].map((v) => (
                          <span key={v} className="px-2 py-1 bg-muted rounded text-xs font-mono">
                            {v}
                          </span>
                        ))
                    }
                  </div>
                </div>
              </TabsContent>

              {/* Styling Tab */}
              <TabsContent value="styling" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Primary Color</Label>
                    <div className="flex gap-2">
                      <Input 
                        type="color"
                        value={config.primaryColor}
                        onChange={(e) => updateConfig("primaryColor", e.target.value)}
                        className="w-12 h-10 p-1 cursor-pointer"
                      />
                      <Input 
                        value={config.primaryColor}
                        onChange={(e) => updateConfig("primaryColor", e.target.value)}
                        className="flex-1"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Secondary Color</Label>
                    <div className="flex gap-2">
                      <Input 
                        type="color"
                        value={config.secondaryColor}
                        onChange={(e) => updateConfig("secondaryColor", e.target.value)}
                        className="w-12 h-10 p-1 cursor-pointer"
                      />
                      <Input 
                        value={config.secondaryColor}
                        onChange={(e) => updateConfig("secondaryColor", e.target.value)}
                        className="flex-1"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Header Background Color</Label>
                  <div className="flex gap-2">
                    <Input 
                      type="color"
                      value={config.headerBgColor}
                      onChange={(e) => updateConfig("headerBgColor", e.target.value)}
                      className="w-12 h-10 p-1 cursor-pointer"
                    />
                    <Input 
                      value={config.headerBgColor}
                      onChange={(e) => updateConfig("headerBgColor", e.target.value)}
                      className="flex-1"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Font Family</Label>
                  <Select 
                    value={config.fontFamily} 
                    onValueChange={(v) => updateConfig("fontFamily", v)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Inter">Inter</SelectItem>
                      <SelectItem value="Arial">Arial</SelectItem>
                      <SelectItem value="Georgia">Georgia</SelectItem>
                      <SelectItem value="Times New Roman">Times New Roman</SelectItem>
                      <SelectItem value="Roboto">Roboto</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </TabsContent>

              {/* Options Tab */}
              <TabsContent value="options" className="space-y-4">
                <div className="space-y-4">
                  {templateType !== "receipt" && (
                    <>
                      <div className="flex items-center justify-between">
                        <div>
                          <Label>Show Terms & Conditions</Label>
                          <p className="text-xs text-muted-foreground">Display terms at the bottom</p>
                        </div>
                        <Switch 
                          checked={config.showTerms} 
                          onCheckedChange={(v) => updateConfig("showTerms", v)} 
                        />
                      </div>

                      <Separator />

                      <div className="flex items-center justify-between">
                        <div>
                          <Label>Show Signature Line</Label>
                          <p className="text-xs text-muted-foreground">Add signature field for contracts</p>
                        </div>
                        <Switch 
                          checked={config.showSignatureLine} 
                          onCheckedChange={(v) => updateConfig("showSignatureLine", v)} 
                        />
                      </div>

                      <Separator />

                      <div className="flex items-center justify-between">
                        <div>
                          <Label>Show Due Date</Label>
                          <p className="text-xs text-muted-foreground">Display payment due date</p>
                        </div>
                        <Switch 
                          checked={config.showDueDate} 
                          onCheckedChange={(v) => updateConfig("showDueDate", v)} 
                        />
                      </div>

                      <Separator />
                    </>
                  )}

                  {templateType !== "receipt" && (
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Show Payment Information</Label>
                        <p className="text-xs text-muted-foreground">Display payment details section</p>
                      </div>
                      <Switch 
                        checked={config.showPaymentInfo} 
                        onCheckedChange={(v) => updateConfig("showPaymentInfo", v)} 
                      />
                    </div>
                  )}

                  {templateType === "receipt" && (
                    <>
                      <Separator />

                      <div className="flex items-center justify-between">
                        <div>
                          <Label>Show Notes Section</Label>
                          <p className="text-xs text-muted-foreground">Display thank you message and contact info</p>
                        </div>
                        <Switch 
                          checked={config.showNotes} 
                          onCheckedChange={(v) => updateConfig("showNotes", v)} 
                        />
                      </div>
                    </>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>

          {/* Preview Panel */}
          <div className="w-1/2 bg-muted/30 overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold flex items-center gap-2">
                <Eye className="w-4 h-4" />
                Live Preview
              </h3>
              <span className="text-xs text-muted-foreground">Updates in real-time</span>
            </div>

            {/* Receipt Preview */}
            {templateType === "receipt" ? (
              <div 
                className="bg-white rounded-lg shadow-lg p-6 mx-auto max-w-[500px] text-sm"
                style={{ fontFamily: config.fontFamily }}
              >

                {/* Company Header */}
                <div 
                  className="p-4 rounded-lg mb-4"
                  style={{ backgroundColor: config.headerBgColor }}
                >
                  <div className="flex items-start gap-4">
                    {config.showLogo && (
                      <div 
                        className="w-14 h-14 rounded-lg flex items-center justify-center text-white font-bold"
                        style={{ backgroundColor: config.primaryColor }}
                      >
                        <ImageIcon className="w-7 h-7" />
                      </div>
                    )}
                    <div className="flex-1">
                      <h1 className="text-lg font-bold" style={{ color: config.primaryColor }}>
                        {config.companyName}
                      </h1>
                      <div className="text-xs text-gray-600 mt-1 space-y-0.5">
                        {config.companyTaxId && (
                          <div>CNPJ / Tax ID: {config.companyTaxId}</div>
                        )}
                        <div>{config.companyAddress}</div>
                        <div>Email: {config.companyEmail}</div>
                        <div>Phone: {config.companyPhone}</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* RECEIPT Title */}
                <div className="text-center mb-4">
                  <h2 
                    className="text-2xl font-bold"
                    style={{ color: config.secondaryColor }}
                  >
                    {config.title}
                  </h2>
                </div>

                {/* Receipt Info */}
                <div className="bg-gray-50 rounded-lg p-3 mb-4 text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Receipt Nº:</span>
                    <span className="font-medium">{sampleReceiptData.receiptNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Invoice Nº:</span>
                    <span className="font-medium">{sampleReceiptData.invoiceNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Date:</span>
                    <span className="font-medium">{sampleReceiptData.date}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Payment Status:</span>
                    <span className="font-medium text-green-600">✅ {sampleReceiptData.paymentStatus}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Payment Method:</span>
                    <span className="font-medium">{sampleReceiptData.paymentMethod}</span>
                  </div>
                </div>



                {/* Notes */}
                {config.showNotes && config.notesText && (
                  <div className="mb-4">
                    <h3 className="font-semibold text-sm mb-2" style={{ color: config.secondaryColor }}>
                      Notes
                    </h3>
                    <div className="bg-green-50 rounded-lg p-3 text-xs text-gray-700 whitespace-pre-line">
                      {config.notesText}
                    </div>
                  </div>
                )}

              </div>
            ) : (
              /* Standard Invoice/Estimate/Contract Preview */
              <div 
                className="bg-white rounded-lg shadow-lg p-8 mx-auto max-w-[500px] text-sm"
                style={{ fontFamily: config.fontFamily }}
              >
                {/* Header */}
                <div 
                  className="p-4 rounded-lg mb-6 -mx-4 -mt-4"
                  style={{ backgroundColor: config.headerBgColor }}
                >
                  <div className={`flex items-start gap-4 ${
                    config.logoPosition === "center" ? "flex-col items-center text-center" :
                    config.logoPosition === "right" ? "flex-row-reverse" : ""
                  }`}>
                    {config.showLogo && (
                      <div 
                        className="w-16 h-16 rounded-lg flex items-center justify-center text-white font-bold text-xl"
                        style={{ backgroundColor: config.primaryColor }}
                      >
                        <ImageIcon className="w-8 h-8" />
                      </div>
                    )}
                    <div className={config.logoPosition === "center" ? "text-center" : ""}>
                      <h1 
                        className="text-xl font-bold"
                        style={{ color: config.primaryColor }}
                      >
                        {config.companyName}
                      </h1>
                      <div className="text-xs text-gray-600 mt-1 space-y-0.5">
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {config.companyAddress}
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            {config.companyPhone}
                          </span>
                          <span className="flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            {config.companyEmail}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Title & Info */}
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h2 
                      className="text-2xl font-bold"
                      style={{ color: config.secondaryColor }}
                    >
                      {config.title}
                    </h2>
                    <div className="text-xs text-gray-500 mt-1 space-y-0.5">
                      <div className="flex items-center gap-1">
                        <Hash className="w-3 h-3" />
                        {sampleInvoiceData.invoiceNumber}
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {sampleInvoiceData.invoiceDate}
                      </div>
                      {config.showDueDate && (
                        <div className="flex items-center gap-1 text-amber-600">
                          <Calendar className="w-3 h-3" />
                          Due: {sampleInvoiceData.dueDate}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-right text-xs">
                    <div className="font-medium" style={{ color: config.secondaryColor }}>Bill To:</div>
                    <div className="text-gray-600">
                      <div className="font-medium">{sampleInvoiceData.clientName}</div>
                      <div>{sampleInvoiceData.clientAddress}</div>
                      <div>{sampleInvoiceData.clientEmail}</div>
                      <div>{sampleInvoiceData.clientPhone}</div>
                    </div>
                  </div>
                </div>

                {/* Intro Text */}
                {config.introText && (
                  <p className="text-xs text-gray-600 mb-4">{config.introText}</p>
                )}

                {/* Items Table */}
                <table className="w-full text-xs mb-6">
                  <thead>
                    <tr 
                      className="text-white"
                      style={{ backgroundColor: config.primaryColor }}
                    >
                      <th className="text-left p-2 rounded-l">Description</th>
                      <th className="text-center p-2">Qty</th>
                      <th className="text-right p-2">Price</th>
                      <th className="text-right p-2 rounded-r">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sampleInvoiceData.items.map((item, i) => (
                      <tr key={i} className="border-b border-gray-100">
                        <td className="p-2">{item.description}</td>
                        <td className="p-2 text-center">{item.qty}</td>
                        <td className="p-2 text-right">${item.price.toFixed(2)}</td>
                        <td className="p-2 text-right">${(item.qty * item.price).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Totals */}
                <div className="flex justify-end mb-6">
                  <div className="w-48 text-xs">
                    <div className="flex justify-between py-1">
                      <span>Subtotal:</span>
                      <span>${sampleInvoiceData.subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b">
                      <span>Tax (8%):</span>
                      <span>${sampleInvoiceData.tax.toFixed(2)}</span>
                    </div>
                    <div 
                      className="flex justify-between py-2 font-bold text-sm"
                      style={{ color: config.primaryColor }}
                    >
                      <span>Total:</span>
                      <span>${sampleInvoiceData.total.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {/* Payment Info */}
                {config.showPaymentInfo && (
                  <div className="bg-gray-50 rounded-lg p-3 mb-4 text-xs">
                    <div className="font-medium mb-1" style={{ color: config.secondaryColor }}>
                      Payment Information
                    </div>
                    <div className="text-gray-600">
                      <div>Bank: Chase Bank</div>
                      <div>Account: **** 1234</div>
                      <div>Or pay online at: payments.cleanpro.com</div>
                    </div>
                  </div>
                )}

                {/* Signature Line */}
                {config.showSignatureLine && (
                  <div className="mb-6 pt-4">
                    <div className="flex gap-8">
                      <div className="flex-1">
                        <div className="border-b border-gray-300 h-8"></div>
                        <div className="text-xs text-gray-500 mt-1">Client Signature</div>
                      </div>
                      <div className="w-32">
                        <div className="border-b border-gray-300 h-8"></div>
                        <div className="text-xs text-gray-500 mt-1">Date</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Terms */}
                {config.showTerms && config.termsAndConditions && (
                  <div className="border-t pt-4 text-xs text-gray-500">
                    <div className="font-medium mb-1">Terms & Conditions</div>
                    <p>{config.termsAndConditions}</p>
                  </div>
                )}

                {/* Footer */}
                {config.footerText && (
                  <div 
                    className="text-center text-xs mt-6 pt-4 border-t"
                    style={{ color: config.primaryColor }}
                  >
                    {config.footerText}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} className="bg-primary">
            <Save className="w-4 h-4 mr-2" />
            Save Template
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
