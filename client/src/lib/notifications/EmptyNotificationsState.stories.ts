import type { Meta, StoryObj } from "@storybook/svelte";
import EmptyNotificationsState from "./EmptyNotificationsState.svelte";

const meta: Meta = {
  title: "Notifications/EmptyNotificationsState",
  component: EmptyNotificationsState as any,
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj;

export const Default: Story = {};
