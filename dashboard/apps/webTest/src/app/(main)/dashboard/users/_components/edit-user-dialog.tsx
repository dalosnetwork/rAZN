"use client";

import * as React from "react";

import { RBAC_ROLES } from "@repo/auth/rbac";

import type {
  DashboardUser,
  UpdateDashboardUserInput,
} from "@/lib/api/users";
import { useI18n } from "@/components/providers/language-provider";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type EditUserDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: DashboardUser | null;
  isPending?: boolean;
  onSubmit: (input: UpdateDashboardUserInput) => Promise<void> | void;
};

export function EditUserDialog({
  open,
  onOpenChange,
  user,
  isPending = false,
  onSubmit,
}: EditUserDialogProps) {
  const { tx } = useI18n();
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [emailVerified, setEmailVerified] = React.useState(false);
  const [roleSlugs, setRoleSlugs] = React.useState<string[]>([]);

  React.useEffect(() => {
    if (!user) {
      return;
    }
    setName(user.name);
    setEmail(user.email);
    setEmailVerified(user.emailVerified);
    setRoleSlugs(user.roles);
  }, [user]);

  const hasAnyRole = roleSlugs.length > 0;

  function toggleRole(slug: string, checked: boolean) {
    setRoleSlugs((previous) => {
      if (checked) {
        return previous.includes(slug) ? previous : [...previous, slug];
      }
      return previous.filter((entry) => entry !== slug);
    });
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user || !hasAnyRole) {
      return;
    }

    await onSubmit({
      name: name.trim(),
      email: email.trim(),
      emailVerified,
      roleSlugs,
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{tx("Edit User", "Kullanıcıyı Düzenle", "Изменить пользователя")}</DialogTitle>
          <DialogDescription>
            {tx(
              "Update user profile fields and role assignments.",
              "Kullanıcı profil alanlarını ve rol atamalarını güncelleyin.",
              "Обновите поля профиля пользователя и назначения ролей.",
            )}
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="edit-user-name">{tx("Name", "Ad", "Имя")}</Label>
            <Input
              id="edit-user-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              disabled={isPending}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-user-email">{tx("Email", "E-posta", "Эл. почта")}</Label>
            <Input
              id="edit-user-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              disabled={isPending}
              required
            />
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="edit-user-email-verified"
              checked={emailVerified}
              onCheckedChange={(checked) => setEmailVerified(Boolean(checked))}
              disabled={isPending}
            />
            <Label htmlFor="edit-user-email-verified">
              {tx("Email verified", "E-posta doğrulandı", "Эл. почта подтверждена")}
            </Label>
          </div>
          <div className="space-y-2">
            <Label>{tx("Roles", "Roller", "Роли")}</Label>
            <div className="grid gap-2 rounded-md border p-3">
              {RBAC_ROLES.map((role) => (
                <div key={role.slug} className="flex items-center gap-2">
                  <Checkbox
                    id={`edit-user-role-${role.slug}`}
                    checked={roleSlugs.includes(role.slug)}
                    onCheckedChange={(checked) =>
                      toggleRole(role.slug, Boolean(checked))
                    }
                    disabled={isPending}
                  />
                  <Label htmlFor={`edit-user-role-${role.slug}`}>{role.name}</Label>
                </div>
              ))}
            </div>
            {!hasAnyRole ? (
              <p className="text-destructive text-xs">
                {tx("Select at least one role.", "En az bir rol seçin.", "Выберите хотя бы одну роль.")}
              </p>
            ) : null}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              {tx("Cancel", "İptal", "Отмена")}
            </Button>
            <Button type="submit" disabled={isPending || !hasAnyRole}>
              {tx("Save changes", "Değişiklikleri kaydet", "Сохранить изменения")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
