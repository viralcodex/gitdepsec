import { useEffect, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader } from "./ui/card";
import { useRouter } from "next/navigation";
import { RefreshCcw, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";
import { Tooltip, TooltipContent } from "./ui/tooltip";
import { TooltipTrigger } from "./ui/tooltip";
import {
  useRepoState,
  useSavedHistoryState,
  useUIState,
} from "@/store/app-store";
import { HistoryItem } from "@/constants/model";

interface SavedHistoryProps {
  addButtonRef: React.RefObject<HTMLDivElement | null>;
}

const SavedHistory = ({ addButtonRef }: SavedHistoryProps) => {
  const { savedHistoryItems, setSavedHistoryItems, resetSavedHistoryState } =
    useSavedHistoryState();
  const { setLoadedRepoKey, loadedRepoKey } = useRepoState();
  const { isSavedHistorySidebarOpen, setSavedHistorySidebarOpen } =
    useUIState();
  const router = useRouter();
  const histCardRef = useRef<HTMLDivElement>(null);
  const toggleBarRef = useRef<HTMLDivElement>(null);

  const closeHistoryCard = useCallback(() => {
    if (histCardRef.current) {
      histCardRef.current.style.transform = "translateX(calc(-95%))";
      histCardRef.current.style.transition = "transform 0.25s ease-in-out";
      setSavedHistorySidebarOpen(false);
    }
  }, [setSavedHistorySidebarOpen]);

  const openHistoryCard = useCallback(() => {
    if (histCardRef.current) {
      histCardRef.current.style.transform = "translateX(0)";
      histCardRef.current.style.transition = "transform 0.25s ease-in-out";
      setTimeout(() => {
        if (histCardRef.current) {
          histCardRef.current.style.opacity = "1";
        }
      }, 250);
      setSavedHistorySidebarOpen(true);
    }
  }, [setSavedHistorySidebarOpen]);

  const toggleHistoryCard = useCallback(() => {
    if (isSavedHistorySidebarOpen) {
      closeHistoryCard();
    } else {
      openHistoryCard();
    }
  }, [isSavedHistorySidebarOpen, closeHistoryCard, openHistoryCard]);

  useEffect(() => {
    const handleClickOutside = (event: Event) => {
      if (
        isSavedHistorySidebarOpen &&
        histCardRef.current &&
        !histCardRef.current.contains(event.target as Node) &&
        toggleBarRef.current &&
        !toggleBarRef.current.contains(event.target as Node) &&
        addButtonRef.current &&
        !addButtonRef.current.contains(event.target as Node)
      ) {
        closeHistoryCard();
      }
    };
    if (isSavedHistorySidebarOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isSavedHistorySidebarOpen, closeHistoryCard, addButtonRef]);

  const parseAndNavigate = (hist: HistoryItem) => {
    // const githubUrl = `https://github.com/${hist.username}/${hist.repo}`;
    const newRepoKey = `${hist.username}/${hist.repo}`;
    
    // Only reset loadedRepoKey if navigating to a different repo
    if (loadedRepoKey !== newRepoKey) {
      setLoadedRepoKey(null);
    }
    // setCurrentUrl(githubUrl);
    router.push(
      `/${hist.username}/${hist.repo}?branch=${hist.branch}`
    );
  };

  //have to read from local storage again to get latest data
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

  const deletehistory = () => {
    resetSavedHistoryState();
    toast.success("All history deleted!");
  };

  return (
    <>
      <Card
        ref={histCardRef}
        id="history-card"
        style={{ transform: "translateX(calc(-95%))", opacity: "0.3" }}
        className="bg-background gap-0 w-[80%] h-130 rounded-xl sm:h-155 sm:w-80 fixed top-91 sm:top-46 left-0 z-101 overflow-auto scrollbar-background-thumb scrollbar-background-bg hover:opacity-100"
      >
        <div
          ref={toggleBarRef}
          id="togglebar"
          className={cn(
            "absolute bg-accent-foreground w-4 h-[100%] rounded-r-xl right-0 opacity-20 hover:opacity-100 cursor-pointer border-none"
          )}
          onClick={toggleHistoryCard}
        />
        <CardHeader className="p-4">
          <div className="flex flex-row justify-between items-center cursor-pointer">
            <span className="text-foreground text-xl font-semibold">
              {"Saved history"}
            </span>
            <section
              aria-label="History actions"
              className="flex flex-row gap-x-4"
            >
              <Tooltip aria-label="refresh history">
                <TooltipTrigger asChild id="refresh-history">
                  <RefreshCcw
                    className="text-accent"
                    onClick={refreshHistory}
                  />
                </TooltipTrigger>
                <TooltipContent>Refresh History</TooltipContent>
              </Tooltip>
              <Tooltip aria-label="delete history">
                <TooltipTrigger asChild id="delete-history">
                  <Trash2 className="text-accent" onClick={deletehistory} />
                </TooltipTrigger>
                <TooltipContent>Delete all History</TooltipContent>
              </Tooltip>
            </section>
          </div>
        </CardHeader>
        <hr className="" />
        <CardContent className="p-2 py-4">
          {savedHistoryItems && Object.keys(savedHistoryItems).length > 0 ? (
            Object.entries(savedHistoryItems)
              .sort(([dateA], [dateB]) => new Date(dateB).getTime() - new Date(dateA).getTime())
              .map(([date, items]) => {
              return (
                <div key={date} className="px-3">
                  <h4
                    aria-label={`Saved history for ${date}`}
                    className="text-md font-bold text-primary-foreground pb-2"
                  >
                    {date}
                  </h4>
                  <hr className="mr-3" />
                  <ul className="my-1 list-disc ml-3 mr-0 text-accent">
                    {items.map((hist, index) => (
                      <li
                        key={index}
                        className="py-2 px-2 rounded-md cursor-pointer hover:bg-gray-400/40"
                        onClick={() => parseAndNavigate(hist)}
                      >
                        <p className="font-semibold text-sm text-accent">
                          {hist.username}/{hist.repo} :{" "}
                          {hist.branch}
                        </p>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })
          ) : (
            <p className="text-accent text-sm w-full p-5">
              No saved history available...
            </p>
          )}
        </CardContent>
      </Card>
    </>
  );
};

export default SavedHistory;
