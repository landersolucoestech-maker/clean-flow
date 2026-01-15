import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Trash2, ShieldAlert, Loader2 } from "lucide-react";
import { useDeleteRole, Role } from "@/hooks/useRoles";
import { toast } from "sonner";

interface DeleteRoleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  role: Role | null;
}

export function DeleteRoleDialog({ open, onOpenChange, role }: DeleteRoleDialogProps) {
  const deleteRoleMutation = useDeleteRole();

  if (!role) return null;

  const isSystemRole = role.is_system || role.name.toLowerCase() === "admin";

  const handleConfirm = () => {
    if (isSystemRole) return;
    
    deleteRoleMutation.mutate(role.id, {
      onSuccess: () => {
        onOpenChange(false);
        toast.success("Função excluída com sucesso!");
      },
      onError: (error) => {
        toast.error("Erro ao excluir função: " + error.message);
      }
    });
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          {isSystemRole ? (
            <>
              <AlertDialogTitle className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-amber-500" />
                Ação Não Permitida
              </AlertDialogTitle>
              <AlertDialogDescription>
                A função <strong>"{role.name}"</strong> é uma função do sistema e não pode ser excluída.
                <br /><br />
                Esta função é essencial para o funcionamento do sistema.
              </AlertDialogDescription>
            </>
          ) : (
            <>
              <AlertDialogTitle className="flex items-center gap-2">
                <Trash2 className="w-5 h-5 text-destructive" />
                Excluir Função
              </AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir a função <strong>"{role.name}"</strong>?
                <br /><br />
                Esta ação não pode ser desfeita. Todos os usuários com esta função perderão suas permissões associadas.
              </AlertDialogDescription>
            </>
          )}
        </AlertDialogHeader>
        <AlertDialogFooter>
          {isSystemRole ? (
            <AlertDialogCancel>Entendido</AlertDialogCancel>
          ) : (
            <>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleConfirm}
                className="bg-destructive hover:bg-destructive/90"
                disabled={deleteRoleMutation.isPending}
              >
                {deleteRoleMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : null}
                Excluir
              </AlertDialogAction>
            </>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
