import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import React from "react";
import { PlusCircle } from "lucide-react";
import toast from "react-hot-toast";
import { useSavedHistoryState, useGraphState } from "@/store/app-store";
import { HistoryItem } from "@/constants/model";
import { MAX_HISTORY_ITEMS } from "@/constants/constants";

interface SaveAnalysisHistoryProps {
  data?: HistoryItem;
  addButtonRef?: React.RefObject<HTMLDivElement | null>;
}
const SaveAnalysisHistory = ({ data, addButtonRef }: SaveAnalysisHistoryProps) => {
  const { savedHistoryItems, setSavedHistoryItems } = useSavedHistoryState();
  const { graphRepoKey } = useGraphState();

  // disable the button if entered url doesn't match the current analysed repo
  const shouldDisableButton = () => {
    if (!data || !data.username || !data.repo || !data.branch) return true;

    const inputRepoKey = `${data.username}/${data.repo}/${data.branch}`;
    return inputRepoKey !== graphRepoKey;
  };

  const addGithubPreference = () => {
    if (shouldDisableButton()) {
      toast.error("Please analyze the repository first before saving!");
      return;
    }
    if (!data) {
      toast.error("No history to save!");
      return;
    }
    if (!data.username || !data.repo || !data.branch || data.branch.trim() === "") {
      toast.error("Incomplete data to save history!");
      return;
    }
    if (Object.values(savedHistoryItems).flat().length >= MAX_HISTORY_ITEMS) {
      toast.error("History limit reached! Please delete some entries before adding new ones.");
      return;
    }

    const dateKey = new Date().toLocaleDateString("en-US", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    const newHistoryItem: HistoryItem = {
      username: data.username || "",
      repo: data.repo || "",
      branch: data.branch || "",
      graphData: data.graphData || {},
      dependencies: data.dependencies || {},
      branches: data.branches || [],
      cachedAt: Date.now(),
    };

    const updatedHistory = { ...savedHistoryItems };

    if (updatedHistory[dateKey]) {
      // Check for duplicates before adding for that date
      const isDuplicate = updatedHistory[dateKey].some(
        (item) =>
          item.username === newHistoryItem.username &&
          item.repo === newHistoryItem.repo &&
          item.branch === newHistoryItem.branch,
      );
      if (!isDuplicate) {
        updatedHistory[dateKey].unshift(newHistoryItem);
      } else {
        toast.error("This history entry already exists!");
        return;
      }
    } else {
      updatedHistory[dateKey] = [newHistoryItem];
    }
    setSavedHistoryItems(updatedHistory);
    toast.success("GitHub History Added!");
  };

  const isDisabled = shouldDisableButton();

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button type="button" disabled={isDisabled} onClick={addGithubPreference}>
            <div
              ref={addButtonRef}
              className={`rounded-2xl p-1 absolute -top-3 -left-3 ${
                isDisabled
                  ? "bg-gray-400 cursor-not-allowed opacity-50"
                  : "bg-accent cursor-pointer hover:bg-accent/80"
              }`}
            >
              <PlusCircle strokeWidth={3} />
            </div>
          </button>
        </TooltipTrigger>
        <TooltipContent
          side="top"
          className="bg-background/80 text-accent text-xs px-2 py-1 rounded-md transition-all ease-in duration-300"
        >
          {isDisabled ? "Analyze repository first" : "Save to History"}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default SaveAnalysisHistory;
