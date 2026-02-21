import type { Meta, StoryObj } from "@storybook/svelte";
import Tasks from "./Tasks.svelte";

const meta: Meta = {
  title: "Components/Tasks",
  component: Tasks as any,
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj;

export const Default: Story = {
  args: {
    tasks: [
      {
        id: "sync_error:1",
        type: "account_disconnected",
        title: "Reconnect Chase Checking",
        description: "This account lost connection and needs to be re-linked.",
        accountId: 1,
        institutionName: "Chase",
      },
      {
        id: "sync_error:2",
        type: "account_disconnected",
        title: "Reconnect Bank of America Savings",
        description: "This account lost connection and needs to be re-linked.",
        accountId: 2,
        institutionName: "Bank of America",
      },
    ],
    onReconnect: (id: number) => console.log("Reconnect account", id),
  },
};

export const SingleTask: Story = {
  args: {
    tasks: [
      {
        id: "sync_error:1",
        type: "account_disconnected",
        title: "Reconnect Chase Checking",
        description: "This account lost connection and needs to be re-linked.",
        accountId: 1,
        institutionName: "Chase",
      },
    ],
    onReconnect: (id: number) => console.log("Reconnect account", id),
  },
};

export const Empty: Story = {
  args: {
    tasks: [],
    onReconnect: (id: number) => console.log("Reconnect account", id),
  },
};
