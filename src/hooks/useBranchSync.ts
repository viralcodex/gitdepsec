import { useEffect, useRef } from "react";
import { useRepoState } from "@/store/app-store";

interface UseBranchSyncProps {
  branchParam: string;
}

/**
 * Synchronizes the selected branch in the store with the URL parameter.
 * - If URL has a valid branch param, selects it
 * - If no branch param, auto-selects the first available branch (once)
 */
export const useBranchSync = ({ branchParam }: UseBranchSyncProps) => {
  const { branches, setSelectedBranch } = useRepoState();
  const hasInitialized = useRef(false);

  useEffect(() => {
    if (branches.length === 0) return;

    // Case 1: URL has a branch parameter - sync to it if valid
    if (branchParam && branches.includes(branchParam)) {
      setSelectedBranch(branchParam);
      hasInitialized.current = true;
      return;
    }

    // Case 2: No URL param AND first time - auto-select first branch
    if (!branchParam && !hasInitialized.current) {
      setSelectedBranch(branches[0]);
      hasInitialized.current = true;
      return;
    }
  }, [branchParam, branches, setSelectedBranch]);
};

export default useBranchSync;
