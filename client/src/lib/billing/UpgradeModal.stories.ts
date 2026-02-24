import type { Meta, StoryObj } from "@storybook/svelte";
import UpgradeModal from "./UpgradeModal.svelte";

const meta: Meta = {
  title: "Billing/UpgradeModal",
  component: UpgradeModal as any,
  tags: ["autodocs"],
  argTypes: {
    requiredPlan: {
      control: "select",
      options: ["plus", "pro"],
    },
  },
};

export default meta;
type Story = StoryObj;

export const PlusPlan: Story = {
  args: {
    isOpen: true,
    requiredPlan: "plus",
    hasExistingSubscription: false,
    onClose: () => console.log("onClose"),
  },
};

export const ProPlan: Story = {
  args: {
    isOpen: true,
    requiredPlan: "pro",
    hasExistingSubscription: false,
    onClose: () => console.log("onClose"),
  },
};

export const ExistingSubscription: Story = {
  args: {
    isOpen: true,
    requiredPlan: "pro",
    hasExistingSubscription: true,
    onClose: () => console.log("onClose"),
  },
};
