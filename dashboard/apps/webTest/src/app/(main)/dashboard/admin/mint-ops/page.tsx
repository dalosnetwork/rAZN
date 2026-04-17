"use client";

import * as React from "react";
import { toast } from "sonner";
import {
  type Connector,
  useAccount,
  useConnect,
  usePublicClient,
  useSwitchChain,
  useWriteContract,
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
  MvpErrorAlert,
  MvpInlineLoading,
} from "@/app/(main)/dashboard/_mvp/components/state-blocks";
import {
  MvpSimpleTable,
  type MvpTableColumn,
} from "@/app/(main)/dashboard/_mvp/components/simple-table";
import { StatusBadge } from "@/app/(main)/dashboard/_mvp/components/status-badge";
import { StatusTimeline } from "@/app/(main)/dashboard/_mvp/components/status-timeline";
import { MvpTableToolbar } from "@/app/(main)/dashboard/_mvp/components/table-toolbar";

import type {
  OpsQueueItem,
} from "@/app/(main)/dashboard/_mvp/types";

import { useI18n } from "@/components/providers/language-provider";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useAdminMintOpsQueueQuery,
  useUpdateAdminMintStatusMutation,
} from "@/lib/queries/dashboard";
import {
  getTokenChainId,
  getTokenContractAddress,
  toChecksumAddress,
  tokenAbi,
  toTokenUnits,
} from "@/lib/web3/token-contract";

const filterOptions = [
  "all",
  "pending",
  "submitted",
  "under_review",
  "approved",
  "rejected",
  "completed",
] as const;

function buildColumns(
  onOpen: (item: OpsQueueItem) => void,
  tt: (en: string) => string,
): MvpTableColumn<OpsQueueItem>[] {
  return [
    {
      id: "request",
      header: tt("Request"),
      cell: (row) => row.requestId,
    },
    {
      id: "user",
      header: tt("User"),
      cell: (row) => row.user,
    },
    {
      id: "amount",
      header: tt("Amount"),
      className: "text-right",
      cell: (row) => formatCurrency(row.amount),
    },
    {
      id: "timestamp",
      header: tt("Timestamp"),
      cell: (row) => formatDateTime(row.submittedAt),
    },
    {
      id: "status",
      header: tt("Status"),
      cell: (row) => <StatusBadge status={row.status} />,
    },
    {
      id: "action",
      header: "",
      className: "text-right",
      cell: (row) => (
        <Button variant="outline" size="sm" onClick={() => onOpen(row)}>
          {tt("Review")}
        </Button>
      ),
    },
  ];
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

async function resolvePreferredConnector(connectors: readonly Connector[]) {
  if (connectors.length === 0) {
    return null;
  }
  const metaMaskConnector = connectors.find((item) => isMetaMaskConnector(item));
  const probeOrder = metaMaskConnector
    ? [metaMaskConnector, ...connectors.filter((item) => item.id !== metaMaskConnector.id)]
    : connectors;

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

export default function Page() {
  const { tt, tx } = useI18n();
  const mintOpsQueueQuery = useAdminMintOpsQueueQuery();
  const updateMintStatusMutation = useUpdateAdminMintStatusMutation();
  const tokenChainId = React.useMemo(() => getTokenChainId(), []);
  const tokenContractAddress = React.useMemo(() => getTokenContractAddress(), []);
  const { address: connectedAdminAddress, chain, isConnected } = useAccount();
  const { connectAsync, connectors, isPending: isConnectorConnecting } =
    useConnect();
  const { switchChainAsync, isPending: isSwitchingChain } = useSwitchChain();
  const { writeContractAsync, isPending: isWritePending } = useWriteContract();
  const publicClient = usePublicClient({ chainId: tokenChainId });
  const [queueItems, setQueueItems] =
    React.useState<OpsQueueItem[]>([]);
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] =
    React.useState<(typeof filterOptions)[number]>("all");
  const [selectedItem, setSelectedItem] = React.useState<OpsQueueItem | null>(
    null,
  );

  React.useEffect(() => {
    if (mintOpsQueueQuery.data) {
      setQueueItems(mintOpsQueueQuery.data);
    }
  }, [mintOpsQueueQuery.data]);

  const filtered = React.useMemo(
    () =>
      queueItems.filter((item) => {
        const query = search.trim().toLowerCase();
        const matchesSearch =
          query.length === 0 ||
          item.requestId.toLowerCase().includes(query) ||
          item.user.toLowerCase().includes(query);
        const matchesStatus =
          statusFilter === "all" || item.status === statusFilter;
        return matchesSearch && matchesStatus;
      }),
    [queueItems, search, statusFilter],
  );

  const activeQueue = filtered.filter((item) =>
    ["submitted", "pending", "under_review"].includes(item.status),
  );

  const columns = React.useMemo(() => buildColumns(setSelectedItem, tt), [tt]);
  const actionPending =
    updateMintStatusMutation.isPending ||
    isConnectorConnecting ||
    isSwitchingChain ||
    isWritePending;

  async function updateItemStatus(
    itemId: string,
    status: "under_review" | "approved" | "rejected",
    label: string,
    options?: {
      txHash?: string;
      adminWalletAddress?: string;
      chainId?: number;
    },
  ) {
    try {
      await updateMintStatusMutation.mutateAsync({
        requestRef: itemId,
        status,
        note: label,
        txHash: options?.txHash,
        adminWalletAddress: options?.adminWalletAddress,
        chainId: options?.chainId,
      });
      const refreshed = await mintOpsQueueQuery.refetch();
      const updatedItem =
        refreshed.data?.find((item) => item.requestId === itemId) ?? null;
      setSelectedItem(updatedItem);
      toast.success(tt("Mint request updated."));
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : tt("Could not update mint request."),
      );
    }
  }

  async function ensureAdminWalletReady() {
    let adminWalletAddress = connectedAdminAddress;
    let currentChainId = chain?.id;

    if (!adminWalletAddress || !isConnected) {
      const preferredConnector = await resolvePreferredConnector(connectors);
      if (!preferredConnector) {
        throw new Error(
          tt("MetaMask provider not found. Please install/enable MetaMask and refresh."),
        );
      }
      let connected: Awaited<ReturnType<typeof connectAsync>>;
      try {
        connected = await connectAsync({ connector: preferredConnector });
      } catch {
        throw new Error(
          tt("MetaMask provider not found. Please unlock MetaMask and try again."),
        );
      }
      adminWalletAddress = pickAccountAddress(connected.accounts?.[0]);
      currentChainId = connected.chainId;
    }

    if (!adminWalletAddress) {
      throw new Error(tt("Admin wallet is not connected."));
    }

    if (currentChainId !== tokenChainId) {
      try {
        await switchChainAsync({ chainId: tokenChainId });
        currentChainId = tokenChainId;
      } catch {
        throw new Error(
          tt(`Please switch wallet network to BSC Testnet (chain ${tokenChainId}).`),
        );
      }
    }

    return {
      adminWalletAddress: toChecksumAddress(adminWalletAddress, "admin wallet"),
      chainId: currentChainId ?? tokenChainId,
    };
  }

  async function approveMintRequest(item: OpsQueueItem) {
    if (!item.onchainWalletAddress) {
      throw new Error(
        tt("User wallet address is missing. The user must connect a wallet."),
      );
    }
    if (!publicClient) {
      throw new Error(tt("Blockchain client is unavailable."));
    }

    const walletAddress = toChecksumAddress(
      item.onchainWalletAddress,
      "onchain wallet address",
    );
    const { adminWalletAddress, chainId } = await ensureAdminWalletReady();
    const amountUnits = await toTokenUnits({
      publicClient,
      tokenAddress: tokenContractAddress,
      amount: item.amount,
    });

    const txHash = await writeContractAsync({
      chainId: tokenChainId,
      account: adminWalletAddress,
      address: tokenContractAddress,
      abi: tokenAbi,
      functionName: "mint",
      args: [walletAddress, amountUnits],
    });
    const receipt = await publicClient.waitForTransactionReceipt({
      hash: txHash,
      confirmations: 1,
    });
    if (receipt.status !== "success") {
      throw new Error(tt("Mint transaction reverted on-chain."));
    }

    await updateItemStatus(item.requestId, "approved", "Request approved", {
      txHash,
      adminWalletAddress,
      chainId,
    });
  }

  const backlogCount = queueItems.filter((item) =>
    ["submitted", "pending", "under_review"].includes(item.status),
  ).length;
  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <MvpPageHeader
        title={tt("Mint Ops")}
        description={tt("Review incoming mint requests, apply operational actions, and monitor processed queue.")}
      />

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-2">
        <MvpKpiCard
          label={tt("Outstanding mint requests")}
          value={formatNumber(backlogCount)}
          hint={tt("Mint requests awaiting action")}
          status="pending"
        />
        <MvpKpiCard
          label={tt("Total value of mint requests")}
          value={formatCurrency(
            activeQueue.reduce((sum, item) => sum + item.amount, 0),
          )}
          hint={tt("Outstanding mint request value")}
          status="under_review"
        />
      </section>

      <MvpSectionCard
        title={tt("Incoming mint requests")}
        description={tt("Search, filter, and review request queue.")}
        contentClassName="space-y-4"
      >
        {mintOpsQueueQuery.isLoading ? (
          <MvpInlineLoading label={tt("Loading mint requests")} />
        ) : null}
        {mintOpsQueueQuery.isError ? (
          <MvpErrorAlert
            title={tt("Mint queue unavailable")}
            description={
              mintOpsQueueQuery.error instanceof Error
                ? mintOpsQueueQuery.error.message
                : tt("Could not load mint requests from backend.")
            }
          />
        ) : null}
        <MvpTableToolbar
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder={tt("Search by request ID or user")}
          filters={
            <Select
              value={statusFilter}
              onValueChange={(value: (typeof filterOptions)[number]) =>
                setStatusFilter(value)
              }
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder={tt("Status")} />
              </SelectTrigger>
              <SelectContent>
                {filterOptions.map((status) => (
                  <SelectItem key={status} value={status}>
                    {status === "all"
                      ? tt("All statuses")
                      : tt(status.replaceAll("_", " "))}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          }
        />

        <MvpSimpleTable
          columns={columns}
          data={activeQueue}
          getRowId={(row) => row.requestId}
          emptyTitle={tt("No active mint requests")}
          emptyDescription={tt("Incoming queue is clear for current filters.")}
        />
      </MvpSectionCard>

      <MvpDetailDrawer
        open={Boolean(selectedItem)}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedItem(null);
          }
        }}
        title={
          selectedItem
            ? `${tt("Mint")} ${selectedItem.requestId}`
            : tt("Mint request")
        }
        description={
          selectedItem
            ? `${selectedItem.user} • ${tt("submitted")} ${formatDateTime(selectedItem.submittedAt)}`
            : undefined
        }
        footer={
          selectedItem ? (
            <div className="flex flex-col gap-2">
              <Button
                disabled={actionPending}
                onClick={() => {
                  void approveMintRequest(selectedItem).catch((error) => {
                    toast.error(
                      error instanceof Error
                        ? error.message
                        : tt("Could not approve mint request."),
                    );
                  });
                }}
              >
                {tt("Approve")}
              </Button>
              <Button
                variant="outline"
                disabled={actionPending}
                onClick={() =>
                  void updateItemStatus(
                    selectedItem.requestId,
                    "rejected",
                    "Request rejected",
                  )
                }
              >
                {tt("Reject")}
              </Button>
            </div>
          ) : null
        }
      >
        {selectedItem ? (
          <>
            <div className="grid grid-cols-2 gap-3 rounded-lg border bg-muted/20 p-3 text-sm">
              <div>
                <p className="text-muted-foreground text-xs">{tt("Amount")}</p>
                <p className="font-medium">
                  {formatCurrency(selectedItem.amount)}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">{tt("Status")}</p>
                <StatusBadge status={selectedItem.status} />
              </div>
              <div>
                <p className="text-muted-foreground text-xs">
                  {tt("KYB state")}
                </p>
                <p className="font-medium">
                  {selectedItem.kybState
                    ? tt(selectedItem.kybState.replaceAll("_", " "))
                    : "-"}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">
                  {tt("Risk flag")}
                </p>
                <p className="font-medium">
                  {selectedItem.riskFlag
                    ? tt(selectedItem.riskFlag)
                    : tt("None")}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">{tt("SLA")}</p>
                <p className="font-medium">{selectedItem.sla ?? "-"}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">
                  {tt("Assignee")}
                </p>
                <p className="font-medium">{selectedItem.assignee}</p>
              </div>
              <div className="col-span-2">
                <p className="text-muted-foreground text-xs">
                  {tt("On-chain wallet")}
                </p>
                <p className="font-mono text-xs">
                  {selectedItem.onchainWalletAddress ?? "-"}
                </p>
              </div>
            </div>
            <StatusTimeline entries={selectedItem.timeline} />
          </>
        ) : null}
      </MvpDetailDrawer>
    </div>
  );
}
