import { useEffect, useMemo, useRef, useState } from "react";
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
import { RefreshCw, Trash2, Upload, User, X } from "lucide-react";
import { toast } from "sonner";
import {
  Staff,
  StaffFormData,
  useCreateStaff,
  useDeleteStaff,
  useUpdateStaff,
} from "@/hooks/useStaff";
import type { Enums } from "@/integrations/supabase/types";
import { useBillingStore } from "@/stores/billing.store";

type AppRole = Enums<"app_role">;
export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
  status: "active" | "pending" | "inactive";
  phone?: string;
  username?: string;
  profileImage?: string;
}

interface Role {
  id: string;
  name: string;
  permissions: string[];
}

interface TeamUserModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  user: TeamMember | null;
  roles: Role[];
  onSave: (user: TeamMember) => void;
  onDelete?: (userId: string) => void;

  /** When true, this modal will persist to the staff table instead of local team members */
  useDatabase?: boolean;
  staff?: Staff | null;
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
  id: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  username: string;
  password: string;
  role: string;
  team: string;
  profileImage: string;
  profileImageFile: File | null;
  paymentMethod: string;
  zelleKey: string;
  quickbooksVendorId: string;
}

const generatePassword = (): string => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%";
  let password = "";
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
};

const getInitialFormData = (): FormData => ({
  id: Date.now().toString(),
  fullName: "",
  email: "",
  phoneNumber: "",
  username: "",
  password: generatePassword(),
  role: "",
  team: "",
  profileImage: "",
  profileImageFile: null,
  paymentMethod: "zelle",
  zelleKey: "",
  quickbooksVendorId: "",
});

function roleToIsDriver(role: AppRole | string): boolean {
  return role === "driver";
}

function TeamSelector({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const pricingPlans = useBillingStore((state) => state.pricingPlans);
  const teamCounts = useBillingStore((state) => state.teamCounts);
  
  // Get team count based on current plan's teamCounts
  const teamOptions = useMemo(() => {
    // Find the current plan (isCurrent = true)
    const currentPlan = pricingPlans.find((p) => p.isCurrent);
    
    if (!currentPlan) {
      // Fallback to 6 teams if no current plan
      return Array.from({ length: 6 }, (_, i) => String(i + 1));
    }
    
    // Get the team count for the current plan from teamCounts store
    const teamCount = teamCounts[currentPlan.id] || currentPlan.baseTeams;
    
    // If maxTeams is null (unlimited), cap at teamCount or 10
    const count = currentPlan.maxTeams === null 
      ? Math.max(teamCount, 10) 
      : teamCount;
    
    return Array.from({ length: count }, (_, i) => String(i + 1));
  }, [pricingPlans, teamCounts]);

  return (
    <div className="space-y-2">
      <Label>Team</Label>
      <Select value={value || "none"} onValueChange={(v) => onChange(v === "none" ? "" : v)}>
        <SelectTrigger>
          <SelectValue placeholder="Select team" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">Sem team definido</SelectItem>
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
  user,
  roles,
  onSave,
  onDelete,
  useDatabase = false,
  staff,
}: TeamUserModalProps) {
  const [formData, setFormData] = useState<FormData>(getInitialFormData());
  const imageInputRef = useRef<HTMLInputElement>(null);

  const createStaff = useCreateStaff();
  const updateStaff = useUpdateStaff();
  const deleteStaff = useDeleteStaff();


  useEffect(() => {
    if (useDatabase) {
      if (mode === "edit" && staff) {
        const roleFromDb = staff.staff_roles?.role;
        const role: AppRole | string = roleFromDb || (staff.is_driver ? "driver" : "cleaner");

        setFormData({
          id: staff.id,
          fullName: staff.name,
          email: staff.email || "",
          phoneNumber: staff.phone || "",
          username: "",
          password: "",
          role,
          team: staff.team || "",
          profileImage: "",
          profileImageFile: null,
          paymentMethod: staff.payment_method || "zelle",
          zelleKey: staff.zelle_key || "",
          quickbooksVendorId: staff.quickbooks_vendor_id || "",
        });
        return;
      }

      if (mode === "create") {
        // keep the same modal fields, but default role to Cleaner for staff
        setFormData({ ...getInitialFormData(), role: "cleaner" });
      }
      return;
    }

    // Local mode (original behavior)
    if (mode === "edit" && user) {
      setFormData({
        id: user.id,
        fullName: user.name,
        email: user.email,
        phoneNumber: user.phone || "",
        username: user.username || "",
        password: "",
        role: user.role,
        team: "",
        profileImage: user.profileImage || "",
        profileImageFile: null,
        paymentMethod: "zelle",
        zelleKey: "",
        quickbooksVendorId: "",
      });
    } else if (mode === "create") {
      setFormData(getInitialFormData());
    }
  }, [mode, user, staff, open, useDatabase]);

  const handleChange = <K extends keyof FormData>(field: K, value: FormData[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleRegeneratePassword = () => {
    handleChange("password", generatePassword());
    toast.success("New password generated!");
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be less than 5MB");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setFormData((prev) => ({
        ...prev,
        profileImage: reader.result as string,
        profileImageFile: file,
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    setFormData((prev) => ({
      ...prev,
      profileImage: "",
      profileImageFile: null,
    }));
    if (imageInputRef.current) imageInputRef.current.value = "";
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.fullName.trim()) {
      toast.error("Please fill in all required fields");
      return;
    }

    // Validate Zelle key when payment method is Zelle
    if (formData.paymentMethod === "zelle" && !formData.zelleKey.trim()) {
      toast.error("Zelle key (email or phone) is required when using Zelle as payment method");
      return;
    }

    if (useDatabase) {
      const staffData: StaffFormData = {
        name: formData.fullName.trim(),
        email: formData.email?.trim() ? formData.email.trim() : undefined,
        phone: formData.phoneNumber?.trim() ? formData.phoneNumber.trim() : undefined,
        role: formData.role as AppRole,
        is_driver: roleToIsDriver(formData.role),
        team: formData.team || undefined,
        payment_method: formData.paymentMethod,
        zelle_key: formData.paymentMethod === "zelle" ? formData.zelleKey.trim() : undefined,
        quickbooks_vendor_id: formData.paymentMethod === "quickbooks" ? formData.quickbooksVendorId.trim() : undefined,
        // keep active as-is; not edited in this modal
        is_active: staff?.is_active ?? true,
      };

      if (mode === "create") {
        createStaff.mutate(staffData, {
          onSuccess: () => onOpenChange(false),
        });
      } else if (mode === "edit" && staff) {
        updateStaff.mutate(
          { id: staff.id, ...staffData },
          {
            onSuccess: () => onOpenChange(false),
          }
        );
      }
      return;
    }

    // Local mode validations
    if (!formData.email || !formData.role) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (mode === "create" && !formData.username) {
      toast.error("Username is required");
      return;
    }

    const teamMember: TeamMember = {
      id: formData.id,
      name: formData.fullName,
      email: formData.email,
      role: formData.role,
      status: "active",
      phone: formData.phoneNumber,
      username: formData.username,
      profileImage: formData.profileImage,
    };

    onSave(teamMember);
    toast.success(mode === "create" ? "Team member created successfully!" : "Team member updated successfully!");
    onOpenChange(false);
  };

  const handleDelete = () => {
    if (useDatabase && staff) {
      deleteStaff.mutate(staff.id, {
        onSuccess: () => onOpenChange(false),
      });
      return;
    }

    if (user && onDelete) {
      onDelete(user.id);
      toast.success("Team member deleted successfully!");
      onOpenChange(false);
    }
  };

  const isPending = createStaff.isPending || updateStaff.isPending || deleteStaff.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>{mode === "create" ? "Add Team Member" : "Edit Team Member"}</DialogTitle>
          <DialogDescription>Fill in the team member information below</DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 overflow-auto">
          <form id="team-user-form" onSubmit={handleSubmit} className="space-y-4 py-4 pr-4">
          <div className="space-y-2">
            <Label>Profile Image</Label>
            <div className="flex items-center gap-4">
              <div className="relative">
                {formData.profileImage ? (
                  <div className="relative w-20 h-20 rounded-full overflow-hidden border-2 border-border">
                    <img src={formData.profileImage} alt="Profile" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={handleRemoveImage}
                      className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full p-1 hover:bg-destructive/90"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center border-2 border-dashed border-border">
                    <User className="w-8 h-8 text-muted-foreground" />
                  </div>
                )}
              </div>
              <div className="flex-1">
                <input
                  type="file"
                  ref={imageInputRef}
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageChange}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => imageInputRef.current?.click()}
                  className="gap-2"
                >
                  <Upload className="w-4 h-4" />
                  Upload Image
                </Button>
                <p className="text-xs text-muted-foreground mt-1">JPG, PNG or GIF. Max 5MB.</p>
              </div>
            </div>
          </div>

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
              required={!useDatabase}
            />
          </div>

          <div className="space-y-2">
            <Label>Phone Number</Label>
            <Input
              value={formData.phoneNumber}
              onChange={(e) => handleChange("phoneNumber", e.target.value)}
              placeholder="(000) 000-0000"
            />
          </div>

          <div className="space-y-2">
            <Label>Login (Username) *</Label>
            <Input
              value={formData.username}
              onChange={(e) => handleChange("username", e.target.value)}
              placeholder="Enter username"
              required={mode === "create" && !useDatabase}
            />
          </div>

          <div className="space-y-2">
            <Label>Password {mode === "create" ? "(Auto-generated)" : ""}</Label>
            <div className="flex gap-2">
              <Input 
                type="text" 
                value={formData.password} 
                onChange={(e) => handleChange("password", e.target.value)}
                placeholder={mode === "edit" ? "Leave blank to keep current" : ""}
                className="font-mono" 
                readOnly={mode === "create"}
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={handleRegeneratePassword}
                title="Generate new password"
              >
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>
            {mode === "create" && (
              <p className="text-xs text-muted-foreground">This password will be sent to the user. They must change it on first login.</p>
            )}
          </div>

          {/* Payment Method Section */}
          <div className="space-y-2 pt-4 border-t">
            <Label>Payment Method *</Label>
            <Select value={formData.paymentMethod} onValueChange={(value) => handleChange("paymentMethod", value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select payment method" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="zelle">Zelle</SelectItem>
                <SelectItem value="quickbooks">QuickBooks</SelectItem>
                <SelectItem value="check">Check</SelectItem>
                <SelectItem value="cash">Cash</SelectItem>
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
                This will be used to send payments via Zelle.
              </p>
            </div>
          )}

          {formData.paymentMethod === "quickbooks" && (
            <div className="space-y-2">
              <Label>QuickBooks Vendor/Employee ID</Label>
              <Input
                value={formData.quickbooksVendorId}
                onChange={(e) => handleChange("quickbooksVendorId", e.target.value)}
                placeholder="Enter QuickBooks vendor or employee ID"
              />
              <p className="text-xs text-muted-foreground">
                This employee will be linked to QuickBooks for payment processing. Leave blank to auto-create.
              </p>
            </div>
          )}
          </form>
        </ScrollArea>

        <DialogFooter className="flex justify-between sm:justify-between flex-shrink-0 pt-4 border-t">
          {mode === "edit" && (onDelete || useDatabase) && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button type="button" variant="destructive" size="icon" disabled={isPending}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Team Member</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete this team member? This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}

          <div className="flex gap-2 ml-auto">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
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
