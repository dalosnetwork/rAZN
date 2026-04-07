"use client";

import { BadgeCheck, Bell, CreditCard, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { useI18n } from "@/components/providers/language-provider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLogoutMutation, useMeQuery } from "@/lib/queries/auth";
import { getInitials } from "@/lib/utils";

export function AccountSwitcher() {
  const router = useRouter();
  const { t } = useI18n();
  const meQuery = useMeQuery();
  const logoutMutation = useLogoutMutation();
  const user = meQuery.data?.user;
  const name = user?.name?.trim() || "User";
  const email = user?.email?.trim() || "";
  const avatar = user?.image || user?.avatar || "";

  const handleLogout = async () => {
    if (logoutMutation.isPending) {
      return;
    }

    try {
      await logoutMutation.mutateAsync();
      router.replace("/auth/v1/login");
      router.refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : t("user.logoutFailed");
      toast.error(message);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Avatar className="size-9 rounded-lg">
          <AvatarImage src={avatar || undefined} alt={name} />
          <AvatarFallback className="rounded-lg">{getInitials(name)}</AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="min-w-56 space-y-1 rounded-lg" side="bottom" align="end" sideOffset={4}>
        <DropdownMenuLabel className="p-0 font-normal">
          <div className="flex w-full items-center justify-between gap-2 px-1 py-1.5">
            <Avatar className="size-9 rounded-lg">
              <AvatarImage src={avatar || undefined} alt={name} />
              <AvatarFallback className="rounded-lg">{getInitials(name)}</AvatarFallback>
            </Avatar>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-semibold">{name}</span>
              <span className="truncate text-muted-foreground text-xs">{email}</span>
            </div>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem>
            <BadgeCheck />
            {t("user.account")}
          </DropdownMenuItem>
          <DropdownMenuItem>
            <CreditCard />
            {t("user.billing")}
          </DropdownMenuItem>
          <DropdownMenuItem>
            <Bell />
            {t("user.notifications")}
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => void handleLogout()} disabled={logoutMutation.isPending}>
          <LogOut />
          {logoutMutation.isPending ? t("user.loggingOut") : t("user.logOut")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
