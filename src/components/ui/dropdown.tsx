"use client";
import { useState } from "react";
import { Check, ChevronsUpDown, Loader } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useErrorState, useRepoState } from "@/store/app-store";

interface DropdownProps {
  className?: string;
  contentClassName?: string;
  isBranchDropdown?: boolean;
  ecosystems?: string[];
  selectedEcosystem?: string;
  onEcosystemChange?: (ecosystem: string) => void;
  shouldShowBranches?: boolean;
}

export function Dropdown({
  className,
  contentClassName,
  isBranchDropdown = true,
  ecosystems = [],
  selectedEcosystem,
  onEcosystemChange,
  shouldShowBranches = true,
}: DropdownProps) {
  const [open, setOpen] = useState(false);
  const { branches, selectedBranch, loadingBranches, hasMore, loadNextPage, setSelectedBranch } =
    useRepoState();
  const { setError } = useErrorState();

  const availableItems = isBranchDropdown ? branches : ecosystems;
  const canOpen = isBranchDropdown ? shouldShowBranches && availableItems.length > 0 : availableItems.length > 0;
  const isDisabled = isBranchDropdown ? loadingBranches || !canOpen : !canOpen;
  const isBranchUnavailable = isBranchDropdown && (!branches.length || !shouldShowBranches);
  const isEcosystemUnavailable = !isBranchDropdown && !ecosystems.length;
  const triggerLabel = isBranchDropdown
    ? loadingBranches
      ? "Loading..."
      : !shouldShowBranches
        ? "Select Branch..."
        : selectedBranch || "Select Branch..."
    : selectedEcosystem || "Select ecosystem";

  const handleOpenChange = (nextOpen: boolean) => {
    // Only block for loading if it's a branch dropdown
    if (isBranchDropdown && loadingBranches) {
      return;
    }

    if (nextOpen && !canOpen) {
      if (isBranchDropdown) {
        setError("Please enter a valid GitHub repository URL first.");
      }
      setOpen(false);
      return;
    }
    setOpen(nextOpen);
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;

    // Trigger pagination when user is near the bottom.
    if (distanceFromBottom <= 500 && hasMore && !loadingBranches) {
      loadNextPage();
    }
  };

  const handleBranchSelect = (value: string) => {
    setSelectedBranch(value);
    setOpen(false);
  };

  const handleEcosystemSelect = (value: string) => {
    onEcosystemChange?.(value);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          aria-label={isBranchDropdown ? "Select Branch Dropdown" : "Select Ecosystem Dropdown"}
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={isDisabled}
          className={cn(
            "sm:h-14 min-w-0 text-md w-full text-input justify-between overflow-hidden border-[3px] border-black px-3 sm:px-4 transition-transform hover:text-secondary-foreground hover:bg-gray-300 max-sm:w-full group",
            isBranchUnavailable ? "opacity-60 cursor-not-allowed" : "",
            isEcosystemUnavailable ? "opacity-60 cursor-not-allowed" : "",
            className,
          )}
        >
          <span className="min-w-0 flex-1 truncate text-left">
            {triggerLabel}
          </span>
          <ChevronsUpDown className="opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className={cn(
          "p-0 border-black border-[3px] w-(--radix-popover-trigger-width) max-w-(--radix-popover-trigger-width)! overflow-hidden",
          contentClassName,
          className
        )}
      >
        <Command className="max-h-100 rounded-md overflow-hidden w-full">
          {isBranchDropdown && (
            <CommandInput
              placeholder={isBranchDropdown ? "Search Branch..." : "Search Ecosystem..."}
              className="h-9"
            />
          )}
          <CommandList
            onScroll={handleScroll}
            className="max-h-87.5 scrollbar-background-bg scrollbar-background-thumb"
          >
            {isBranchDropdown ? (
              // Branch dropdown mode
              !branches.length && !loadingBranches ? (
                <CommandEmpty>No branch found</CommandEmpty>
              ) : (
                <CommandGroup>
                  {branches.map((branch) => (
                    <CommandItem
                      key={branch}
                      value={branch}
                      onSelect={handleBranchSelect}
                      className="whitespace-normal break-all cursor-pointer"
                    >
                      {branch}
                      <Check
                        className={cn(
                          "ml-auto",
                          selectedBranch === branch ? "opacity-100" : "opacity-0",
                        )}
                      />
                    </CommandItem>
                  ))}
                  {/* Loading indicator for pagination */}
                  {loadingBranches && branches.length > 0 && (
                    <CommandItem disabled className="justify-center p-0 m-0">
                      <Loader className="h-4 w-4 animate-spin" />
                    </CommandItem>
                  )}
                </CommandGroup>
              )
            ) : // Ecosystem dropdown mode
              !ecosystems.length ? (
                <CommandEmpty>No ecosystem found</CommandEmpty>
              ) : (
                <CommandGroup className="m-2">
                  {ecosystems.map((ecosystem) => (
                    <CommandItem
                      key={ecosystem}
                      value={ecosystem}
                      onSelect={handleEcosystemSelect}
                      className="whitespace-normal break-all cursor-pointer"
                    >
                      {ecosystem}
                      <Check
                        className={cn(
                          "ml-auto",
                          selectedEcosystem === ecosystem ? "opacity-100" : "opacity-0",
                        )}
                      />
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
          </CommandList>
          {isBranchDropdown && (
            <div>
              {!hasMore && branches.length > 0 ? (
                <div className="p-2 text-center text-xs text-accent border-t truncate">
                  All {branches.length} branches loaded
                </div>
              ) : (
                <div className="p-2 text-center text-xs text-accent border-t truncate">
                  Scroll to load more branches...
                </div>
              )}
            </div>
          )}
        </Command>
      </PopoverContent>
    </Popover>
  );
}
