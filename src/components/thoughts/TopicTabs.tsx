"use client";

import type { Tab } from "@/features/thoughts/list";
import type { ThoughtTopic } from "@/features/thoughts/topics";

/**
 * "All" and the topics in use, as a group of buttons (not ARIA tabs): one is pressed. They wrap
 * onto as many lines as needed, so nothing scrolls sideways, and every line starts on the left.
 */
export function TopicTabs({
  tabs,
  selected,
  onSelect,
}: {
  tabs: Tab[];
  selected: "all" | ThoughtTopic;
  onSelect: (key: "all" | ThoughtTopic) => void;
}) {
  if (tabs.length === 0) return null;
  return (
    <div
      role="group"
      aria-label="Show thoughts about"
      className="border-line mt-3 mb-5 border-b"
    >
      <div className="flex flex-wrap gap-x-5 md:gap-x-6">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            data-fid={`tab:${tab.key}`}
            aria-pressed={selected === tab.key}
            aria-label={tab.name}
            onClick={() => onSelect(tab.key)}
            className="group text-ink-soft hover:text-ink aria-pressed:text-ink aria-pressed:pressed-glow focus-visible:outline-accent duration-fast inline-flex min-h-11 min-w-11 items-center gap-1.5 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 aria-pressed:font-medium"
          >
            <span aria-hidden="true">{tab.label}</span>
            <span
              aria-hidden="true"
              className="text-ink-faint group-aria-pressed:text-ink-soft text-xs"
            >
              {tab.count}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
