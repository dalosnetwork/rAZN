"use client";

import Link from "next/link";

import { LanguageSwitcher } from "@/components/language-switcher";
import { useI18n } from "@/components/providers/language-provider";
import { APP_CONFIG } from "@/config/app-config";

import { LoginForm } from "../../_components/login-form";

export default function LoginV2() {
  const { t } = useI18n();

  return (
    <>
      <div className="mx-auto flex w-full flex-col justify-center space-y-8 sm:w-[350px]">
        <div className="space-y-2 text-center">
          <h1 className="font-medium text-3xl">{t("auth.loginToAccount")}</h1>
          <p className="text-muted-foreground text-sm">{t("auth.enterDetailsToLogin")}</p>
        </div>
        <div className="space-y-4">
          <LoginForm />
        </div>
      </div>

      <div className="absolute top-5 flex w-full justify-end px-10">
        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          <span>{t("auth.dontHaveAccount")} </span>
          <Link prefetch={false} className="text-foreground" href="register">
            {t("auth.register")}
          </Link>
          <LanguageSwitcher />
        </div>
      </div>

      <div className="absolute bottom-5 flex w-full justify-between px-10">
        <div className="text-sm">{APP_CONFIG.copyright}</div>
        <LanguageSwitcher />
      </div>
    </>
  );
}
