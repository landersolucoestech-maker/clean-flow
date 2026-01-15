import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, Printer, X } from "lucide-react";
import { LucideIcon } from "lucide-react";

interface ReportData {
  id: string;
  name: string;
  description: string;
  type: string;
  records: number;
  icon: LucideIcon;
  iconColor: string;
  iconBg: string;
}

interface ReportPreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  report: ReportData | null;
}

export function ReportPreviewModal({
  open,
  onOpenChange,
  report,
}: ReportPreviewModalProps) {
  if (!report) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    console.log("Downloading report:", report.name);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div
              className={`w-12 h-12 rounded-lg flex items-center justify-center ${report.iconBg}`}
            >
              <report.icon className={`w-6 h-6 ${report.iconColor}`} />
            </div>
            <div>
              <DialogTitle className="text-xl">{report.name}</DialogTitle>
              <DialogDescription>{report.description}</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="mt-4 space-y-4">
          {/* Report Info */}
          <div className="flex items-center gap-4">
            <Badge variant="secondary">{report.type}</Badge>
            <span className="text-sm text-muted-foreground">
              {report.records} registros
            </span>
          </div>

          {/* Preview Content Placeholder */}
          <div className="border rounded-lg p-6 bg-muted/30 min-h-[300px]">
            <div className="text-center text-muted-foreground">
              <p className="text-lg font-medium mb-2">Pré-visualização do Relatório</p>
              <p className="text-sm">
                O conteúdo detalhado do relatório "{report.name}" será exibido aqui.
              </p>
              <p className="text-sm mt-4">
                Total de registros: <strong>{report.records}</strong>
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              <X className="w-4 h-4 mr-2" />
              Fechar
            </Button>
            <Button variant="outline" onClick={handlePrint}>
              <Printer className="w-4 h-4 mr-2" />
              Imprimir
            </Button>
            <Button onClick={handleDownload}>
              <Download className="w-4 h-4 mr-2" />
              Download
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
