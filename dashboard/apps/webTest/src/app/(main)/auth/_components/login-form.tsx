"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { useI18n } from "@/components/providers/language-provider";
import { useLoginMutation } from "@/lib/queries/auth";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";

const DEFAULT_REDIRECT_PATH = "/dashboard/overview";

function getSafeRedirectPath(pathname: string | null) {
  if (!pathname || !pathname.startsWith("/") || pathname.startsWith("//")) {
    return DEFAULT_REDIRECT_PATH;
  }

  return pathname;
}

export function LoginForm() {
  const { t, tx } = useI18n();
  const router = useRouter();
  const loginMutation = useLoginMutation();
  const FormSchema = z.object({
    email: z
      .string()
      .email({
        message: tx(
          "Please enter a valid email address.",
          "Lütfen geçerli bir e-posta adresi girin.",
          "Пожалуйста, введите действительный адрес электронной почты.",
        ),
      }),
    password: z
      .string()
      .min(6, {
        message: tx(
          "Password must be at least 6 characters.",
          "Şifre en az 6 karakter olmalıdır.",
          "Пароль должен содержать не менее 6 символов.",
        ),
      }),
    remember: z.boolean().optional(),
  });

  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      email: "",
      password: "",
      remember: false,
    },
  });

  const onSubmit = async (data: z.infer<typeof FormSchema>) => {
    try {
      await loginMutation.mutateAsync({
        email: data.email,
        password: data.password,
        rememberMe: data.remember,
      });

      const search =
        typeof window !== "undefined" ? window.location.search : "";
      const next = new URLSearchParams(search).get("next");
      toast.success(t("auth.loginSuccess"));
      router.push(getSafeRedirectPath(next));
    } catch (error) {
      const message =
        error instanceof Error ? error.message : t("auth.loginFailed");
      toast.error(message);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("auth.emailAddress")}</FormLabel>
              <FormControl>
                <Input
                  id="email"
                  type="email"
                  placeholder={tx(
                    "you@example.com",
                    "ornek@eposta.com",
                    "you@example.com",
                  )}
                  autoComplete="email"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("auth.password")}</FormLabel>
              <FormControl>
                <Input
                  id="password"
                  type="password"
                  placeholder={tx("••••••••", "••••••••", "••••••••")}
                  autoComplete="current-password"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="remember"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center">
              <FormControl>
                <Checkbox
                  id="login-remember"
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  className="size-4"
                />
              </FormControl>
              <FormLabel
                htmlFor="login-remember"
                className="ml-1 font-medium text-muted-foreground text-sm"
              >
                {t("auth.rememberMe30Days")}
              </FormLabel>
            </FormItem>
          )}
        />
        <Button
          className="w-full"
          type="submit"
          disabled={loginMutation.isPending}
        >
          {loginMutation.isPending ? t("auth.pleaseWait") : t("auth.login")}
        </Button>
      </form>
    </Form>
  );
}
