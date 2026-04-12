"use client";

import * as React from "react";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRouter } from "next/navigation";

import { Bell, ChevronRight, Coins } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { useI18n } from "@/components/providers/language-provider";
import type { TranslationKey } from "@/lib/i18n/messages";
import {
  useDashboardNotificationsQuery,
  useMarkDashboardNotificationsReadMutation,
} from "@/lib/queries/dashboard";
import type { NavGroup, NavMainItem } from "@/navigation/sidebar/sidebar-items";

interface NavMainProps {
  readonly items: readonly NavGroup[];
}

const IsComingSoon = ({ label }: { label: string }) => (
  <span className="ml-auto rounded-md bg-gray-200 px-2 py-1 text-xs dark:text-gray-800">
    {label}
  </span>
);

function getTranslatedLabel(
  item: { title: string; titleKey?: TranslationKey },
  t: (key: TranslationKey) => string,
) {
  return item.titleKey ? t(item.titleKey) : item.title;
}

const NavItemExpanded = ({
  item,
  isActive,
  isSubmenuOpen,
  t,
  soonLabel,
}: {
  item: NavMainItem;
  isActive: (url: string, subItems?: NavMainItem["subItems"]) => boolean;
  isSubmenuOpen: (subItems?: NavMainItem["subItems"]) => boolean;
  t: (key: TranslationKey) => string;
  soonLabel: string;
}) => {
  const label = getTranslatedLabel(item, t);

  return (
    <Collapsible
      key={item.url}
      asChild
      defaultOpen={isSubmenuOpen(item.subItems)}
      className="group/collapsible"
    >
      <SidebarMenuItem>
        <CollapsibleTrigger asChild>
          {item.subItems ? (
            <SidebarMenuButton
              disabled={item.comingSoon}
              isActive={isActive(item.url, item.subItems)}
              tooltip={label}
            >
              {item.icon && <item.icon />}
              <span>{label}</span>
              {item.comingSoon && <IsComingSoon label={soonLabel} />}
              <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
            </SidebarMenuButton>
          ) : (
            <SidebarMenuButton
              asChild
              aria-disabled={item.comingSoon}
              isActive={isActive(item.url)}
              tooltip={label}
            >
              <Link
                prefetch={false}
                href={item.url}
                target={item.newTab ? "_blank" : undefined}
              >
                {item.icon && <item.icon />}
                <span>{label}</span>
                {item.comingSoon && <IsComingSoon label={soonLabel} />}
              </Link>
            </SidebarMenuButton>
          )}
        </CollapsibleTrigger>
        {item.subItems && (
          <CollapsibleContent>
            <SidebarMenuSub>
              {item.subItems.map((subItem) => (
                <SidebarMenuSubItem key={subItem.url}>
                  <SidebarMenuSubButton
                    aria-disabled={subItem.comingSoon}
                    isActive={isActive(subItem.url)}
                    asChild
                  >
                    <Link
                      prefetch={false}
                      href={subItem.url}
                      target={subItem.newTab ? "_blank" : undefined}
                    >
                      {subItem.icon && <subItem.icon />}
                      <span>{getTranslatedLabel(subItem, t)}</span>
                      {subItem.comingSoon && <IsComingSoon label={soonLabel} />}
                    </Link>
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>
              ))}
            </SidebarMenuSub>
          </CollapsibleContent>
        )}
      </SidebarMenuItem>
    </Collapsible>
  );
};

const NavItemCollapsed = ({
  item,
  isActive,
  t,
  soonLabel,
}: {
  item: NavMainItem;
  isActive: (url: string, subItems?: NavMainItem["subItems"]) => boolean;
  t: (key: TranslationKey) => string;
  soonLabel: string;
}) => {
  const label = getTranslatedLabel(item, t);

  return (
    <SidebarMenuItem key={item.url}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <SidebarMenuButton
            disabled={item.comingSoon}
            tooltip={label}
            isActive={isActive(item.url, item.subItems)}
          >
            {item.icon && <item.icon />}
            <span>{label}</span>
            <ChevronRight />
          </SidebarMenuButton>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          className="w-50 space-y-1"
          side="right"
          align="start"
        >
          {item.subItems?.map((subItem) => (
            <DropdownMenuItem key={subItem.url} asChild>
              <SidebarMenuSubButton
                key={subItem.url}
                asChild
                className="focus-visible:ring-0"
                aria-disabled={subItem.comingSoon}
                isActive={isActive(subItem.url)}
              >
                <Link
                  prefetch={false}
                  href={subItem.url}
                  target={subItem.newTab ? "_blank" : undefined}
                >
                  {subItem.icon && (
                    <subItem.icon className="[&>svg]:text-sidebar-foreground" />
                  )}
                  <span>{getTranslatedLabel(subItem, t)}</span>
                  {subItem.comingSoon && <IsComingSoon label={soonLabel} />}
                </Link>
              </SidebarMenuSubButton>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </SidebarMenuItem>
  );
};

export function NavMain({ items }: NavMainProps) {
  const router = useRouter();
  const { t, tt } = useI18n();
  const path = usePathname();
  const { state, isMobile } = useSidebar();
  const showMintQuickAction = React.useMemo(
    () =>
      items.some((group) =>
        group.items.some((item) => item.url === "/dashboard/mint"),
      ),
    [items],
  );
  const showNotificationsQuickAction = React.useMemo(
    () =>
      items.some((group) =>
        group.items.some((item) => item.url === "/dashboard/notifications"),
      ),
    [items],
  );

  const notificationsQuery = useDashboardNotificationsQuery(
    1,
    20,
    showNotificationsQuickAction,
    {
      refetchInterval: showNotificationsQuickAction ? 5_000 : false,
    },
  );
  const markNotificationsReadMutation = useMarkDashboardNotificationsReadMutation();
  const mintLabel = t("sidebar.item.mint");
  const inboxLabel = t("sidebar.inbox");
  const soonLabel = t("sidebar.soon");
  const notificationRows = notificationsQuery.data?.rows ?? [];
  const unreadCount = notificationsQuery.data?.pagination.unreadCount ?? 0;
  const hasInitializedToastRef = React.useRef(false);
  const previousRowIdsRef = React.useRef<Set<string>>(new Set());
  const hasMarkedNotificationsRef = React.useRef(false);

  React.useEffect(() => {
    if (!showNotificationsQuickAction) {
      hasMarkedNotificationsRef.current = false;
      return;
    }

    if (!path.startsWith("/dashboard/notifications")) {
      hasMarkedNotificationsRef.current = false;
      return;
    }

    if (!notificationsQuery.data) {
      return;
    }

    if (hasMarkedNotificationsRef.current) {
      return;
    }

    hasMarkedNotificationsRef.current = true;
    if (unreadCount > 0) {
      markNotificationsReadMutation.mutate({ markAll: true });
    }
  }, [
    markNotificationsReadMutation,
    notificationsQuery.data,
    path,
    showNotificationsQuickAction,
    unreadCount,
  ]);

  React.useEffect(() => {
    if (!showNotificationsQuickAction) {
      return;
    }

    if (!notificationsQuery.data) {
      return;
    }

    const currentIds = new Set(notificationRows.map((row) => row.id));
    if (!hasInitializedToastRef.current) {
      previousRowIdsRef.current = currentIds;
      hasInitializedToastRef.current = true;
      return;
    }

    if (path.startsWith("/dashboard/notifications")) {
      previousRowIdsRef.current = currentIds;
      return;
    }

    const newRows = notificationRows.filter(
      (row) => !previousRowIdsRef.current.has(row.id) && !row.isRead,
    );

    for (const row of newRows.slice(0, 3)) {
      toast.info(tt(row.title), {
        description: tt(row.message),
      });
    }

    previousRowIdsRef.current = currentIds;
  }, [notificationRows, notificationsQuery.data, path, showNotificationsQuickAction, tt]);

  const isItemActive = (url: string, subItems?: NavMainItem["subItems"]) => {
    if (subItems?.length) {
      return subItems.some((sub) => path.startsWith(sub.url));
    }
    return path === url;
  };

  const isSubmenuOpen = (subItems?: NavMainItem["subItems"]) => {
    return subItems?.some((sub) => path.startsWith(sub.url)) ?? false;
  };

  return (
    <>
      {(showMintQuickAction || showNotificationsQuickAction) && (
        <SidebarGroup>
          <SidebarGroupContent className="flex flex-col gap-2">
            <SidebarMenu>
              <SidebarMenuItem className="flex items-center gap-2">
                {showMintQuickAction && (
                  <SidebarMenuButton
                    asChild
                    tooltip={mintLabel}
                    className="relative min-w-8 bg-primary text-primary-foreground duration-200 ease-linear hover:bg-primary/90 hover:text-primary-foreground active:bg-primary/90 active:text-primary-foreground"
                  >
                    <Link prefetch={false} href="/dashboard/mint">
                      <Coins />
                      <span>{mintLabel}</span>
                      {showNotificationsQuickAction && unreadCount > 0 && (
                        <span className="absolute top-1 right-1 hidden min-h-4 min-w-4 items-center justify-center rounded-full bg-primary-foreground px-1 text-[10px] text-primary leading-none group-data-[collapsible=icon]:inline-flex">
                          {unreadCount > 99 ? "99+" : unreadCount}
                        </span>
                      )}
                    </Link>
                  </SidebarMenuButton>
                )}
                {showNotificationsQuickAction && (
                  <Button
                    size="icon"
                    className="relative h-9 w-9 shrink-0 group-data-[collapsible=icon]:opacity-0"
                    variant="outline"
                    onClick={() => router.push("/dashboard/notifications")}
                  >
                    <Bell />
                    {unreadCount > 0 && (
                      <span className="-right-1 -top-1 absolute inline-flex min-h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] text-primary-foreground leading-none">
                        {unreadCount > 99 ? "99+" : unreadCount}
                      </span>
                    )}
                    <span className="sr-only">{inboxLabel}</span>
                  </Button>
                )}
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      )}
      {items.map((group) => (
        <SidebarGroup key={group.id}>
          {(group.label || group.labelKey) && (
            <SidebarGroupLabel>
              {group.labelKey ? t(group.labelKey) : group.label}
            </SidebarGroupLabel>
          )}
          <SidebarGroupContent className="flex flex-col gap-2">
            <SidebarMenu>
              {group.items.map((item) => {
                if (state === "collapsed" && !isMobile) {
                  // If no subItems, just render the button as a link
                  if (!item.subItems) {
                    const itemLabel = getTranslatedLabel(item, t);
                    return (
                      <SidebarMenuItem key={item.url}>
                        <SidebarMenuButton
                          asChild
                          aria-disabled={item.comingSoon}
                          tooltip={itemLabel}
                          isActive={isItemActive(item.url)}
                        >
                          <Link
                            prefetch={false}
                            href={item.url}
                            target={item.newTab ? "_blank" : undefined}
                          >
                            {item.icon && <item.icon />}
                            <span>{itemLabel}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  }
                  // Otherwise, render the dropdown as before
                  return (
                    <NavItemCollapsed
                      key={item.url}
                      item={item}
                      isActive={isItemActive}
                      t={t}
                      soonLabel={soonLabel}
                    />
                  );
                }
                // Expanded view
                return (
                  <NavItemExpanded
                    key={item.url}
                    item={item}
                    isActive={isItemActive}
                    isSubmenuOpen={isSubmenuOpen}
                    t={t}
                    soonLabel={soonLabel}
                  />
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      ))}
    </>
  );
}
