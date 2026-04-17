"use client";

import * as React from "react";
import type { SortingState } from "@tanstack/react-table";
import { toast } from "sonner";

import { useMeQuery } from "@/lib/queries/auth";
import { useI18n } from "@/components/providers/language-provider";
import {
  useDashboardUsersQuery,
  useDisableDashboardUserMutation,
  useUpdateDashboardUserMutation,
} from "@/lib/queries/users";
import type { DashboardUser, DashboardUsersSortBy } from "@/lib/api/users";
import { Spinner } from "@/components/ui/spinner";
import { DisableUserDialog } from "./_components/disable-user-dialog";
import { EditUserDialog } from "./_components/edit-user-dialog";
import { UsersDataTable } from "./_components/data-table";

const SUPER_ADMIN_ROLE_SLUG = "super_admin";

function resolveSortBy(columnId: string | undefined): DashboardUsersSortBy {
  if (
    columnId === "name" ||
    columnId === "email" ||
    columnId === "createdAt" ||
    columnId === "emailVerified"
  ) {
    return columnId;
  }
  return "createdAt";
}

export default function UsersPage() {
  const { tx } = useI18n();
  const meQuery = useMeQuery();
  const isSuperAdmin =
    meQuery.data?.access?.roleSlugs.includes(SUPER_ADMIN_ROLE_SLUG) ?? false;
  const [pagination, setPagination] = React.useState({
    pageIndex: 0,
    pageSize: 5,
  });
  const [sorting, setSorting] = React.useState<SortingState>([
    { id: "createdAt", desc: true },
  ]);
  const [editingUser, setEditingUser] = React.useState<DashboardUser | null>(
    null,
  );
  const [disablingUser, setDisablingUser] =
    React.useState<DashboardUser | null>(null);

  const updateUserMutation = useUpdateDashboardUserMutation();
  const disableUserMutation = useDisableDashboardUserMutation();

  const primarySort = sorting[0];
  const sortBy = resolveSortBy(primarySort?.id);
  const sortDir = primarySort ? (primarySort.desc ? "desc" : "asc") : "desc";

  const usersQuery = useDashboardUsersQuery(
    {
      page: pagination.pageIndex + 1,
      pageSize: pagination.pageSize,
      sortBy,
      sortDir,
    },
    isSuperAdmin,
  );

  React.useEffect(() => {
    setPagination((previous) =>
      previous.pageIndex === 0
        ? previous
        : {
            ...previous,
            pageIndex: 0,
          },
    );
  }, [sortBy, sortDir]);

  React.useEffect(() => {
    if (!usersQuery.data) {
      return;
    }

    const lastPageIndex = Math.max(
      0,
      usersQuery.data.pagination.totalPages - 1,
    );
    if (pagination.pageIndex > lastPageIndex) {
      setPagination((previous) => ({
        ...previous,
        pageIndex: lastPageIndex,
      }));
    }
  }, [pagination.pageIndex, usersQuery.data]);

  async function handleEditUserSubmit(input: {
    name?: string;
    email?: string;
    emailVerified?: boolean;
    roleSlugs?: string[];
  }) {
    if (!editingUser) {
      return;
    }

    try {
      await updateUserMutation.mutateAsync({
        userId: editingUser.id,
        input,
      });
      toast.success(
        tx("User updated", "Kullanıcı güncellendi", "Пользователь обновлен"),
      );
      setEditingUser(null);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : tx(
              "Failed to update user",
              "Kullanıcı güncellenemedi",
              "Не удалось обновить пользователя",
            ),
      );
    }
  }

  async function handleDisableUserConfirm() {
    if (!disablingUser) {
      return;
    }

    try {
      await disableUserMutation.mutateAsync(disablingUser.id);
      toast.success(
        tx(
          "User disabled",
          "Kullanıcı devre dışı bırakıldı",
          "Пользователь отключен",
        ),
      );
      setDisablingUser(null);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : tx(
              "Failed to disable user",
              "Kullanıcı devre dışı bırakılamadı",
              "Не удалось отключить пользователя",
            ),
      );
    }
  }

  const disabledActionUserIds = [
    ...(disableUserMutation.isPending && disableUserMutation.variables
      ? [disableUserMutation.variables]
      : []),
    ...(updateUserMutation.isPending && updateUserMutation.variables
      ? [updateUserMutation.variables.userId]
      : []),
  ];

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      {meQuery.isPending ? (
        <div className="flex min-h-32 items-center justify-center">
          <Spinner
            className="size-5"
            aria-label={tx("Loading", "Yükleniyor", "Загрузка", "Yüklənir")}
          />
        </div>
      ) : !isSuperAdmin ? (
        <p className="text-muted-foreground text-sm">
          {tx(
            "This page is only available to super admins.",
            "Bu sayfa yalnızca süper yöneticiler için kullanılabilir.",
            "Эта страница доступна только суперадминистраторам.",
          )}
        </p>
      ) : usersQuery.isPending ? (
        <div className="flex min-h-32 items-center justify-center">
          <Spinner
            className="size-5"
            aria-label={tx("Loading", "Yükleniyor", "Загрузка", "Yüklənir")}
          />
        </div>
      ) : usersQuery.isError ? (
        <p className="text-destructive text-sm">
          {usersQuery.error instanceof Error
            ? usersQuery.error.message
            : tx(
                "Failed to load users",
                "Kullanıcılar yüklenemedi",
                "Не удалось загрузить пользователей",
              )}
        </p>
      ) : (
        <section id="users-table">
          <UsersDataTable
            data={usersQuery.data.rows}
            totalRows={usersQuery.data.pagination.total}
            pagination={pagination}
            onPaginationChange={setPagination}
            sorting={sorting}
            onSortingChange={setSorting}
            currentUserId={meQuery.data?.user?.id}
            onEditUser={setEditingUser}
            onDisableUser={setDisablingUser}
            disabledActionUserIds={disabledActionUserIds}
          />
        </section>
      )}
      <EditUserDialog
        open={Boolean(editingUser)}
        onOpenChange={(open) => {
          if (!open) {
            setEditingUser(null);
          }
        }}
        user={editingUser}
        isPending={updateUserMutation.isPending}
        onSubmit={handleEditUserSubmit}
      />
      <DisableUserDialog
        open={Boolean(disablingUser)}
        onOpenChange={(open) => {
          if (!open) {
            setDisablingUser(null);
          }
        }}
        user={disablingUser}
        isPending={disableUserMutation.isPending}
        onConfirm={handleDisableUserConfirm}
      />
    </div>
  );
}
