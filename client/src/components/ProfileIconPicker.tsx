import { useEffect, useState } from "react";
import { useI18n } from "@/contexts/i18n-context";
import { cn } from "@/lib/utils";
import {
  getProfileIconGroup,
  PROFILE_ICON_GROUPS,
  PROFILE_ICONS,
  type ProfileIconGroup,
  type ProfileIconId,
} from "@/lib/playerProfile";

interface ProfileIconPickerProps {
  value: ProfileIconId;
  onChange: (id: ProfileIconId) => void;
  compact?: boolean;
}

/** Ícones separados por tema: abre no tema do ícone atual e mantém a lista curta. */
export function ProfileIconPicker({ value, onChange, compact = false }: ProfileIconPickerProps) {
  const { t } = useI18n();
  const [group, setGroup] = useState<ProfileIconGroup>(() => getProfileIconGroup(value));

  // O perfil carrega depois de abrir: acompanha o tema do ícone salvo
  useEffect(() => {
    setGroup(getProfileIconGroup(value));
  }, [value]);

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5" role="tablist" aria-label={t("profile.icon")}>
        {PROFILE_ICON_GROUPS.map((id) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={group === id}
            onClick={() => setGroup(id)}
            className={cn(
              "rounded-full border px-2.5 py-1 text-xs font-semibold transition-colors",
              group === id
                ? "border-indigo-600 bg-indigo-600 text-white"
                : "border-gray-200 bg-white text-gray-700 hover:border-indigo-300",
            )}
          >
            {t(`profile.iconGroup.${id}`)}
          </button>
        ))}
      </div>
      <div className={cn("grid gap-2", compact ? "grid-cols-10" : "grid-cols-6")}>
        {PROFILE_ICONS.filter((icon) => icon.group === group).map(({ id, Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => onChange(id)}
            title={t(`profile.iconName.${id}`)}
            aria-label={t(`profile.iconName.${id}`)}
            aria-pressed={value === id}
            className={cn(
              "aspect-square rounded-xl border-2 flex items-center justify-center transition-colors",
              value === id
                ? "border-indigo-600 bg-indigo-50 text-indigo-800"
                : "border-gray-200 bg-white text-gray-700 hover:border-indigo-300",
            )}
          >
            <Icon className={compact ? "w-4 h-4" : "w-6 h-6"} />
          </button>
        ))}
      </div>
    </div>
  );
}
