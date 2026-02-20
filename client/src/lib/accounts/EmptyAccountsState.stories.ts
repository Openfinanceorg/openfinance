import type { Meta, StoryObj } from "@storybook/svelte";
import EmptyAccountsState from "./EmptyAccountsState.svelte";

const meta: Meta = {
  title: "Accounts/EmptyAccountsState",
  component: EmptyAccountsState as any,
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj;

export const Default: Story = {};
