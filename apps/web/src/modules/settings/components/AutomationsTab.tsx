import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Zap, Edit, Send, Loader2, Save, SaveAll, Plus, Trash2 } from "lucide-react";
import { 
  useAutomationConfigs, 
  useToggleAutomation, 
  useUpdateAutomationConfig, 
  useBulkUpdateAutomationConfigs,
  useCreateAutomation,
  useDeleteAutomation,
  CreateAutomationData,
  AutomationConfig,
} from "@/hooks/useAutomationConfigs";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

const TRIGGER_OPTIONS = [
  { value: "on_our_way", label: "On Our Way" },
  { value: "started", label: "Job Started" },
  { value: "finished", label: "Job Finished" },
  { value: "time_before", label: "Time Before Job" },
  { value: "time_after", label: "Time After Invoice" },
  { value: "invoice_created", label: "Invoice Created" },
  { value: "payment_received", label: "Payment Received" },
  { value: "estimate_created", label: "Estimate Created" },
  { value: "contract_created", label: "Contract Created" },
  { value: "contract_signed", label: "Contract Signed" },
];

const CATEGORY_OPTIONS = [
  { value: "job", label: "Job" },
  { value: "invoice", label: "Invoice" },
];

const MESSAGE_TO_OPTIONS = [
  { value: "text_phone_1", label: "Text Phone 1" },
  { value: "text_phone_2", label: "Text Phone 2" },
  { value: "email", label: "Email" },
];

export function AutomationsTab() {
  const { data: automations, isLoading } = useAutomationConfigs();
  const toggleAutomation = useToggleAutomation();
  const updateAutomation = useUpdateAutomationConfig();
  const bulkUpdate = useBulkUpdateAutomationConfigs();
  const createAutomation = useCreateAutomation();
  const deleteAutomation = useDeleteAutomation();
  
  const [editingAutomation, setEditingAutomation] = useState<string | null>(null);
  const [editedValues, setEditedValues] = useState<Record<string, Partial<AutomationConfig>>>({});
  const [showAddModal, setShowAddModal] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [newAutomation, setNewAutomation] = useState<CreateAutomationData>({
    trigger_type: "",
    label: "",
    category: "job",
    message_to: "text_phone_1",
    message: "",
    enabled: true,
  });

  const handleToggleAutomation = (id: string, currentEnabled: boolean) => {
    toggleAutomation.mutate({ id, enabled: !currentEnabled });
  };

  const handleEditField = <Key extends keyof AutomationConfig>(id: string, field: Key, value: AutomationConfig[Key]) => {
    setEditedValues(prev => ({
      ...prev,
      [id]: {
        ...prev[id],
        [field]: value,
      },
    }));
  };

  const handleSaveChanges = (id: string) => {
    const changes = editedValues[id];
    if (!changes) return;

    updateAutomation.mutate(
      { id, ...changes },
      {
        onSuccess: () => {
          toast.success("Automation saved");
          setEditedValues(prev => {
            const newValues = { ...prev };
            delete newValues[id];
            return newValues;
          });
          setEditingAutomation(null);
        },
      }
    );
  };

  const handleSaveAllChanges = () => {
    const updates = Object.entries(editedValues).map(([id, changes]) => ({
      id,
      ...changes,
    }));

    if (updates.length === 0) {
      toast.info("No changes to save");
      return;
    }

    bulkUpdate.mutate(updates, {
      onSuccess: () => {
        setEditedValues({});
        setEditingAutomation(null);
      },
    });
  };

  const handleCreateAutomation = () => {
    if (!newAutomation.trigger_type || !newAutomation.label || !newAutomation.message) {
      toast.error("Please fill in all required fields");
      return;
    }

    createAutomation.mutate(newAutomation, {
      onSuccess: () => {
        setShowAddModal(false);
        setNewAutomation({
          trigger_type: "",
          label: "",
          category: "job",
          message_to: "text_phone_1",
          message: "",
          enabled: true,
        });
      },
    });
  };

  const handleDeleteAutomation = () => {
    if (!deleteConfirmId) return;
    deleteAutomation.mutate(deleteConfirmId, {
      onSuccess: () => setDeleteConfirmId(null),
    });
  };

  const hasUnsavedChanges = Object.keys(editedValues).length > 0;

  const getFieldValue = <Key extends keyof AutomationConfig>(automation: AutomationConfig, field: Key): AutomationConfig[Key] => {
    const editedValue = editedValues[automation.id]?.[field];
    if (editedValue !== undefined) {
      return editedValue as AutomationConfig[Key];
    }
    return automation[field];
  };

  const getTriggerDescription = (automation: AutomationConfig) => {
    const trigger = TRIGGER_OPTIONS.find(t => t.value === automation.trigger_type);
    let desc = `When ${trigger?.label || automation.trigger_type}`;
    
    if (automation.trigger_type === "time_before") {
      desc = `${automation.delay_value || 2} ${automation.delay_type || "days"} before job`;
      if (automation.send_at_time) desc += ` at ${automation.send_at_time}`;
    } else if (automation.trigger_type === "time_after") {
      desc = `${automation.delay_value || 3} ${automation.delay_type || "days"} after invoice`;
      if (automation.send_at_time) desc += ` at ${automation.send_at_time}`;
      if (automation.condition) desc += ` (${automation.condition === "payment_no" ? "if unpaid" : ""})`;
    }
    
    return desc;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5" />
            Automations
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5" />
                Automations
              </CardTitle>
              <CardDescription>
                Configure automated messages for job status changes and reminders.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => setShowAddModal(true)} className="gap-2">
                <Plus className="w-4 h-4" />
                Add Automation
              </Button>
              <Button 
                onClick={handleSaveAllChanges}
                disabled={bulkUpdate.isPending || !hasUnsavedChanges}
                variant={hasUnsavedChanges ? "default" : "outline"}
                className="gap-2"
              >
                {bulkUpdate.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <SaveAll className="w-4 h-4" />
                )}
                Save All {hasUnsavedChanges && `(${Object.keys(editedValues).length})`}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {automations?.map((automation) => (
            <div key={automation.id} className="border border-border rounded-lg p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${automation.enabled ? "bg-success/10" : "bg-muted"}`}>
                    <Send className={`w-5 h-5 ${automation.enabled ? "text-success" : "text-muted-foreground"}`} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">{automation.label}</h4>
                      <Badge variant={automation.enabled ? "default" : "secondary"} className="text-xs">
                        {automation.enabled ? "Running by Default" : "Disabled"}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {getTriggerDescription(automation)}, send message
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => setEditingAutomation(editingAutomation === automation.id ? null : automation.id)}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => setDeleteConfirmId(automation.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                  <Switch 
                    checked={automation.enabled} 
                    onCheckedChange={() => handleToggleAutomation(automation.id, automation.enabled)}
                    disabled={toggleAutomation.isPending}
                  />
                </div>
              </div>

              {editingAutomation === automation.id && (
                <div className="border-t border-border pt-4 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Label</Label>
                      <Input 
                        value={getFieldValue(automation, "label")} 
                        onChange={(e) => handleEditField(automation.id, "label", e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Category</Label>
                      <Select 
                        value={getFieldValue(automation, "category")} 
                        onValueChange={(v) => handleEditField(automation.id, "category", v)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CATEGORY_OPTIONS.map(opt => (
                            <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
                    <div className="space-y-2">
                      <Label>Trigger</Label>
                      <Select 
                        value={getFieldValue(automation, "trigger_type")} 
                        onValueChange={(v) => handleEditField(automation.id, "trigger_type", v)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {TRIGGER_OPTIONS.map(opt => (
                            <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Delay Type</Label>
                      <Select 
                        value={getFieldValue(automation, "delay_type") || "hours"} 
                        onValueChange={(v) => handleEditField(automation.id, "delay_type", v)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="hours">Hours</SelectItem>
                          <SelectItem value="days">Days</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>{getFieldValue(automation, "delay_type") === "days" ? "Days" : "Hours"}</Label>
                      <Input 
                        type="number" 
                        min={0}
                        value={getFieldValue(automation, "delay_value") ?? 0} 
                        onChange={(e) => handleEditField(automation.id, "delay_value", parseInt(e.target.value))}
                      />
                    </div>

                    {(getFieldValue(automation, "trigger_type") === "time_before" || 
                      getFieldValue(automation, "trigger_type") === "time_after") && (
                      <div className="space-y-2">
                        <Label>Send At Time</Label>
                        <Input 
                          type="time" 
                          value={getFieldValue(automation, "send_at_time") || "10:00"} 
                          onChange={(e) => handleEditField(automation.id, "send_at_time", e.target.value)}
                        />
                      </div>
                    )}
                  </div>

                  {getFieldValue(automation, "trigger_type") === "time_after" && (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Condition</Label>
                        <Select 
                          value={getFieldValue(automation, "condition") || ""} 
                          onValueChange={(v) => handleEditField(automation.id, "condition", v)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select condition" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="payment_no">Payment = No</SelectItem>
                            <SelectItem value="payment_yes">Payment = Yes</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Message To</Label>
                      <Select 
                        value={getFieldValue(automation, "message_to")} 
                        onValueChange={(v) => handleEditField(automation.id, "message_to", v)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {MESSAGE_TO_OPTIONS.map(opt => (
                            <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Message</Label>
                    <Textarea 
                      value={getFieldValue(automation, "message")} 
                      onChange={(e) => handleEditField(automation.id, "message", e.target.value)}
                      rows={6}
                    />
                    <p className="text-xs text-muted-foreground">
                      Variables: {"{ClientName}"}, {"{CompanyName}"}, {"{JobDate}"}, {"{InvoiceNumber}"}, {"{InvoiceLink}"}, {"{EstimateLink}"}, {"{ContractLink}"}, {"{ReceiptLink}"}
                    </p>
                  </div>

                  {editedValues[automation.id] && Object.keys(editedValues[automation.id]).length > 0 && (
                    <div className="flex justify-end">
                      <Button 
                        onClick={() => handleSaveChanges(automation.id)}
                        disabled={updateAutomation.isPending}
                        className="gap-2"
                      >
                        {updateAutomation.isPending ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Save className="w-4 h-4" />
                        )}
                        Save Changes
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Add Automation Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add New Automation</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Label *</Label>
                <Input 
                  value={newAutomation.label} 
                  onChange={(e) => setNewAutomation(prev => ({ ...prev, label: e.target.value }))}
                  placeholder="e.g., On Our Way"
                />
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Select 
                  value={newAutomation.category} 
                  onValueChange={(v) => setNewAutomation(prev => ({ ...prev, category: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORY_OPTIONS.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Trigger *</Label>
                <Select 
                  value={newAutomation.trigger_type} 
                  onValueChange={(v) => setNewAutomation(prev => ({ ...prev, trigger_type: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select trigger" />
                  </SelectTrigger>
                  <SelectContent>
                    {TRIGGER_OPTIONS.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Message To</Label>
                <Select 
                  value={newAutomation.message_to} 
                  onValueChange={(v) => setNewAutomation(prev => ({ ...prev, message_to: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MESSAGE_TO_OPTIONS.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {(newAutomation.trigger_type === "time_before" || newAutomation.trigger_type === "time_after") && (
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Delay Type</Label>
                  <Select 
                    value={newAutomation.delay_type || "days"} 
                    onValueChange={(v) => setNewAutomation(prev => ({ ...prev, delay_type: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hours">Hours</SelectItem>
                      <SelectItem value="days">Days</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{newAutomation.delay_type === "hours" ? "Hours" : "Days"}</Label>
                  <Input 
                    type="number" 
                    min={1}
                    value={newAutomation.delay_value || ""} 
                    onChange={(e) => setNewAutomation(prev => ({ ...prev, delay_value: parseInt(e.target.value) || null }))}
                    placeholder="2"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Send At Time</Label>
                  <Input 
                    type="time" 
                    value={newAutomation.send_at_time || "10:00"} 
                    onChange={(e) => setNewAutomation(prev => ({ ...prev, send_at_time: e.target.value }))}
                  />
                </div>
              </div>
            )}

            {newAutomation.trigger_type === "time_after" && (
              <div className="space-y-2">
                <Label>Condition</Label>
                <Select 
                  value={newAutomation.condition || ""} 
                  onValueChange={(v) => setNewAutomation(prev => ({ ...prev, condition: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select condition (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="payment_no">Payment = No</SelectItem>
                    <SelectItem value="payment_yes">Payment = Yes</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label>Message *</Label>
              <Textarea 
                value={newAutomation.message} 
                onChange={(e) => setNewAutomation(prev => ({ ...prev, message: e.target.value }))}
                rows={6}
                placeholder="Hi {ClientName}!&#10;&#10;Your message here...&#10;&#10;{CompanyName}"
              />
              <p className="text-xs text-muted-foreground">
                Variables: {"{ClientName}"}, {"{CompanyName}"}, {"{JobDate}"}, {"{InvoiceNumber}"}, {"{InvoiceLink}"}, {"{EstimateLink}"}, {"{ContractLink}"}, {"{ReceiptLink}"}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateAutomation} disabled={createAutomation.isPending}>
              {createAutomation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Create Automation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Automation</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this automation? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteAutomation}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteAutomation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
