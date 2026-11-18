import { Settings, UserRound } from "lucide-react";
import { DropdownMenu } from "radix-ui";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { iconButtonClass, menuContentClass, menuItemClass } from "../ui/ThemeToggle";
import { SETTINGS_PATH } from "./nav";

/** The avatar menu: who you are (a guest for now, ADR-018) and the way to Settings. */
export function AccountMenu() {
  const { t } = useTranslation();
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger className={iconButtonClass} aria-label={t("account.menuLabel")}>
        <span className="grid size-8 place-items-center rounded-full bg-accent-soft text-accent-ink">
          <UserRound className="size-4" aria-hidden="true" />
        </span>
      </DropdownMenu.Trigger>
      <DropdownMenu.Content align="end" sideOffset={6} className={menuContentClass}>
        <DropdownMenu.Label className="px-2.5 py-2">
          <span className="block font-medium">{t("account.guest")}</span>
          <span className="block text-xs text-muted">{t("account.guestHint")}</span>
        </DropdownMenu.Label>
        <DropdownMenu.Separator className="my-1 h-px bg-line" />
        <DropdownMenu.Item asChild className={menuItemClass}>
          <Link to={SETTINGS_PATH}>
            <Settings className="size-4 text-muted" aria-hidden="true" />
            {t("account.settings")}
          </Link>
        </DropdownMenu.Item>
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  );
}
