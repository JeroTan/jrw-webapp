import * as React from "react";
import {
  useId,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";

import { mergeClassNames } from "../utils";

export type TabItem = {
  content: ReactNode;
  disabled?: boolean;
  id: string;
  label: ReactNode;
};

export type TabsProps = {
  className?: string;
  defaultValue?: string;
  label: string;
  onValueChange?: (value: string) => void;
  tabs: TabItem[];
  value?: string;
};

export function Tabs({
  className,
  defaultValue,
  label,
  onValueChange,
  tabs,
  value,
}: TabsProps) {
  const baseId = useId();
  const firstEnabledTab = tabs.find((tab) => !tab.disabled);
  const [internalValue, setInternalValue] = useState(
    defaultValue ?? firstEnabledTab?.id ?? tabs[0]?.id,
  );
  const selectedValue = value ?? internalValue;
  const selectedTab =
    tabs.find((tab) => tab.id === selectedValue) ?? firstEnabledTab ?? tabs[0];

  function selectTab(tab: TabItem) {
    if (tab.disabled) {
      return;
    }

    setInternalValue(tab.id);
    onValueChange?.(tab.id);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    if (!["ArrowRight", "ArrowLeft", "Home", "End"].includes(event.key)) {
      return;
    }

    event.preventDefault();
    const enabledTabs = tabs.filter((tab) => !tab.disabled);
    const currentEnabledIndex = enabledTabs.findIndex(
      (tab) => tab.id === tabs[index]?.id,
    );
    const nextIndex =
      event.key === "Home"
        ? 0
        : event.key === "End"
          ? enabledTabs.length - 1
          : event.key === "ArrowRight"
            ? (currentEnabledIndex + 1) % enabledTabs.length
            : (currentEnabledIndex - 1 + enabledTabs.length) %
              enabledTabs.length;
    const nextTab = enabledTabs[nextIndex];
    if (nextTab) {
      selectTab(nextTab);
    }
  }

  return (
    <div className={mergeClassNames("jrw-tabs", className)}>
      <div aria-label={label} className="jrw-tabs__list" role="tablist">
        {tabs.map((tab, index) => {
          const selected = tab.id === selectedTab?.id;
          const tabId = `${baseId}-${tab.id}-tab`;
          const panelId = `${baseId}-${tab.id}-panel`;

          return (
            <button
              aria-controls={panelId}
              aria-selected={selected}
              className="jrw-tab"
              disabled={tab.disabled}
              id={tabId}
              key={tab.id}
              onClick={() => selectTab(tab)}
              onKeyDown={(event) => handleKeyDown(event, index)}
              role="tab"
              tabIndex={selected ? 0 : -1}
              type="button"
            >
              {tab.label}
            </button>
          );
        })}
      </div>
      {selectedTab ? (
        <div
          aria-labelledby={`${baseId}-${selectedTab.id}-tab`}
          className="jrw-tabs__panel"
          id={`${baseId}-${selectedTab.id}-panel`}
          role="tabpanel"
        >
          {selectedTab.content}
        </div>
      ) : null}
    </div>
  );
}
