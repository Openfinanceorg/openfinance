<script lang="ts">
  import { authClient } from "$lib/auth-client";
  import {
    Avatar,
    AvatarImage,
    AvatarFallback,
  } from "$lib/components/ui/avatar";
  import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
  } from "$lib/components/ui/dropdown-menu";
  import ChevronsUpDown from "lucide-svelte/icons/chevrons-up-down";

  const session = authClient.useSession();

  function getInitials(name: string | null | undefined): string {
    if (!name?.trim()) return "?";
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }
</script>

<DropdownMenu>
  <DropdownMenuTrigger
    class="flex items-center gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-gray-100 transition-colors border-0 cursor-pointer"
  >
    <Avatar class="h-7 w-7">
      <AvatarImage src={$session.data?.user?.image} alt="" />
      <AvatarFallback class="bg-gray-300 text-sm font-medium text-gray-700"
        >{getInitials($session.data?.user?.name)}</AvatarFallback
      >
    </Avatar>
    <div class="flex flex-col">
      <span class="text-sm font-medium text-gray-900">
        {$session.data?.user?.name ?? "Account"}
      </span>
      <span class="text-xs text-gray-500">Free plan</span>
    </div>
    <ChevronsUpDown class="h-4 w-4 text-gray-400" />
  </DropdownMenuTrigger>
  <DropdownMenuContent class="bg-white text-gray-900 border-gray-200">
    <DropdownMenuItem
      onclick={() => authClient.signOut()}
      class="cursor-pointer"
    >
      Sign out
    </DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
