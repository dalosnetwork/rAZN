import type { ColumnDef } from "@tanstack/react-table";
import { EllipsisVertical } from "lucide-react";

import type { DashboardUser } from "@/lib/api/users";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";

type TxFn = (en: string, tr: string, ru?: string) => string;

function formatDate(value: string, locale?: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return locale?.startsWith("tr") ? "Yok" : locale?.startsWith("ru") ? "Н/Д" : "N/A";
  }
  return date.toLocaleString(locale);
}

type CreateUsersColumnsOptions = {
  tx: TxFn;
  locale: string;
  onEditUser: (user: DashboardUser) => void;
  onDisableUser: (user: DashboardUser) => void;
  currentUserId?: string;
  disabledActionUserIds?: string[];
};

export function createUsersColumns(
  options: CreateUsersColumnsOptions,
): ColumnDef<DashboardUser>[] {
  const { tx, locale } = options;
  return [
    {
      id: "select",
      header: ({ table }) => (
        <div className="flex items-center justify-center">
          <Checkbox
            checked={
              table.getIsAllPageRowsSelected() ||
              (table.getIsSomePageRowsSelected() && "indeterminate")
            }
            onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
            aria-label={tx("Select all", "Tümünü seç", "Выбрать все")}
          />
        </div>
      ),
      cell: ({ row }) => (
        <div className="flex items-center justify-center">
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
            aria-label={tx("Select row", "Satırı seç", "Выбрать строку")}
          />
        </div>
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "name",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={tx("Name", "Ad", "Имя")} />
      ),
      cell: ({ row }) => (
        <div className="font-medium">
          {row.original.name || tx("Unnamed User", "Adsız Kullanıcı", "Пользователь без имени")}
        </div>
      ),
      enableSorting: true,
    },
    {
      accessorKey: "email",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={tx("Email", "E-posta", "Эл. почта")} />
      ),
      cell: ({ row }) => (
        <div className="text-muted-foreground">{row.original.email}</div>
      ),
      enableSorting: true,
    },
    {
      id: "roles",
      accessorFn: (row) => row.roles.join(", "),
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={tx("Roles", "Roller", "Роли")} />
      ),
      cell: ({ row }) => (
        <div className="flex flex-wrap gap-1">
          {row.original.roles.length > 0 ? (
            row.original.roles.map((role) => (
              <Badge key={`${row.original.id}-${role}`} variant="outline">
                {role}
              </Badge>
            ))
          ) : (
            <span className="text-muted-foreground text-xs">
              {tx("No role", "Rol yok", "Нет роли")}
            </span>
          )}
        </div>
      ),
      enableSorting: false,
    },
    {
      accessorKey: "emailVerified",
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title={tx("Email Status", "E-posta Durumu", "Статус эл. почты")}
        />
      ),
      cell: ({ row }) => (
        <Badge variant="outline" className="px-1.5 text-muted-foreground">
          {row.original.emailVerified
            ? tx("Verified", "Doğrulandı", "Подтверждено")
            : tx("Unverified", "Doğrulanmadı", "Не подтверждено")}
        </Badge>
      ),
      enableSorting: true,
    },
    {
      accessorKey: "createdAt",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={tx("Created At", "Oluşturulma", "Создано")} />
      ),
      cell: ({ row }) => (
        <div className="text-muted-foreground">{formatDate(row.original.createdAt, locale)}</div>
      ),
      enableSorting: true,
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="flex size-8 text-muted-foreground data-[state=open]:bg-muted"
              size="icon"
            >
              <EllipsisVertical />
              <span className="sr-only">{tx("Open menu", "Menüyü aç", "Открыть меню")}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-36">
            <DropdownMenuItem onSelect={() => options.onEditUser(row.original)}>
              {tx("Edit user", "Kullanıcıyı düzenle", "Изменить пользователя")}
            </DropdownMenuItem>
            <DropdownMenuItem>{tx("Copy user id", "Kullanıcı kimliğini kopyala", "Скопировать ID пользователя")}</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              disabled={
                row.original.roles.includes("super_admin") ||
                row.original.id === options.currentUserId ||
                options.disabledActionUserIds?.includes(row.original.id)
              }
              onSelect={() => options.onDisableUser(row.original)}
            >
              {tx("Disable user", "Kullanıcıyı devre dışı bırak", "Отключить пользователя")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
      enableSorting: false,
    },
  ];
}
