import { useState, useEffect } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Download, Send, Eye, FileText, ChevronLeft, ChevronRight } from "lucide-react";

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface PayrollPDFPreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employeeName: string;
  employeePhone?: string;
  pdfBlob: Blob | null;
  isGenerating: boolean;
  onDownload: () => void;
  onSendSMS: () => void;
  isSending: boolean;
}

export function PayrollPDFPreviewModal({
  open,
  onOpenChange,
  employeeName,
  employeePhone,
  pdfBlob,
  isGenerating,
  onDownload,
  onSendSMS,
  isSending,
}: PayrollPDFPreviewModalProps) {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  useEffect(() => {
    if (pdfBlob) {
      const url = URL.createObjectURL(pdfBlob);
      setPdfUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setPdfUrl(null);
      setNumPages(null);
      setPageNumber(1);
    }
  }, [pdfBlob]);

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setPageNumber(1);
  };

  const goToPrevPage = () => setPageNumber((prev) => Math.max(prev - 1, 1));
  const goToNextPage = () => setPageNumber((prev) => Math.min(prev + 1, numPages || 1));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Payroll PDF - {employeeName}
          </DialogTitle>
          <DialogDescription>
            Prévia do PDF gerado
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center justify-center py-4 gap-4 min-h-[400px]">
          {isGenerating ? (
            <>
              <Loader2 className="w-12 h-12 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Gerando PDF...</p>
            </>
          ) : pdfUrl ? (
            <div className="flex flex-col items-center gap-4 w-full">
              <div className="border rounded-lg overflow-hidden bg-muted/30 max-h-[50vh] overflow-y-auto">
                <Document
                  file={pdfUrl}
                  onLoadSuccess={onDocumentLoadSuccess}
                  loading={
                    <div className="flex items-center justify-center p-8">
                      <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    </div>
                  }
                  error={
                    <div className="flex flex-col items-center justify-center p-8 gap-2">
                      <Eye className="w-8 h-8 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">Erro ao carregar PDF</p>
                    </div>
                  }
                >
                  <Page 
                    pageNumber={pageNumber} 
                    width={500}
                    renderTextLayer={false}
                    renderAnnotationLayer={false}
                  />
                </Document>
              </div>
              
              {numPages && numPages > 1 && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={goToPrevPage}
                    disabled={pageNumber <= 1}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Página {pageNumber} de {numPages}
                  </span>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={goToNextPage}
                    disabled={pageNumber >= numPages}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <>
              <Eye className="w-12 h-12 text-muted-foreground" />
              <p className="text-muted-foreground">Nenhum PDF disponível</p>
            </>
          )}
        </div>

        <DialogFooter className="flex flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
          <Button
            variant="outline"
            onClick={onDownload}
            disabled={!pdfBlob || isGenerating}
            className="gap-2"
          >
            <Download className="w-4 h-4" />
            Download
          </Button>
          <Button
            onClick={onSendSMS}
            disabled={!pdfBlob || isGenerating || isSending || !employeePhone}
            title={!employeePhone ? "Nenhum telefone encontrado para este funcionário" : ""}
            className="gap-2"
          >
            {isSending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                Enviar via SMS
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
