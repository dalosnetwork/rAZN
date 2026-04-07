"use client";

import * as React from "react";

import { MvpDetailDrawer } from "@/app/(main)/dashboard/_mvp/components/detail-drawer";
import {
  formatCurrency,
  formatDateTime,
  formatNumber,
} from "@/app/(main)/dashboard/_mvp/components/formatters";
import { MvpKpiCard } from "@/app/(main)/dashboard/_mvp/components/kpi-card";
import { MvpPageHeader } from "@/app/(main)/dashboard/_mvp/components/page-header";
import { MvpSectionCard } from "@/app/(main)/dashboard/_mvp/components/section-card";
import {
  MvpSimpleTable,
  type MvpTableColumn,
} from "@/app/(main)/dashboard/_mvp/components/simple-table";
import {
  MvpErrorAlert,
  MvpInlineLoading,
} from "@/app/(main)/dashboard/_mvp/components/state-blocks";
import { StatusBadge } from "@/app/(main)/dashboard/_mvp/components/status-badge";
import { MvpTableToolbar } from "@/app/(main)/dashboard/_mvp/components/table-toolbar";
import type { MvpStatus } from "@/app/(main)/dashboard/_mvp/types";

import { useI18n } from "@/components/providers/language-provider";
import { Button } from "@/components/ui/button";
import { useAdminWalletQuery } from "@/lib/queries/dashboard";

type AdminWalletRecord = {
  id: string;
  wallet: string;
  type: "minting_vault" | "treasury_vault" | "redemption_tracking";
  ownerName: string;
  ownerEmail: string;
  balance: number;
  status: MvpStatus;
  network: string;
  address: string;
  updatedAt: string;
};

type MintAdminWalletLogRow = {
  id: string;
  requestId: string;
  customer: string;
  amount: number;
  destinationWallet: string;
  adminWalletAddress: string;
  txHash: string;
  status: MvpStatus;
  updatedAt: string;
};

type WalletActivityRow = {
  id: string;
  action: string;
  wallet: string;
  customerName: string;
  customerEmail: string;
  actorName: string;
  actorEmail: string;
  status: MvpStatus;
  timestamp: string;
};

function walletPurposeLabel(
  type: AdminWalletRecord["type"],
  tt: (en: string) => string,
) {
  if (type === "minting_vault") {
    return tt("Mint destination");
  }
  if (type === "treasury_vault") {
    return tt("Treasury");
  }
  return tt("Redemption");
}

function buildWalletColumns(
  onOpen: (wallet: AdminWalletRecord) => void,
  tt: (en: string) => string,
): MvpTableColumn<AdminWalletRecord>[] {
  return [
    {
      id: "owner",
      header: tt("Customer"),
      cell: (row) => (
        <div className="space-y-0.5">
          <p className="font-medium">{row.ownerName}</p>
          <p className="text-muted-foreground text-xs">{row.ownerEmail}</p>
        </div>
      ),
    },
    {
      id: "wallet",
      header: tt("Wallet"),
      cell: (row) => (
        <div className="space-y-0.5">
          <p className="font-medium">{row.wallet}</p>
          <p className="text-muted-foreground text-xs">
            {walletPurposeLabel(row.type, tt)}
          </p>
        </div>
      ),
    },
    {
      id: "address",
      header: tt("Address"),
      cell: (row) => <span className="font-mono text-xs">{row.address}</span>,
    },
    {
      id: "network",
      header: tt("Network"),
      cell: (row) => row.network,
    },
    {
      id: "status",
      header: tt("Status"),
      cell: (row) => <StatusBadge status={row.status} />,
    },
    {
      id: "balance",
      header: tt("Balance"),
      className: "text-right",
      cell: (row) => formatCurrency(row.balance),
    },
    {
      id: "detail",
      header: tt("Detail"),
      className: "text-right",
      cell: (row) => (
        <Button variant="outline" size="sm" onClick={() => onOpen(row)}>
          {tt("View details")}
        </Button>
      ),
    },
  ];
}

function buildMintAdminWalletLogColumns(
  tt: (en: string) => string,
): MvpTableColumn<MintAdminWalletLogRow>[] {
  return [
    {
      id: "requestId",
      header: tt("Request ID"),
      cell: (row) => row.requestId,
    },
    {
      id: "customer",
      header: tt("Customer"),
      cell: (row) => row.customer,
    },
    {
      id: "amount",
      header: tt("Amount"),
      className: "text-right",
      cell: (row) => formatCurrency(row.amount),
    },
    {
      id: "destinationWallet",
      header: tt("Destination wallet"),
      cell: (row) => (
        <span className="font-mono text-xs">{row.destinationWallet}</span>
      ),
    },
    {
      id: "adminWalletAddress",
      header: tt("Mint admin wallet"),
      cell: (row) => (
        <span className="font-mono text-xs">{row.adminWalletAddress}</span>
      ),
    },
    {
      id: "txHash",
      header: tt("Tx hash"),
      cell: (row) => <span className="font-mono text-xs">{row.txHash}</span>,
    },
    {
      id: "status",
      header: tt("Status"),
      cell: (row) => <StatusBadge status={row.status} />,
    },
    {
      id: "updatedAt",
      header: tt("Updated"),
      cell: (row) => formatDateTime(row.updatedAt),
    },
  ];
}

function buildActivityColumns(
  tt: (en: string) => string,
): MvpTableColumn<WalletActivityRow>[] {
  return [
    {
      id: "action",
      header: tt("Action"),
      cell: (row) => row.action,
    },
    {
      id: "wallet",
      header: tt("Wallet"),
      cell: (row) => row.wallet,
    },
    {
      id: "customer",
      header: tt("Customer"),
      cell: (row) => (
        <div className="space-y-0.5">
          <p className="font-medium">{row.customerName}</p>
          <p className="text-muted-foreground text-xs">{row.customerEmail}</p>
        </div>
      ),
    },
    {
      id: "actor",
      header: tt("Admin"),
      cell: (row) => (
        <div className="space-y-0.5">
          <p className="font-medium">{row.actorName}</p>
          <p className="text-muted-foreground text-xs">{row.actorEmail}</p>
        </div>
      ),
    },
    {
      id: "status",
      header: tt("Status"),
      cell: (row) => <StatusBadge status={row.status} />,
    },
    {
      id: "timestamp",
      header: tt("Time"),
      cell: (row) => formatDateTime(row.timestamp),
    },
  ];
}

export default function Page() {
  const { tt } = useI18n();
  const adminWalletQuery = useAdminWalletQuery();
  const [search, setSearch] = React.useState("");
  const [selectedWallet, setSelectedWallet] =
    React.useState<AdminWalletRecord | null>(null);

  const wallets = (adminWalletQuery.data?.wallets ?? []) as AdminWalletRecord[];
  const mintAdminWalletLogs = (adminWalletQuery.data?.mintAdminWalletLogs ??
    []) as MintAdminWalletLogRow[];
  const walletActivity = (adminWalletQuery.data?.activity ?? []) as WalletActivityRow[];

  const filteredWallets = React.useMemo(() => {
    const query = search.trim().toLowerCase();
    if (query.length === 0) {
      return wallets;
    }

    return wallets.filter((wallet) => {
      return (
        wallet.wallet.toLowerCase().includes(query) ||
        wallet.ownerName.toLowerCase().includes(query) ||
        wallet.ownerEmail.toLowerCase().includes(query) ||
        wallet.network.toLowerCase().includes(query) ||
        wallet.address.toLowerCase().includes(query)
      );
    });
  }, [search, wallets]);

  const uniqueOwnerCount = React.useMemo(() => {
    const ownerKeys = wallets.map((wallet) =>
      `${wallet.ownerName.toLowerCase()}|${wallet.ownerEmail.toLowerCase()}`,
    );
    return new Set(ownerKeys).size;
  }, [wallets]);

  const loggedMintAdminWalletCount = React.useMemo(() => {
    const adminWallets = mintAdminWalletLogs
      .map((row) => row.adminWalletAddress)
      .filter((address) => address && address !== "-")
      .map((address) => address.toLowerCase());
    return new Set(adminWallets).size;
  }, [mintAdminWalletLogs]);

  const walletColumns = React.useMemo(
    () => buildWalletColumns(setSelectedWallet, tt),
    [tt],
  );
  const mintAdminWalletLogColumns = React.useMemo(
    () => buildMintAdminWalletLogColumns(tt),
    [tt],
  );
  const activityColumns = React.useMemo(() => buildActivityColumns(tt), [tt]);

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <MvpPageHeader
        title={tt("Wallet")}
        description={tt("Customer wallet registry and mint admin wallet audit logs.")}
      />
      {adminWalletQuery.isLoading ? <MvpInlineLoading /> : null}
      {adminWalletQuery.error ? (
        <MvpErrorAlert
          title={tt("Could not load admin wallet state")}
          description={adminWalletQuery.error.message}
        />
      ) : null}

      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <MvpKpiCard
          label={tt("Registered wallets")}
          value={formatNumber(wallets.length)}
          hint={tt("Total wallet records in customer registry")}
          status="active"
        />
        <MvpKpiCard
          label={tt("Wallet owners")}
          value={formatNumber(uniqueOwnerCount)}
          hint={tt("Unique customers owning these wallet records")}
          status="active"
        />
        <MvpKpiCard
          label={tt("Mint admin wallets in logs")}
          value={formatNumber(loggedMintAdminWalletCount)}
          hint={tt("Unique admin wallet addresses captured during mint approvals")}
          status={loggedMintAdminWalletCount > 0 ? "connected" : "warning"}
        />
      </section>

      <MvpSectionCard
        title={tt("Customer wallet registry")}
        description={tt("Each row shows the wallet owner so admins can identify whose wallet is listed.")}
        contentClassName="space-y-4"
      >
        <MvpTableToolbar
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder={tt("Search customer, wallet, network, or address")}
        />
        <MvpSimpleTable
          columns={walletColumns}
          data={filteredWallets}
          getRowId={(row) => row.id}
          emptyTitle={tt("No wallets")}
          emptyDescription={tt("No wallets matched the selected filters.")}
        />
      </MvpSectionCard>

      <MvpSectionCard
        title={tt("Mint admin wallet log")}
        description={tt("Audit trail of mint requests with captured admin wallet and on-chain transaction hash.")}
      >
        <MvpSimpleTable
          columns={mintAdminWalletLogColumns}
          data={mintAdminWalletLogs}
          getRowId={(row) => row.id}
          emptyTitle={tt("No mint admin wallet logs")}
          emptyDescription={tt("Mint completion logs will appear here after approved mint requests.")}
        />
      </MvpSectionCard>

      <MvpSectionCard
        title={tt("Wallet activity table")}
        description={tt("Recent wallet events with customer and actor context.")}
      >
        <MvpSimpleTable
          columns={activityColumns}
          data={walletActivity}
          getRowId={(row) => row.id}
          emptyTitle={tt("No wallet activity")}
          emptyDescription={tt("Wallet operational activity will appear here.")}
        />
      </MvpSectionCard>

      <MvpDetailDrawer
        open={Boolean(selectedWallet)}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedWallet(null);
          }
        }}
        title={selectedWallet ? `${selectedWallet.wallet}` : tt("Wallet details")}
        description={
          selectedWallet
            ? `${tt("Owner")}: ${selectedWallet.ownerName} • ${tt("Last updated")} ${formatDateTime(selectedWallet.updatedAt)}`
            : undefined
        }
        footer={
          selectedWallet ? (
            <Button disabled>{tt("Save changes")}</Button>
          ) : null
        }
      >
        {selectedWallet ? (
          <div className="grid grid-cols-1 gap-3 rounded-lg border bg-muted/20 p-3 text-sm">
            <div>
              <p className="text-muted-foreground text-xs">{tt("Customer")}</p>
              <p className="font-medium">{selectedWallet.ownerName}</p>
              <p className="text-muted-foreground text-xs">{selectedWallet.ownerEmail}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">{tt("Wallet")}</p>
              <p className="font-medium">{selectedWallet.wallet}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">{tt("Purpose")}</p>
              <p className="font-medium">{walletPurposeLabel(selectedWallet.type, tt)}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">{tt("Address")}</p>
              <p className="font-mono text-xs">{selectedWallet.address}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">{tt("Balance")}</p>
              <p className="font-medium">{formatCurrency(selectedWallet.balance)}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">{tt("Status")}</p>
              <StatusBadge status={selectedWallet.status} />
            </div>
          </div>
        ) : null}
      </MvpDetailDrawer>
    </div>
  );
}
