"use client";

import * as React from "react";

import { toast } from "sonner";

import { MvpPageHeader } from "@/app/(main)/dashboard/_mvp/components/page-header";
import { MvpSectionCard } from "@/app/(main)/dashboard/_mvp/components/section-card";

import { useI18n } from "@/components/providers/language-provider";
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
import {
  useDashboardStateQuery,
  useUpdateDashboardSettingsMutation,
} from "@/lib/queries/dashboard";

const ADMIN_NOTIFICATION_KEYS = {
  redemptionRequest: "Redemption request",
  mintRequests: "Mint requests",
  userRegistrations: "User registrations",
  securityAlerts: "Security alerts",
} as const;

export default function Page() {
  const { tt } = useI18n();
  const dashboardStateQuery = useDashboardStateQuery();
  const updateSettingsMutation = useUpdateDashboardSettingsMutation();

  const [profile, setProfile] = React.useState({
    fullName: "Alex Warren",
    email: "alex.warren@razn.io",
    phone: "+1 202 555 0142",
  });

  const [notifications, setNotifications] = React.useState({
    redemptionRequest: true,
    mintRequests: true,
    userRegistrations: true,
    securityAlerts: true,
  });

  const [preference, setPreference] = React.useState({
    timezone: "Europe/Istanbul",
    language: "en",
    currency: "USD",
  });

  const [security, setSecurity] = React.useState({
    enforceMfa: true,
    sessionTimeout: "30m",
    allowApiKeys: true,
  });

  React.useEffect(() => {
    const state = dashboardStateQuery.data;
    if (!state) {
      return;
    }

    setProfile({
      fullName: state.settingsProfile.fullName,
      email: state.settingsProfile.email,
      phone: state.settingsProfile.contactPhone,
    });
    setNotifications({
      redemptionRequest:
        state.settingsNotificationPreferences.find(
          (entry) => entry.label === ADMIN_NOTIFICATION_KEYS.redemptionRequest,
        )?.enabled ?? true,
      mintRequests:
        state.settingsNotificationPreferences.find(
          (entry) => entry.label === ADMIN_NOTIFICATION_KEYS.mintRequests,
        )?.enabled ?? true,
      userRegistrations:
        state.settingsNotificationPreferences.find(
          (entry) => entry.label === ADMIN_NOTIFICATION_KEYS.userRegistrations,
        )?.enabled ?? true,
      securityAlerts:
        state.settingsNotificationPreferences.find(
          (entry) => entry.label === ADMIN_NOTIFICATION_KEYS.securityAlerts,
        )?.enabled ?? true,
    });
    setPreference({
      timezone: state.settingsProfile.timezone || "UTC",
      language: "en",
      currency: state.settingsProfile.baseCurrency || "USD",
    });
  }, [dashboardStateQuery.data]);

  async function saveProfile() {
    try {
      await updateSettingsMutation.mutateAsync({
        profile: {
          fullName: profile.fullName,
          email: profile.email,
          contactPhone: profile.phone,
        },
      });
      toast.success(tt("Profile settings saved."));
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : tt("Profile save failed."),
      );
    }
  }

  async function saveNotifications() {
    try {
      await updateSettingsMutation.mutateAsync({
        notificationPreferences: [
          {
            preferenceKey: ADMIN_NOTIFICATION_KEYS.redemptionRequest,
            channel: "email",
            enabled: notifications.redemptionRequest,
          },
          {
            preferenceKey: ADMIN_NOTIFICATION_KEYS.mintRequests,
            channel: "email",
            enabled: notifications.mintRequests,
          },
          {
            preferenceKey: ADMIN_NOTIFICATION_KEYS.userRegistrations,
            channel: "email",
            enabled: notifications.userRegistrations,
          },
          {
            preferenceKey: ADMIN_NOTIFICATION_KEYS.securityAlerts,
            channel: "email",
            enabled: notifications.securityAlerts,
          },
        ],
      });
      toast.success(tt("Notification settings saved."));
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : tt("Notification save failed."),
      );
    }
  }

  async function savePreference() {
    try {
      await updateSettingsMutation.mutateAsync({
        profile: {
          timezone: preference.timezone,
          baseCurrency: preference.currency,
        },
      });
      toast.success(tt("Preference settings saved."));
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : tt("Preference save failed."),
      );
    }
  }

  function saveSecurity() {
    toast.success(tt("Security settings saved."));
  }

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <MvpPageHeader
        title={tt("Settings")}
        description={tt("Manage admin profile, notifications, preferences, and security controls.")}
      />

      <MvpSectionCard
        title={tt("Profile")}
        description={tt("Update your admin profile information.")}
        action={<Button onClick={saveProfile}>{tt("Save changes")}</Button>}
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="admin-profile-name">{tt("Full name")}</Label>
            <Input
              id="admin-profile-name"
              value={profile.fullName}
              onChange={(event) =>
                setProfile((previous) => ({
                  ...previous,
                  fullName: event.target.value,
                }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="admin-profile-email">{tt("Email")}</Label>
            <Input
              id="admin-profile-email"
              value={profile.email}
              onChange={(event) =>
                setProfile((previous) => ({
                  ...previous,
                  email: event.target.value,
                }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="admin-profile-phone">{tt("Phone")}</Label>
            <Input
              id="admin-profile-phone"
              value={profile.phone}
              onChange={(event) =>
                setProfile((previous) => ({
                  ...previous,
                  phone: event.target.value,
                }))
              }
            />
          </div>
        </div>
      </MvpSectionCard>

      <MvpSectionCard
        title={tt("Security notifications")}
        description={tt("Choose which operational and security emails are sent to admin users.")}
        action={
          <Button variant="outline" onClick={saveNotifications}>
            {tt("Save changes")}
          </Button>
        }
      >
        <div className="space-y-4 text-sm">
          <label className="flex items-center justify-between gap-3 rounded-md border p-3">
            <div>
              <p className="font-medium">{tt("Redemption request")}</p>
              <p className="text-muted-foreground text-xs">
                {tt("Email when a new redemption request is submitted")}
              </p>
            </div>
            <Switch
              checked={notifications.redemptionRequest}
              onCheckedChange={(checked) =>
                setNotifications((previous) => ({
                  ...previous,
                  redemptionRequest: checked,
                }))
              }
            />
          </label>

          <label className="flex items-center justify-between gap-3 rounded-md border p-3">
            <div>
              <p className="font-medium">{tt("Mint requests")}</p>
              <p className="text-muted-foreground text-xs">
                {tt("Email when a new mint request is submitted")}
              </p>
            </div>
            <Switch
              checked={notifications.mintRequests}
              onCheckedChange={(checked) =>
                setNotifications((previous) => ({
                  ...previous,
                  mintRequests: checked,
                }))
              }
            />
          </label>

          <label className="flex items-center justify-between gap-3 rounded-md border p-3">
            <div>
              <p className="font-medium">{tt("User registrations")}</p>
              <p className="text-muted-foreground text-xs">
                {tt("Email when a new user completes registration")}
              </p>
            </div>
            <Switch
              checked={notifications.userRegistrations}
              onCheckedChange={(checked) =>
                setNotifications((previous) => ({
                  ...previous,
                  userRegistrations: checked,
                }))
              }
            />
          </label>

          <label className="flex items-center justify-between gap-3 rounded-md border p-3">
            <div>
              <p className="font-medium">{tt("Security alerts")}</p>
              <p className="text-muted-foreground text-xs">
                {tt("Email for critical access, role, and policy incidents")}
              </p>
            </div>
            <Switch
              checked={notifications.securityAlerts}
              onCheckedChange={(checked) =>
                setNotifications((previous) => ({
                  ...previous,
                  securityAlerts: checked,
                }))
              }
            />
          </label>
        </div>
      </MvpSectionCard>

      <MvpSectionCard
        title={tt("Preference")}
        description={tt("Set default dashboard preferences for admin workflows.")}
        action={
          <Button variant="outline" onClick={savePreference}>
            {tt("Save changes")}
          </Button>
        }
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label>{tt("Timezone")}</Label>
            <Select
              value={preference.timezone}
              onValueChange={(value) =>
                setPreference((previous) => ({ ...previous, timezone: value }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder={tt("Select timezone")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Europe/Istanbul">Europe/Istanbul</SelectItem>
                <SelectItem value="UTC">UTC</SelectItem>
                <SelectItem value="America/New_York">America/New_York</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>{tt("Language")}</Label>
            <Select
              value={preference.language}
              onValueChange={(value) =>
                setPreference((previous) => ({ ...previous, language: value }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder={tt("Select language")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="tr">Turkce</SelectItem>
                <SelectItem value="ru">Russian</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>{tt("Currency")}</Label>
            <Select
              value={preference.currency}
              onValueChange={(value) =>
                setPreference((previous) => ({ ...previous, currency: value }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder={tt("Select currency")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="USD">USD</SelectItem>
                <SelectItem value="EUR">EUR</SelectItem>
                <SelectItem value="TRY">TRY</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </MvpSectionCard>

      <MvpSectionCard
        title={tt("Security")}
        description={tt("Configure core security protections for your admin account.")}
        action={
          <Button variant="outline" onClick={saveSecurity}>
            {tt("Save changes")}
          </Button>
        }
      >
        <div className="space-y-4 text-sm">
          <label className="flex items-center justify-between gap-3 rounded-md border p-3">
            <div>
              <p className="font-medium">{tt("Enforce MFA")}</p>
              <p className="text-muted-foreground text-xs">
                {tt("Require multi-factor authentication for admin sign-ins")}
              </p>
            </div>
            <Switch
              checked={security.enforceMfa}
              onCheckedChange={(checked) =>
                setSecurity((previous) => ({
                  ...previous,
                  enforceMfa: checked,
                }))
              }
            />
          </label>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>{tt("Session timeout")}</Label>
              <Select
                value={security.sessionTimeout}
                onValueChange={(value) =>
                  setSecurity((previous) => ({
                    ...previous,
                    sessionTimeout: value,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder={tt("Select timeout")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="15m">15 minutes</SelectItem>
                  <SelectItem value="30m">30 minutes</SelectItem>
                  <SelectItem value="60m">60 minutes</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <label className="flex items-center justify-between gap-3 rounded-md border p-3 md:mt-7">
              <div>
                <p className="font-medium">{tt("Allow API keys")}</p>
                <p className="text-muted-foreground text-xs">
                  {tt("Allow personal API key generation")}
                </p>
              </div>
              <Switch
                checked={security.allowApiKeys}
                onCheckedChange={(checked) =>
                  setSecurity((previous) => ({
                    ...previous,
                    allowApiKeys: checked,
                  }))
                }
              />
            </label>
          </div>
        </div>
      </MvpSectionCard>
    </div>
  );
}
