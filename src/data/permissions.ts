export interface Permission {
  id: string;
  label: string;
  description: string;
  type: "toggle" | "dropdown";
}

export interface PermissionCategory {
  id: string;
  label: string;
  permissions: Permission[];
}

export const scheduleVisibilityOptions = [
  { value: "all_days", label: "All Days" },
  { value: "today_tomorrow_6pm", label: "Today + Tomorrow at 6pm" },
  { value: "current_week", label: "Current Week" },
];

// ============================================
// PERMISSION CATEGORIES
// ============================================

export const permissionCategories: PermissionCategory[] = [
  {
    id: "job_status",
    label: "Job Status Tracking",
    permissions: [
      {
        id: "trigger_job_status",
        label: "Trigger Job Status",
        description: "Can mark status steps (On Our Way, Cleaning Now, Cleaning Done)",
        type: "toggle",
      },
      {
        id: "edit_job_status",
        label: "Edit Job Status Times",
        description: "Can manually edit status timestamps after they are set",
        type: "toggle",
      },
      {
        id: "view_status_history",
        label: "View Status History",
        description: "Can view the GPS tracking history and audit log",
        type: "toggle",
      },
    ],
  },
  {
    id: "schedule",
    label: "Schedule",
    permissions: [
      {
        id: "view_schedule",
        label: "View Schedule",
        description: "Can view the schedule calendar",
        type: "toggle",
      },
      {
        id: "create_jobs",
        label: "Create Jobs",
        description: "Can create new jobs",
        type: "toggle",
      },
      {
        id: "edit_jobs",
        label: "Edit Jobs",
        description: "Can edit existing jobs",
        type: "toggle",
      },
      {
        id: "delete_jobs",
        label: "Delete Jobs",
        description: "Can delete jobs",
        type: "toggle",
      },
    ],
  },
];

// Flat list of all permissions
export const allPermissions = permissionCategories.flatMap(cat => cat.permissions);

// Get all permission IDs as a type
export type PermissionId = typeof allPermissions[number]["id"];
