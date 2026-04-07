export type MvpStatus =
  | "active"
  | "connected"
  | "pending"
  | "under_review"
  | "approved"
  | "verified"
  | "rejected"
  | "completed"
  | "blocked"
  | "inactive"
  | "warning"
  | "stale"
  | "critical"
  | "draft"
  | "submitted"
  | "queued"
  | "processing"
  | "not_started"
  | "in_progress"
  | "needs_update";

export type StatusMeta = {
  label: string;
  variant: "secondary" | "outline" | "destructive";
  className?: string;
};

export const MVP_STATUS_META: Record<MvpStatus, StatusMeta> = {
  active: {
    label: "Active",
    variant: "secondary",
    className: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  },
  connected: {
    label: "Connected",
    variant: "secondary",
    className: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  },
  pending: {
    label: "Pending",
    variant: "outline",
    className: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  },
  under_review: {
    label: "Under Review",
    variant: "outline",
    className: "bg-sky-500/10 text-sky-700 dark:text-sky-300",
  },
  approved: {
    label: "Approved",
    variant: "secondary",
    className: "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300",
  },
  verified: {
    label: "Verified",
    variant: "secondary",
    className: "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300",
  },
  rejected: { label: "Rejected", variant: "destructive" },
  completed: {
    label: "Completed",
    variant: "secondary",
    className: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  },
  blocked: { label: "Blocked", variant: "destructive" },
  inactive: {
    label: "Inactive",
    variant: "outline",
    className: "bg-muted text-muted-foreground",
  },
  warning: {
    label: "Warning",
    variant: "outline",
    className: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  },
  stale: {
    label: "Stale",
    variant: "outline",
    className: "bg-orange-500/15 text-orange-700 dark:text-orange-300",
  },
  critical: { label: "Critical", variant: "destructive" },
  draft: {
    label: "Draft",
    variant: "outline",
    className: "bg-muted text-muted-foreground",
  },
  submitted: {
    label: "Submitted",
    variant: "outline",
    className: "bg-sky-500/10 text-sky-700 dark:text-sky-300",
  },
  queued: {
    label: "Queued",
    variant: "outline",
    className: "bg-indigo-500/10 text-indigo-700 dark:text-indigo-300",
  },
  processing: {
    label: "Processing",
    variant: "outline",
    className: "bg-violet-500/10 text-violet-700 dark:text-violet-300",
  },
  not_started: {
    label: "Not Started",
    variant: "outline",
    className: "bg-muted text-muted-foreground",
  },
  in_progress: {
    label: "In Progress",
    variant: "outline",
    className: "bg-blue-500/10 text-blue-700 dark:text-blue-300",
  },
  needs_update: {
    label: "Needs Update",
    variant: "outline",
    className: "bg-yellow-500/15 text-yellow-700 dark:text-yellow-300",
  },
};
