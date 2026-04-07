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
  useAdminRedemptionOpsQueueQuery,
  useUpdateAdminRedemptionStatusMutation,
} from "@/lib/queries/dashboard";
import {
  getRedeemFunctionName,
  getTokenChainId,
  getTokenContractAddress,
  toChecksumAddress,
  tokenAbi,
  toTokenUnits,
} from "@/lib/web3/token-contract";

const filterOptions = [
  "all",
  "submitted",
  "queued",
  "processing",
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
      header: tt("Request ID"),
      cell: (row) => row.requestId,
    },
    {
      id: "institution",
      header: tt("Institution requesting"),
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
      id: "destination",
      header: tt("Destination account"),
      cell: (row) => row.destinationAccount ?? "-",
    },
    {
      id: "action",
      header: tt("Details / action"),
      cell: (row) => (
        <Button variant="outline" size="sm" onClick={() => onOpen(row)}>
          {tt("Manage")}
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
  const { tt } = useI18n();
  const redemptionOpsQueueQuery = useAdminRedemptionOpsQueueQuery();
  const updateRedemptionStatusMutation = useUpdateAdminRedemptionStatusMutation();
  const tokenChainId = React.useMemo(() => getTokenChainId(), []);
  const tokenContractAddress = React.useMemo(() => getTokenContractAddress(), []);
  const redeemFunctionName = React.useMemo(() => getRedeemFunctionName(), []);
  const { address: connectedAdminAddress, chain, isConnected } = useAccount();
  const { connectAsync, connectors, isPending: isConnectorConnecting } =
    useConnect();
  const { switchChainAsync, isPending: isSwitchingChain } = useSwitchChain();
  const { writeContractAsync, isPending: isWritePending } = useWriteContract();
  const publicClient = usePublicClient({ chainId: tokenChainId });
  const [queueItems, setQueueItems] = React.useState<OpsQueueItem[]>([]);
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] =
    React.useState<(typeof filterOptions)[number]>("all");
  const [selectedItem, setSelectedItem] = React.useState<OpsQueueItem | null>(
    null,
  );

  React.useEffect(() => {
    if (redemptionOpsQueueQuery.data) {
      setQueueItems(redemptionOpsQueueQuery.data);
    }
  }, [redemptionOpsQueueQuery.data]);

  const filteredItems = React.useMemo(() => {
    return queueItems.filter((item) => {
      const query = search.trim().toLowerCase();
      const matchesSearch =
        query.length === 0 ||
        item.requestId.toLowerCase().includes(query) ||
        item.user.toLowerCase().includes(query);
      const matchesStatus =
        statusFilter === "all" || item.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [queueItems, search, statusFilter]);

  const activeQueue = filteredItems
    .filter((item) =>
      ["submitted", "queued", "processing", "approved"].includes(item.status),
    )
    .sort((a, b) => (a.queuePos ?? 999) - (b.queuePos ?? 999));

  const columns = React.useMemo(() => buildColumns(setSelectedItem, tt), [tt]);
  const actionPending =
    updateRedemptionStatusMutation.isPending ||
    isConnectorConnecting ||
    isSwitchingChain ||
    isWritePending;

  async function updateStatus(
    requestId: string,
    status: "queued" | "processing" | "approved" | "rejected",
    label: string,
    queuePosition?: number,
    options?: {
      txHash?: string;
      adminWalletAddress?: string;
      chainId?: number;
    },
  ) {
    try {
      await updateRedemptionStatusMutation.mutateAsync({
        requestRef: requestId,
        status,
        note: label,
        queuePosition,
        txHash: options?.txHash,
        adminWalletAddress: options?.adminWalletAddress,
        chainId: options?.chainId,
      });
      const refreshed = await redemptionOpsQueueQuery.refetch();
      const updatedItem =
        refreshed.data?.find((item) => item.requestId === requestId) ?? null;
      setSelectedItem(updatedItem);
      toast.success(tt("Redemption request updated."));
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : tt("Could not update redemption request."),
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

  async function approveRedeemRequest(item: OpsQueueItem) {
    if (!item.onchainWalletAddress) {
      throw new Error(
        tt("User wallet address is missing. The user must connect a wallet."),
      );
    }
    if (!publicClient) {
      throw new Error(tt("Blockchain client is unavailable."));
    }

    const holderAddress = toChecksumAddress(
      item.onchainWalletAddress,
      "onchain wallet address",
    );
    const { adminWalletAddress, chainId } = await ensureAdminWalletReady();
    const amountUnits = await toTokenUnits({
      publicClient,
      tokenAddress: tokenContractAddress,
      amount: item.amount,
    });

    let txHash: `0x${string}`;
    if (redeemFunctionName === "burnFrom") {
      txHash = await writeContractAsync({
        chainId: tokenChainId,
        account: adminWalletAddress,
        address: tokenContractAddress,
        abi: tokenAbi,
        functionName: "burnFrom",
        args: [holderAddress, amountUnits],
      });
    } else if (redeemFunctionName === "burn") {
      txHash = await writeContractAsync({
        chainId: tokenChainId,
        account: adminWalletAddress,
        address: tokenContractAddress,
        abi: tokenAbi,
        functionName: "burn",
        args: [amountUnits],
      });
    } else {
      txHash = await writeContractAsync({
        chainId: tokenChainId,
        account: adminWalletAddress,
        address: tokenContractAddress,
        abi: tokenAbi,
        functionName: "redeem",
        args: [holderAddress, amountUnits],
      });
    }

    const receipt = await publicClient.waitForTransactionReceipt({
      hash: txHash,
      confirmations: 1,
    });
    if (receipt.status !== "success") {
      throw new Error(tt("Redeem transaction reverted on-chain."));
    }

    await updateStatus(
      item.requestId,
      "approved",
      "Approved for payout",
      item.queuePos,
      {
        txHash,
        adminWalletAddress,
        chainId,
      },
    );
  }

  const outstandingCount = queueItems.filter((item) =>
    ["submitted", "queued", "processing", "approved"].includes(item.status),
  ).length;

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <MvpPageHeader
        title={tt("Redemption Ops")}
        description={tt("Queue-oriented operational console for redemption processing and payout completion.")}
      />

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        <MvpKpiCard
          label={tt("Outstanding redemption requests")}
          value={formatNumber(outstandingCount)}
          hint={tt("Open redemption requests")}
          status="queued"
        />
        <MvpKpiCard
          label={tt("Total value of redemption requests")}
          value={formatCurrency(
            activeQueue.reduce((sum, item) => sum + item.amount, 0),
          )}
          hint={tt("Outstanding redemption request value")}
          status="processing"
        />
        <MvpKpiCard
          label={tt("Available redeemable balance")}
          value={formatCurrency(73_500)}
          hint={tt("Available fiat cash for redemption")}
          status="active"
        />
      </section>

      <MvpSectionCard
        title={tt("Active redemption queue")}
        description={tt("Search and move requests through processing stages.")}
        contentClassName="space-y-4"
      >
        {redemptionOpsQueueQuery.isLoading ? (
          <MvpInlineLoading label={tt("Loading redemption requests")} />
        ) : null}
        {redemptionOpsQueueQuery.isError ? (
          <MvpErrorAlert
            title={tt("Redemption queue unavailable")}
            description={
              redemptionOpsQueueQuery.error instanceof Error
                ? redemptionOpsQueueQuery.error.message
                : tt("Could not load redemption requests from backend.")
            }
          />
        ) : null}
        <MvpTableToolbar
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder={tt("Search request or user")}
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
          emptyTitle={tt("No active redemptions")}
          emptyDescription={tt("Queue is clear for selected filters.")}
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
            ? `${tt("Redemption")} ${selectedItem.requestId}`
            : tt("Redemption request")
        }
        description={
          selectedItem
            ? `${selectedItem.user} • ${tt("submitted")} ${formatDateTime(selectedItem.submittedAt)}`
            : undefined
        }
        footer={
          selectedItem ? (
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                disabled={actionPending}
                onClick={() =>
                  void updateStatus(
                    selectedItem.requestId,
                    "processing",
                    "Moved to processing",
                    selectedItem.queuePos,
                  )
                }
              >
                {tt("Mark processing")}
              </Button>
              <Button
                variant="outline"
                disabled={actionPending}
                onClick={() => {
                  void approveRedeemRequest(selectedItem).catch((error) => {
                    toast.error(
                      error instanceof Error
                        ? error.message
                        : tt("Could not approve redemption request."),
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
                  void updateStatus(
                    selectedItem.requestId,
                    "rejected",
                    "Rejected by operations",
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
                <p className="text-muted-foreground text-xs">
                  {tt("Queue position")}
                </p>
                <p className="font-medium">
                  {selectedItem.queuePos
                    ? `#${selectedItem.queuePos}`
                    : tt("Completed queue")}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">{tt("SLA")}</p>
                <p className="font-medium">{selectedItem.sla ?? "-"}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">{tt("Status")}</p>
                <StatusBadge status={selectedItem.status} />
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
