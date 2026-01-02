"use client";

import { useEffect, useCallback } from "react";
import { getRepoBranches } from "@/lib/api";
import { verifyUrl, getRepoKeyFromUrl } from "@/lib/utils";
import { useErrorState, useRepoState, store } from "@/store/app-store";
import { HistoryItem } from "@/constants/model";
import { defaultBranchNames } from "@/constants/constants";

export const useRepoData = (url: string | null) => {
  const pageSize = 100;
  const {
    page,
    loadedRepoKey,
    setBranches,
    setSelectedBranch,
    setLoadingBranches,
    setHasMore,
    setTotalBranches,
    setLoadedRepoKey,
    resetRepoState,
  } = useRepoState();

  const { setBranchError } = useErrorState();

  const updateCacheBranches = useCallback(
    (cachedItem: HistoryItem | undefined, branchList: string[]) => {
      if (!cachedItem) return;

      const historyItems = store.getState().savedHistoryItems;

      const dateKey = Object.keys(historyItems).find((dateKey) =>
        historyItems[dateKey].some(
          (item) =>
            item.username === cachedItem.username &&
            item.repo === cachedItem.repo
        )
      );

      if (dateKey) {
        const itemIndex = historyItems[dateKey].findIndex(
          (item) =>
            item.username === cachedItem.username &&
            item.repo === cachedItem.repo
        );

        if (itemIndex !== -1) {
          store.setState((prev) => ({
            savedHistoryItems: {
              ...prev.savedHistoryItems,
              [dateKey]: prev.savedHistoryItems[dateKey].map((item, idx) =>
                idx === itemIndex ? { ...item, branches: branchList } : item
              ),
            },
          }));
        }
      }
    },
    []
  );

  const fetchBranches = useCallback(
    async (graphRepoKey: string) => {
      if (!url) return;

      const result = verifyUrl(url, setBranchError);
      if (!result) {
        setLoadingBranches(false);
        return;
      }
      const { sanitizedUsername, sanitizedRepo } = result;

      const historyItems = store.getState().savedHistoryItems;

      /**
       * Always find the cached item so we can update it later
       * Match by repo only (not branch) since branches list is same for all branches
       * Prioritize finding an item with a default branch name for better UX
       */
      const matchingItems = Object.values(historyItems)
        .flat()
        .filter((item) => {
          const itemRepoKey = `${item.username}/${item.repo}`;
          return itemRepoKey === `${sanitizedUsername}/${sanitizedRepo}`;
        });

      // Try to find one with a common default branch name first
      const cachedItem =
        matchingItems.find((item) =>
          defaultBranchNames.includes(item.branch.toLowerCase())
        ) || matchingItems[0]; // Fall back to first match if no default found

      // Only use cache for page 1 - pagination should always fetch from API
      if (
        page === 1 &&
        cachedItem &&
        cachedItem.branches &&
        cachedItem.branches.length > 0
      ) {
        setBranches(cachedItem.branches);
        setSelectedBranch(cachedItem.branch || null);
        setLoadedRepoKey(graphRepoKey);
        setLoadingBranches(false);
        setBranchError("");
        const hasFullPage = cachedItem.branches.length >= pageSize;
        setHasMore(hasFullPage);
        setTotalBranches(cachedItem.branches.length);
        return;
      }

      // If not in cache (or page > 1), fetch from API
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
        return;
      }

      // For first page, replace branches. For subsequent pages, append them
      let branchList = [];
      if (page === 1) {
        if (
          branchesResponse.defaultBranch &&
          !branchesResponse.branches?.includes(branchesResponse.defaultBranch)
        ) {
          branchList = [
            branchesResponse.defaultBranch,
            ...(branchesResponse.branches || []),
          ];
        } else {
          branchList = branchesResponse.branches || [];
        }
        setSelectedBranch(branchesResponse.defaultBranch ?? null);
        setLoadedRepoKey(graphRepoKey);
      } else {
        const currentBranches = store.getState().branches;
        const newBranchesToAdd = branchesResponse.branches || [];
        const uniqueBranches = Array.from(
          new Set([...currentBranches, ...newBranchesToAdd])
        );
        branchList = uniqueBranches;
      }
      setBranches(branchList);
      setHasMore(branchesResponse.hasMore!);
      setTotalBranches(branchesResponse.total || 0);
      setBranchError("");
      updateCacheBranches(cachedItem, branchList);
      setLoadingBranches(false);
    },
    [
      url,
      setBranchError,
      setLoadingBranches,
      page,
      setBranches,
      setSelectedBranch,
      setLoadedRepoKey,
      setHasMore,
      setTotalBranches,
      resetRepoState,
      updateCacheBranches,
    ]
  );

  useEffect(() => {
    if (!url) {
      // resetRepoState();
      return;
    }

    const repoKey = getRepoKeyFromUrl(url);
    if (!repoKey) {
      verifyUrl(url, setBranchError);
      return;
    }

    // if (url !== currentUrl) {
    //   // only set currentUrl if it has changed
    //   setCurrentUrl(url);
    // }

    let debounceTimeout: NodeJS.Timeout;
    // Case 1: Different repo - always fetch branches (from cache or API)
    if (loadedRepoKey !== repoKey) {
      debounceTimeout = setTimeout(() => fetchBranches(repoKey), 400);
    }
    // Case 2: Same repo - only fetch if loading next page
    if (loadedRepoKey === repoKey && page > 1) {
      fetchBranches(repoKey);
    }
    return () => clearTimeout(debounceTimeout);
  }, [url, page, loadedRepoKey, fetchBranches, resetRepoState, setBranchError]);
};
