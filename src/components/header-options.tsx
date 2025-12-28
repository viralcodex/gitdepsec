import {
  TooltipProvider,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@radix-ui/react-tooltip";
import React from "react";
import { PlusCircle } from "lucide-react";
import toast from "react-hot-toast";
import { useSavedHistoryState } from "@/store/app-store";

interface HeaderOptionsProps {
  data?: { [key: string]: string | null } | null;
  addButtonRef?: React.RefObject<HTMLDivElement | null>;
}
const HeaderOptions = ({ data, addButtonRef }: HeaderOptionsProps) => {
  const { savedHistoryItems, setSavedHistoryItems } = useSavedHistoryState();

  const addGithubPreference = () => {
    if (!data) {
      toast.error("No history to save!");
      return;
    }
  
    if( !data.sanitizedUsername || !data.sanitizedRepo ){
      toast.error("Incomplete data to save history!");
      return;
    }

    const dateKey = new Date().toLocaleDateString("en-US", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    const newHistoryItem = {
      sanitizedUsername: data.sanitizedUsername || "",
      sanitizedRepo: data.sanitizedRepo || "",
      branch: data.branch || "",
    };

    const updatedHistory = { ...savedHistoryItems };

    if (updatedHistory[dateKey]) {
      // Check for duplicates before adding
      const isDuplicate = updatedHistory[dateKey].some(
        (item) =>
          item.sanitizedUsername === newHistoryItem.sanitizedUsername &&
          item.sanitizedRepo === newHistoryItem.sanitizedRepo &&
          item.branch === newHistoryItem.branch
      );
      if (!isDuplicate) {
        updatedHistory[dateKey].unshift(newHistoryItem);
      }
      else{
        toast.error("This history entry already exists!");
        return;
      }
    } else {
      updatedHistory[dateKey] = [newHistoryItem];
    }
    setSavedHistoryItems(updatedHistory);
    toast.success("GitHub History Added!");
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            ref={addButtonRef}
            onClick={addGithubPreference}
            className="bg-accent rounded-2xl p-1 cursor-pointer absolute -top-3 -left-3"
          >
            <PlusCircle strokeWidth={3} />
          </div>
        </TooltipTrigger>
        <TooltipContent className="bg-background/80 text-accent text-xs px-2 py-1 rounded-md transition-all ease-in duration-300">
          Save to History
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default HeaderOptions;
