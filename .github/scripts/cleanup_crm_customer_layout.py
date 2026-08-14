from pathlib import Path

path = Path('apps/web/src/modules/crm/customers/pages/CustomersPageContent.tsx')
text = path.read_text(encoding='utf-8')

text = text.replace('import { Plus, Search, MoreHorizontal, UserPlus, Users, UserCheck, UserX, Repeat, Eye, Pencil, Trash2, LayoutGrid, List, Phone, Mail, MapPin, Upload, Download, Loader2 } from "lucide-react";', 'import { Plus, Search, MoreHorizontal, Eye, Pencil, Trash2, LayoutGrid, List, Phone, Mail, MapPin, Upload, Download, Loader2 } from "lucide-react";')

start = text.index('  // Stats - Real data calculations')
end = text.index('  if (isLoading) {')
text = text[:start] + text[end:]

jsx_start = text.index('          {/* Stats Cards */}')
jsx_end = text.index('          {/* Customer workspace */}')
text = text[:jsx_start] + text[jsx_end:]

text = text.replace('      contentClassName="gap-5"', '      contentClassName="gap-4"')
text = text.replace('      <div className="space-y-5">', '      <div className="space-y-4">', 1)
text = text.replace('<Card className="overflow-hidden rounded-md border-border/80 shadow-sm">', '<Card className="overflow-hidden rounded-md border-border/80 shadow-sm">', 1)
text = text.replace('            <CardHeader className="border-b border-border/70 px-5 py-4">', '            <CardHeader className="border-b border-border/70 px-5 py-3">', 1)
text = text.replace('                <CardTitle className="text-base">{t("customers.title")}</CardTitle>', '                <CardTitle className="text-sm font-semibold">Customers</CardTitle>', 1)
text = text.replace('                <p className="text-sm text-muted-foreground">Search, filter and manage the customer directory.</p>', '                <p className="text-xs text-muted-foreground">Search, filter and manage the customer directory.</p>', 1)

path.write_text(text, encoding='utf-8')
print('CRM customer layout cleanup applied')
