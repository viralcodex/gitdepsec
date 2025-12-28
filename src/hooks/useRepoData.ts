"use client";

import { useEffect, useCallback } from "react";
import { getRepoBranches } from "@/lib/api";
import { verifyUrl, getRepoKeyFromUrl } from "@/lib/utils";
import { useErrorState, useRepoState, store } from "@/store/app-store";
export const useRepoData = (url: string | null) => {
  const pageSize = 100;
  const {
    page,
    currentUrl,
    loadedRepoKey,
    setBranches,
    setSelectedBranch,
    setLoadingBranches,
    setHasMore,
    setTotalBranches,
    setCurrentUrl,
    setLoadedRepoKey,
    resetRepoState,
  } = useRepoState();

  const { setBranchError } = useErrorState();

  const fetchBranches = useCallback(
    async (repoKey: string) => {
      if (!url) return;

      const result = verifyUrl(url, setBranchError);
      if (!result) {
        setLoadingBranches(false);
        return;
      }

      const { sanitizedUsername, sanitizedRepo } = result;

      setLoadingBranches(true);

      const branchesResponse = await getRepoBranches(
        sanitizedUsername,
        sanitizedRepo,
        page,
        pageSize
      );

      if (branchesResponse.error) {
        setBranchError(branchesResponse.error);
        resetRepoState();
      } else {
        // For first page, replace branches. For subsequent pages, append them
        if (page === 1) {
          if (
            branchesResponse.defaultBranch &&
            !branchesResponse.branches?.includes(branchesResponse.defaultBranch)
          ) {
            setBranches([
              branchesResponse.defaultBranch,
              ...(branchesResponse.branches || []),
            ]);
          } else {
            setBranches(branchesResponse.branches || []);
          }
          setSelectedBranch(branchesResponse.defaultBranch ?? null);
          setLoadedRepoKey(repoKey);
        } else {
          // Get current branches from store to avoid stale closure
          const currentBranches = store.getState().branches;
          const newBranchesToAdd = branchesResponse.branches || [];
          const uniqueBranches = Array.from(
            new Set([...currentBranches, ...newBranchesToAdd])
          );
          setBranches(uniqueBranches);
        }
        setHasMore(branchesResponse.hasMore!);
        setTotalBranches(branchesResponse.total || 0);
        setBranchError("");
      }
      setLoadingBranches(false);
    },
    [
      url,
      page,
      setBranchError,
      setLoadingBranches,
      resetRepoState,
      setHasMore,
      setTotalBranches,
      setSelectedBranch,
      setLoadedRepoKey,
      setBranches,
    ]
  );

  useEffect(() => {
    if (!url) {
      resetRepoState();
      return;
    }

    const repoKey = getRepoKeyFromUrl(url);
    if (!repoKey) {
      // Invalid URL - verify it to set the error message
      verifyUrl(url, setBranchError);
      return;
    }

    if (url !== currentUrl) {
      setCurrentUrl(url);
    }

    // Case 1: New repo (not cached) - fetch branches with debounce
    if (loadedRepoKey !== repoKey && page === 1) {
      if (currentUrl && currentUrl !== url) {
        // Different repo - reset state first
        resetRepoState();
      }
      const debounceTimeout = setTimeout(() => fetchBranches(repoKey), 400);
      return () => clearTimeout(debounceTimeout);
    }
    // Case 2: Same repo (cached) - only fetch if loading next page
    if (loadedRepoKey === repoKey && page > 1) {
      fetchBranches(repoKey);
    }
  }, [url, page, currentUrl, loadedRepoKey, fetchBranches, resetRepoState, setCurrentUrl, setBranchError]);
};
