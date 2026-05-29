import House from "lucide-svelte/icons/house";
import Wallet from "lucide-svelte/icons/wallet";
import ArrowLeftRight from "lucide-svelte/icons/arrow-left-right";
import Plug from "lucide-svelte/icons/plug";

export const navItems = [
  { href: "/", label: "Home", icon: House },
  { href: "/accounts", label: "Accounts", icon: Wallet },
  { href: "/transactions", label: "Transactions", icon: ArrowLeftRight },
  { href: "/connect", label: "Connect", icon: Plug },
];

export function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname.startsWith(href);
}
