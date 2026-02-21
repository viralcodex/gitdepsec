"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Input } from "./ui/input";
import { Dropdown } from "./ui/dropdown";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { useRepoState, useErrorState, useFileState } from "@/store/app-store";
import { store } from "@/store/app-store";
import { useRepoData } from "@/hooks/useRepoData";
import useFileUpload from "@/hooks/useFileUpload";
import { AlertTriangle, Search, RotateCcw } from "lucide-react";
import { cn, getRepoKeyFromUrl } from "@/lib/utils";

const MainContent = () => {
  const { branches, selectedBranch, loadingBranches, loadedRepoKey } = useRepoState();

  const { branchError, setBranchError } = useErrorState();
  const { inputFile: file, setInputFile: setFile } = useFileUpload();
  const { newFileName, uploaded, setUploaded, resetFileState } = useFileState();
  const [inputUrl, setInputUrl] = useState<string>("");
  const [debouncedUrl, setDebouncedUrl] = useState<string>("");

  const router = useRouter();

  //CUSTOM HOOK
  useRepoData(debouncedUrl);

  const currentRepoKey = useMemo(() => {
    if (!inputUrl) return null;
    return getRepoKeyFromUrl(inputUrl);
  }, [inputUrl]);

  const shouldShowBranches = useMemo(() => {
    return currentRepoKey === loadedRepoKey;
  }, [currentRepoKey, loadedRepoKey]);

  // Debounce the URL input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedUrl(inputUrl);
    }, 250);
    return () => clearTimeout(handler);
  }, [inputUrl]);

  // Clear local state when input is cleared
  useEffect(() => {
    if (!inputUrl) {
      setBranchError(null);
    }
  }, [inputUrl, setBranchError]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    //empty form
    if (!debouncedUrl && !file) {
      setBranchError("Please enter a GitHub URL or upload a manifest file.");
      return;
    }

    //file upload
    if (file) {
      if (!uploaded) {
        toast.error("Please wait for the file to be uploaded.");
        return;
      }
      router.push(`/file_upload/${encodeURIComponent(newFileName)}`);
      setUploaded(true);
      return;
    }

    //url audit
    if (debouncedUrl && !file && loadedRepoKey) {
      const branchParam = selectedBranch ? `?branch=${encodeURIComponent(selectedBranch)}` : "";
      router.push(`/${loadedRepoKey}${branchParam}`);
    }
  };

  const isDisabled = () => {
    return (
      loadingBranches ||
      (!inputUrl && !file) ||
      (file !== null && !uploaded) ||
      ((!branches || !branches.length) && !file)
    );
  };

  return (
    <Card className="w-full max-w-3xl border-[3px] border-black bg-gray-300/55 p-6 sm:p-8 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] backdrop-blur-[2px]">
      <form onSubmit={handleSubmit} className="space-y-4">
        <section className="flex flex-col space-y-3 sm:flex-row sm:gap-4 gap-3 w-full">
          <div className="flex w-full flex-col flex-1">
            <Input
              onChange={(e) => setInputUrl(e.target.value)}
              value={inputUrl}
              className={cn(
                "flex-1 w-full rounded-md border-[3px] px-3 py-2.5 sm:px-4 sm:py-4 text-sm font-bold placeholder:text-base placeholder:font-normal sm:text-lg sm:placeholder:text-lg bg-popover transition-shadow",
                branchError ? "border-red-600" : "border-black",
              )}
              placeholder="https://github.com/username/repo"
              disabled={file !== null}
              aria-invalid={!!branchError}
              aria-describedby={branchError ? "url-error" : undefined}
            />
            {branchError && (
              <p
                id="url-error"
                className="font-ui-strong flex items-center gap-1.5 text-red-600 text-xs px-2 py-1.5 mt-1 rounded-md bg-red-50/80"
              >
                <AlertTriangle className="h-4 w-4 shrink-0" />
                {branchError}
              </p>
            )}
          </div>
          <div className="flex-1">
            <Dropdown shouldShowBranches={shouldShowBranches} className="" />
          </div>
        </section>

        <section className="flex w-full flex-col items-center justify-center gap-y-3">
          <div className="flex items-center w-full gap-x-3">
            <div className="grow h-px bg-black/20" />
            <span className="font-ui-heading font-bold text-muted-foreground text-md sm:text-lg">or</span>
            <div className="grow h-px bg-black/20" />
          </div>
          <div className="flex grow w-full flex-col items-start justify-center">
            <label
              htmlFor="manifest-file-input"
              className="font-ui-heading block text-md font-bold text-primary-foreground mb-2"
            >
              <p className="text-md sm:text-lg">
                Upload a manifest file (max 5MB) <i className="text-muted-foreground">(.json, .yaml, .xml, .txt)</i>
              </p>
            </label>
            <Input
              id="manifest-file-input"
              className="font-ui-mono flex-1 rounded-md border-[3px] border-black px-3 text-base font-semibold placeholder:text-base placeholder:font-normal sm:px-4 sm:py-4 cursor-pointer bg-popover file:mr-3 file:rounded file:border-0 file:bg-black file:px-3 file:py-1 file:text-white file:font-semibold file:text-sm"
              type="file"
              onChange={(e) => {
                setFile(e.target.files?.[0] || null);
                setBranchError(null);
              }}
              disabled={inputUrl !== ""}
            />
          </div>
        </section>
        <div
          className="flex w-full items-center justify-center gap-x-4 pt-2"
          role="group"
          aria-label="Form actions"
        >
          <Button
            className="font-ui-heading sm:p-6 px-5 py-2.5 cursor-pointer bg-white text-black border-[3px] border-black text-base font-semibold transition-all hover:bg-gray-100 sm:text-lg disabled:cursor-not-allowed disabled:opacity-50 enabled:active:shadow-none"
            type="submit"
            disabled={isDisabled()}
            aria-label="Audit repository dependencies"
          >
            <Search className="w-4 h-4 sm:w-5 sm:h-5 mr-1.5" />
            Audit
          </Button>
          <Button
            className="font-ui-heading sm:p-6 px-5 py-2.5 cursor-pointer bg-black text-white border-[3px] border-black text-base font-semibold transition-all hover:bg-accent-foreground sm:text-lg active:shadow-none"
            type="reset"
            onClick={() => {
              store.getState().clearForm();
              resetFileState();
              setInputUrl("");
              setBranchError("");
            }}
          >
            <RotateCcw className="w-4 h-4 sm:w-5 sm:h-5 mr-1.5" />
            Clear
          </Button>
        </div>
      </form>
    </Card>
  );
};

export default MainContent;
