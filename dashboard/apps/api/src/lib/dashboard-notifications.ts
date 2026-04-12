import { userNotificationsTable } from "@repo/db";
import { and, desc, eq, inArray, sql } from "drizzle-orm";

import { db } from "./db";

export type DashboardNotificationCategory =
  | "mint"
  | "redeem"
  | "kyb"
  | "wallet"
  | "bank_account"
  | "security"
  | "system";

export type DashboardNotificationChannel = "email" | "in_app" | "sms";

export type DashboardNotificationEventStatus =
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

export type DashboardNotificationListResult = {
  rows: {
    id: string;
    category: DashboardNotificationCategory;
    title: string;
    message: string;
    channel: DashboardNotificationChannel;
    status: DashboardNotificationEventStatus;
    entityType?: string;
    entityRef?: string;
    isRead: boolean;
    readAt?: string;
    createdAt: string;
    updatedAt: string;
  }[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    unreadCount: number;
  };
};

function toIso(value: Date | string | null | undefined) {
  if (!value) {
    return new Date(0).toISOString();
  }
  if (typeof value === "string") {
    return value;
  }
  return value.toISOString();
}

export async function listNotificationsForUser(
  userId: string,
  page: number,
  pageSize: number,
): Promise<DashboardNotificationListResult> {
  const safePage = Math.max(1, Math.floor(page));
  const safePageSize = Math.max(1, Math.floor(pageSize));
  const offset = (safePage - 1) * safePageSize;

  const [countRows, unreadRows, rows] = await Promise.all([
    db
      .select({
        count: sql<number>`count(*)`,
      })
      .from(userNotificationsTable)
      .where(eq(userNotificationsTable.userId, userId)),
    db
      .select({
        count: sql<number>`count(*)`,
      })
      .from(userNotificationsTable)
      .where(
        and(
          eq(userNotificationsTable.userId, userId),
          eq(userNotificationsTable.isRead, false),
        ),
      ),
    db
      .select()
      .from(userNotificationsTable)
      .where(eq(userNotificationsTable.userId, userId))
      .orderBy(desc(userNotificationsTable.createdAt))
      .limit(safePageSize)
      .offset(offset),
  ]);

  const total = Number(countRows[0]?.count ?? 0);
  const unreadCount = Number(unreadRows[0]?.count ?? 0);
  const totalPages = Math.max(1, Math.ceil(total / safePageSize));

  return {
    rows: rows.map((row) => ({
      id: row.id,
      category: row.category as DashboardNotificationCategory,
      title: row.title,
      message: row.message,
      channel: row.channel as DashboardNotificationChannel,
      status: row.eventStatus as DashboardNotificationEventStatus,
      entityType: row.entityType ?? undefined,
      entityRef: row.entityRef ?? undefined,
      isRead: row.isRead,
      readAt: row.readAt ? toIso(row.readAt) : undefined,
      createdAt: toIso(row.createdAt),
      updatedAt: toIso(row.updatedAt),
    })),
    pagination: {
      page: safePage,
      pageSize: safePageSize,
      total,
      totalPages,
      unreadCount,
    },
  };
}

export async function markAllNotificationsAsReadForUser(userId: string) {
  const now = new Date();
  const rows = await db
    .update(userNotificationsTable)
    .set({
      isRead: true,
      readAt: now,
      updatedAt: now,
    })
    .where(
      and(
        eq(userNotificationsTable.userId, userId),
        eq(userNotificationsTable.isRead, false),
      ),
    )
    .returning({ id: userNotificationsTable.id });

  return rows.length;
}

export async function markNotificationsAsReadForUser(
  userId: string,
  ids: string[],
) {
  const uniqueIds = Array.from(new Set(ids.filter((id) => id.trim().length > 0)));
  if (uniqueIds.length === 0) {
    return 0;
  }

  const now = new Date();
  const rows = await db
    .update(userNotificationsTable)
    .set({
      isRead: true,
      readAt: now,
      updatedAt: now,
    })
    .where(
      and(
        eq(userNotificationsTable.userId, userId),
        inArray(userNotificationsTable.id, uniqueIds),
      ),
    )
    .returning({ id: userNotificationsTable.id });

  return rows.length;
}
