import {
  Ban,
  BadgeCheck,
  ChartSpline,
  CircleDollarSign,
  Coins,
  FileLock2,
  Landmark,
  LayoutDashboard,
  Settings2,
  ShieldAlert,
  ShieldCheck,
  UserRoundCheck,
  Wallet,
  WalletMinimal,
  type LucideIcon,
} from "lucide-react";

import type { TranslationKey } from "@/lib/i18n/messages";

export interface NavSubItem {
  title: string;
  titleKey?: TranslationKey;
  url: string;
  icon?: LucideIcon;
  comingSoon?: boolean;
  newTab?: boolean;
  isNew?: boolean;
}

export interface NavMainItem {
  title: string;
  titleKey?: TranslationKey;
  url: string;
  icon?: LucideIcon;
  subItems?: NavSubItem[];
  comingSoon?: boolean;
  newTab?: boolean;
  isNew?: boolean;
}

export interface NavGroup {
  id: number;
  label?: string;
  labelKey?: TranslationKey;
  items: NavMainItem[];
}

export const sidebarItems: NavGroup[] = [
  {
    id: 1,
    label: "User",
    labelKey: "sidebar.group.user",
    items: [
      {
        title: "Overview",
        titleKey: "sidebar.item.overview",
        url: "/dashboard/overview",
        icon: LayoutDashboard,
      },
      {
        title: "Mint",
        titleKey: "sidebar.item.mint",
        url: "/dashboard/mint",
        icon: Coins,
      },
      {
        title: "Redeem",
        titleKey: "sidebar.item.redeem",
        url: "/dashboard/redeem",
        icon: Wallet,
      },
      {
        title: "KYB",
        titleKey: "sidebar.item.kyb",
        url: "/dashboard/kyb",
        icon: BadgeCheck,
      },
      {
        title: "Reserve Transparency",
        titleKey: "sidebar.item.reserveTransparency",
        url: "/dashboard/reserve-transparency",
        icon: ChartSpline,
      },
      {
        title: "Wallet",
        titleKey: "sidebar.item.wallet",
        url: "/dashboard/wallet",
        icon: WalletMinimal,
      },
      {
        title: "Banking",
        titleKey: "sidebar.item.banking",
        url: "/dashboard/banking",
        icon: Landmark,
      },
      {
        title: "Settings",
        titleKey: "sidebar.item.settings",
        url: "/dashboard/settings",
        icon: Settings2,
      },
    ],
  },
  {
    id: 2,
    label: "Admin",
    labelKey: "sidebar.group.admin",
    items: [
      {
        title: "Admin Overview",
        titleKey: "sidebar.item.adminOverview",
        url: "/dashboard/admin/overview",
        icon: CircleDollarSign,
      },
      {
        title: "Mint Ops",
        titleKey: "sidebar.item.mintOps",
        url: "/dashboard/admin/mint-ops",
        icon: Coins,
      },
      {
        title: "Redemption Ops",
        titleKey: "sidebar.item.redemptionOps",
        url: "/dashboard/admin/redemption-ops",
        icon: Wallet,
      },
      {
        title: "Institution Management",
        titleKey: "sidebar.item.kybReview",
        url: "/dashboard/admin/institution-management",
        icon: UserRoundCheck,
      },
      {
        title: "Reserve Management",
        titleKey: "sidebar.item.treasury",
        url: "/dashboard/admin/reserve-management",
        icon: Landmark,
      },
      {
        title: "Wallet",
        titleKey: "sidebar.item.riskControls",
        url: "/dashboard/admin/wallet",
        icon: ShieldAlert,
      },
      {
        title: "Admin & Role Management",
        titleKey: "sidebar.item.blacklist",
        url: "/dashboard/admin/admin-role-management",
        icon: Ban,
      },
      {
        title: "Settings",
        titleKey: "sidebar.item.contractControls",
        url: "/dashboard/admin/settings",
        icon: FileLock2,
      },
    ],
  },
  {
    id: 3,
    label: "System",
    labelKey: "sidebar.group.system",
    items: [
      {
        title: "Unauthorized",
        titleKey: "sidebar.item.unauthorized",
        url: "/unauthorized",
        icon: ShieldCheck,
      },
    ],
  },
];
