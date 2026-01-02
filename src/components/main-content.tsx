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
import { getRepoKeyFromUrl } from "@/lib/utils";

const MainContent = () => {
  const {
    branches,
    selectedBranch,
    loadingBranches,
    loadedRepoKey
  } = useRepoState();

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
    <Card className="w-full max-w-3xl border-[3px] border-black bg-gray-300/60 p-4 sm:p-8 shadow-[0px_0px_10px_0px_#FFFFFF] backdrop-blur-[1px]">
      <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
        <div className="flex flex-row gap-3 sm:flex-row sm:gap-4">
          <div className="flex-1 flex flex-col">
            <Input
              onChange={(e) => setInputUrl(e.target.value)}
              value={inputUrl}
              className={`flex-1 rounded-md border-[3px] px-3 py-2 text-base font-bold placeholder:text-base placeholder:font-normal sm:px-4 sm:py-4 sm:text-lg sm:placeholder:text-lg ${
                branchError ? "border-red-600" : "border-black"
              }`}
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
        </div>
        <div className="flex w-full flex-col items-center justify-center gap-y-2">
          <Dropdown shouldShowBranches={shouldShowBranches} />
          <div className="flex items-center w-full gap-x-2 mt-2">
            <div className="flex-grow h-px bg-white" />
            <span className="font-bold text-muted-foreground text-sm sm:text-base">
              or
            </span>
            <div className="flex-grow h-px bg-white" aria-hidden="true" />
          </div>
          <div className="flex flex-grow w-full flex-col items-start justify-center my-2">
            <label htmlFor="manifest-file-input" className="block text-md font-bold text-primary-foreground mb-2">
              Upload a manifest file{" "}
              <span className="italic font-semibold">
                (.json, .yaml, .xml, .txt)
              </span>{" "}
              - Max 5MB
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
          <div className="flex w-full items-center justify-center gap-x-4" role="group" aria-label="Form actions">
            <Button
              className="cursor-pointer bg-accent text-black border-[3px] border-black p-4 px-4 text-base transition-transform hover:text-accent-foreground hover:bg-primary-foreground sm:p-6 sm:px-6 sm:text-lg disabled:cursor-not-allowed"
              type="submit"
              disabled={isDisabled()}
              aria-label="Analyse repository dependencies"
            >
              Analyse
            </Button>
            <Button
              className="cursor-pointer bg-accent-foreground text-accent border-[3px] border-black p-4 px-4 text-base transition-transform hover:text-accent-foreground hover:bg-primary-foreground sm:p-6 sm:px-6 sm:text-lg"
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
        </div>
      </form>
    </Card>
  );
};

export default MainContent;
