"use client";

import Link from "next/link";

import { Command } from "lucide-react";

import { LanguageSwitcher } from "@/components/language-switcher";
import { useI18n } from "@/components/providers/language-provider";

import { RegisterForm } from "../../_components/register-form";

export default function RegisterV1() {
  const { t } = useI18n();

  return (
    <div className="flex h-dvh">
      <div className="absolute top-4 right-4 z-10">
        <LanguageSwitcher />
      </div>
      <div className="flex w-full items-center justify-center bg-background p-8 lg:w-2/3">
        <div className="w-full max-w-md space-y-10 py-24 lg:py-32">
          <div className="space-y-4 text-center">
            <div className="font-medium tracking-tight">{t("auth.register")}</div>
            <div className="mx-auto max-w-xl text-muted-foreground">{t("auth.registerIntro")}</div>
          </div>
          <div className="space-y-4">
            <RegisterForm />
            <p className="text-center text-muted-foreground text-xs">
              {t("auth.alreadyHaveAccount")}{" "}
              <Link prefetch={false} href="login" className="text-primary">
                {t("auth.login")}
              </Link>
            </p>
          </div>
        </div>
      </div>

      <div className="hidden bg-primary lg:block lg:w-1/3">
        <div className="flex h-full flex-col items-center justify-center p-12 text-center">
          <div className="space-y-6">
            <Command className="mx-auto size-12 text-primary-foreground" />
            <div className="space-y-2">
              <h1 className="font-light text-5xl text-primary-foreground">{t("auth.welcome")}</h1>
              <p className="text-primary-foreground/80 text-xl">{t("auth.rightPlace")}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
