import type { Meta, StoryObj } from "@storybook/svelte";
import TasksSection from "./TasksSection.svelte";

const meta: Meta = {
  title: "Components/TasksSection",
  component: TasksSection as any,
  tags: ["autodocs"],
  argTypes: {
    accountConnected: { control: "boolean" },
    mcpLinked: { control: "boolean" },
  },
};

export default meta;
type Story = StoryObj;

export const Unchecked: Story = {
  args: {
    accountConnected: false,
    mcpLinked: false,
    onConnectAccount: () => console.log("Connect account clicked"),
  },
};

export const AccountConnected: Story = {
  args: {
    ...Unchecked.args,
    accountConnected: true,
  },
};

export const AllCompleted: Story = {
  args: {
    ...Unchecked.args,
    accountConnected: true,
    mcpLinked: true,
  },
};
