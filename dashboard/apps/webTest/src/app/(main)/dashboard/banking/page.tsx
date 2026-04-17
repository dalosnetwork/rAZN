"use client";

import * as React from "react";

import { CopyIcon } from "lucide-react";
import { toast } from "sonner";

import { MvpDetailDrawer } from "@/app/(main)/dashboard/_mvp/components/detail-drawer";
import {
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
import { MvpTableToolbar } from "@/app/(main)/dashboard/_mvp/components/table-toolbar";
import type { MvpStatus } from "@/app/(main)/dashboard/_mvp/types";

import { useI18n } from "@/components/providers/language-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useCreateBankAccountMutation,
  useDashboardStateQuery,
} from "@/lib/queries/dashboard";
import { useMeQuery } from "@/lib/queries/auth";
import { hasAccessPermission, type UserAccess } from "@/lib/rbac/route-access";

type BankAccount = {
  id: string;
  accountHolder: string;
  bankName: string;
  ibanMasked: string;
  accountNumberMasked: string;
  bankAddress: string;
  swiftCode: string;
  country: string;
  currency: string;
  status: MvpStatus;
  isPrimary: boolean;
  addedAt: string;
};

type NewBankAccountForm = {
  accountHolder: string;
  bankName: string;
  iban: string;
  accountNumber: string;
  bankAddress: string;
  swiftCode: string;
  country: string;
  currency: string;
};

const emptyForm: NewBankAccountForm = {
  accountHolder: "",
  bankName: "",
  iban: "",
  accountNumber: "",
  bankAddress: "",
  swiftCode: "",
  country: "United Kingdom",
  currency: "USD",
};

function canAddOwnBankAccount(access: UserAccess | null | undefined) {
  if (!access) {
    return false;
  }
  if (access.roleSlugs.includes("read_only")) {
    return false;
  }
  return hasAccessPermission(access, "settings.view");
}

function buildColumns(
  onOpen: (account: BankAccount) => void,
  onCopy: (value: string, label: string) => Promise<void> | void,
  tt: (en: string) => string,
): MvpTableColumn<BankAccount>[] {
  return [
    {
      id: "holder",
      header: tt("Account holder"),
      cell: (row) => (
        <div>
          <p className="font-medium text-sm">{row.accountHolder}</p>
          {row.isPrimary ? (
            <p className="text-muted-foreground text-xs">
              {tt("Primary account")}
            </p>
          ) : null}
        </div>
      ),
    },
    {
      id: "bank",
      header: tt("Bank"),
      cell: (row) => row.bankName,
    },
    {
      id: "iban",
      header: tt("IBAN"),
      cell: (row) => (
        <div className="flex items-center gap-1">
          <span className="font-mono text-xs">{row.ibanMasked}</span>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            disabled={row.ibanMasked.trim() === "-" || row.ibanMasked.trim() === ""}
            onClick={() => void onCopy(row.ibanMasked, "IBAN")}
          >
            <CopyIcon className="size-3.5" />
            <span className="sr-only">{tt("Copy IBAN")}</span>
          </Button>
        </div>
      ),
    },
    {
      id: "accountNumber",
      header: tt("Account number"),
      cell: (row) => (
        <div className="flex items-center gap-1">
          <span className="font-mono text-xs">{row.accountNumberMasked}</span>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            disabled={
              row.accountNumberMasked.trim() === "-" ||
              row.accountNumberMasked.trim() === ""
            }
            onClick={() => void onCopy(row.accountNumberMasked, tt("Account number"))}
          >
            <CopyIcon className="size-3.5" />
            <span className="sr-only">{tt("Copy account number")}</span>
          </Button>
        </div>
      ),
    },
    {
      id: "bankAddress",
      header: tt("Bank address"),
      cell: (row) => row.bankAddress,
    },
    {
      id: "currency",
      header: tt("Currency"),
      cell: (row) => row.currency,
    },
    {
      id: "country",
      header: tt("Country"),
      cell: (row) => row.country,
    },
    {
      id: "status",
      header: tt("Status"),
      cell: (row) => <StatusBadge status={row.status} />,
    },
    {
      id: "added",
      header: tt("Added"),
      cell: (row) => formatDateTime(row.addedAt),
    },
    {
      id: "details",
      header: tt("Details"),
      className: "text-right",
      cell: (row) => (
        <Button variant="outline" size="sm" onClick={() => onOpen(row)}>
          {tt("Open")}
        </Button>
      ),
    },
  ];
}

export default function Page() {
  const { tt } = useI18n();
  const meQuery = useMeQuery();
  const dashboardStateQuery = useDashboardStateQuery();
  const createBankAccountMutation = useCreateBankAccountMutation();
  const canAddBankAccount = canAddOwnBankAccount(meQuery.data?.access);
  const [accounts, setAccounts] = React.useState<BankAccount[]>([]);
  const [selectedAccount, setSelectedAccount] =
    React.useState<BankAccount | null>(null);
  const [search, setSearch] = React.useState("");
  const [form, setForm] = React.useState<NewBankAccountForm>(emptyForm);

  React.useEffect(() => {
    if (dashboardStateQuery.data?.bankAccounts) {
      setAccounts(dashboardStateQuery.data.bankAccounts as BankAccount[]);
    }
  }, [dashboardStateQuery.data?.bankAccounts]);

  const filteredAccounts = React.useMemo(() => {
    const query = search.trim().toLowerCase();
    return accounts.filter((account) => {
      if (!query) {
        return true;
      }

      return (
        account.accountHolder.toLowerCase().includes(query) ||
        account.bankName.toLowerCase().includes(query) ||
        account.ibanMasked.toLowerCase().includes(query) ||
        account.accountNumberMasked.toLowerCase().includes(query) ||
        account.bankAddress.toLowerCase().includes(query) ||
        account.country.toLowerCase().includes(query)
      );
    });
  }, [accounts, search]);

  const verifiedCount = accounts.filter(
    (account) => account.status === "verified",
  ).length;
  const primaryAccount = accounts.find((account) => account.isPrimary);
  const handleCopyValue = React.useCallback(
    async (value: string, label: string) => {
      const normalizedValue = value.trim();
      if (!normalizedValue || normalizedValue === "-") {
        toast.error(`${label} ${tx("is not available.", "kullanılamıyor.", "недоступен.", "mövcud deyil.")}`);
        return;
      }

      try {
        await navigator.clipboard.writeText(normalizedValue);
        toast.success(`${label} ${tx("copied to clipboard.", "panoya kopyalandı.", "скопировано в буфер обмена.", "buferə kopyalandı.")}`);
      } catch {
        toast.error(`${tx("Could not copy", "Kopyalanamadı:", "Не удалось скопировать:", "Kopyalana bilmədi:")} ${label}.`);
      }
    },
    [tt],
  );

  const columns = React.useMemo(
    () => buildColumns(setSelectedAccount, handleCopyValue, tt),
    [handleCopyValue, tt],
  );

  function setFormField<K extends keyof NewBankAccountForm>(
    key: K,
    value: NewBankAccountForm[K],
  ) {
    if (!canAddBankAccount) {
      return;
    }
    setForm((previous) => ({ ...previous, [key]: value }));
  }

  async function addBankAccount() {
    if (!canAddBankAccount) {
      return;
    }
    if (
      !form.accountHolder.trim() ||
      !form.bankName.trim() ||
      !form.iban.trim() ||
      !form.accountNumber.trim() ||
      !form.bankAddress.trim()
    ) {
      toast.error(tt("Please complete required bank account fields."));
      return;
    }

    try {
      await createBankAccountMutation.mutateAsync({
        accountHolder: form.accountHolder.trim(),
        bankName: form.bankName.trim(),
        ibanMasked: form.iban.trim(),
        accountNumberMasked: form.accountNumber.trim(),
        bankAddress: form.bankAddress.trim(),
        swiftCode: form.swiftCode.trim() || undefined,
        country: form.country,
        currency: form.currency,
        isPrimary: accounts.length === 0,
      });
      await dashboardStateQuery.refetch();
      setForm(emptyForm);
      toast.success(tt("Bank account added."));
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : tt("Could not add bank account."),
      );
    }
  }

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <MvpPageHeader
        title={tt("Banking")}
        description={tt("Add and manage your bank account details for mint and redemption operations.")}
      />
      {!canAddBankAccount ? (
        <p className="text-muted-foreground text-sm">
          {tt("This action requires settings edit access.")}
        </p>
      ) : null}

      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <MvpKpiCard
          label={tt("Linked bank accounts")}
          value={formatNumber(accounts.length)}
          hint={tt("Total user bank accounts")}
          status="active"
        />
        <MvpKpiCard
          label={tt("Verified accounts")}
          value={formatNumber(verifiedCount)}
          hint={tt("Accounts verified for operations")}
          status="verified"
        />
        <MvpKpiCard
          label={tt("Primary account status")}
          value={primaryAccount ? tt("Set") : tt("Not set")}
          hint={
            primaryAccount
              ? primaryAccount.bankName
              : tt("Select a primary account")
          }
          status={primaryAccount ? "approved" : "warning"}
        />
      </section>

      <MvpSectionCard
        title={tt("Bank account details & management")}
        description={tt("View your linked bank accounts and manage account status.")}
        contentClassName="space-y-4"
      >
        <MvpTableToolbar
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder={tt("Search account holder, bank, IBAN, account number, address, or country")}
        />
        <MvpSimpleTable
          columns={columns}
          data={filteredAccounts}
          getRowId={(row) => row.id}
          emptyTitle={tt("No bank accounts")}
          emptyDescription={tt("Add your first bank account to begin operations.")}
        />
      </MvpSectionCard>

      <MvpSectionCard
        title={tt("Add bank account")}
        description={tt("Add a new bank account for minting and redemption settlement.")}
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="bank-account-holder">{tt("Account holder")}</Label>
            <Input
              id="bank-account-holder"
              value={form.accountHolder}
              disabled={!canAddBankAccount}
              onChange={(event) =>
                setFormField("accountHolder", event.target.value)
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bank-name">{tt("Bank name")}</Label>
            <Input
              id="bank-name"
              value={form.bankName}
              disabled={!canAddBankAccount}
              onChange={(event) => setFormField("bankName", event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bank-iban">{tt("IBAN")}</Label>
            <Input
              id="bank-iban"
              value={form.iban}
              disabled={!canAddBankAccount}
              onChange={(event) => setFormField("iban", event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bank-account-number">{tt("Account number")}</Label>
            <Input
              id="bank-account-number"
              value={form.accountNumber}
              disabled={!canAddBankAccount}
              onChange={(event) =>
                setFormField("accountNumber", event.target.value)
              }
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="bank-address">{tt("Bank address")}</Label>
            <Input
              id="bank-address"
              value={form.bankAddress}
              disabled={!canAddBankAccount}
              onChange={(event) =>
                setFormField("bankAddress", event.target.value)
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bank-swift">{tt("SWIFT")}</Label>
            <Input
              id="bank-swift"
              value={form.swiftCode}
              disabled={!canAddBankAccount}
              onChange={(event) =>
                setFormField("swiftCode", event.target.value)
              }
            />
          </div>
          <div className="space-y-2">
            <Label>{tt("Country")}</Label>
            <Select
              value={form.country}
              disabled={!canAddBankAccount}
              onValueChange={(value) => setFormField("country", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder={tt("Select country")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="United Kingdom">{tt("United Kingdom")}</SelectItem>
                <SelectItem value="United States">{tt("United States")}</SelectItem>
                <SelectItem value="Turkey">{tt("Turkey")}</SelectItem>
                <SelectItem value="Germany">{tt("Germany")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>{tt("Currency")}</Label>
            <Select
              value={form.currency}
              disabled={!canAddBankAccount}
              onValueChange={(value) => setFormField("currency", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder={tt("Select currency")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="USD">USD</SelectItem>
                <SelectItem value="EUR">EUR</SelectItem>
                <SelectItem value="TRY">TRY</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <Button disabled={!canAddBankAccount} onClick={addBankAccount}>
            {tt("Add bank account")}
          </Button>
        </div>
      </MvpSectionCard>

      <MvpDetailDrawer
        open={Boolean(selectedAccount)}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedAccount(null);
          }
        }}
        title={
          selectedAccount ? selectedAccount.bankName : tt("Bank account details")
        }
        description={
          selectedAccount
            ? `${selectedAccount.accountHolder} • ${tt("Added")} ${formatDateTime(selectedAccount.addedAt)}`
            : undefined
        }
      >
        {selectedAccount ? (
          <div className="space-y-3 rounded-lg border bg-muted/20 p-3 text-sm">
            <div>
              <p className="text-muted-foreground text-xs">
                {tt("Account holder")}
              </p>
              <p className="font-medium">{selectedAccount.accountHolder}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">{tt("Bank")}</p>
              <p className="font-medium">{selectedAccount.bankName}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">{tt("IBAN")}</p>
              <div className="flex items-center gap-1">
                <p className="font-mono text-xs">{selectedAccount.ibanMasked}</p>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  disabled={
                    selectedAccount.ibanMasked.trim() === "-" ||
                    selectedAccount.ibanMasked.trim() === ""
                  }
                  onClick={() =>
                    void handleCopyValue(selectedAccount.ibanMasked, "IBAN")
                  }
                >
                  <CopyIcon className="size-3.5" />
                  <span className="sr-only">{tt("Copy IBAN")}</span>
                </Button>
              </div>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">
                {tt("Account number")}
              </p>
              <div className="flex items-center gap-1">
                <p className="font-mono text-xs">
                  {selectedAccount.accountNumberMasked}
                </p>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  disabled={
                    selectedAccount.accountNumberMasked.trim() === "-" ||
                    selectedAccount.accountNumberMasked.trim() === ""
                  }
                  onClick={() =>
                    void handleCopyValue(
                      selectedAccount.accountNumberMasked,
                      tt("Account number"),
                    )
                  }
                >
                  <CopyIcon className="size-3.5" />
                  <span className="sr-only">{tt("Copy account number")}</span>
                </Button>
              </div>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">
                {tt("Bank address")}
              </p>
              <p className="font-medium">{selectedAccount.bankAddress}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">{tt("SWIFT")}</p>
              <p className="font-medium">{selectedAccount.swiftCode}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">{tt("Status")}</p>
              <StatusBadge status={selectedAccount.status} />
            </div>
          </div>
        ) : null}
      </MvpDetailDrawer>
    </div>
  );
}
