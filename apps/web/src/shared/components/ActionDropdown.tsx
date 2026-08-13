import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Eye, Pencil, Trash2 } from "lucide-react";

interface ActionDropdownProps {
  onView?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  viewLabel?: string;
  editLabel?: string;
  deleteLabel?: string;
}

export function ActionDropdown({
  onView,
  onEdit,
  onDelete,
  viewLabel = "Ver",
  editLabel = "Editar",
  deleteLabel = "Excluir",
}: ActionDropdownProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg text-muted-foreground hover:text-foreground">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-40 rounded-xl border-border bg-popover p-1.5 shadow-lg">
        {onView && (
          <DropdownMenuItem onClick={onView} className="cursor-pointer rounded-lg">
            <Eye className="mr-2 h-4 w-4 text-muted-foreground" />
            {viewLabel}
          </DropdownMenuItem>
        )}
        {onEdit && (
          <DropdownMenuItem onClick={onEdit} className="cursor-pointer rounded-lg">
            <Pencil className="mr-2 h-4 w-4 text-muted-foreground" />
            {editLabel}
          </DropdownMenuItem>
        )}
        {onDelete && (
          <DropdownMenuItem onClick={onDelete} className="cursor-pointer rounded-lg text-destructive focus:text-destructive">
            <Trash2 className="mr-2 h-4 w-4" />
            {deleteLabel}
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
