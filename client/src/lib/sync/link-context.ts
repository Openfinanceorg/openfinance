import { getContext, setContext } from "svelte";
import type { ConnectedAccount } from "@openfinance/shared";

export interface LinkContext {
  openSearch: () => void;
  triggerReauth: (account: ConnectedAccount) => void;
  onAccountLinked: (cb: () => void) => void;
}

const KEY = "link-actions";

export function setLinkContext(ctx: LinkContext) {
  setContext(KEY, ctx);
}

export function getLinkContext(): LinkContext {
  return getContext<LinkContext>(KEY);
}
