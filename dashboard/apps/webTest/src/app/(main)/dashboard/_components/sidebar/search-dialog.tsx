"use client";

import * as React from "react";

import { useRouter } from "next/navigation";

import { Search, type LucideIcon } from "lucide-react";

import { useI18n } from "@/components/providers/language-provider";
import { Button } from "@/components/ui/button";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import type { TranslationKey } from "@/lib/i18n/messages";
import { useMeQuery } from "@/lib/queries/auth";
import {
  canAccessDashboardPath,
  filterSidebarItemsByAccess,
} from "@/lib/rbac/route-access";
import type { NavGroup } from "@/navigation/sidebar/sidebar-items";
import { sidebarItems } from "@/navigation/sidebar/sidebar-items";

import {
  subscribeToGlobalSearch,
  type GlobalSearchScope,
} from "./global-search-events";

type SearchCommand = {
  id: string;
  group: "pages" | "actions";
  label: string;
  href: string;
  icon?: LucideIcon;
  keywords: string[];
  disabled?: boolean;
  newTab?: boolean;
};

function getNavLabel(
  item: { title: string; titleKey?: TranslationKey },
  t: (key: TranslationKey) => string,
) {
  return item.titleKey ? t(item.titleKey) : item.title;
}

function buildPageCommands(
  items: readonly NavGroup[],
  t: (key: TranslationKey) => string,
): SearchCommand[] {
  const commands: SearchCommand[] = [];

  for (const group of items) {
    const groupLabel = group.labelKey ? t(group.labelKey) : (group.label ?? "");

    for (const item of group.items) {
      const itemLabel = getNavLabel(item, t);
      if (!item.subItems?.length) {
        commands.push({
          id: `page:${item.url}`,
          group: "pages",
          label: itemLabel,
          href: item.url,
          icon: item.icon,
          keywords: [groupLabel, itemLabel, item.url].filter(Boolean),
          disabled: item.comingSoon,
          newTab: item.newTab,
        });
      }

      for (const subItem of item.subItems ?? []) {
        const subItemLabel = getNavLabel(subItem, t);
        commands.push({
          id: `page:${subItem.url}`,
          group: "pages",
          label: `${itemLabel}: ${subItemLabel}`,
          href: subItem.url,
          icon: subItem.icon ?? item.icon,
          keywords: [groupLabel, itemLabel, subItemLabel, subItem.url].filter(
            Boolean,
          ),
          disabled: subItem.comingSoon,
          newTab: subItem.newTab,
        });
      }
    }
  }

  return commands;
}

export function SearchDialog() {
  const router = useRouter();
  const { t, tx } = useI18n();
  const meQuery = useMeQuery();

  const [open, setOpen] = React.useState(false);
  const [scope, setScope] = React.useState<GlobalSearchScope>("all");
  const [query, setQuery] = React.useState("");

  const access = meQuery.data?.access;

  const visibleSidebarItems = React.useMemo(() => {
    if (!access) {
      return sidebarItems;
    }
    return filterSidebarItemsByAccess(sidebarItems, access);
  }, [access]);

  const pageCommands = React.useMemo(
    () => buildPageCommands(visibleSidebarItems, t),
    [t, visibleSidebarItems],
  );

  const actionCommands = React.useMemo<SearchCommand[]>(() => {
    const actions: SearchCommand[] = [];

    return actions.filter((action) => {
      if (!access) {
        return true;
      }
      const [pathname] = action.href.split("#");
      return (
        !pathname.startsWith("/dashboard") ||
        canAccessDashboardPath(pathname, access)
      );
    });
  }, [access]);

  const commands = React.useMemo(() => {
    if (scope === "actions") {
      return actionCommands;
    }
    return [...pageCommands, ...actionCommands];
  }, [actionCommands, pageCommands, scope]);

  const groupedCommands = React.useMemo(
    () => ({
      pages: commands.filter((command) => command.group === "pages"),
      actions: commands.filter((command) => command.group === "actions"),
    }),
    [commands],
  );

  const executeCommand = React.useCallback(
    (command: SearchCommand) => {
      if (command.disabled) {
        return;
      }
      if (command.newTab) {
        window.open(command.href, "_blank", "noopener,noreferrer");
      } else {
        const [pathname, hash] = command.href.split("#");
        if (hash && window.location.pathname === pathname) {
          window.history.replaceState(window.history.state, "", `#${hash}`);
          document.getElementById(hash)?.scrollIntoView({ block: "start" });
        } else {
          router.push(command.href);
        }
      }
      setOpen(false);
    },
    [router],
  );

  React.useEffect(() => {
    const down = (event: KeyboardEvent) => {
      if (event.key === "j" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setScope("all");
        setQuery("");
        setOpen((isOpen) => !isOpen);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  React.useEffect(() => {
    return subscribeToGlobalSearch((detail) => {
      setScope(detail.scope ?? "all");
      setQuery(detail.query ?? "");
      setOpen(true);
    });
  }, []);

  return (
    <>
      <Button
        variant="link"
        className="!px-0 font-normal text-muted-foreground hover:no-underline"
        onClick={() => {
          setScope("all");
          setQuery("");
          setOpen(true);
        }}
      >
        <Search className="size-4" />
        {tx("Search", "Ara", "Поиск")}
        <kbd className="inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-medium text-[10px]">
          <span className="text-xs">⌘</span>J
        </kbd>
      </Button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput
          value={query}
          onValueChange={setQuery}
          placeholder={tx(
            "Search dashboards, users, and more…",
            "Panolarda, kullanıcılarda ve daha fazlasında ara…",
            "Ищите панели, пользователей и многое другое…",
          )}
        />
        <CommandList>
          <CommandEmpty>
            {tx("No results found.", "Sonuç bulunamadı.", "Ничего не найдено.")}
          </CommandEmpty>

          {groupedCommands.pages.length > 0 && (
            <CommandGroup heading={tx("Pages", "Sayfalar", "Страницы")}>
              {groupedCommands.pages.map((command) => (
                <CommandItem
                  key={command.id}
                  className="!py-1.5"
                  value={command.label}
                  keywords={command.keywords}
                  disabled={command.disabled}
                  onSelect={() => executeCommand(command)}
                >
                  {command.icon && <command.icon />}
                  <span>{command.label}</span>
                  {command.disabled && (
                    <CommandShortcut>{t("sidebar.soon")}</CommandShortcut>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {groupedCommands.pages.length > 0 &&
            groupedCommands.actions.length > 0 && <CommandSeparator />}

          {groupedCommands.actions.length > 0 && (
            <CommandGroup heading={tx("Actions", "Aksiyonlar", "Действия")}>
              {groupedCommands.actions.map((command) => (
                <CommandItem
                  key={command.id}
                  className="!py-1.5"
                  value={command.label}
                  keywords={command.keywords}
                  onSelect={() => executeCommand(command)}
                >
                  {command.icon && <command.icon />}
                  <span>{command.label}</span>
                  <CommandShortcut>
                    {tx("Action", "Aksiyon", "Действие")}
                  </CommandShortcut>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
        </CommandList>
      </CommandDialog>
    </>
  );
}
