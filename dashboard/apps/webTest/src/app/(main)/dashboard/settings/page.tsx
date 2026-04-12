"use client";

import * as React from "react";

import { SaveIcon, ShieldAlertIcon } from "lucide-react";
import { toast } from "sonner";

import { MvpInlineLoading } from "@/app/(main)/dashboard/_mvp/components/state-blocks";
import {
  formatDateTime,
  formatNumber,
} from "@/app/(main)/dashboard/_mvp/components/formatters";
import { MvpKpiCard } from "@/app/(main)/dashboard/_mvp/components/kpi-card";
import { MvpPageHeader } from "@/app/(main)/dashboard/_mvp/components/page-header";
import { MvpSectionCard } from "@/app/(main)/dashboard/_mvp/components/section-card";
import {
  MvpSimpleTable,
  type MvpTableColumn,
} from "@/app/(main)/dashboard/_mvp/components/simple-table";
import { StatusBadge } from "@/app/(main)/dashboard/_mvp/components/status-badge";

import type {
  SettingsNotificationPreference,
  SettingsProfile,
  SettingsSecuritySession,
} from "@/app/(main)/dashboard/_mvp/types";

import { useI18n } from "@/components/providers/language-provider";
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
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useMeQuery } from "@/lib/queries/auth";
import {
  useDashboardStateQuery,
  useUpdateDashboardSettingsMutation,
} from "@/lib/queries/dashboard";
import { hasAccessPermission, type UserAccess } from "@/lib/rbac/route-access";

type SaveState = "idle" | "saving" | "saved" | "error";
type ProfileErrors = Partial<Record<keyof SettingsProfile, string>>;
type SettingsDashboardPreferences = {
  defaultLandingPage: string;
  compactTableDensity: boolean;
  showUsdInMillions: boolean;
  weeklyDigest: boolean;
  documentDelivery: string;
};

const initialProfile: SettingsProfile = {
  fullName: "",
  organization: "",
  email: "",
  contactPhone: "",
  timezone: "UTC",
  baseCurrency: "USD",
  reportingContact: "",
};
const USER_NOTIFICATION_TEMPLATES: Array<
  Omit<SettingsNotificationPreference, "enabled">
> = [
  {
    id: "user-redemption-approved",
    label: "Redemption approved",
    description: "Email when your redemption request is approved.",
    channel: "email",
  },
  {
    id: "user-mint-approved",
    label: "Mint approved",
    description: "Email when your mint request is approved.",
    channel: "email",
  },
  {
    id: "user-kyb-approved",
    label: "KYB approved",
    description: "Email when your KYB verification is approved.",
    channel: "email",
  },
];
const initialNotifications: SettingsNotificationPreference[] =
  USER_NOTIFICATION_TEMPLATES.map((item) => ({
    ...item,
    enabled: true,
  }));
const initialSessions: SettingsSecuritySession[] = [];
const initialPreferences: SettingsDashboardPreferences = {
  defaultLandingPage: "/dashboard/overview",
  compactTableDensity: false,
  showUsdInMillions: false,
  weeklyDigest: false,
  documentDelivery: "email",
};

function canEditOwnSettings(access: UserAccess | null | undefined) {
  if (!access) {
    return false;
  }
  if (access.roleSlugs.includes("read_only")) {
    return false;
  }
  return hasAccessPermission(access, "settings.view");
}

function validateProfile(input: SettingsProfile): ProfileErrors {
  const errors: ProfileErrors = {};

  if (!input.fullName.trim()) {
    errors.fullName = "Full name is required.";
  }
  if (!input.organization.trim()) {
    errors.organization = "Organization is required.";
  }
  if (!input.email.trim() || !input.email.includes("@")) {
    errors.email = "Valid email is required.";
  }
  if (!input.reportingContact.trim() || !input.reportingContact.includes("@")) {
    errors.reportingContact = "Reporting contact email is required.";
  }

  return errors;
}

export default function Page() {
  const { tt } = useI18n();
  const meQuery = useMeQuery();
  const dashboardStateQuery = useDashboardStateQuery();
  const updateSettingsMutation = useUpdateDashboardSettingsMutation();
  const canEditSettings = canEditOwnSettings(meQuery.data?.access);
  const [profile, setProfile] = React.useState<SettingsProfile>(initialProfile);
  const [notifications, setNotifications] =
    React.useState<SettingsNotificationPreference[]>(initialNotifications);
  const [sessions, setSessions] =
    React.useState<SettingsSecuritySession[]>(initialSessions);
  const [preferences, setPreferences] =
    React.useState<SettingsDashboardPreferences>(initialPreferences);

  const [mfaEnabled, setMfaEnabled] = React.useState(true);
  const [sessionTimeout, setSessionTimeout] = React.useState("30");
  const [profileErrors, setProfileErrors] = React.useState<ProfileErrors>({});
  const [saveState, setSaveState] = React.useState<SaveState>("idle");
  const [activeTab, setActiveTab] = React.useState("profile");
  const baselineRef = React.useRef({
    profile: initialProfile,
    notifications: initialNotifications,
    sessions: initialSessions,
    preferences: initialPreferences,
    mfaEnabled: true,
    sessionTimeout: "30",
  });

  function buildUserNotificationsFromState(
    entries: SettingsNotificationPreference[],
  ) {
    const byLabel = new Map(entries.map((entry) => [entry.label, entry]));
    return USER_NOTIFICATION_TEMPLATES.map((template) => ({
      ...template,
      enabled: byLabel.get(template.label)?.enabled ?? true,
    }));
  }

  React.useEffect(() => {
    if (!dashboardStateQuery.data) {
      return;
    }

    const nextProfile = dashboardStateQuery.data.settingsProfile;
    const nextNotifications = buildUserNotificationsFromState(
      dashboardStateQuery.data.settingsNotificationPreferences,
    );
    const nextSessions = dashboardStateQuery.data.settingsSecuritySessions;
    const nextPreferences =
      dashboardStateQuery.data.settingsDashboardPreferences;

    setProfile(nextProfile);
    setNotifications(nextNotifications);
    setSessions(nextSessions);
    setPreferences(nextPreferences);
    setMfaEnabled(true);
    setSessionTimeout("30");

    baselineRef.current = {
      profile: nextProfile,
      notifications: nextNotifications,
      sessions: nextSessions,
      preferences: nextPreferences,
      mfaEnabled: true,
      sessionTimeout: "30",
    };
  }, [dashboardStateQuery.data]);

  const dirty = React.useMemo(() => {
    return (
      JSON.stringify(profile) !== JSON.stringify(baselineRef.current.profile) ||
      JSON.stringify(notifications) !==
        JSON.stringify(baselineRef.current.notifications) ||
      JSON.stringify(sessions) !==
        JSON.stringify(baselineRef.current.sessions) ||
      JSON.stringify(preferences) !==
        JSON.stringify(baselineRef.current.preferences) ||
      mfaEnabled !== baselineRef.current.mfaEnabled ||
      sessionTimeout !== baselineRef.current.sessionTimeout
    );
  }, [
    mfaEnabled,
    notifications,
    preferences,
    profile,
    sessionTimeout,
    sessions,
  ]);

  const enabledNotificationCount = notifications.filter(
    (item) => item.enabled,
  ).length;
  const criticalNotificationCount = notifications.filter(
    (item) => item.enabled && item.criticalOnly,
  ).length;
  const activeSessionCount = sessions.filter(
    (item) => item.status === "active",
  ).length;

  function setProfileField<K extends keyof SettingsProfile>(
    field: K,
    value: SettingsProfile[K],
  ) {
    if (!canEditSettings) {
      return;
    }
    setProfile((previous) => ({ ...previous, [field]: value }));
    setProfileErrors((previous) => ({ ...previous, [field]: undefined }));
  }

  function toggleNotification(
    id: string,
    key: "enabled" | "criticalOnly",
    value: boolean,
  ) {
    if (!canEditSettings) {
      return;
    }
    setNotifications((previous) =>
      previous.map((item) =>
        item.id === id
          ? {
              ...item,
              [key]: value,
            }
          : item,
      ),
    );
  }

  function channelLabel(channel: SettingsNotificationPreference["channel"]) {
    if (channel === "email") {
      return tt("Email");
    }
    if (channel === "in_app") {
      return tt("In-app inbox");
    }
    return "SMS";
  }

  function revokeSession(id: string) {
    if (!canEditSettings) {
      return;
    }
    setSessions((previous) => previous.filter((session) => session.id !== id));
    toast.success(tt("Session revoked."));
  }

  const sessionColumns: MvpTableColumn<SettingsSecuritySession>[] = React.useMemo(() => [
    {
      id: "device",
      header: tt("Device"),
      cell: (row) => (
        <div>
          <p className="font-medium text-sm">{row.device}</p>
          <p className="text-muted-foreground text-xs">{row.location}</p>
        </div>
      ),
    },
    {
      id: "ip",
      header: tt("IP"),
      cell: (row) => row.ipAddress,
    },
    {
      id: "lastActiveAt",
      header: tt("Last active"),
      cell: (row) => formatDateTime(row.lastActiveAt),
    },
    {
      id: "status",
      header: tt("Status"),
      cell: (row) => (
        <div className="flex items-center gap-2">
          <StatusBadge status={row.status} />
          {row.current ? (
            <span className="rounded-md bg-muted px-2 py-1 text-xs">
              {tt("Current")}
            </span>
          ) : null}
        </div>
      ),
    },
    {
      id: "actions",
      header: "",
      className: "text-right",
      cell: (row) =>
        row.current ? (
          <span className="text-muted-foreground text-xs">
            {tt("Active now")}
          </span>
        ) : (
          <Button
            variant="outline"
            size="sm"
            disabled={!canEditSettings}
            onClick={() => revokeSession(row.id)}
          >
            {tt("Revoke")}
          </Button>
        ),
    },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [tt, canEditSettings]);

  async function saveChanges() {
    if (!canEditSettings) {
      return;
    }
    const validationErrors = validateProfile(profile);
    setProfileErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) {
      setSaveState("error");
      toast.error(tt("Please fix profile validation errors before saving."));
      return;
    }

    try {
      setSaveState("saving");
      await updateSettingsMutation.mutateAsync({
        profile: {
          fullName: profile.fullName,
          email: profile.email,
          contactPhone: profile.contactPhone,
          timezone: profile.timezone,
          baseCurrency: profile.baseCurrency,
          reportingContact: profile.reportingContact,
        },
        notificationPreferences: notifications.map((entry) => ({
          id: entry.id,
          preferenceKey: entry.label,
          channel: entry.channel,
          enabled: entry.enabled,
          criticalOnly: entry.criticalOnly,
        })),
        dashboardPreferences: {
          defaultLandingPage: preferences.defaultLandingPage,
          compactTableDensity: preferences.compactTableDensity,
          showUsdInMillions: preferences.showUsdInMillions,
          weeklyDigest: preferences.weeklyDigest,
          documentDelivery: preferences.documentDelivery as "email" | "in_app",
        },
      });

      baselineRef.current = {
        profile,
        notifications,
        sessions,
        preferences,
        mfaEnabled,
        sessionTimeout,
      };

      setSaveState("saved");
      toast.success(tt("Settings saved."));
    } catch (error) {
      setSaveState("error");
      toast.error(
        error instanceof Error
          ? error.message
          : tt("Settings could not be saved."),
      );
    }
  }

  function discardChanges() {
    if (!canEditSettings) {
      return;
    }
    setProfile(baselineRef.current.profile);
    setNotifications(baselineRef.current.notifications);
    setSessions(baselineRef.current.sessions);
    setPreferences(baselineRef.current.preferences);
    setMfaEnabled(baselineRef.current.mfaEnabled);
    setSessionTimeout(baselineRef.current.sessionTimeout);
    setProfileErrors({});
    setSaveState("idle");
  }

  function revokeAllOtherSessions() {
    if (!canEditSettings) {
      return;
    }
    setSessions((previous) => previous.filter((session) => session.current));
    toast.success(tt("All non-current sessions were revoked."));
  }

  function setMfaEnabledValue(nextValue: boolean) {
    if (!canEditSettings) {
      return;
    }
    setMfaEnabled(nextValue);
  }

  function setSessionTimeoutValue(nextValue: string) {
    if (!canEditSettings) {
      return;
    }
    setSessionTimeout(nextValue);
  }

  function setPreferenceField<K extends keyof SettingsDashboardPreferences>(
    field: K,
    value: SettingsDashboardPreferences[K],
  ) {
    if (!canEditSettings) {
      return;
    }
    setPreferences((previous) => ({
      ...previous,
      [field]: value,
    }));
  }

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <MvpPageHeader
        title={tt("Settings")}
        description={tt("Configure profile, notifications, security controls, and dashboard preferences.")}
        actions={
          <>
            <Button
              variant="outline"
              onClick={discardChanges}
              disabled={!canEditSettings || !dirty || saveState === "saving"}
            >
              {tt("Discard")}
            </Button>
            <Button
              onClick={() => void saveChanges()}
              disabled={!canEditSettings || !dirty || saveState === "saving"}
            >
              <SaveIcon className="size-4" />
              {tt("Save changes")}
            </Button>
          </>
        }
      />
      {!canEditSettings ? (
        <p className="text-muted-foreground text-sm">
          {tt("This action requires settings edit access.")}
        </p>
      ) : null}

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MvpKpiCard
          label={tt("Enabled notifications")}
          value={formatNumber(enabledNotificationCount)}
          hint={`${criticalNotificationCount} ${tt("critical-only channels")}`}
          status="active"
        />
        <MvpKpiCard
          label={tt("Active sessions")}
          value={formatNumber(activeSessionCount)}
          hint={tt("Current signed-in devices")}
          status="active"
        />
        <MvpKpiCard
          label={tt("MFA status")}
          value={tt(mfaEnabled ? "Enabled" : "Disabled")}
          hint={tt("Second factor requirement for privileged actions")}
          status={mfaEnabled ? "approved" : "warning"}
        />
        <MvpKpiCard
          label={tt("Pending edits")}
          value={dirty ? tt("Unsaved") : tt("Synced")}
          hint={
            saveState === "saved"
              ? tt("Last save completed successfully.")
              : tt("No backend persistence in MVP mode.")
          }
          status={dirty ? "warning" : "completed"}
        />
      </section>

      {saveState === "saving" ? (
        <MvpInlineLoading label={tt("Saving settings...")} />
      ) : saveState === "error" ? (
        <p className="text-destructive text-sm">
          {tt("Settings could not be saved. Check highlighted fields.")}
        </p>
      ) : null}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList variant="line" className="w-full justify-start overflow-auto">
          <TabsTrigger value="profile">{tt("Profile")}</TabsTrigger>
          <TabsTrigger value="notifications">{tt("Notifications")}</TabsTrigger>
          <TabsTrigger value="security">{tt("Security")}</TabsTrigger>
          <TabsTrigger value="preferences">{tt("Preferences")}</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-4">
          <MvpSectionCard
            title={tt("Profile and organization")}
            description={tt("Primary account identity and operational contact details.")}
          >
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="settings-fullName">{tt("Full name")}</Label>
                <Input
                  id="settings-fullName"
                  value={profile.fullName}
                  onChange={(event) =>
                    setProfileField("fullName", event.target.value)
                  }
                />
                {profileErrors.fullName ? (
                  <p className="text-destructive text-xs">
                    {tt(profileErrors.fullName)}
                  </p>
                ) : null}
              </div>

              <div className="space-y-2">
                <Label htmlFor="settings-organization">
                  {tt("Organization")}
                </Label>
                <Input
                  id="settings-organization"
                  value={profile.organization}
                  onChange={(event) =>
                    setProfileField("organization", event.target.value)
                  }
                />
                {profileErrors.organization ? (
                  <p className="text-destructive text-xs">
                    {tt(profileErrors.organization)}
                  </p>
                ) : null}
              </div>

              <div className="space-y-2">
                <Label htmlFor="settings-email">{tt("Email")}</Label>
                <Input
                  id="settings-email"
                  value={profile.email}
                  onChange={(event) =>
                    setProfileField("email", event.target.value)
                  }
                />
                {profileErrors.email ? (
                  <p className="text-destructive text-xs">
                    {tt(profileErrors.email)}
                  </p>
                ) : null}
              </div>

              <div className="space-y-2">
                <Label htmlFor="settings-phone">{tt("Phone")}</Label>
                <Input
                  id="settings-phone"
                  value={profile.contactPhone}
                  onChange={(event) =>
                    setProfileField("contactPhone", event.target.value)
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="settings-timezone">{tt("Timezone")}</Label>
                <Select
                  value={profile.timezone}
                  onValueChange={(value) => setProfileField("timezone", value)}
                >
                  <SelectTrigger id="settings-timezone">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Europe/Istanbul">
                      Europe/Istanbul
                    </SelectItem>
                    <SelectItem value="UTC">UTC</SelectItem>
                    <SelectItem value="America/New_York">
                      America/New_York
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="settings-currency">{tt("Base currency")}</Label>
                <Select
                  value={profile.baseCurrency}
                  onValueChange={(value) =>
                    setProfileField("baseCurrency", value)
                  }
                >
                  <SelectTrigger id="settings-currency">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                    <SelectItem value="TRY">TRY</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="settings-reporting">
                  {tt("Reporting contact email")}
                </Label>
                <Input
                  id="settings-reporting"
                  value={profile.reportingContact}
                  onChange={(event) =>
                    setProfileField("reportingContact", event.target.value)
                  }
                />
                {profileErrors.reportingContact ? (
                  <p className="text-destructive text-xs">
                    {tt(profileErrors.reportingContact)}
                  </p>
                ) : null}
              </div>
            </div>
          </MvpSectionCard>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-4">
          <MvpSectionCard
            title={tt("Security notification preferences")}
            description={tt("Choose which email updates you receive for approvals and verification milestones.")}
            contentClassName="space-y-3"
          >
            {notifications.map((item) => (
              <div
                key={item.id}
                className="flex flex-col gap-3 rounded-lg border bg-muted/20 p-3 md:flex-row md:items-center md:justify-between"
              >
                <div>
                  <p className="font-medium text-sm">{tt(item.label)}</p>
                  <p className="text-muted-foreground text-xs">
                    {tt(item.description)}
                  </p>
                  <p className="mt-1 text-muted-foreground text-xs">
                    {tt("Channel")}: {channelLabel(item.channel)}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Label htmlFor={`${item.id}-enabled`} className="text-xs">
                      {tt("Enabled")}
                    </Label>
                    <Switch
                      id={`${item.id}-enabled`}
                      checked={item.enabled}
                      disabled={!canEditSettings}
                      onCheckedChange={(checked) =>
                        toggleNotification(item.id, "enabled", checked)
                      }
                      />
                  </div>
                </div>
              </div>
            ))}
          </MvpSectionCard>
        </TabsContent>

        <TabsContent value="security" className="space-y-4">
          <MvpSectionCard
            title={tt("Security controls")}
            description={tt("Session and authentication controls for account protection.")}
          >
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="flex items-center justify-between rounded-lg border bg-muted/20 p-3">
                <div>
                  <p className="font-medium text-sm">
                    {tt("Require MFA for admin actions")}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    {tt(
                      "Applies to mint, redeem, and contract control mutations.",
                    )}
                  </p>
                </div>
                <Switch
                  checked={mfaEnabled}
                  onCheckedChange={setMfaEnabledValue}
                  disabled={!canEditSettings}
                />
              </div>

              <div className="rounded-lg border bg-muted/20 p-3">
                <Label htmlFor="settings-session-timeout">
                  {tt("Session timeout")}
                </Label>
                <Select
                  value={sessionTimeout}
                  onValueChange={setSessionTimeoutValue}
                  disabled={!canEditSettings}
                >
                  <SelectTrigger id="settings-session-timeout" className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="15">15 {tt("minutes")}</SelectItem>
                    <SelectItem value="30">30 {tt("minutes")}</SelectItem>
                    <SelectItem value="60">60 {tt("minutes")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </MvpSectionCard>

          <MvpSectionCard
            title={tt("Session visibility")}
            description={tt("Current and recent device sessions for this account.")}
          >
            <MvpSimpleTable
              columns={sessionColumns}
              data={sessions}
              getRowId={(row) => row.id}
              emptyTitle={tt("No sessions")}
              emptyDescription={tt("No active sessions are visible for this account.")}
            />
          </MvpSectionCard>

          <MvpSectionCard
            title={tt("Danger zone")}
            description={tt("High-impact security actions with confirmation.")}
            contentClassName="space-y-3"
          >
            <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-3">
              <p className="font-medium text-sm">
                {tt("Sign out from all other devices")}
              </p>
              <p className="mt-1 text-muted-foreground text-xs">
                {tt(
                  "Immediately revoke all sessions except your current device.",
                )}
              </p>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="destructive"
                    className="mt-3"
                    disabled={!canEditSettings}
                  >
                    <ShieldAlertIcon className="size-4" />
                    {tt("Revoke all other sessions")}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      {tt("Revoke all other sessions?")}
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      {tt(
                        "Users on revoked devices will be signed out immediately.",
                      )}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{tt("Cancel")}</AlertDialogCancel>
                    <AlertDialogAction
                      variant="destructive"
                      disabled={!canEditSettings}
                      onClick={revokeAllOtherSessions}
                    >
                      {tt("Revoke sessions")}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </MvpSectionCard>
        </TabsContent>

        <TabsContent value="preferences" className="space-y-4">
          <MvpSectionCard
            title={tt("Dashboard preferences")}
            description={tt("Personal dashboard defaults and reporting display behavior.")}
          >
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="settings-default-page">
                  {tt("Default landing page")}
                </Label>
                <Select
                  value={preferences.defaultLandingPage}
                  disabled={!canEditSettings}
                  onValueChange={(value) =>
                    setPreferenceField("defaultLandingPage", value)
                  }
                >
                  <SelectTrigger id="settings-default-page">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="/dashboard/overview">
                      {tt("Overview")}
                    </SelectItem>
                    <SelectItem value="/dashboard/wallet">
                      {tt("Wallet")}
                    </SelectItem>
                    <SelectItem value="/dashboard/mint">
                      {tt("Mint")}
                    </SelectItem>
                    <SelectItem value="/dashboard/redeem">
                      {tt("Redeem")}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="settings-delivery">
                  {tt("Document delivery")}
                </Label>
                <Select
                  value={preferences.documentDelivery}
                  disabled={!canEditSettings}
                  onValueChange={(value) =>
                    setPreferenceField("documentDelivery", value)
                  }
                >
                  <SelectTrigger id="settings-delivery">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="email">{tt("Email")}</SelectItem>
                    <SelectItem value="in_app">{tt("In-app inbox")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between rounded-lg border bg-muted/20 p-3">
                <div>
                  <p className="font-medium text-sm">
                    {tt("Compact table density")}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    {tt("Use denser row height for operational tables.")}
                  </p>
                </div>
                <Switch
                  checked={preferences.compactTableDensity}
                  disabled={!canEditSettings}
                  onCheckedChange={(checked) =>
                    setPreferenceField("compactTableDensity", checked)
                  }
                />
              </div>

              <div className="flex items-center justify-between rounded-lg border bg-muted/20 p-3">
                <div>
                  <p className="font-medium text-sm">
                    {tt("Show USD values in millions")}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    {tt("Reduce visual noise in KPI and chart axis labels.")}
                  </p>
                </div>
                <Switch
                  checked={preferences.showUsdInMillions}
                  disabled={!canEditSettings}
                  onCheckedChange={(checked) =>
                    setPreferenceField("showUsdInMillions", checked)
                  }
                />
              </div>
            </div>
          </MvpSectionCard>

          <MvpSectionCard
            title={tt("Communication cadence")}
            description={tt("Periodic summaries and digest preferences.")}
            contentClassName="space-y-2"
          >
            <div className="flex items-center justify-between rounded-lg border bg-muted/20 p-3">
              <div>
                <p className="font-medium text-sm">
                  {tt("Weekly operations digest")}
                </p>
                <p className="text-muted-foreground text-xs">
                  {tt(
                    "Include mint, redeem, KYB, treasury, and blacklist highlights.",
                  )}
                </p>
              </div>
              <Switch
                checked={preferences.weeklyDigest}
                disabled={!canEditSettings}
                onCheckedChange={(checked) =>
                  setPreferenceField("weeklyDigest", checked)
                }
              />
            </div>
          </MvpSectionCard>
        </TabsContent>
      </Tabs>
    </div>
  );
}
