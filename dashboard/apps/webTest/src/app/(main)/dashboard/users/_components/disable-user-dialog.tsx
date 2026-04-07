"use client";

import type { DashboardUser } from "@/lib/api/users";
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
} from "@/components/ui/alert-dialog";

type DisableUserDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: DashboardUser | null;
  isPending?: boolean;
  onConfirm: () => Promise<void> | void;
};

export function DisableUserDialog({
  open,
  onOpenChange,
  user,
  isPending = false,
  onConfirm,
}: DisableUserDialogProps) {
  const { tx } = useI18n();
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent size="sm">
        <AlertDialogHeader>
          <AlertDialogTitle>{tx("Disable User", "Kullanıcıyı Devre Dışı Bırak", "Отключить пользователя")}</AlertDialogTitle>
          <AlertDialogDescription>
            {user
              ? tx(
                  `This will disable ${user.name} and remove access immediately.`,
                  `${user.name} devre dışı bırakılacak ve erişimi hemen kaldırılacak.`,
                  `${user.name} будет отключен, и доступ будет немедленно удален.`,
                )
              : tx(
                  "This will disable this user and remove access immediately.",
                  "Bu kullanıcı devre dışı bırakılacak ve erişimi hemen kaldırılacak.",
                  "Этот пользователь будет отключен, и доступ будет немедленно удален.",
                )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>{tx("Cancel", "İptal", "Отмена")}</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={isPending}
            onClick={(event) => {
              event.preventDefault();
              void onConfirm();
            }}
          >
            {tx("Disable", "Devre Dışı Bırak", "Отключить")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
