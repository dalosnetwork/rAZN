"use client";

import type { ReactNode } from "react";

import { useI18n } from "@/components/providers/language-provider";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { useIsMobile } from "@/hooks/use-mobile";

type MvpDetailDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
};

export function MvpDetailDrawer({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
}: MvpDetailDrawerProps) {
  const isMobile = useIsMobile();
  const { tt } = useI18n();

  return (
    <Drawer
      open={open}
      onOpenChange={onOpenChange}
      direction={isMobile ? "bottom" : "right"}
    >
      <DrawerContent className="max-h-[100vh] overflow-x-hidden overflow-y-auto data-[vaul-drawer-direction=right]:sm:max-w-lg">
        <DrawerHeader>
          <DrawerTitle>{tt(title)}</DrawerTitle>
          {description ? (
            <DrawerDescription>{tt(description)}</DrawerDescription>
          ) : null}
        </DrawerHeader>
        <div className="space-y-4 px-4 pb-2">{children}</div>
        <DrawerFooter>
          {footer}
          <DrawerClose asChild>
            <Button variant="outline">{tt("Close")}</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
