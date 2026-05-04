"use client";

import Image from "next/image";

import { APP_CONFIG } from "@/config/app-config";
import { cn } from "@/lib/utils";

import raznLogo from "../../media/razn.png";

type BrandLogoProps = {
  className?: string;
  imageClassName?: string;
  onPrimary?: boolean;
  alt?: string;
};

export function BrandLogo({
  className,
  imageClassName,
  onPrimary = false,
  alt = APP_CONFIG.name,
}: BrandLogoProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center p-0.5",
        onPrimary && "rounded-full border border-white/60 bg-white p-1 shadow-sm",
        className,
      )}
    >
      <Image
        src={raznLogo}
        alt={alt}
        className={cn("h-7 w-7 object-contain", imageClassName)}
        priority
      />
    </span>
  );
}
