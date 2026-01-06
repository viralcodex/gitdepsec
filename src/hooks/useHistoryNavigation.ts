import { useRouter } from "next/navigation";
import { HistoryItem } from "@/constants/model";
import { useRepoState } from "@/store/app-store";
import { useCallback } from "react";

export const useHistoryNavigation = () => {
  const router = useRouter();
  const { loadedRepoKey, setLoadedRepoKey } = useRepoState();

  const navigateToHistory = useCallback(
    (hist: HistoryItem) => {
      // const githubUrl = `https://github.com/${hist.username}/${hist.repo}`;
      const newRepoKey = `${hist.username}/${hist.repo}`;

      // Only reset loadedRepoKey if navigating to a different repo
      if (loadedRepoKey !== newRepoKey) {
        setLoadedRepoKey(null);
      }
      // setCurrentUrl(githubUrl);
      router.push(`/${hist.username}/${hist.repo}?branch=${hist.branch}`);
    },
    [router, loadedRepoKey, setLoadedRepoKey]
  );

  return { navigateToHistory };
};
