"use client";

import Link from "next/link";

import { LanguageSwitcher } from "@/components/language-switcher";
import { useI18n } from "@/components/providers/language-provider";
import { APP_CONFIG } from "@/config/app-config";

import { RegisterForm } from "../../_components/register-form";
import { GoogleButton } from "../../_components/social-auth/google-button";

export default function RegisterV2() {
  const { t } = useI18n();

  return (
    <>
      <div className="mx-auto flex w-full flex-col justify-center space-y-8 sm:w-[350px]">
        <div className="space-y-2 text-center">
          <h1 className="font-medium text-3xl">{t("auth.createAccount")}</h1>
          <p className="text-muted-foreground text-sm">{t("auth.enterDetailsToRegister")}</p>
        </div>
        <div className="space-y-4">
          <GoogleButton className="w-full" />
          <div className="relative text-center text-sm after:absolute after:inset-0 after:top-1/2 after:z-0 after:flex after:items-center after:border-border after:border-t">
            <span className="relative z-10 bg-background px-2 text-muted-foreground">{t("auth.orContinueWith")}</span>
          </div>
          <RegisterForm />
        </div>
      </div>

      <div className="absolute top-5 flex w-full justify-end px-10">
        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          <span>{t("auth.alreadyHaveAccount")} </span>
          <Link prefetch={false} className="text-foreground" href="login">
            {t("auth.login")}
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
