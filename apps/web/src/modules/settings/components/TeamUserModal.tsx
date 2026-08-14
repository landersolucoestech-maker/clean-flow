import { T } from "@/shared/components/i18n/T";
import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  Staff,
  StaffFormData,
  useCreateStaff,
  useDeleteStaff,
  useUpdateStaff,
} from "@/hooks/useStaff";
import type { Enums } from "@/integrations/supabase/types";

type AppRole = Enums<"app_role">;
interface TeamUserModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  staff?: Staff | null;
  canDelete?: boolean;
}

const FUNCTION_ROLES = [
  { value: "admin", label: "Admin" },
  { value: "cleaner", label: "Cleaner" },
  { value: "driver", label: "Driver" },
  { value: "cleaning_manager", label: "Cleaning Manager Team" },
  { value: "office_manager", label: "Office Manager" },
  { value: "virtual_assistant", label: "Virtual Assistant" },
];


interface FormData {
  fullName: string;
  email: string;
  phoneNumber: string;
  role: string;
  team: string;
  paymentMethod: string;
  zelleKey: string;
  quickbooksVendorId: string;
}

const getInitialFormData = (): FormData => ({
  fullName: "",
  email: "",
  phoneNumber: "",
  role: "cleaner",
  team: "",
  paymentMethod: "zelle",
  zelleKey: "",
  quickbooksVendorId: "",
});

function roleToIsDriver(role: AppRole | string): boolean {
  return role === "driver";
}

function TeamSelector({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const teamOptions = Array.from({ length: 10 }, (_, index) => String(index + 1));

  return (
    <div className="space-y-2">
      <Label><T k="settings.team" /></Label>
      <Select value={value || "none"} onValueChange={(v) => onChange(v === "none" ? "" : v)}>
        <SelectTrigger>
          <SelectValue placeholder="Select team" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none"><T k="literal.settings.sem_team_definido.699638a0" /></SelectItem>
          {teamOptions.map((teamNum) => (
            <SelectItem key={teamNum} value={teamNum}>
              Team {teamNum}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export function TeamUserModal({
  open,
  onOpenChange,
  mode,
  staff,
  canDelete = true,
}: TeamUserModalProps) {
  const [formData, setFormData] = useState<FormData>(getInitialFormData());

  const createStaff = useCreateStaff();
  const updateStaff = useUpdateStaff();
  const deleteStaff = useDeleteStaff();


  useEffect(() => {
    if (!open) return;
    if (mode === "edit" && staff) {
      const roleFromDb = staff.staff_roles?.role;
      const role: AppRole | string = roleFromDb || (staff.is_driver ? "driver" : "cleaner");
      setFormData({
        fullName: staff.name,
        email: staff.email || "",
        phoneNumber: staff.phone || "",
        role,
        team: staff.team || "",
        paymentMethod: staff.payment_method || "zelle",
        zelleKey: staff.zelle_key || "",
        quickbooksVendorId: staff.quickbooks_vendor_id || "",
      });
      return;
    }
    setFormData(getInitialFormData());
  }, [mode, staff, open]);

  const handleChange = <K extends keyof FormData>(field: K, value: FormData[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.fullName.trim()) {
      toast.error("Please fill in all required fields");
      return;
    }
    if (!formData.email.trim()) {
      toast.error("Email is required to create or update the login");
      return;
    }

    // Validate Zelle key when payment method is Zelle
    if (formData.paymentMethod === "zelle" && !formData.zelleKey.trim()) {
      toast.error("Zelle key (email or phone) is required when using Zelle as payment method");
      return;
    }

    const staffData: StaffFormData = {
      name: formData.fullName.trim(),
      email: formData.email.trim(),
      phone: formData.phoneNumber.trim() || undefined,
      role: formData.role as AppRole,
      is_driver: roleToIsDriver(formData.role),
      team: formData.team || undefined,
      payment_method: formData.paymentMethod,
      zelle_key: formData.paymentMethod === "zelle" ? formData.zelleKey.trim() : undefined,
      quickbooks_vendor_id: formData.paymentMethod === "quickbooks" ? formData.quickbooksVendorId.trim() : undefined,
      is_active: staff?.is_active ?? true,
    };

    if (mode === "create") {
      createStaff.mutate(staffData, { onSuccess: () => onOpenChange(false) });
    } else if (staff) {
      updateStaff.mutate({ id: staff.id, ...staffData }, { onSuccess: () => onOpenChange(false) });
    }
  };

  const handleDelete = () => {
    if (staff) {
      deleteStaff.mutate(staff.id, {
        onSuccess: () => onOpenChange(false),
      });
    }
  };

  const isPending = createStaff.isPending || updateStaff.isPending || deleteStaff.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>{mode === "create" ? "Add Team Member" : "Edit Team Member"}</DialogTitle>
          <DialogDescription><T k="literal.settings.fill_in_the_team_member_information_below.da606bd3" /></DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 overflow-auto">
          <form id="team-user-form" onSubmit={handleSubmit} className="space-y-4 py-4 pr-4">
          <div className="space-y-2">
            <Label>Role *</Label>
            <Select value={formData.role} onValueChange={(value) => handleChange("role", value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                {FUNCTION_ROLES.map((role) => (
                  <SelectItem key={role.value} value={role.value}>
                    {role.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {(formData.role === "driver" || formData.role === "cleaner") && (
            <TeamSelector value={formData.team} onChange={(value) => handleChange("team", value)} />
          )}

          <div className="space-y-2">
            <Label>Full Name *</Label>
            <Input
              value={formData.fullName}
              onChange={(e) => handleChange("fullName", e.target.value)}
              placeholder="Enter full name"
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Email *</Label>
            <Input
              type="email"
              value={formData.email}
              onChange={(e) => handleChange("email", e.target.value)}
              placeholder="Enter email address"
              required
            />
          </div>

          <div className="space-y-2">
            <Label><T k="literal.settings.phone_number.ab25d61b" /></Label>
            <Input
              value={formData.phoneNumber}
              onChange={(e) => handleChange("phoneNumber", e.target.value)}
              placeholder="(000) 000-0000"
            />
          </div>

          {mode === "create" && (
            <p className="text-sm text-muted-foreground">
              <T k="literal.settings.an_invitation_email_will_let_this_team_membe.70738a20" />
            </p>
          )}

          {/* Payment Method Section */}
          <div className="space-y-2 pt-4 border-t">
            <Label>Payment Method *</Label>
            <Select value={formData.paymentMethod} onValueChange={(value) => handleChange("paymentMethod", value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select payment method" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="zelle"><T k="literal.settings.zelle.2a9876e6" /></SelectItem>
                <SelectItem value="quickbooks">QuickBooks</SelectItem>
                <SelectItem value="check"><T k="literal.settings.check.4b5e84be" /></SelectItem>
                <SelectItem value="cash"><T k="literal.settings.cash.758ec54e" /></SelectItem>
              </SelectContent>
            </Select>
          </div>

          {formData.paymentMethod === "zelle" && (
            <div className="space-y-2">
              <Label>Zelle Key (Email or Phone) *</Label>
              <Input
                value={formData.zelleKey}
                onChange={(e) => handleChange("zelleKey", e.target.value)}
                placeholder="Enter email or phone for Zelle"
                required
              />
              <p className="text-xs text-muted-foreground">
                <T k="literal.settings.this_will_be_used_to_send_payments_via_zelle.e78cd09e" />
              </p>
            </div>
          )}

          {formData.paymentMethod === "quickbooks" && (
            <div className="space-y-2">
              <Label><T k="literal.settings.quickbooks_vendor_employee_id.67ba260c" /></Label>
              <Input
                value={formData.quickbooksVendorId}
                onChange={(e) => handleChange("quickbooksVendorId", e.target.value)}
                placeholder="Enter QuickBooks vendor or employee ID"
              />
              <p className="text-xs text-muted-foreground">
                <T k="literal.settings.this_employee_will_be_linked_to_quickbooks_f.10ce4b7a" />
              </p>
            </div>
          )}
          </form>
        </ScrollArea>

        <DialogFooter className="flex justify-between sm:justify-between flex-shrink-0 pt-4 border-t">
          {mode === "edit" && staff && canDelete && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button type="button" variant="destructive" size="icon" disabled={isPending} aria-label="Delete team member">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle><T k="literal.settings.delete_team_member.50032753" /></AlertDialogTitle>
                  <AlertDialogDescription>
                    <T k="literal.settings.are_you_sure_you_want_to_delete_this_team_me.8b1aa436" />
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel><T k="common.cancel" /></AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete}><T k="common.delete" /></AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}

          <div className="flex gap-2 ml-auto">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              <T k="common.cancel" />
            </Button>
            <Button type="submit" form="team-user-form" disabled={isPending}>
              {isPending ? "Saving..." : mode === "create" ? "Add Member" : "Save Changes"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
