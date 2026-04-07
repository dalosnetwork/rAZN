"use client";

import {
  CalendarDays,
  Fingerprint,
  Mail,
  ShieldCheck,
  UserRound,
} from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/components/providers/language-provider";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { useMeQuery } from "@/lib/queries/auth";
import { getInitials } from "@/lib/utils";

function formatDateTime(
  value: string | null | undefined,
  locale: string,
  notAvailableLabel: string,
) {
  if (!value) {
    return notAvailableLabel;
  }

  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) {
    return notAvailableLabel;
  }

  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(parsedDate);
}

function formatRoleLabel(roleSlug: string) {
  return roleSlug
    .split("_")
    .filter(Boolean)
    .map((chunk) => `${chunk[0]?.toUpperCase() ?? ""}${chunk.slice(1)}`)
    .join(" ");
}

export default function ProfilePage() {
  const { language, tx } = useI18n();
  const locale =
    language === "tr" ? "tr-TR" : language === "ru" ? "ru-RU" : "en-US";
  const meQuery = useMeQuery();

  if (meQuery.isPending) {
    return (
      <div className="flex min-h-32 items-center justify-center">
        <Spinner
          className="size-5"
          aria-label={tx("Loading", "Yükleniyor", "Загрузка")}
        />
      </div>
    );
  }

  if (meQuery.isError) {
    return (
      <p className="text-destructive text-sm">
        {meQuery.error instanceof Error
          ? meQuery.error.message
          : tx(
              "Failed to load profile",
              "Profil yüklenemedi",
              "Не удалось загрузить профиль",
            )}
      </p>
    );
  }

  if (!meQuery.data?.user) {
    return (
      <p className="text-muted-foreground text-sm">
        {tx(
          "No profile data is available.",
          "Profil verisi mevcut değil.",
          "Данные профиля недоступны.",
        )}
      </p>
    );
  }

  const { user, access } = meQuery.data;
  const name = user.name?.trim() || tx("User", "Kullanıcı", "Пользователь");
  const email =
    user.email?.trim() || tx("No email", "E-posta yok", "Нет эл. почты");
  const avatar = user.image || user.avatar || "";
  const isEmailVerified = Boolean(user.emailVerified);
  const notAvailable = tx("Not available", "Mevcut değil", "Недоступно");

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <Card>
        <CardHeader className="border-b">
          <CardTitle>
            {tx("Your Profile", "Profiliniz", "Ваш профиль")}
          </CardTitle>
          <CardDescription>
            {tx(
              "View your account details, roles, and permissions.",
              "Hesap ayrıntılarınızı, rollerinizi ve izinlerinizi görüntüleyin.",
              "Просматривайте данные аккаунта, роли и разрешения.",
            )}
          </CardDescription>
          <CardAction>
            <Badge variant={isEmailVerified ? "default" : "outline"}>
              {isEmailVerified
                ? tx(
                    "Email verified",
                    "E-posta doğrulandı",
                    "Эл. почта подтверждена",
                  )
                : tx(
                    "Email not verified",
                    "E-posta doğrulanmadı",
                    "Эл. почта не подтверждена",
                  )}
            </Badge>
          </CardAction>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-4">
            <Avatar className="size-14 rounded-xl">
              <AvatarImage src={avatar || undefined} alt={name} />
              <AvatarFallback className="rounded-xl">
                {getInitials(name)}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold text-lg">{name}</p>
              <p className="text-muted-foreground text-sm">{email}</p>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-lg border p-3">
              <p className="mb-1 flex items-center gap-2 font-medium text-sm">
                <UserRound className="size-4 text-muted-foreground" />
                {tx("User ID", "Kullanıcı ID", "ID пользователя")}
              </p>
              <p className="break-all text-muted-foreground text-sm">
                {user.id || notAvailable}
              </p>
            </div>

            <div className="rounded-lg border p-3">
              <p className="mb-1 flex items-center gap-2 font-medium text-sm">
                <Mail className="size-4 text-muted-foreground" />
                {tx("Email", "E-posta", "Эл. почта")}
              </p>
              <p className="break-all text-muted-foreground text-sm">{email}</p>
            </div>

            <div className="rounded-lg border p-3">
              <p className="mb-1 flex items-center gap-2 font-medium text-sm">
                <CalendarDays className="size-4 text-muted-foreground" />
                {tx("Created", "Oluşturuldu", "Создан")}
              </p>
              <p className="text-muted-foreground text-sm">
                {formatDateTime(user.createdAt, locale, notAvailable)}
              </p>
            </div>

            <div className="rounded-lg border p-3">
              <p className="mb-1 flex items-center gap-2 font-medium text-sm">
                <CalendarDays className="size-4 text-muted-foreground" />
                {tx("Last updated", "Son güncelleme", "Последнее обновление")}
              </p>
              <p className="text-muted-foreground text-sm">
                {formatDateTime(user.updatedAt, locale, notAvailable)}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <p className="flex items-center gap-2 font-medium text-sm">
              <ShieldCheck className="size-4 text-muted-foreground" />
              {tx("Roles", "Roller", "Роли")}
            </p>
            <div className="flex flex-wrap gap-2">
              {access.roleSlugs.length > 0 ? (
                access.roleSlugs.map((roleSlug) => (
                  <Badge key={roleSlug} variant="secondary">
                    {formatRoleLabel(roleSlug)}
                  </Badge>
                ))
              ) : (
                <span className="text-muted-foreground text-sm">
                  {tx(
                    "No roles assigned.",
                    "Rol atanmadı.",
                    "Роли не назначены.",
                  )}
                </span>
              )}
            </div>
          </div>

          <section id="profile-permissions" className="space-y-2">
            <p className="flex items-center gap-2 font-medium text-sm">
              <Fingerprint className="size-4 text-muted-foreground" />
              {tx("Permissions", "İzinler", "Разрешения")}
            </p>
            <div className="flex flex-wrap gap-2">
              {access.permissionKeys.length > 0 ? (
                access.permissionKeys.map((permissionKey) => (
                  <Badge
                    key={permissionKey}
                    variant="outline"
                    className="font-mono text-[11px]"
                  >
                    {permissionKey}
                  </Badge>
                ))
              ) : (
                <span className="text-muted-foreground text-sm">
                  {tx(
                    "No permissions assigned.",
                    "İzin atanmadı.",
                    "Разрешения не назначены.",
                  )}
                </span>
              )}
            </div>
          </section>
        </CardContent>
      </Card>
    </div>
  );
}
