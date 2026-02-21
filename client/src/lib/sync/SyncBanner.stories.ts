import type { Meta, StoryObj } from "@storybook/svelte";
import SyncBanner from "./SyncBanner.svelte";
import { syncStatus } from "./sync-status";

type Variant = "idle" | "syncing" | "completed";

interface StoryArgs {
  variant: Variant;
  institutions: string[];
}

function setStatus(variant: Variant, institutions: string[]): void {
  if (variant === "syncing") {
    syncStatus.set({
      syncing: true,
      syncingInstitutions: institutions,
      completed: false,
    });
    return;
  }

  if (variant === "completed") {
    syncStatus.set({
      syncing: false,
      syncingInstitutions: [],
      completed: true,
    });
    return;
  }

  syncStatus.set({
    syncing: false,
    syncingInstitutions: [],
    completed: false,
  });
}

const meta: Meta = {
  title: "Sync/SyncBanner",
  component: SyncBanner as any,
  tags: ["autodocs"],
  render: (args) => {
    const storyArgs = args as StoryArgs;
    setStatus(storyArgs.variant, storyArgs.institutions ?? []);
    return { Component: SyncBanner };
  },
  argTypes: {
    variant: {
      control: "select",
      options: ["idle", "syncing", "completed"],
    },
    institutions: { control: "object" },
  },
};

export default meta;
type Story = StoryObj<StoryArgs>;

export const Syncing: Story = {
  args: {
    variant: "syncing",
    institutions: ["Chase", "Wells Fargo"],
  },
};

export const Completed: Story = {
  args: {
    variant: "completed",
    institutions: [],
  },
};

export const Idle: Story = {
  args: {
    variant: "idle",
    institutions: [],
  },
};
