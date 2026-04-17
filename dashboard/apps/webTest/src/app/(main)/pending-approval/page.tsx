"use client";

import * as React from "react";

import { CheckCircle2, Clock3, LogOut, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { LanguageSwitcher } from "@/components/language-switcher";
import { useI18n } from "@/components/providers/language-provider";
import { Button } from "@/components/ui/button";
import { useLogoutMutation, useMeQuery } from "@/lib/queries/auth";

const POLL_SECONDS = 15;

export default function PendingApprovalPage() {
  const { tx } = useI18n();
  const router = useRouter();
  const meQuery = useMeQuery();
  const logoutMutation = useLogoutMutation();
  const name = meQuery.data?.user?.name?.trim();

  const statusSteps = React.useMemo(
    () => [
      {
        icon: CheckCircle2,
        title: tx(
          "Account created",
          "Hesap oluşturuldu",
          "Аккаунт создан",
          "Hesab yaradıldı",
        ),
        description: tx(
          "Your registration is complete.",
          "Kayıt işleminiz tamamlandı.",
          "Ваша регистрация завершена.",
          "Qeydiyyatınız tamamlandı.",
        ),
      },
      {
        icon: ShieldCheck,
        title: tx(
          "Admin review",
          "Yönetici incelemesi",
          "Проверка администратором",
          "Admin yoxlaması",
        ),
        description: tx(
          "Our team is verifying your institution profile.",
          "Ekibimiz kurum profilinizi doğruluyor.",
          "Наша команда проверяет профиль вашей организации.",
          "Komandamız təşkilat profilinizi yoxlayır.",
        ),
      },
      {
        icon: Clock3,
        title: tx(
          "Automatic access",
          "Otomatik erişim",
          "Автоматический доступ",
          "Avtomatik giriş",
        ),
        description: tx(
          "You will enter your dashboard right after approval.",
          "Onaydan hemen sonra panelinize giriş yapacaksınız.",
          "Сразу после одобрения вы получите доступ к панели.",
          "Təsdiqdən dərhal sonra panelinizə daxil olacaqsınız.",
        ),
      },
    ],
    [tx],
  );

  const handleLogout = async () => {
    if (logoutMutation.isPending) {
      return;
    }

    try {
      await logoutMutation.mutateAsync();
      router.replace("/auth/v1/login");
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : tx(
              "Could not log out.",
              "Çıkış yapılamadı.",
              "Не удалось выйти из аккаунта.",
              "Çıxış etmək mümkün olmadı.",
            ),
      );
    }
  };

  return (
    <div className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-background px-4 py-15 sm:px-6">
      <div className="-z-10 pointer-events-none absolute inset-0">
        <div className="-top-24 absolute left-1/2 h-56 w-[36rem] -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute right-0 bottom-0 h-52 w-52 rounded-full bg-emerald-400/10 blur-3xl" />
      </div>

      <div className="absolute top-4 right-4 z-10 grid auto-cols-max grid-flow-col items-center gap-2 sm:gap-3">
        <Button
          type="button"
          variant="ghost"
          size="md"
          onClick={() => void handleLogout()}
          disabled={logoutMutation.isPending}
        >
          <LogOut className="size-4" />
          {logoutMutation.isPending
            ? tx(
                "Logging out...",
                "Çıkış yapılıyor...",
                "Выход...",
                "Çıxış edilir...",
              )
            : tx(
                "Log out",
                "Çıkış yap",
                "Выйти",
                "Çıxış et",
              )}
        </Button>
        <LanguageSwitcher />
      </div>

      <section className="w-full max-w-3xl rounded-2xl border border-border/70 bg-card/95 p-6 shadow-lg backdrop-blur-sm sm:p-8">
        <div className="mb-7 flex flex-col gap-4 border-border/60 border-b pb-6 sm:mb-8 sm:pb-7">
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-primary text-xs">
            <Clock3 className="size-3.5" />
            <span>
              {tx(
                "Pending approval",
                "Onay bekleniyor",
                "Ожидает одобрения",
                "Təsdiq gözlənilir",
              )}
            </span>
          </div>

          <div className="space-y-3">
            <h1 className="font-semibold text-2xl tracking-tight sm:text-3xl">
              {tx(
                "Welcome to the team",
                "Ekibe hoş geldiniz",
                "Добро пожаловать в команду",
                "Komandaya xoş gəlmisiniz",
              )}
            </h1>
            <p className="max-w-2xl text-base text-muted-foreground leading-relaxed">
              {tx(
                "Your account is active and currently waiting for final admin approval. As soon as onboarding is approved, your dashboard will be available immediately.",
                "Hesabınız aktif ve şu anda son yönetici onayını bekliyor. Onboarding onaylanır onaylanmaz paneliniz hemen kullanıma açılacaktır.",
                "Ваш аккаунт активен и сейчас ожидает финального одобрения администратором. Как только онбординг будет одобрен, панель станет доступна сразу.",
                "Hesabınız aktivdir və hazırda son admin təsdiqini gözləyir. Onboarding təsdiqlənən kimi paneliniz dərhal açılacaq.",
              )}
            </p>
            {name ? (
              <p className="text-muted-foreground text-sm">
                {tx(
                  "Signed in as",
                  "Giriş yapan hesap",
                  "Вход выполнен как",
                  "Daxil olunan hesab",
                )}{" "}
                <span className="font-medium text-foreground">{name}</span>
              </p>
            ) : null}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          {statusSteps.map((step) => (
            <article
              key={step.title}
              className="rounded-xl border border-border/60 bg-background/80 p-4"
            >
              <step.icon className="mb-3 size-4 text-primary" />
              <h2 className="mb-1 font-medium text-sm">{step.title}</h2>
              <p className="text-muted-foreground text-xs leading-relaxed">
                {step.description}
              </p>
            </article>
          ))}
        </div>

        <div className="mt-7 flex flex-col gap-3 border-border/60 border-t pt-5 sm:mt-8 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-muted-foreground text-sm">
            {tx(
              "No action is required from you right now.",
              "Şu anda sizden bir işlem yapmanız gerekmiyor.",
              "Сейчас от вас не требуется никаких действий.",
              "Hazırda sizdən heç bir əməliyyat tələb olunmur.",
            )}
          </p>
        </div>
      </section>
    </div>
  );
}
