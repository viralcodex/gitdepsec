"use client";
import { useEffect, useState } from "react";
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useErrorState, useRepoState } from "@/store/app-store";

interface DropdownProps {
  className?: string;
  isBranchDropdown?: boolean;
  ecosystems?: string[];
  selectedEcosystem?: string;
  onEcosystemChange?: (ecosystem: string) => void;
  shouldShowBranches?: boolean;
}

export function Dropdown({
  className,
  isBranchDropdown = true,
  ecosystems = [],
  selectedEcosystem,
  onEcosystemChange,
  shouldShowBranches = true,
}: DropdownProps) {
  const [open, setOpen] = useState(false);
  const [shouldOpen, setShouldOpen] = useState(false);
  const {
    branches,
    selectedBranch,
    loadingBranches,
    hasMore,
    loadNextPage,
    setSelectedBranch,
  } = useRepoState();
  const { setError } = useErrorState();

  // Effect to determine if the dropdown should open
  useEffect(() => {
    const items = isBranchDropdown ? branches : ecosystems;
    if (isBranchDropdown && !shouldShowBranches) {
      setShouldOpen(false);
      setOpen(false);
      return;
    }
    if (items.length) {
      setShouldOpen(true);
    } else {
      setShouldOpen(false);
      setOpen(false);
    }
  }, [branches, ecosystems, isBranchDropdown, shouldShowBranches, setError]);

  const handleOpenChange = (nextOpen: boolean) => {
    // Only block for loading if it's a branch dropdown
    if (isBranchDropdown && loadingBranches) return;
    if (nextOpen && !shouldOpen) {
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

    // Trigger pagination when user is near the bottom (within 100px)
    if (distanceFromBottom <= 500 && hasMore && !loadingBranches) {
      console.log("Triggering loadNextPage");
      loadNextPage();
    }
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          aria-label={isBranchDropdown ? "Select Branch Dropdown" : "Select Ecosystem Dropdown"}
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={
            isBranchDropdown ? loadingBranches || !shouldOpen : !shouldOpen
          }
          className={cn(
            "text-md w-full text-input justify-between overflow-y-hidden overflow-x-scroll scrollbar-background-hidden border-[3px] border-black p-6 transition-transform hover:text-secondary-foreground hover:bg-gray-300 max-sm:w-full group",
            isBranchDropdown && (!branches || branches.length === 0 || !shouldShowBranches)
              ? "opacity-60 cursor-not-allowed"
              : "",
            !isBranchDropdown && !ecosystems.length
              ? "opacity-60 cursor-not-allowed"
              : "",
            className
          )}
        >
          {isBranchDropdown
            ? loadingBranches
              ? "Loading branches..."
              : !shouldShowBranches
              ? "Select Branch..."
              : selectedBranch || "Select Branch..."
            : selectedEcosystem || "Select ecosystem"}
          <ChevronsUpDown className="opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className={cn("p-0 border-black border-[3px]", className)}
      >
        <Command className="max-h-[400px] rounded-md">
          {!ecosystems && (
            <CommandInput
              placeholder={
                isBranchDropdown ? "Search Branch..." : "Search Ecosystem..."
              }
              className="h-9"
            />
          )}
          <CommandList
            onScroll={handleScroll}
            className="max-h-[350px] scrollbar-background-bg scrollbar-background-thumb"
          >
            {isBranchDropdown ? (
              // Branch dropdown mode
              !branches.length && !loadingBranches ? (
                <CommandEmpty>No branch found</CommandEmpty>
              ) : (
                <CommandGroup className="">
                  {branches.map((branch) => (
                    <CommandItem
                      key={branch}
                      value={branch}
                      onSelect={(value: string) => {
                        setSelectedBranch(value);
                        setOpen(false);
                      }}
                      className="whitespace-normal break-all cursor-pointer"
                    >
                      {branch}
                      <Check
                        className={cn(
                          "ml-auto",
                          selectedBranch === branch
                            ? "opacity-100"
                            : "opacity-0"
                        )}
                      />
                    </CommandItem>
                  ))}
                  {/* Loading indicator for pagination */}
                  {loadingBranches && branches.length > 0 && (
                    <CommandItem disabled className="justify-center">
                      <div className="flex items-center gap-2">
                        <Loader className="h-4 w-4 animate-spin" />
                      </div>
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
                    onSelect={(value: string) => {
                      onEcosystemChange?.(value);
                      setOpen(false);
                    }}
                    className="whitespace-normal break-all cursor-pointer"
                  >
                    {ecosystem}
                    <Check
                      className={cn(
                        "ml-auto",
                        selectedEcosystem === ecosystem
                          ? "opacity-100"
                          : "opacity-0"
                      )}
                    />
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
          {isBranchDropdown && !hasMore && branches.length > 0 ? (
            <div className="p-2 text-center text-xs text-accent border-t">
              All {branches.length} branches loaded
            </div>
          ) : (
            <div className="p-2 text-center text-xs text-accent border-t">
              Scroll to load more branches...
            </div>
          )}
        </Command>
      </PopoverContent>
    </Popover>
  );
}
