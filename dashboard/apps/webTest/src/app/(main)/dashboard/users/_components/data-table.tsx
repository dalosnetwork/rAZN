"use client";
"use no memo";

import * as React from "react";

import { Plus } from "lucide-react";
import type { OnChangeFn, PaginationState, SortingState } from "@tanstack/react-table";

import type { DashboardUser } from "@/lib/api/users";
import { useI18n } from "@/components/providers/language-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDataTableInstance } from "@/hooks/use-data-table-instance";

import { DataTable as DataTableNew } from "@/components/data-table/data-table";
import { DataTablePagination } from "@/components/data-table/data-table-pagination";
import { DataTableViewOptions } from "@/components/data-table/data-table-view-options";
import { createUsersColumns } from "./columns";

type Props = {
  data: DashboardUser[];
  totalRows: number;
  pagination: PaginationState;
  onPaginationChange: React.Dispatch<React.SetStateAction<PaginationState>>;
  sorting: SortingState;
  onSortingChange: OnChangeFn<SortingState>;
  onEditUser: (user: DashboardUser) => void;
  onDisableUser: (user: DashboardUser) => void;
  currentUserId?: string;
  disabledActionUserIds?: string[];
};

export function UsersDataTable({
  data,
  totalRows,
  pagination,
  onPaginationChange,
  sorting,
  onSortingChange,
  onEditUser,
  onDisableUser,
  currentUserId,
  disabledActionUserIds,
}: Props) {
  const { language, tx } = useI18n();
  const locale = language === "tr" ? "tr-TR" : language === "ru" ? "ru-RU" : "en-US";
  const columns = React.useMemo(
    () =>
      createUsersColumns({
        tx,
        locale,
        onEditUser,
        onDisableUser,
        currentUserId,
        disabledActionUserIds,
      }),
    [currentUserId, disabledActionUserIds, locale, onDisableUser, onEditUser, tx],
  );
  const table = useDataTableInstance({
    data,
    columns,
    getRowId: (row) => row.id,
    pagination,
    onPaginationChange,
    manualPagination: true,
    rowCount: totalRows,
    sorting,
    onSortingChange,
    manualSorting: true,
  });

  return (
    <Tabs defaultValue="users" className="w-full flex-col justify-start gap-6">
      <div className="flex items-center justify-between">
        <Label htmlFor="users-view-selector" className="sr-only">
          {tx("View", "Görünüm", "Вид")}
        </Label>
        <Select defaultValue="users">
          <SelectTrigger className="flex @4xl/main:hidden w-fit" size="sm" id="users-view-selector">
            <SelectValue placeholder={tx("Select a view", "Görünüm seçin", "Выберите вид")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="users">{tx("Users", "Kullanıcılar", "Пользователи")}</SelectItem>
            <SelectItem value="roles">{tx("Roles", "Roller", "Роли")}</SelectItem>
          </SelectContent>
        </Select>
        <TabsList className="@4xl/main:flex hidden **:data-[slot=badge]:size-5 **:data-[slot=badge]:rounded-full **:data-[slot=badge]:bg-muted-foreground/30 **:data-[slot=badge]:px-1">
          <TabsTrigger value="users">
            {tx("Users", "Kullanıcılar", "Пользователи")} <Badge variant="secondary">{totalRows}</Badge>
          </TabsTrigger>
          <TabsTrigger value="roles">{tx("Roles", "Roller", "Роли")}</TabsTrigger>
        </TabsList>
        <div className="flex items-center gap-2">
          <DataTableViewOptions table={table} />
          <Button variant="outline" size="sm">
            <Plus />
            <span className="hidden lg:inline">{tx("Invite User", "Kullanıcı Davet Et", "Пригласить пользователя")}</span>
          </Button>
        </div>
      </div>
      <TabsContent value="users" className="relative flex flex-col gap-4 overflow-auto">
        <div className="overflow-hidden rounded-lg border">
          <DataTableNew table={table} columns={columns} />
        </div>
        <DataTablePagination table={table} pageSizeOptions={[1, 5, 10, 50]} />
      </TabsContent>
      <TabsContent value="roles" className="flex flex-col">
        <div className="aspect-video w-full flex-1 rounded-lg border border-dashed" />
      </TabsContent>
    </Tabs>
  );
}
