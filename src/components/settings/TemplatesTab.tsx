import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { FileText, Edit, Eye, Upload, Trash2, Download, Save, X } from "lucide-react";
import { TemplateEditorModal } from "./TemplateEditorModal";
import { LeadEstimateTemplateEditor } from "./LeadEstimateTemplateEditor";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

interface Template {
  id: string;
  name: string;
  description: string;
  type: "estimate" | "contract" | "invoice" | "receipt";
  isTermsConditions?: boolean;
}

interface UploadedFile {
  name: string;
  size: number;
  uploadedAt: Date;
  url?: string;
}

interface TermsConditionsData {
  title: string;
  content: string;
  file?: UploadedFile;
}

export function TemplatesTab() {
  const [templates] = useState<Template[]>([
    { id: "1", name: "Lead / Estimate Template", description: "Used for sending estimates and converted leads", type: "estimate" },
    { id: "2", name: "Terms & Conditions", description: "Set your terms title, content, and optionally upload a document", type: "contract", isTermsConditions: true },
    { id: "3", name: "Invoice Template", description: "Used for billing and charging", type: "invoice" },
    { id: "4", name: "Receipt Template", description: "Used for payment confirmation", type: "receipt" },
  ]);

  const [editorOpen, setEditorOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [termsModalOpen, setTermsModalOpen] = useState(false);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [leadEstimateEditorOpen, setLeadEstimateEditorOpen] = useState(false);
  const [termsData, setTermsData] = useState<TermsConditionsData>({
    title: "",
    content: "",
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleEditTemplate = (template: Template) => {
    if (template.isTermsConditions) {
      setTermsModalOpen(true);
      return;
    }
    if (template.type === "estimate") {
      setLeadEstimateEditorOpen(true);
      return;
    }
    setSelectedTemplate(template);
    setEditorOpen(true);
  };

  const handlePreviewTemplate = (template: Template) => {
    if (template.isTermsConditions) {
      if (!termsData.title && !termsData.content && !termsData.file) {
        toast.warning("No Terms & Conditions configured yet");
        return;
      }
      setPreviewModalOpen(true);
      return;
    }
    if (template.type === "estimate") {
      setLeadEstimateEditorOpen(true);
      return;
    }
    setSelectedTemplate(template);
    setEditorOpen(true);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const validTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
      if (!validTypes.includes(file.type)) {
        toast.error("Please upload a PDF or Word document");
        return;
      }
      
      // Create a URL for preview
      const fileUrl = URL.createObjectURL(file);
      
      setTermsData(prev => ({
        ...prev,
        file: {
          name: file.name,
          size: file.size,
          uploadedAt: new Date(),
          url: fileUrl,
        }
      }));
      toast.success(`"${file.name}" uploaded successfully`);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveFile = () => {
    if (termsData.file?.url) {
      URL.revokeObjectURL(termsData.file.url);
    }
    setTermsData(prev => ({ ...prev, file: undefined }));
    toast.success("Document removed");
  };

  const handleSaveTerms = () => {
    if (!termsData.title.trim()) {
      toast.error("Please enter a title");
      return;
    }
    toast.success("Terms & Conditions saved successfully");
    setTermsModalOpen(false);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const hasTermsData = termsData.title || termsData.content || termsData.file;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Document Templates
          </CardTitle>
          <CardDescription>
            All templates must include in the header: Company Logo, Company Data, and Customer Data.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {templates.map((template) => (
              <div key={template.id} className="flex items-center justify-between p-4 border border-border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <FileText className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-medium">{template.name}</h4>
                    <p className="text-sm text-muted-foreground">{template.description}</p>
                    {template.isTermsConditions && hasTermsData && (
                      <p className="text-xs text-green-600 mt-1">
                        ✓ {termsData.title || "Configured"} 
                        {termsData.file && ` • ${termsData.file.name}`}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => handleEditTemplate(template)}>
                    <Edit className="w-4 h-4 mr-2" />
                    {template.isTermsConditions ? "Configure" : "Edit Template"}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handlePreviewTemplate(template)}>
                    <Eye className="w-4 h-4 mr-2" />
                    Preview
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>


      {/* Lead/Estimate Template Editor */}
      <LeadEstimateTemplateEditor 
        open={leadEstimateEditorOpen} 
        onOpenChange={setLeadEstimateEditorOpen} 
      />

      {/* Template Editor Modal */}
      {selectedTemplate && !selectedTemplate.isTermsConditions && selectedTemplate.type !== "estimate" && (
        <TemplateEditorModal
          open={editorOpen}
          onOpenChange={setEditorOpen}
          templateType={selectedTemplate.type}
          templateName={selectedTemplate.name}
        />
      )}

      {/* Terms & Conditions Editor Modal */}
      <Dialog open={termsModalOpen} onOpenChange={setTermsModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Configure Terms & Conditions</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <Label htmlFor="terms-title">Title *</Label>
              <Input
                id="terms-title"
                placeholder="e.g., Service Terms & Conditions"
                value={termsData.title}
                onChange={(e) => setTermsData(prev => ({ ...prev, title: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="terms-content">Content</Label>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept=".pdf,.doc,.docx"
                  className="hidden"
                />
                {termsData.file ? (
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <FileText className="w-4 h-4 text-primary" />
                      <span className="max-w-[200px] truncate">{termsData.file.name}</span>
                      <span className="text-xs">({formatFileSize(termsData.file.size)})</span>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => fileInputRef.current?.click()}>
                      <Upload className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={handleRemoveFile}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                ) : (
                  <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                    <Upload className="w-4 h-4 mr-2" />
                    Upload PDF
                  </Button>
                )}
              </div>
              
              {/* Content: Textarea OR PDF Preview */}
              {termsData.file && termsData.file.url && termsData.file.name.toLowerCase().endsWith('.pdf') ? (
                <iframe
                  src={termsData.file.url}
                  className="w-full min-h-[300px] border border-border rounded-lg bg-white"
                  title="PDF Preview"
                />
              ) : termsData.file && !termsData.file.name.toLowerCase().endsWith('.pdf') ? (
                <div className="flex flex-col items-center justify-center min-h-[200px] border border-border rounded-lg bg-muted/50">
                  <FileText className="w-10 h-10 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">Word document attached</p>
                  <p className="text-xs text-muted-foreground">{termsData.file.name}</p>
                </div>
              ) : (
                <Textarea
                  id="terms-content"
                  placeholder="Enter your terms and conditions text here, or upload a PDF document..."
                  value={termsData.content}
                  onChange={(e) => setTermsData(prev => ({ ...prev, content: e.target.value }))}
                  className="min-h-[200px] resize-y"
                />
              )}
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="outline" onClick={() => setTermsModalOpen(false)}>
                <X className="w-4 h-4 mr-2" />
                Cancel
              </Button>
              <Button onClick={handleSaveTerms}>
                <Save className="w-4 h-4 mr-2" />
                Save Terms
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Terms & Conditions Preview Modal */}
      <Dialog open={previewModalOpen} onOpenChange={setPreviewModalOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Terms & Conditions Preview</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4">
            {termsData.title && (
              <div>
                <h2 className="text-xl font-bold">{termsData.title}</h2>
              </div>
            )}
            
            {termsData.content && (
              <div className="prose prose-sm max-w-none">
                <p className="whitespace-pre-wrap text-muted-foreground">{termsData.content}</p>
              </div>
            )}
            
            {termsData.file && (
              <div className="space-y-3">
                <h3 className="font-medium flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Attached Document
                </h3>
                {termsData.file.url && termsData.file.name.endsWith('.pdf') ? (
                  <iframe
                    src={termsData.file.url}
                    className="w-full h-[400px] border border-border rounded-lg"
                    title="Terms & Conditions PDF"
                  />
                ) : (
                  <div className="flex items-center justify-between p-4 border border-border rounded-lg bg-muted/50">
                    <div className="flex items-center gap-3">
                      <FileText className="w-5 h-5 text-primary" />
                      <div>
                        <p className="font-medium">{termsData.file.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {formatFileSize(termsData.file.size)}
                        </p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => {
                      if (termsData.file?.url) {
                        window.open(termsData.file.url, '_blank');
                      }
                    }}>
                      <Download className="w-4 h-4 mr-2" />
                      Download
                    </Button>
                  </div>
                )}
              </div>
            )}

            {!termsData.title && !termsData.content && !termsData.file && (
              <p className="text-muted-foreground text-center py-8">
                No Terms & Conditions configured yet
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
