import { useRouter } from "next/navigation";
import { HistoryItem } from "@/constants/model";
import { useCallback } from "react";

export const useHistoryNavigation = () => {
  const router = useRouter();

  const navigateToHistory = useCallback(
    (hist: HistoryItem) => {
      router.push(`/${hist.username}/${hist.repo}?branch=${hist.branch}`);
    },
    [router],
  );

  return { navigateToHistory };
};
