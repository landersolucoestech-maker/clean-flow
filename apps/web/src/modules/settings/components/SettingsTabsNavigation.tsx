import type { ComponentType } from "react";

interface SettingsTabItem<T extends string> {
  id: T;
  label: string;
  icon: ComponentType<{ className?: string }>;
}

interface SettingsTabsNavigationProps<T extends string> {
  tabs: SettingsTabItem<T>[];
  activeTab: T;
  onChange: (tab: T) => void;
}

export function SettingsTabsNavigation<T extends string>({ tabs, activeTab, onChange }: SettingsTabsNavigationProps<T>) {
  return (
    <div className="flex items-center gap-2 overflow-x-auto border-b border-border/80 pb-4">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={`flex items-center gap-2 whitespace-nowrap rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
              isActive
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-muted/70 text-muted-foreground hover:bg-accent hover:text-foreground"
            }`}
          >
            <Icon className="h-4 w-4" />
            <span>{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}
