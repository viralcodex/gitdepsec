"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dropdown } from "@/components/ui/dropdown";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn, verifyUrl } from "@/lib/utils";
import { LucideArrowBigRight, LucideLoader2, RefreshCcwDot } from "lucide-react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import HeaderToggle from "./header-toggle";
import HeaderOptions from "./header-options";
import { ButtonGroup } from "./ui/button-group";
import { useRepoState, useGraphState, useDiagramState, useErrorState, useUIState } from "@/store/app-store";
import { HistoryItem } from "@/constants/model";

interface TopHeaderProps {
  inputUrl: string;
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRefresh: () => void;
  resetGraphSvg: () => void;
  addButtonRef: React.RefObject<HTMLDivElement | null>;
}

const TopHeaderGithub = (props: TopHeaderProps) => {
  const { inputUrl, handleInputChange, onRefresh, resetGraphSvg, addButtonRef } = props;
  
  // Store hooks
  const { branches, selectedBranch, loadingBranches } = useRepoState();
  const { loading, setLoading, graphData, dependencies } = useGraphState();
  const { isDiagramExpanded } = useDiagramState();
  const { setBranchError } = useErrorState();
  const { setFileHeaderOpen } = useUIState();
  const [result, setResult] = useState<HistoryItem>();
  const router = useRouter();

  useEffect(() => {
    if (inputUrl && selectedBranch) {
      const verified = verifyUrl(inputUrl, setBranchError);
      if (verified) {
        setResult({
          username: verified.sanitizedUsername,
          repo: verified.sanitizedRepo,
          branch: selectedBranch,
          graphData: graphData || {},
          dependencies: dependencies || {},
          branches: branches || [],
        });
      }
    }
    return () => {
      setResult(undefined);
    };
  }, [inputUrl, setBranchError, selectedBranch, graphData, dependencies, branches]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!result) {
      return;
    }
    const { username, repo } = result;
    if (!branches || branches.length === 0) {
      return;
    }

    setLoading(true);
    setBranchError("");

    // Check if we're on the same page with same parameters
    const currentUrl = window.location.href;
    const newUrl = `/${encodeURIComponent(username)}/${encodeURIComponent(repo)}?branch=${encodeURIComponent(
      selectedBranch!
    )}`;

    if (currentUrl.includes(newUrl.slice(1))) {
      setLoading(false);
      return;
    } else {
      resetGraphSvg();
      router.push(newUrl);
    }
  };

  const onRefreshAnalysis = () => {
    if (!result) {
      return;
    }
    setLoading(true);
    setBranchError("");
    onRefresh();
  };

  const isDisabled = () => {return loading || loadingBranches || !result};

  return (
    <form
      onSubmit={handleSubmit}
      className={cn(
        isDiagramExpanded
          ? "hidden"
          : "w-full flex flex-col items-center justify-center"
      )}
      aria-label="GitHub repository analysis form"
    >
      <div className="flex flex-col items-center justify-center px-4 pt-4 w-full">
        <Card className="relative max-h-[200px] bg-background sm:max-w-[700px] w-full border-2 border-accent mx-auto mt-4 flex justify-center p-4 gap-4 sm:flex-row flex-col">
          <HeaderToggle
            from="github"
            setIsFileHeaderOpen={setFileHeaderOpen}
          />
          <HeaderOptions data={result} addButtonRef={addButtonRef} />
          <Input
            className="sm:w-[60%] h-13 border-1"
            placeholder="https://github.com/username/repo"
            value={inputUrl}
            onChange={handleInputChange}
            aria-label="GitHub repository URL"
          />
        <div className="sm:w-[35%] sm:max-w-[35%] h-13">
          <Dropdown
            className="shadow-none border-input border-1 h-full text-sm px-3 overflow-x-auto"
          />
        </div>
          <ButtonGroup className="sm:flex-row" role="group" aria-label="Repository actions">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  className="flex-1 sm:h-13 sm:w-15 bg-muted-foreground disabled:bg-muted-foreground disabled:opacity-80 hover:bg-input text-sm cursor-pointer disabled:cursor-not-allowed"
                  type="submit"
                  disabled={isDisabled()}
                  aria-label="Analyse GitHub repository"
                >
                  {loading ? (
                    <LucideLoader2 className="animate-spin" strokeWidth={3} />
                  ) : (
                    <span className="flex flex-row items-center justify-center gap-x-2">
                      <span className="sm:hidden">Analyse</span>
                      <LucideArrowBigRight strokeWidth={3} aria-hidden="true" />
                    </span>
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Analyse</p>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  className="flex-1 sm:h-13 sm:w-15 bg-muted-foreground disabled:bg-muted-foreground disabled:opacity-80 hover:bg-input text-sm cursor-pointer disabled:cursor-not-allowed"
                  type="button"
                  onClick={onRefreshAnalysis}
                  disabled={isDisabled()}
                  aria-label="Refresh repository analysis"
                >
                  {loading ? (
                    <LucideLoader2 className="animate-spin" strokeWidth={3} />
                  ) : (
                    <span className="flex flex-row items-center justify-center gap-x-2">
                      <span className="sm:hidden">Re-analyse</span>
                      <RefreshCcwDot strokeWidth={3} aria-hidden="true" />
                    </span>
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Re-analyse</p>
              </TooltipContent>
            </Tooltip>
          </ButtonGroup>
        </Card>
      </div>
    </form>
  );
};

export default TopHeaderGithub;
