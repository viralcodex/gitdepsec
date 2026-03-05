import { useEffect, useRef } from "react";
import { useRepoState } from "@/store/app-store";

interface UseBranchSyncProps {
  branchParam: string | null;
  repoKey?: string;
}

export const useBranchSync = ({ branchParam, repoKey }: UseBranchSyncProps) => {
  const { branches, selectedBranch, setSelectedBranch, repoBranchCache } = useRepoState();
  const hasInitializedRef = useRef(false);
  const lastUrlBranchRef = useRef<string | null>(null);

  const syncBranchIfNeeded = (nextBranch: string | null) => {
    if (!nextBranch || !branches.includes(nextBranch) || selectedBranch === nextBranch) {
      return;
    }
    setSelectedBranch(nextBranch);
  };

  useEffect(() => {
    hasInitializedRef.current = false;
    lastUrlBranchRef.current = null;
  }, [repoKey]);

  useEffect(() => {
    if (branches.length === 0) return;

    if (branchParam && branches.includes(branchParam)) {
      const shouldSyncFromUrl =
        !hasInitializedRef.current || lastUrlBranchRef.current !== branchParam;

      if (shouldSyncFromUrl) {
        syncBranchIfNeeded(branchParam);
      }

      hasInitializedRef.current = true;
      lastUrlBranchRef.current = branchParam;
      return;
    }

    if (selectedBranch && branches.includes(selectedBranch)) {
      hasInitializedRef.current = true;
      return;
    }

    if (!hasInitializedRef.current && repoKey) {
      const cachedEntry = repoBranchCache[repoKey];
      const cachedBranch = cachedEntry?.selectedBranch || cachedEntry?.defaultBranch;

      if (cachedBranch && branches.includes(cachedBranch)) {
        syncBranchIfNeeded(cachedBranch);
        hasInitializedRef.current = true;
        return;
      }
    }

    if (!hasInitializedRef.current && branches[0]) {
      syncBranchIfNeeded(branches[0]);
      hasInitializedRef.current = true;
      return;
    }
  }, [branchParam, branches, selectedBranch, setSelectedBranch, repoBranchCache, repoKey]);
};

export default useBranchSync;
