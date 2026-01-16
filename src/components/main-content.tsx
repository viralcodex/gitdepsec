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
import { AlertTriangle } from "lucide-react";
import { cn, getRepoKeyFromUrl } from "@/lib/utils";

const MainContent = () => {
  const { branches, selectedBranch, loadingBranches, loadedRepoKey } =
    useRepoState();

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

    //url analysis
    if (debouncedUrl && !file && loadedRepoKey) {
      const branchParam = selectedBranch
        ? `?branch=${encodeURIComponent(selectedBranch)}`
        : "";
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
    <Card className="w-full max-w-3xl border-[3px] border-black bg-gray-300/55 p-6 sm:p-8 shadow-[0px_0px_10px_0px_#AAAAAA] backdrop-blur-[1px]">
      <form onSubmit={handleSubmit} className="space-y-3">
        <section className="flex flex-col space-y-3 sm:flex-row sm:gap-4 gap-3 w-full">
          <div className="flex w-full flex-col flex-1">
            <Input
              onChange={(e) => setInputUrl(e.target.value)}
              value={inputUrl}
              className={cn(
                `flex-1 w-full rounded-md border-[3px] px-3 py-2.5 sm:px-4 sm:py-4 text-sm font-bold placeholder:text-base placeholder:font-normal sm:text-lg sm:placeholder:text-lg ${
                  branchError ? "border-red-600" : "border-black"
                }`,
              )}
              placeholder="https://github.com/username/repo"
              disabled={file !== null}
              aria-invalid={!!branchError}
              aria-describedby={branchError ? "url-error" : undefined}
            />
            {branchError && (
              <p
                id="url-error"
                className="text-red-600 text-xs max-w-x px-2 py-1 mt-0.5 font-semibold rounded-md backdrop-blur-lg"
              >
                <AlertTriangle className="inline-block mr-1 h-6 w-6" />
                {branchError}
              </p>
            )}
          </div>
          <div className="flex-1">
            <Dropdown shouldShowBranches={shouldShowBranches} className="" />
          </div>
        </section>
        <section className="flex w-full flex-col items-center justify-center gap-y-2">
          <div className="flex items-center w-full gap-x-2">
            <div className="flex-grow h-px bg-white" />
            <span className="font-bold text-muted-foreground text-sm sm:text-base">
              or
            </span>
            <div className="flex-grow h-px bg-white" />
          </div>
          <div className="flex flex-grow w-full flex-col items-start justify-center my-2">
            <label
              htmlFor="manifest-file-input"
              className="block text-md font-bold text-primary-foreground mb-2"
            >
              <p className="text-sm sm:text-md">
                Upload a manifest file (max 5MB){" "}
                <i>(.json, .yaml, .xml, .txt)</i>{" "}
              </p>
            </label>
            <Input
              id="manifest-file-input"
              className="flex-1 rounded-md border-[3px] border-black px-3 text-base font-bold placeholder:text-base placeholder:font-normal sm:px-4 sm:py-4 cursor-pointer"
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
          className="flex w-full items-center justify-center gap-x-4 p-0"
          role="group"
          aria-label="Form actions"
        >
          <Button
            className="sm:p-6 px-4 py-2 cursor-pointer bg-accent text-black border-[3px] border-black text-base transition-transform hover:text-accent-foreground hover:bg-primary-foreground sm:text-lg disabled:cursor-not-allowed"
            type="submit"
            disabled={isDisabled()}
            aria-label="Analyse repository dependencies"
          >
            Analyse
          </Button>
          <Button
            className="sm:p-6 px-4 py-2 cursor-pointer bg-accent-foreground text-accent border-[3px] border-black text-base transition-transform hover:text-accent-foreground hover:bg-primary-foreground sm:text-lg"
            type="reset"
            onClick={() => {
              store.getState().clearForm();
              resetFileState();
              setInputUrl("");
              setBranchError("");
            }}
          >
            Clear
          </Button>
        </div>
      </form>
    </Card>
  );
};

export default MainContent;
