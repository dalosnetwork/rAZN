"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { useI18n } from "@/components/providers/language-provider";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useRegisterMutation } from "@/lib/queries/auth";

const DEFAULT_REDIRECT_PATH = "/dashboard/overview";

function getSafeRedirectPath(pathname: string | null) {
  if (!pathname || !pathname.startsWith("/") || pathname.startsWith("//")) {
    return DEFAULT_REDIRECT_PATH;
  }

  return pathname;
}

export function RegisterForm() {
  const { t, tx } = useI18n();
  const router = useRouter();
  const registerMutation = useRegisterMutation();
  const FormSchema = z
    .object({
      name: z
        .string()
        .min(2, {
          message: tx(
            "Name must be at least 2 characters.",
            "Ad en az 2 karakter olmalıdır.",
            "Имя должно содержать не менее 2 символов.",
          ),
        }),
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
      confirmPassword: z
        .string()
        .min(6, {
          message: tx(
            "Confirm Password must be at least 6 characters.",
            "Şifre Onayı en az 6 karakter olmalıdır.",
            "Подтверждение пароля должно содержать не менее 6 символов.",
          ),
        }),
    })
    .refine((data) => data.password === data.confirmPassword, {
      message: tx(
        "Passwords do not match.",
        "Şifreler eşleşmiyor.",
        "Пароли не совпадают.",
      ),
      path: ["confirmPassword"],
    });

  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  const onSubmit = async (data: z.infer<typeof FormSchema>) => {
    try {
      await registerMutation.mutateAsync({
        name: data.name,
        email: data.email,
        password: data.password,
      });

      const search =
        typeof window !== "undefined" ? window.location.search : "";
      const next = new URLSearchParams(search).get("next");
      toast.success(t("auth.registerSuccess"));
      router.push(getSafeRedirectPath(next));
    } catch (error) {
      const message =
        error instanceof Error ? error.message : t("auth.registerFailed");
      toast.error(message);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("auth.fullName")}</FormLabel>
              <FormControl>
                <Input
                  id="name"
                  type="text"
                  placeholder={tx("John Doe", "Ahmet Yılmaz", "Иван Иванов")}
                  autoComplete="name"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
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
                  autoComplete="new-password"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="confirmPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("auth.confirmPassword")}</FormLabel>
              <FormControl>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder={tx("••••••••", "••••••••", "••••••••")}
                  autoComplete="new-password"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button
          className="w-full"
          type="submit"
          disabled={registerMutation.isPending}
        >
          {registerMutation.isPending
            ? t("auth.pleaseWait")
            : t("auth.register")}
        </Button>
      </form>
    </Form>
  );
}
