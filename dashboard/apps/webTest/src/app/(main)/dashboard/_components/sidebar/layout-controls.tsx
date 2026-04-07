"use client";

import { Settings } from "lucide-react";

import { useI18n } from "@/components/providers/language-provider";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { type FontKey, fontOptions } from "@/lib/fonts/registry";
import type { ContentLayout, NavbarStyle, SidebarCollapsible, SidebarVariant } from "@/lib/preferences/layout";
import {
  applyContentLayout,
  applyFont,
  applyNavbarStyle,
  applySidebarCollapsible,
  applySidebarVariant,
} from "@/lib/preferences/layout-utils";
import { PREFERENCE_DEFAULTS } from "@/lib/preferences/preferences-config";
import { persistPreference } from "@/lib/preferences/preferences-storage";
import { THEME_PRESET_OPTIONS, type ThemeMode, type ThemePreset } from "@/lib/preferences/theme";
import { applyThemePreset } from "@/lib/preferences/theme-utils";
import { usePreferencesStore } from "@/stores/preferences/preferences-provider";

export function LayoutControls() {
  const { tx } = useI18n();
  const themeMode = usePreferencesStore((s) => s.themeMode);
  const resolvedThemeMode = usePreferencesStore((s) => s.resolvedThemeMode);
  const setThemeMode = usePreferencesStore((s) => s.setThemeMode);
  const themePreset = usePreferencesStore((s) => s.themePreset);
  const setThemePreset = usePreferencesStore((s) => s.setThemePreset);
  const contentLayout = usePreferencesStore((s) => s.contentLayout);
  const setContentLayout = usePreferencesStore((s) => s.setContentLayout);
  const navbarStyle = usePreferencesStore((s) => s.navbarStyle);
  const setNavbarStyle = usePreferencesStore((s) => s.setNavbarStyle);
  const variant = usePreferencesStore((s) => s.sidebarVariant);
  const setSidebarVariant = usePreferencesStore((s) => s.setSidebarVariant);
  const collapsible = usePreferencesStore((s) => s.sidebarCollapsible);
  const setSidebarCollapsible = usePreferencesStore((s) => s.setSidebarCollapsible);
  const font = usePreferencesStore((s) => s.font);
  const setFont = usePreferencesStore((s) => s.setFont);

  const onThemePresetChange = async (preset: ThemePreset) => {
    applyThemePreset(preset);
    setThemePreset(preset);
    persistPreference("theme_preset", preset);
  };

  const onThemeModeChange = async (mode: ThemeMode | "") => {
    if (!mode) return;
    setThemeMode(mode);
    persistPreference("theme_mode", mode);
  };

  const onContentLayoutChange = async (layout: ContentLayout | "") => {
    if (!layout) return;
    applyContentLayout(layout);
    setContentLayout(layout);
    persistPreference("content_layout", layout);
  };

  const onNavbarStyleChange = async (style: NavbarStyle | "") => {
    if (!style) return;
    applyNavbarStyle(style);
    setNavbarStyle(style);
    persistPreference("navbar_style", style);
  };

  const onSidebarStyleChange = async (value: SidebarVariant | "") => {
    if (!value) return;
    setSidebarVariant(value);
    applySidebarVariant(value);
    persistPreference("sidebar_variant", value);
  };

  const onSidebarCollapseModeChange = async (value: SidebarCollapsible | "") => {
    if (!value) return;
    setSidebarCollapsible(value);
    applySidebarCollapsible(value);
    persistPreference("sidebar_collapsible", value);
  };

  const onFontChange = async (value: FontKey | "") => {
    if (!value) return;
    applyFont(value);
    setFont(value);
    persistPreference("font", value);
  };

  const handleRestore = () => {
    onThemePresetChange(PREFERENCE_DEFAULTS.theme_preset);
    onThemeModeChange(PREFERENCE_DEFAULTS.theme_mode);
    onContentLayoutChange(PREFERENCE_DEFAULTS.content_layout);
    onNavbarStyleChange(PREFERENCE_DEFAULTS.navbar_style);
    onSidebarStyleChange(PREFERENCE_DEFAULTS.sidebar_variant);
    onSidebarCollapseModeChange(PREFERENCE_DEFAULTS.sidebar_collapsible);
    onFontChange(PREFERENCE_DEFAULTS.font);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button size="icon">
          <Settings />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end">
        <div className="flex flex-col gap-5">
          <div className="space-y-1.5">
            <h4 className="font-medium text-sm leading-none">{tx("Preferences", "Tercihler", "Настройки")}</h4>
            <p className="text-muted-foreground text-xs">
              {tx(
                "Customize your dashboard layout preferences.",
                "Panel düzen tercihlerinizi özelleştirin.",
                "Настройте параметры макета панели управления.",
              )}
            </p>
            <p className="font-medium text-muted-foreground text-xs">
              {tx(
                "*Preferences use cookies by default. You can switch between cookies, localStorage, or no storage in code.",
                "*Tercihler varsayılan olarak çerez kullanır. Kodda çerez, localStorage veya depolama yok seçenekleri arasında geçiş yapabilirsiniz.",
                "*По умолчанию настройки используют cookie. В коде можно переключиться между cookie, localStorage или отключить хранение.",
              )}
            </p>
          </div>
          <div className="space-y-3 **:data-[slot=toggle-group]:w-full **:data-[slot=toggle-group-item]:flex-1 **:data-[slot=toggle-group-item]:text-xs">
            <div className="space-y-1">
              <Label className="font-medium text-xs">{tx("Theme Preset", "Tema Ön Ayarı", "Пресет темы")}</Label>
              <Select value={themePreset} onValueChange={onThemePresetChange}>
                <SelectTrigger size="sm" className="w-full text-xs">
                  <SelectValue placeholder={tx("Preset", "Ön Ayar", "Пресет")} />
                </SelectTrigger>
                <SelectContent>
                  {THEME_PRESET_OPTIONS.map((preset) => (
                    <SelectItem key={preset.value} className="text-xs" value={preset.value}>
                      <span
                        className="size-2.5 rounded-full"
                        style={{
                          backgroundColor:
                            (resolvedThemeMode ?? "light") === "dark" ? preset.primary.dark : preset.primary.light,
                        }}
                      />
                      {preset.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="font-medium text-xs">{tx("Fonts", "Yazı Tipleri", "Шрифты")}</Label>
              <Select value={font} onValueChange={onFontChange}>
                <SelectTrigger size="sm" className="w-full text-xs">
                  <SelectValue placeholder={tx("Select font", "Yazı tipi seçin", "Выберите шрифт")} />
                </SelectTrigger>
                <SelectContent>
                  {fontOptions.map((font) => (
                    <SelectItem key={font.key} className="text-xs" value={font.key}>
                      {font.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="font-medium text-xs">{tx("Theme Mode", "Tema Modu", "Режим темы")}</Label>
              <ToggleGroup
                size="sm"
                variant="outline"
                type="single"
                value={themeMode}
                onValueChange={onThemeModeChange}
              >
                <ToggleGroupItem value="light" aria-label={tx("Toggle light", "Aydınlık seç", "Переключить светлую")}>
                  {tx("Light", "Aydınlık", "Светлая")}
                </ToggleGroupItem>
                <ToggleGroupItem value="dark" aria-label={tx("Toggle dark", "Karanlık seç", "Переключить тёмную")}>
                  {tx("Dark", "Karanlık", "Тёмная")}
                </ToggleGroupItem>
                <ToggleGroupItem value="system" aria-label={tx("Toggle system", "Sistem seç", "Переключить системную")}>
                  {tx("System", "Sistem", "Системная")}
                </ToggleGroupItem>
              </ToggleGroup>
            </div>

            <div className="space-y-1">
              <Label className="font-medium text-xs">{tx("Page Layout", "Sayfa Düzeni", "Макет страницы")}</Label>
              <ToggleGroup
                size="sm"
                variant="outline"
                type="single"
                value={contentLayout}
                onValueChange={onContentLayoutChange}
              >
                <ToggleGroupItem value="centered" aria-label={tx("Toggle centered", "Ortalanmış seç", "Переключить центрированный")}>
                  {tx("Centered", "Ortalanmış", "По центру")}
                </ToggleGroupItem>
                <ToggleGroupItem value="full-width" aria-label={tx("Toggle full-width", "Tam genişlik seç", "Переключить полную ширину")}>
                  {tx("Full Width", "Tam Genişlik", "Полная ширина")}
                </ToggleGroupItem>
              </ToggleGroup>
            </div>

            <div className="space-y-1">
              <Label className="font-medium text-xs">{tx("Navbar Behavior", "Gezinme Çubuğu Davranışı", "Поведение панели навигации")}</Label>
              <ToggleGroup
                size="sm"
                variant="outline"
                type="single"
                value={navbarStyle}
                onValueChange={onNavbarStyleChange}
              >
                <ToggleGroupItem value="sticky" aria-label={tx("Toggle sticky", "Sabit seç", "Переключить фиксированную")}>
                  {tx("Sticky", "Sabit", "Фиксированная")}
                </ToggleGroupItem>
                <ToggleGroupItem value="scroll" aria-label={tx("Toggle scroll", "Kaydırmalı seç", "Переключить прокрутку")}>
                  {tx("Scroll", "Kaydırmalı", "Прокрутка")}
                </ToggleGroupItem>
              </ToggleGroup>
            </div>

            <div className="space-y-1">
              <Label className="font-medium text-xs">{tx("Sidebar Style", "Kenar Çubuğu Stili", "Стиль боковой панели")}</Label>
              <ToggleGroup
                size="sm"
                variant="outline"
                type="single"
                value={variant}
                onValueChange={onSidebarStyleChange}
              >
                <ToggleGroupItem value="inset" aria-label={tx("Toggle inset", "İçe gömülü seç", "Переключить встроенную")}>
                  {tx("Inset", "İçe Gömülü", "Встроенная")}
                </ToggleGroupItem>
                <ToggleGroupItem value="sidebar" aria-label={tx("Toggle sidebar", "Kenar çubuğunu seç", "Переключить боковую панель")}>
                  {tx("Sidebar", "Kenar Çubuğu", "Боковая панель")}
                </ToggleGroupItem>
                <ToggleGroupItem value="floating" aria-label={tx("Toggle floating", "Yüzer seç", "Переключить плавающую")}>
                  {tx("Floating", "Yüzer", "Плавающая")}
                </ToggleGroupItem>
              </ToggleGroup>
            </div>

            <div className="space-y-1">
              <Label className="font-medium text-xs">
                {tx("Sidebar Collapse Mode", "Kenar Çubuğu Daraltma Modu", "Режим сворачивания боковой панели")}
              </Label>
              <ToggleGroup
                size="sm"
                variant="outline"
                type="single"
                value={collapsible}
                onValueChange={onSidebarCollapseModeChange}
              >
                <ToggleGroupItem value="icon" aria-label={tx("Toggle icon", "Simgeyi seç", "Переключить значок")}>
                  {tx("Icon", "Simge", "Значок")}
                </ToggleGroupItem>
                <ToggleGroupItem value="offcanvas" aria-label={tx("Toggle offcanvas", "Offcanvas seç", "Переключить offcanvas")}>
                  {tx("OffCanvas", "OffCanvas", "OffCanvas")}
                </ToggleGroupItem>
              </ToggleGroup>
            </div>

            <Button type="button" size="sm" variant="outline" className="w-full text-xs" onClick={handleRestore}>
              {tx("Restore Defaults", "Varsayılanları Geri Yükle", "Восстановить значения по умолчанию")}
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
