"use client";

import * as React from "react";

import {
  CopyIcon,
  MoreHorizontalIcon,
  PowerIcon,
} from "lucide-react";
import { toast } from "sonner";
import {
  type Connector,
  useAccount,
  useConnect,
  useDisconnect,
} from "wagmi";

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
import { StatusBadge } from "@/app/(main)/dashboard/_mvp/components/status-badge";
import { StatusTimeline } from "@/app/(main)/dashboard/_mvp/components/status-timeline";
import { MvpTableToolbar } from "@/app/(main)/dashboard/_mvp/components/table-toolbar";

import type {
  WalletActivity,
  WalletAddress,
  WalletConnectionSummary,
} from "@/app/(main)/dashboard/_mvp/types";

import { useI18n } from "@/components/providers/language-provider";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useMeQuery } from "@/lib/queries/auth";
import {
  useConnectWalletMutation,
  useDashboardStateQuery,
  useDisconnectWalletMutation,
  useSetPrimaryWalletMutation,
} from "@/lib/queries/dashboard";
import { hasAccessPermission, type UserAccess } from "@/lib/rbac/route-access";

type AddressFilter = "all" | "connected" | "pending" | "verified" | "inactive";

const addressFilterOptions: AddressFilter[] = [
  "all",
  "connected",
  "pending",
  "verified",
  "inactive",
];

function canEditOwnWallet(access: UserAccess | null | undefined) {
  if (!access) {
    return false;
  }
  if (access.roleSlugs.includes("read_only")) {
    return false;
  }
  return hasAccessPermission(access, "settings.view");
}

function isMetaMaskConnector(connector: Pick<Connector, "id" | "name">) {
  const connectorName = connector.name.toLowerCase();
  const connectorId = connector.id.toLowerCase();
  return connectorName.includes("metamask") || connectorId === "metamask";
}

function pickAccountAddress(account: unknown): `0x${string}` | undefined {
  if (typeof account === "string") {
    return account as `0x${string}`;
  }
  if (account && typeof account === "object") {
    const value = (account as { address?: unknown }).address;
    if (typeof value === "string") {
      return value as `0x${string}`;
    }
  }
  return undefined;
}

async function resolvePreferredConnector(
  connectors: readonly Connector[],
  activeConnector?: Connector,
) {
  const orderedConnectors = [
    activeConnector,
    ...connectors.filter((item) => item.id !== activeConnector?.id),
  ].filter((item): item is Connector => Boolean(item));

  const metaMaskConnector = orderedConnectors.find((item) =>
    isMetaMaskConnector(item),
  );
  const probeOrder = metaMaskConnector
    ? [
        metaMaskConnector,
        ...orderedConnectors.filter((item) => item.id !== metaMaskConnector.id),
      ]
    : orderedConnectors;

  for (const candidate of probeOrder) {
    try {
      const provider = await candidate.getProvider();
      if (provider) {
        return candidate;
      }
    } catch {
      continue;
    }
  }

  return null;
}

function toAddressColumns(
  tt: (en: string) => string,
  onOpen: (address: WalletAddress) => void,
  onCopy: (address: WalletAddress) => void,
  onDisconnect: (address: WalletAddress) => Promise<void> | void,
  onSetPrimary: (address: WalletAddress) => Promise<void> | void,
  canDisconnectAddresses: boolean,
  canSetPrimaryAddresses: boolean,
): MvpTableColumn<WalletAddress>[] {
  return [
    {
      id: "label",
      header: tt("Label"),
      cell: (row) => (
        <div>
          <p className="font-medium text-sm">{row.label}</p>
          <p className="text-muted-foreground text-xs">{tt(row.type)}</p>
        </div>
      ),
    },
    {
      id: "address",
      header: tt("Wallet address"),
      cell: (row) => (
        <span className="font-mono text-xs tracking-wide">
          {row.address}
        </span>
      ),
    },
    {
      id: "network",
      header: tt("Network"),
      cell: (row) => row.network,
    },
    {
      id: "balance",
      header: tt("Balance"),
      className: "text-right",
      cell: (row) => formatCurrency(row.balance),
    },
    {
      id: "connection",
      header: tt("Connection status"),
      cell: (row) => <StatusBadge status={row.connectionStatus} />,
    },
    {
      id: "verification",
      header: tt("Verification"),
      cell: (row) => <StatusBadge status={row.verificationStatus} />,
    },
    {
      id: "updated",
      header: tt("Last activity"),
      cell: (row) =>
        row.lastActivityAt
          ? formatDateTime(row.lastActivityAt)
          : tt("No activity"),
    },
    {
      id: "actions",
      header: "",
      className: "text-right",
      cell: (row) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="size-8">
              <MoreHorizontalIcon className="size-4" />
              <span className="sr-only">{tt("Open menu")}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => onOpen(row)}>
              {tt("View details")}
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => onCopy(row)}>
              {tt("Copy")}
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() => void onSetPrimary(row)}
              disabled={!canSetPrimaryAddresses || row.type === "primary"}
            >
              {tt("Set as primary")}
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() => void onDisconnect(row)}
              disabled={
                !canDisconnectAddresses ||
                row.connectionStatus === "inactive"
              }
            >
              {tt("Disconnect")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];
}

export default function Page() {
  const { tt } = useI18n();
  const meQuery = useMeQuery();
  const dashboardStateQuery = useDashboardStateQuery();
  const connectWalletMutation = useConnectWalletMutation();
  const disconnectWalletMutation = useDisconnectWalletMutation();
  const setPrimaryWalletMutation = useSetPrimaryWalletMutation();
  const canEditWallet = canEditOwnWallet(meQuery.data?.access);
  const { address: connectedAddress, chain, connector, isConnected } =
    useAccount();
  const { connectAsync, connectors, isPending: isConnectorConnecting } =
    useConnect();
  const { disconnect: disconnectConnector, isPending: isConnectorDisconnecting } =
    useDisconnect();
  const walletActionPending =
    connectWalletMutation.isPending ||
    disconnectWalletMutation.isPending ||
    setPrimaryWalletMutation.isPending ||
    isConnectorConnecting ||
    isConnectorDisconnecting;
  const [connection, setConnection] = React.useState<WalletConnectionSummary>({
    provider: "-",
    accountId: "-",
    primaryNetwork: "-",
    connectedSince: new Date(0).toISOString(),
    status: "inactive",
    dailyTransferLimit: 0,
    usedToday: 0,
    policyProfile: "-",
  });
  const [addresses, setAddresses] = React.useState<WalletAddress[]>([]);
  const [activities, setActivities] = React.useState<WalletActivity[]>([]);
  const [search, setSearch] = React.useState("");
  const [networkFilter, setNetworkFilter] = React.useState("all");
  const [statusFilter, setStatusFilter] = React.useState<AddressFilter>("all");
  const [selectedAddress, setSelectedAddress] =
    React.useState<WalletAddress | null>(null);

  React.useEffect(() => {
    if (dashboardStateQuery.data?.walletConnectionSummary) {
      setConnection(dashboardStateQuery.data.walletConnectionSummary);
    }
    if (dashboardStateQuery.data?.walletAddresses) {
      setAddresses(dashboardStateQuery.data.walletAddresses);
    }
    if (dashboardStateQuery.data?.walletActivity) {
      setActivities(dashboardStateQuery.data.walletActivity);
    }
  }, [
    dashboardStateQuery.data?.walletActivity,
    dashboardStateQuery.data?.walletAddresses,
    dashboardStateQuery.data?.walletConnectionSummary,
  ]);

  const networkFilterOptions = React.useMemo(
    () => ["all", ...new Set(addresses.map((entry) => entry.network))],
    [addresses],
  );

  React.useEffect(() => {
    if (!networkFilterOptions.includes(networkFilter)) {
      setNetworkFilter("all");
    }
  }, [networkFilter, networkFilterOptions]);

  const filteredAddresses = React.useMemo(
    () =>
      addresses.filter((item) => {
        const query = search.trim().toLowerCase();
        const matchesSearch =
          query.length === 0 ||
          item.label.toLowerCase().includes(query) ||
          item.address.toLowerCase().includes(query) ||
          item.network.toLowerCase().includes(query);

        const matchesNetwork =
          networkFilter === "all" || item.network === networkFilter;

        const matchesStatus =
          statusFilter === "all" ||
          (statusFilter === "connected" &&
            item.connectionStatus === "connected") ||
          (statusFilter === "pending" &&
            item.verificationStatus === "pending") ||
          (statusFilter === "verified" &&
            item.verificationStatus === "verified") ||
          (statusFilter === "inactive" &&
            (item.connectionStatus === "inactive" ||
              item.verificationStatus === "inactive"));

        return matchesSearch && matchesNetwork && matchesStatus;
      }),
    [addresses, networkFilter, search, statusFilter],
  );

  const totalBalance = addresses.reduce((sum, item) => sum + item.balance, 0);
  const connectedWalletCount = addresses.filter(
    (item) => item.connectionStatus === "connected",
  ).length;

  const columns = toAddressColumns(
    tt,
    setSelectedAddress,
    (address) => void handleCopyAddress(address),
    (address) => disconnectAddress(address),
    (address) => setPrimaryAddress(address),
    canEditWallet && !walletActionPending,
    canEditWallet && !walletActionPending,
  );

  async function handleCopyAddress(address: WalletAddress) {
    try {
      await navigator.clipboard.writeText(address.address);
      toast.success(tt("Address copied to clipboard."));
    } catch {
      toast.error(tt("Unable to copy wallet address."));
    }
  }

  async function disconnectAddress(address: WalletAddress) {
    if (!canEditWallet) {
      return;
    }

    try {
      await disconnectWalletMutation.mutateAsync({
        accountAddress: address.address,
        network: address.network,
      });

      if (
        isConnected &&
        connectedAddress &&
        connectedAddress.toLowerCase() === address.address.toLowerCase()
      ) {
        disconnectConnector();
      }

      await dashboardStateQuery.refetch();
      toast.success(tt("Wallet address disconnected."));
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : tt("Unable to disconnect wallet address."),
      );
    }
  }

  async function setPrimaryAddress(address: WalletAddress) {
    if (!canEditWallet || address.type === "primary") {
      return;
    }

    try {
      await setPrimaryWalletMutation.mutateAsync({
        accountAddress: address.address,
        network: address.network,
      });
      await dashboardStateQuery.refetch();
      toast.success(tt("Primary wallet updated."));
      setSelectedAddress((current) =>
        current && current.id === address.id
          ? {
              ...current,
              type: "primary",
            }
          : current,
      );
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : tt("Unable to set primary wallet."),
      );
    }
  }

  async function handleConnectWallet() {
    if (!canEditWallet) {
      return;
    }

    try {
      let accountAddress = connectedAddress;
      let provider = connector?.id ?? "injected";
      let network = chain?.name ?? "Ethereum";
      let label = connector?.name ? `${connector.name} wallet` : "Linked wallet";

      const preferredConnector = await resolvePreferredConnector(
        connectors,
        connector ?? undefined,
      );
      if (!preferredConnector) {
        toast.error(
          tt("MetaMask provider not found. Please install/enable MetaMask and refresh."),
        );
        return;
      }

      const shouldReconnectWithPreferred =
        !accountAddress ||
        !connector ||
        connector.id !== preferredConnector.id;

      if (shouldReconnectWithPreferred) {
        let result: Awaited<ReturnType<typeof connectAsync>>;
        try {
          result = await connectAsync({ connector: preferredConnector });
        } catch {
          toast.error(
            tt("MetaMask provider not found. Please unlock MetaMask and try again."),
          );
          return;
        }
        accountAddress = pickAccountAddress(result.accounts?.[0]);
        provider = preferredConnector.id;
        label = preferredConnector.name
          ? `${preferredConnector.name} wallet`
          : "Linked wallet";
        if (result.chainId) {
          network = chain?.name ?? `Chain ${result.chainId}`;
        }
      }

      if (!accountAddress) {
        toast.error(tt("Wallet address could not be resolved."));
        return;
      }

      await connectWalletMutation.mutateAsync({
        provider,
        accountAddress,
        network,
        label,
      });
      await dashboardStateQuery.refetch();
      toast.success(tt("Wallet connected."));
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : tt("Unable to connect wallet."),
      );
    }
  }

  async function handleDisconnectWallet() {
    if (!canEditWallet) {
      return;
    }

    const connectedAddressRow =
      (connectedAddress
        ? addresses.find(
            (item) =>
              item.connectionStatus === "connected" &&
              item.address.toLowerCase() === connectedAddress.toLowerCase(),
          )
        : undefined) ??
      addresses.find((item) => item.connectionStatus === "connected");

    if (!connectedAddressRow) {
      toast.error(tt("No connected wallet address found."));
      return;
    }

    try {
      await disconnectWalletMutation.mutateAsync({
        accountAddress: connectedAddressRow.address,
        network: connectedAddressRow.network,
      });

      if (isConnected) {
        disconnectConnector();
      }

      await dashboardStateQuery.refetch();
      toast.success(tt("Wallet disconnected."));
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : tt("Unable to disconnect wallet."),
      );
    }
  }

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <MvpPageHeader
        title={tt("Wallet")}
        description={tt("Connected wallet summary, linked addresses, network support, and recent wallet operations.")}
        actions={
          <>
            <Button
              variant="outline"
              disabled={!canEditWallet || walletActionPending}
              onClick={() => void handleConnectWallet()}
            >
              {tt("Connect wallet")}
            </Button>
            <Button
              variant="destructive"
              disabled={!canEditWallet || walletActionPending}
              onClick={() => void handleDisconnectWallet()}
            >
              <PowerIcon className="size-4" />
              {tt("Disconnect")}
            </Button>
          </>
        }
      />
      {!canEditWallet ? (
        <p className="text-muted-foreground text-sm">
          {tt("This action requires settings edit access.")}
        </p>
      ) : null}

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MvpKpiCard
          label={tt("Connection status")}
          value={tt(
            connection.status === "connected" ? "Connected" : "Disconnected",
          )}
          hint={tt("Wallet session state and policy attachment")}
          status={connection.status}
        />
        <MvpKpiCard
          label={tt("Balance")}
          value={formatCurrency(totalBalance)}
          hint={tt("Visible linked-address holdings")}
          status="active"
        />
        <MvpKpiCard
          label={tt("Network")}
          value={connection.primaryNetwork}
          hint={tt("Primary network")}
          status="active"
        />
        <MvpKpiCard
          label={tt("Number of wallets")}
          value={formatNumber(connectedWalletCount)}
          hint={tt("Connected status")}
          status={connectedWalletCount > 0 ? "active" : "pending"}
        />
      </section>

      <MvpSectionCard
        title={tt("Linked addresses")}
        description={tt("Manage connected addresses, verification state, and operational availability.")}
        contentClassName="space-y-4"
      >
        <MvpTableToolbar
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder={tt("Search label, network, or address")}
          filters={
            <div className="flex flex-wrap gap-2">
              <Select value={networkFilter} onValueChange={setNetworkFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder={tt("All networks")} />
                </SelectTrigger>
                <SelectContent>
                  {networkFilterOptions.map((network) => (
                    <SelectItem key={network} value={network}>
                      {network === "all" ? tt("All networks") : network}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={statusFilter}
                onValueChange={(value: AddressFilter) => setStatusFilter(value)}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder={tt("All statuses")} />
                </SelectTrigger>
                <SelectContent>
                  {addressFilterOptions.map((status) => (
                    <SelectItem key={status} value={status}>
                      {status === "all" ? tt("All statuses") : tt(status)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          }
        />

        <MvpSimpleTable
          columns={columns}
          data={filteredAddresses}
          getRowId={(row) => row.id}
          emptyTitle={tt("No linked wallets")}
          emptyDescription={tt("Connect a wallet to start managing linked addresses and verification states.")}
        />
      </MvpSectionCard>

      <MvpSectionCard
        title={tt("Recent wallet activity")}
        description={tt("Recent connect, verification, and address actions.")}
      >
        <MvpSimpleTable
          columns={[
            {
              id: "action",
              header: tt("Action"),
              cell: (row: WalletActivity) => tt(row.action),
            },
            {
              id: "target",
              header: tt("Target"),
              cell: (row: WalletActivity) => row.target,
            },
            {
              id: "network",
              header: tt("Network"),
              cell: (row: WalletActivity) => row.network,
            },
            {
              id: "actor",
              header: tt("Actor"),
              cell: (row: WalletActivity) => row.actor,
            },
            {
              id: "status",
              header: tt("Status"),
              cell: (row: WalletActivity) => (
                <StatusBadge status={row.status} />
              ),
            },
            {
              id: "time",
              header: tt("Time"),
              cell: (row: WalletActivity) => formatDateTime(row.timestamp),
            },
          ]}
          data={activities}
          getRowId={(row) => row.id}
          emptyTitle={tt("No wallet activity")}
          emptyDescription={tt("Activity events will appear here after wallet actions.")}
        />
      </MvpSectionCard>

      <MvpDetailDrawer
        open={Boolean(selectedAddress)}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedAddress(null);
          }
        }}
        title={
          selectedAddress
            ? `${tt("Wallet address")} ${selectedAddress.label}`
            : tt("Wallet address")
        }
        description={
          selectedAddress
            ? `${selectedAddress.network} • ${selectedAddress.address}`
            : undefined
        }
        footer={
          selectedAddress ? (
            <div className="grid grid-cols-1 gap-2">
              <Button
                variant="outline"
                onClick={() => void handleCopyAddress(selectedAddress)}
              >
                <CopyIcon className="size-4" />
                {tt("Copy address")}
              </Button>
              <Button
                variant="outline"
                onClick={() => void setPrimaryAddress(selectedAddress)}
                disabled={
                  !canEditWallet ||
                  walletActionPending ||
                  selectedAddress.type === "primary"
                }
              >
                {tt("Set as primary")}
              </Button>
              <Button
                variant="outline"
                onClick={() => void disconnectAddress(selectedAddress)}
                disabled={
                  !canEditWallet ||
                  walletActionPending ||
                  selectedAddress.connectionStatus === "inactive"
                }
              >
                {tt("Disconnect address")}
              </Button>
            </div>
          ) : null
        }
      >
        {selectedAddress ? (
          <>
            <div className="rounded-lg border bg-muted/20 p-3">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={selectedAddress.connectionStatus} />
                <StatusBadge status={selectedAddress.verificationStatus} />
                <span className="rounded-md bg-muted px-2 py-1 text-xs">
                  {tt(selectedAddress.type)}
                </span>
              </div>
              <p className="mt-2 font-mono text-xs">
                {selectedAddress.address}
              </p>
              <p className="mt-1 text-muted-foreground text-xs">
                {tt("Added")}: {formatDateTime(selectedAddress.addedAt)}
              </p>
              {selectedAddress.lastActivityAt ? (
                <p className="text-muted-foreground text-xs">
                  {tt("Last activity")}:{" "}
                  {formatDateTime(selectedAddress.lastActivityAt)}
                </p>
              ) : null}
            </div>

            <div className="space-y-2 rounded-lg border p-3">
              <p className="font-medium text-sm">{tt("Tags and allocation")}</p>
              <p className="text-muted-foreground text-sm">
                {tt("Balance")}: {formatCurrency(selectedAddress.balance)} •{" "}
                {tt("Allocation")}: {selectedAddress.allocation.toFixed(1)}%
              </p>
              <div className="flex flex-wrap gap-2">
                {selectedAddress.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-md bg-muted px-2 py-1 text-xs"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <p className="font-medium text-sm">{tt("Address timeline")}</p>
              <StatusTimeline entries={selectedAddress.timeline} />
            </div>
          </>
        ) : null}
      </MvpDetailDrawer>
    </div>
  );
}
