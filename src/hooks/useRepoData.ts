"use client";

import { useEffect, useCallback, useRef } from "react";
import { getRepoBranches } from "@/lib/api";
import { verifyUrl, getRepoKeyFromUrl } from "@/lib/utils";
import { useErrorState, useRepoState, store } from "@/store/app-store";
import { HistoryItem } from "@/constants/model";
import { DEFAULT_BRANCH_NAMES } from "@/constants/constants";

const PAGE_SIZE = 100;

export const useRepoData = (url: string | null) => {
  const { page, setLoadingBranches, resetRepoState, upsertRepoBranchCache } = useRepoState();
  const { setBranchError } = useErrorState();
  const latestRequestIdRef = useRef(0);

  const ensureDefaultBranchFirst = (branches: string[], defaultBranch: string | null) => {
    if (!defaultBranch) return branches;
    if (!branches.includes(defaultBranch)) return branches;

    return [defaultBranch, ...branches.filter((branch) => branch !== defaultBranch)];
  };

  const buildBranchList = ({
    currentPage,
    currentBranches,
    fetchedBranches,
    defaultBranch,
  }: {
    currentPage: number;
    currentBranches: string[];
    fetchedBranches: string[];
    defaultBranch?: string | null;
  }) => {
    if (currentPage > 1) {
      return Array.from(new Set([...currentBranches, ...fetchedBranches]));
    }

    if (defaultBranch && !fetchedBranches.includes(defaultBranch)) {
      return [defaultBranch, ...fetchedBranches];
    }

    return fetchedBranches;
  };

  const findCachedHistoryItem = (repoKey: string) => {
    const historyItems = store.getState().savedHistoryItems;
    const matchingItems = Object.values(historyItems)
      .flat()
      .filter((item) => `${item.username}/${item.repo}` === repoKey);

    return (
      matchingItems.find((item) => DEFAULT_BRANCH_NAMES.includes(item.branch.toLowerCase())) ||
      matchingItems[0]
    );
  };

  const syncBranchState = useCallback(
    ({
      repoKey,
      branches,
      selectedBranch,
      defaultBranch,
      hasMore,
      totalBranches,
      currentPage,
    }: {
      repoKey: string;
      branches: string[];
      selectedBranch: string | null;
      defaultBranch: string | null;
      hasMore: boolean;
      totalBranches: number;
      currentPage: number;
    }) => {
      const orderedBranches = ensureDefaultBranchFirst(branches, defaultBranch);

      store.setState({
        branches: orderedBranches,
        selectedBranch,
        defaultBranch,
        loadedRepoKey: repoKey,
        loadingBranches: false,
        branchError: "",
        hasMore,
        totalBranches,
        page: currentPage,
      });

      upsertRepoBranchCache(repoKey, {
        branches: orderedBranches,
        selectedBranch,
        defaultBranch,
        hasMore,
        totalBranches,
        page: currentPage,
      });
    },
    [upsertRepoBranchCache],
  );

  const hydrateFromCache = useCallback(
    (
      repoKey: string,
      branches: string[],
      selectedBranch: string | null | undefined,
      defaultBranch: string | null | undefined,
      hasMore: boolean,
    ) => {
      const normalizedDefaultBranch =
        defaultBranch ??
        branches.find((branch) => DEFAULT_BRANCH_NAMES.includes(branch.toLowerCase())) ??
        null;

      syncBranchState({
        repoKey,
        branches,
        selectedBranch: selectedBranch ?? normalizedDefaultBranch,
        defaultBranch: normalizedDefaultBranch,
        hasMore,
        totalBranches: branches.length,
        currentPage: 1,
      });
    },
    [syncBranchState],
  );

  const updateCacheBranches = useCallback(
    (cachedItem: HistoryItem | undefined, branchList: string[]) => {
      if (!cachedItem) return;

      const historyItems = store.getState().savedHistoryItems;
      const dateKey = Object.keys(historyItems).find((key) =>
        historyItems[key].some(
          (item) => item.username === cachedItem.username && item.repo === cachedItem.repo,
        ),
      );

      if (!dateKey) return;

      const itemIndex = historyItems[dateKey].findIndex(
        (item) => item.username === cachedItem.username && item.repo === cachedItem.repo,
      );

      if (itemIndex === -1) return;

      store.setState((prev) => ({
        savedHistoryItems: {
          ...prev.savedHistoryItems,
          [dateKey]: prev.savedHistoryItems[dateKey].map((item, idx) =>
            idx === itemIndex ? { ...item, branches: branchList } : item,
          ),
        },
      }));
    },
    [],
  );

  const fetchBranches = useCallback(
    async (repoKey: string, forcePage?: number) => {
      if (!url) return;
      const requestId = ++latestRequestIdRef.current;
      const isStaleRequest = () => requestId !== latestRequestIdRef.current;

      const context = verifyUrl(url, setBranchError);
      if (!context) {
        if (!isStaleRequest()) {
          setLoadingBranches(false);
        }
        return;
      }

      const { sanitizedUsername, sanitizedRepo } = context;
      const currentPage = forcePage ?? store.getState().repoBranchCache[repoKey]?.page ?? 1;
      const isFirstPage = currentPage === 1;
      const repoCacheEntry = store.getState().repoBranchCache[repoKey];
      const cachedHistoryItem = findCachedHistoryItem(repoKey);

      const hydrateCachedBranches = () => {
        if (!isFirstPage) return false;

        if (repoCacheEntry?.branches?.length) {
          if (isStaleRequest()) return true;
          hydrateFromCache(
            repoKey,
            repoCacheEntry.branches,
            repoCacheEntry.selectedBranch,
            repoCacheEntry.defaultBranch,
            repoCacheEntry.hasMore,
          );
          return true;
        }

        if (cachedHistoryItem?.branches?.length) {
          if (isStaleRequest()) return true;
          hydrateFromCache(
            repoKey,
            cachedHistoryItem.branches,
            cachedHistoryItem.branch,
            null,
            cachedHistoryItem.branches.length >= PAGE_SIZE,
          );
          return true;
        }

        return false;
      };

      if (hydrateCachedBranches()) {
        return;
      }

      if (!isStaleRequest()) {
        setLoadingBranches(true);
      }

      let branchesResponse;
      try {
        branchesResponse = await getRepoBranches(
          sanitizedUsername,
          sanitizedRepo,
          currentPage,
          PAGE_SIZE,
        );
      } catch {
        if (!isStaleRequest()) {
          setBranchError("Failed to fetch branches. Please try again.");
          setLoadingBranches(false);
        }
        return;
      }

      if (isStaleRequest()) return;

      if (branchesResponse.error) {
        setBranchError(branchesResponse.error);
        resetRepoState();
        return;
      }

      const fetchedBranches = branchesResponse.branches || [];
      const currentState = store.getState();
      const branchList = buildBranchList({
        currentPage,
        currentBranches: currentState.branches,
        fetchedBranches,
        defaultBranch: branchesResponse.defaultBranch,
      });

      syncBranchState({
        repoKey,
        branches: branchList,
        selectedBranch:
          isFirstPage ? (branchesResponse.defaultBranch ?? null) : currentState.selectedBranch,
        defaultBranch:
          isFirstPage ? (branchesResponse.defaultBranch ?? null) : currentState.defaultBranch,
        hasMore: branchesResponse.hasMore || false,
        totalBranches: branchesResponse.total || 0,
        currentPage,
      });

      updateCacheBranches(cachedHistoryItem, branchList);
    },
    [
      url,
      setBranchError,
      setLoadingBranches,
      resetRepoState,
      hydrateFromCache,
      syncBranchState,
      updateCacheBranches,
    ],
  );

  useEffect(() => {
    if (!url) return;

    const repoKey = getRepoKeyFromUrl(url);
    if (!repoKey) {
      verifyUrl(url, setBranchError);
      return;
    }

    const cachedPage = store.getState().repoBranchCache[repoKey]?.page || 1;
    if (cachedPage > 1) {
      fetchBranches(repoKey, cachedPage);
      return;
    }

    const debounceTimeout = setTimeout(() => fetchBranches(repoKey, 1), 400);
    return () => clearTimeout(debounceTimeout);
  }, [url, page, fetchBranches, setBranchError]);
};
