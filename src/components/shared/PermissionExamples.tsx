/**
 * ============================================
 * PERMISSION USAGE EXAMPLES
 * Reference file showing how to use RBAC
 * ============================================
 * 
 * This file contains examples only - do not import in production.
 * Copy the patterns you need into your components.
 */

import { Button } from "@/components/ui/button";
import { usePermission } from "@/hooks/usePermission";
import { 
  PermissionGate, 
  ViewGate, 
  CreateGate, 
  EditGate, 
  DeleteGate,
  AdminGate 
} from "@/components/shared/PermissionGate";

// ============================================
// EXAMPLE 1: Using the Hook Directly
// ============================================

export function ExampleWithHook() {
  const { 
    hasPermission, 
    canView, 
    canCreate, 
    canEdit, 
    canDelete,
    isAdmin 
  } = usePermission();

  return (
    <div>
      {/* Check specific permission */}
      {hasPermission("view_customers") && (
        <div>Lista de Clientes</div>
      )}

      {/* Use convenience methods */}
      {canView("customers") && <div>Ver Clientes</div>}
      {canCreate("customers") && <Button>Novo Cliente</Button>}
      {canEdit("customers") && <Button>Editar</Button>}
      {canDelete("customers") && <Button variant="destructive">Excluir</Button>}

      {/* Admin-only content */}
      {isAdmin() && <div>Configurações Avançadas</div>}
    </div>
  );
}

// ============================================
// EXAMPLE 2: Using PermissionGate Component
// ============================================

export function ExampleWithGate() {
  return (
    <div>
      {/* Single permission check */}
      <PermissionGate permission="view_customers">
        <div>Lista de Clientes</div>
      </PermissionGate>

      {/* With fallback content */}
      <PermissionGate 
        permission="edit_customers"
        fallback={<span>Sem permissão para editar</span>}
      >
        <Button>Editar Cliente</Button>
      </PermissionGate>

      {/* Multiple permissions - ALL required (default) */}
      <PermissionGate permissions={["view_customers", "edit_customers"]}>
        <Button>Ver e Editar</Button>
      </PermissionGate>

      {/* Multiple permissions - ANY required */}
      <PermissionGate 
        permissions={["create_invoices", "edit_invoices"]} 
        requireAny
      >
        <Button>Gerenciar Faturas</Button>
      </PermissionGate>

      {/* Module + Action shorthand */}
      <PermissionGate module="invoices" action="create">
        <Button>Nova Fatura</Button>
      </PermissionGate>
    </div>
  );
}

// ============================================
// EXAMPLE 3: Using Specialized Gates
// ============================================

export function ExampleWithSpecializedGates() {
  return (
    <div>
      <ViewGate module="customers">
        <div>Lista de Clientes Visível</div>
      </ViewGate>

      <CreateGate module="customers">
        <Button>Novo Cliente</Button>
      </CreateGate>

      <EditGate module="invoices">
        <Button>Editar Fatura</Button>
      </EditGate>

      <DeleteGate module="leads">
        <Button variant="destructive">Excluir Lead</Button>
      </DeleteGate>

      <AdminGate fallback={<span>Apenas para administradores</span>}>
        <div>Configurações do Sistema</div>
      </AdminGate>
    </div>
  );
}

// ============================================
// EXAMPLE 4: Sidebar Navigation
// ============================================

export function ExampleSidebar() {
  const { canView } = usePermission();

  const menuItems = [
    { label: "Dashboard", href: "/", permission: null }, // Always visible
    { label: "Schedule", href: "/schedule", permission: "schedule" },
    { label: "Customers", href: "/customers", permission: "customers" },
    { label: "Invoices", href: "/invoices", permission: "invoices" },
    { label: "Settings", href: "/settings", permission: "system_settings" },
  ];

  return (
    <nav>
      {menuItems.map(item => {
        // If no permission required, show always
        if (!item.permission) {
          return <a key={item.href} href={item.href}>{item.label}</a>;
        }
        
        // Check permission before showing
        if (canView(item.permission)) {
          return <a key={item.href} href={item.href}>{item.label}</a>;
        }
        
        return null;
      })}
    </nav>
  );
}

// ============================================
// EXAMPLE 5: Action Buttons in Table Row
// ============================================

interface CustomerRowProps {
  customer: { id: string; name: string };
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

export function ExampleTableRow({ customer, onEdit, onDelete }: CustomerRowProps) {
  return (
    <tr>
      <td>{customer.name}</td>
      <td>
        <EditGate module="customers">
          <Button size="sm" onClick={() => onEdit(customer.id)}>
            Editar
          </Button>
        </EditGate>
        
        <DeleteGate module="customers">
          <Button 
            size="sm" 
            variant="destructive" 
            onClick={() => onDelete(customer.id)}
          >
            Excluir
          </Button>
        </DeleteGate>
      </td>
    </tr>
  );
}

// ============================================
// EXAMPLE 6: Form with Conditional Fields
// ============================================

export function ExampleForm() {
  const { hasPermission } = usePermission();

  return (
    <form>
      <input placeholder="Nome do Cliente" />
      
      {/* Only show price field if user can edit prices */}
      <PermissionGate permission="edit_job_prices">
        <input placeholder="Preço" type="number" />
      </PermissionGate>

      {/* Only show hidden notes if toggled */}
      <PermissionGate permission="toggle_hidden_notes">
        <textarea placeholder="Notas Internas (ocultas)" />
      </PermissionGate>

      {/* Submit button - require at least edit permission */}
      <PermissionGate 
        permissions={["create_customers", "edit_customers"]}
        requireAny
      >
        <Button type="submit">Salvar</Button>
      </PermissionGate>
    </form>
  );
}

// ============================================
// SECURITY NOTES
// ============================================

/**
 * ⚠️ IMPORTANT SECURITY CONSIDERATIONS:
 * 
 * 1. Frontend RBAC is for UX only - always enforce on backend
 * 2. Never trust client-side permission checks for security
 * 3. Use Supabase RLS policies for data access control
 * 4. JWT claims should contain role/permissions for API validation
 * 
 * Backend enforcement example (Supabase Edge Function):
 * 
 * ```typescript
 * // In edge function
 * const { data: userRole } = await supabase
 *   .from('user_roles')
 *   .select('role')
 *   .eq('user_id', user.id)
 *   .single();
 * 
 * if (!userRole || userRole.role !== 'admin') {
 *   return new Response('Forbidden', { status: 403 });
 * }
 * ```
 * 
 * RLS policy example:
 * 
 * ```sql
 * CREATE POLICY "Users can only view their team's data"
 * ON customers FOR SELECT
 * USING (
 *   team_id IN (
 *     SELECT team_id FROM user_teams 
 *     WHERE user_id = auth.uid()
 *   )
 * );
 * ```
 */
