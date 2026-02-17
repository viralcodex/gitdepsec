"use client";
import { useHistoryNavigation } from "@/hooks/useHistoryNavigation";
import { useSavedHistoryState } from "@/store/app-store";
import { ArrowRight } from "lucide-react";
import React from "react";
import { Card } from "../ui/card";
import EmptyCard from "../empty-card";

const HistoryPanel = () => {
  const { savedHistoryItems } = useSavedHistoryState();
  const { navigateToHistory } = useHistoryNavigation();

  const topThreeRecentItems = React.useMemo(() => {
    const allItems = Object.values(savedHistoryItems).flat();
    const sortedItems = allItems.sort((a, b) => {
      if (!a.cachedAt) return 1;
      if (!b.cachedAt) return -1;
      return b.cachedAt - a.cachedAt;
    });
    return sortedItems.slice(0, 3);
  }, [savedHistoryItems]);

  if (!topThreeRecentItems.length) {
    return null;
  }

  return (
    <Card
      aria-label="Recent analysis history"
      className="w-full max-w-3xl m-0 border-none text-secondary bg-[rgba(169,169,169,0.4)] p-4 sm:px-4 sm:py-2 backdrop-blur-[1px]"
    >
      <div>
        <header className="flex flex-row justify-between items-center w-full">
          <p className="font-ui-heading font-bold sm:text-lg text-md">Continue Analysis:</p>
          {/* <p className="text-xs text-secondary hover:text-accent hover:underline cursor-pointer">
            View All
          </p> */}
        </header>
        <hr className="mb-2 mt-1" />
        <ul className="mt-1">
          {topThreeRecentItems ? (
            topThreeRecentItems.map((item, index) => {
              return (
                <li
                  key={index}
                  className="text-sm sm:text-md"
                  onClick={() => navigateToHistory(item)}
                >
                  <button className="flex flex-row w-full px-2 py-1 rounded-sm items-center justify-between hover:bg-accent-foreground cursor-pointer">
                    <p className="font-ui-mono">
                      {item.username}/{item.repo} · {item.branch}
                    </p>
                    <ArrowRight className="h-4 w-4 text-secondary" />
                  </button>
                </li>
              );
            })
          ) : (
            <EmptyCard
              size="sm"
              variant="search"
              title="No recent analyses"
              message="Your analysis history will appear here"
              useCoffeeCup={false}
              className="border-none bg-transparent"
            />
          )}
        </ul>
      </div>
    </Card>
  );
};

export default HistoryPanel;
