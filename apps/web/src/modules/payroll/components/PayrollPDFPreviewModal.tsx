import { T } from "@/shared/components/i18n/T";
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
      <DialogContent className="max-h-[86vh] sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Payroll PDF - {employeeName}
          </DialogTitle>
          <DialogDescription>
            <T k="literal.payroll.previa_do_pdf_gerado.79916614" />
          </DialogDescription>
        </DialogHeader>

        <div className="flex min-h-[280px] flex-col items-center justify-center gap-3 py-3">
          {isGenerating ? (
            <>
              <Loader2 className="h-7 w-7 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground"><T k="literal.payroll.gerando_pdf.5e2900c2" /></p>
            </>
          ) : pdfUrl ? (
            <div className="flex w-full flex-col items-center gap-3">
              <div className="max-h-[48vh] overflow-y-auto rounded-md border bg-muted/20">
                <Document
                  file={pdfUrl}
                  onLoadSuccess={onDocumentLoadSuccess}
                  loading={
                    <div className="flex items-center justify-center p-5">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    </div>
                  }
                  error={
                    <div className="flex flex-col items-center justify-center gap-2 p-5">
                      <Eye className="h-6 w-6 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground"><T k="literal.payroll.erro_ao_carregar_pdf.17546dc9" /></p>
                    </div>
                  }
                >
                  <Page 
                    pageNumber={pageNumber} 
                    width={460}
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
              <Eye className="h-7 w-7 text-muted-foreground" />
              <p className="text-muted-foreground"><T k="literal.payroll.nenhum_pdf_disponivel.a128808a" /></p>
            </>
          )}
        </div>

        <DialogFooter className="flex flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            <T k="common.close" />
          </Button>
          <Button
            variant="outline"
            onClick={onDownload}
            disabled={!pdfBlob || isGenerating}
            className="gap-2"
          >
            <Download className="w-4 h-4" />
            <T k="literal.payroll.download.a479c9c3" />
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
                <T k="literal.payroll.enviando.21fc978c" />
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <T k="literal.payroll.enviar_via_sms.79760fb7" />
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
