"use client";

import { useState } from "react";
import { siGoogle } from "simple-icons";
import { toast } from "sonner";

import { useI18n } from "@/components/providers/language-provider";
import { SimpleIcon } from "@/components/simple-icon";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const DEFAULT_REDIRECT_PATH = "/dashboard/overview";

type SocialAuthResponse = {
  url?: string;
  message?: string;
  error?: {
    message?: string;
  };
};

function getSafeRedirectPath(pathname: string | null) {
  if (!pathname || !pathname.startsWith("/") || pathname.startsWith("//")) {
    return DEFAULT_REDIRECT_PATH;
  }

  return pathname;
}

export function GoogleButton({
  className,
  ...props
}: React.ComponentProps<typeof Button>) {
  const { t } = useI18n();
  const [isPending, setIsPending] = useState(false);

  const handleClick = async (event: React.MouseEvent<HTMLButtonElement>) => {
    props.onClick?.(event);
    if (event.defaultPrevented) {
      return;
    }

    try {
      setIsPending(true);

      const search =
        typeof window !== "undefined" ? window.location.search : "";
      const next = new URLSearchParams(search).get("next");
      const callbackURL = getSafeRedirectPath(next);
      const errorCallbackURL =
        typeof window !== "undefined"
          ? window.location.pathname
          : "/auth/v2/login";

      const response = await fetch("/api/auth/google", {
        method: "POST",
        credentials: "include",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          callbackURL,
          newUserCallbackURL: callbackURL,
          errorCallbackURL,
        }),
      });

      const payload = (await response
        .json()
        .catch(() => ({}))) as SocialAuthResponse;

      if (!response.ok) {
        throw new Error(
          payload.error?.message ?? payload.message ?? t("auth.loginFailed"),
        );
      }

      if (!payload.url) {
        throw new Error(t("auth.loginFailed"));
      }

      window.location.assign(payload.url);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : t("auth.loginFailed");
      toast.error(message);
    } finally {
      setIsPending(false);
    }
  };

  return (
    <Button
      variant="secondary"
      className={cn(className)}
      {...props}
      onClick={handleClick}
      disabled={isPending || props.disabled}
    >
      <SimpleIcon icon={siGoogle} className="size-4" />
      {t("auth.continueWithGoogle")}
    </Button>
  );
}
