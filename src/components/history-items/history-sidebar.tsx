"use client";

import { useEffect, useRef, useCallback } from "react";
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Clock,
  GitBranch,
  History,
  RefreshCcw,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";
import { Button } from "../ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "../ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import { useSavedHistoryState, useUIState } from "@/store/app-store";
import { HistoryItem } from "@/constants/model";
import { useHistoryNavigation } from "@/hooks/useHistoryNavigation";
import EmptyCard from "../empty-card";

interface SavedHistoryProps {
  addButtonRef: React.RefObject<HTMLDivElement | null>;
}

const HistorySidebar = ({ addButtonRef }: SavedHistoryProps) => {
  const { savedHistoryItems, setSavedHistoryItems, resetSavedHistoryState } =
    useSavedHistoryState();
  const { isSavedHistorySidebarOpen, setSavedHistorySidebarOpen } = useUIState();
  const { navigateToHistory } = useHistoryNavigation();
  const sidebarRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);

  const closeSidebar = useCallback(() => {
    setSavedHistorySidebarOpen(false);
  }, [setSavedHistorySidebarOpen]);

  const openSidebar = useCallback(() => {
    setSavedHistorySidebarOpen(true);
  }, [setSavedHistorySidebarOpen]);

  const toggleSidebar = useCallback(() => {
    if (isSavedHistorySidebarOpen) {
      closeSidebar();
    } else {
      openSidebar();
    }
  }, [isSavedHistorySidebarOpen, closeSidebar, openSidebar]);

  useEffect(() => {
    const handleClickOutside = (event: Event) => {
      if (
        isSavedHistorySidebarOpen &&
        sidebarRef.current &&
        !sidebarRef.current.contains(event.target as Node) &&
        toggleRef.current &&
        !toggleRef.current.contains(event.target as Node) &&
        addButtonRef.current &&
        !addButtonRef.current.contains(event.target as Node)
      ) {
        closeSidebar();
      }
    };
    if (isSavedHistorySidebarOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isSavedHistorySidebarOpen, closeSidebar, addButtonRef]);

  const refreshHistory = () => {
    const persistedData = localStorage.getItem("gitdepsec_storage");
    if (persistedData) {
      try {
        const parsed = JSON.parse(persistedData);
        if (parsed.state?.savedHistoryItems) {
          setSavedHistoryItems(parsed.state.savedHistoryItems);
          toast.success("History refreshed!");
        } else {
          toast.error("No history found in storage");
        }
      } catch (error) {
        toast.error("Failed to refresh history");
        console.error("Error parsing history:", error);
      }
    } else {
      toast.error("No saved history found");
    }
  };

  const parseAndNavigate = (hist: HistoryItem) => {
    navigateToHistory(hist);
    closeSidebar();
  };

  const deleteHistory = () => {
    resetSavedHistoryState();
    toast.success("All history deleted!");
  };

  const hasHistory = savedHistoryItems && Object.keys(savedHistoryItems).length > 0;

  return (
    <>
      {/* Sidebar Panel */}
      <Card
        ref={sidebarRef}
        className={cn(
          "fixed top-0 left-0 z-101 h-full w-80",
          "bg-background/95 backdrop-blur-xl",
          "border-r border-border/50",
          "shadow-2xl shadow-black/20",
          "flex flex-col rounded-none",
          "transition-transform duration-300 ease-out gap-0",
          isSavedHistorySidebarOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        {/* Header */}
        <CardHeader className="p-4 border-b">
          {/* Subtle gradient accent */}
          <div className="absolute inset-0 bg-linear-to-r from-primary/5 via-transparent to-transparent pointer-events-none" />

          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10 border border-primary/20">
                <History className="w-6 h-6 text-[#f2d46b]" />
              </div>
              <div>
                <h2 className="font-ui-heading text-lg font-semibold tracking-tight text-[#f2d46b]">
                  History
                </h2>
                <p className="text-xs text-muted-foreground">
                  Your saved audits
                </p>
              </div>
            </div>

            <div className="flex items-center">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    onClick={refreshHistory}
                    variant="ghost"
                    size="icon"
                    className="rounded-full hover:bg-accent-foreground"
                    aria-label="Refresh history"
                  >
                    <RefreshCcw className="size-5! text-muted-foreground group-hover:text-foreground transition-colors" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">Refresh</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    onClick={deleteHistory}
                    variant="ghost"
                    size="icon"
                    className="rounded-full hover:bg-destructive/50"
                    aria-label="Clear history"
                  >
                    <Trash2 className="size-5! text-muted-foreground group-hover:text-destructive transition-colors" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">Clear all</TooltipContent>
              </Tooltip>
            </div>
          </div>
        </CardHeader>

        {/* Content */}
        <CardContent className="flex-1 overflow-y-auto scrollbar-background-thumb scrollbar-background-bg px-0">
          {hasHistory ? (
            <div className="pb-4">
              {Object.entries(savedHistoryItems)
                .sort(([dateA], [dateB]) => new Date(dateB).getTime() - new Date(dateA).getTime())
                .map(([date, items], groupIndex) => (
                  <div key={date} className="mb-6 last:mb-0">
                    {/* Date Header */}
                    <div className="sticky top-0 z-10 px-5 py-3 bg-background/90 backdrop-blur-sm border-y border-border/60">
                      <div className="flex items-center gap-3">
                        <Clock className="size-5 text-muted-foreground" />
                        <span className="font-ui-heading text-xs font-semibold text-muted-foreground uppercase tracking-[0.2em]">
                          {date}
                        </span>
                        <span className="ml-auto text-[10px] text-muted-foreground bg-transparent border border-border/60 px-2 py-0.5 rounded-full">
                          {items.length}
                        </span>
                      </div>
                    </div>

                    {/* History Items */}
                    <ul className="px-3 pt-3 space-y-1">
                      {items.map((hist, index) => (
                        <li
                          key={index}
                          onClick={() => parseAndNavigate(hist)}
                          className={cn(
                            "group relative px-2 py-2 rounded-lg cursor-pointer",
                            "hover:bg-muted/60 active:bg-muted/80",
                            "transition-all duration-200",
                            "border border-transparent hover:border-border/50",
                          )}
                          style={{
                            animationDelay: `${(groupIndex * items.length + index) * 50}ms`,
                          }}
                        >
                          {/* Left accent bar on hover */}
                          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-0 bg-primary rounded-full transition-all duration-200 group-hover:h-8" />

                          <div className="flex items-center justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <p className="font-ui-data text-sm font-semibold text-[#f2d46b] truncate">
                                {hist.username}/{hist.repo}
                              </p>
                              <div className="flex items-center gap-1.5 mt-1">
                                <GitBranch className="size-5 text-muted-foreground" />
                                <span className="font-ui-data text-xs text-muted-foreground truncate">
                                  {hist.branch}
                                </span>
                              </div>
                            </div>

                            <ArrowRight className="size-6 text-muted-foreground opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200" />
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
            </div>
          ) : (
            <div className="h-full flex items-center justify-center p-4">
              <EmptyCard
                size="sm"
                variant="default"
                title="No saved history"
                message="Save your audits to quickly access them later"
                useCoffeeCup={false}
                className="border-none bg-transparent h-auto"
              />
            </div>
          )}
        </CardContent>

        {/* Footer */}
        <CardFooter className="p-4 bg-muted/10">
          <p className="text-[10px] text-muted-foreground/60 text-center w-full">
            History is stored locally in your browser
          </p>
        </CardFooter>
      </Card>

      {/* Toggle Button */}
      <Button
        variant="outline"
        ref={toggleRef}
        onClick={toggleSidebar}
        className={cn(
          "fixed top-1/2 -translate-y-1/2 z-102",
          "w-6 h-16 rounded-r-lg rounded-l-none",
          "bg-background/90 backdrop-blur-sm",
          "border-l-0 border-border/50",
          "shadow-lg shadow-black/10",
          "flex items-center justify-center",
          "hover:bg-muted/80 hover:w-7",
          "transition-all duration-300 ease-out",
          "group",
          isSavedHistorySidebarOpen ? "left-80" : "left-0",
        )}
        aria-label={isSavedHistorySidebarOpen ? "Close history" : "Open history"}
      >
        {isSavedHistorySidebarOpen ? (
          <ChevronLeft className="size-6 text-muted-foreground group-hover:text-foreground transition-colors" />
        ) : (
          <ChevronRight className="size-6 text-muted-foreground group-hover:text-foreground transition-colors" />
        )}
      </Button>

      {/* Overlay for mobile */}
      {isSavedHistorySidebarOpen && (
        <div
          className="fixed inset-0 z-100 bg-black/20 backdrop-blur-sm sm:hidden rounded-tl-none rounded-bl-none"
          onClick={closeSidebar}
          aria-hidden="true"
        />
      )}
    </>
  );
};

export default HistorySidebar;
