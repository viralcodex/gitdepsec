"use client";
import { useGraph } from "@/hooks/useGraph";
import { useRepoData } from "@/hooks/useRepoData";
import { useParams, useSearchParams } from "next/navigation";
import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import TopHeaderGithub from "../../../components/top-headers/top-header-github";
import { GraphNode } from "@/constants/model";
import TopHeaderFile from "@/components/top-headers/top-header-file";
import { downloadFixPlanPDF } from "@/lib/utils";
import toast from "react-hot-toast";
import { useIsMobile } from "@/hooks/useMobile";
import {
  useErrorState,
  useGraphState,
  useUIState,
  useDiagramState,
  useFileState,
  useAppActions,
} from "@/store/app-store";
import useFixPlanGeneration from "@/hooks/useFixPlanGeneration";
import useFileUpload from "@/hooks/useFileUpload";
import useWindowSize from "@/hooks/useWindowSize";
import useUrlInput from "@/hooks/useUrlInput";
import useBranchSync from "@/hooks/useBranchSync";
import HeaderControls from "@/components/header-controls";
import dynamic from "next/dynamic";
import DiagramProgress from "@/components/diagram-progress";

//LAZY LOADING COMPONENTS
const HistorySidebar = dynamic(() => import("@/components/history-items/history-sidebar"));
const DepDiagram = dynamic(() => import("@/components/dependency-diagram"), {
  ssr: false,
  loading: () => <DiagramProgress />,
});
const DependencyDetailsCard = dynamic(
  () => import("@/components/dependency-sidebar/dependency-sidebar"),
  { ssr: true }
);
const FixPlanCard = dynamic(
  () => import("@/components/fix-plan/fix-plan-card"),
  { ssr: true }
);

const Page = () => {
  const params = useParams<{ username: string; repo: string }>();
  const username = params.username;
  const repo = params.repo;
  const branch = useSearchParams().get("branch") || "";
  const file = username?.includes("file_") ? decodeURIComponent(repo) : "";

  const [forceRefresh, setForceRefresh] = useState<boolean>(false);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const fixPlanRef = useRef<HTMLDivElement>(null);
  const addButtonRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

  // Store selectors
  const { setFileUploadState } = useFileState();
  const { resetNavigationState } = useAppActions();
  const { error } = useErrorState();
  const { graphData, resetGraphState } = useGraphState();
  const {
    fileHeaderOpen,
    isFixPlanDialogOpen,
    setFileHeaderOpen,
    setFixPlanDialogOpen,
  } = useUIState();
  const { selectedNode, setSelectedNode, resetDiagramState } =
    useDiagramState();

  // Custom hooks
  const { generateFixPlan } = useFixPlanGeneration({ username, repo, branch });
  const { inputFile, setInputFile } = useFileUpload();
  const { windowSize } = useWindowSize();
  const { inputUrl, handleInputChange } = useUrlInput({
    username,
    repo,
    branch,
  });
  useBranchSync({ branchParam: branch });
  useGraph(username, repo, branch, file, forceRefresh);
  useRepoData(inputUrl);
  const [selectedEcosystem, setSelectedEcosystem] = useState<
    string | undefined
  >(graphData ? Object.keys(graphData)[0] : undefined);

  useEffect(() => {
    if (graphData && Object.keys(graphData).length > 0) {
      setSelectedEcosystem((prev) =>
        prev && graphData[prev] ? prev : Object.keys(graphData)[0]
      );
    }
  }, [graphData]);

  const ecosystemOptions = useMemo(() => {
    if (!graphData) return [];
    const keys = Object.keys(graphData);
    return keys.length > 0 ? keys : [];
  }, [graphData]);

  // Handle file header state based on the file prop
  useEffect(() => {
    if (file) {
      setFileHeaderOpen(true);
      setInputFile(null);
      setFileUploadState(file, false);
    } else {
      setFileHeaderOpen(false);
    }
  }, [file, setFileHeaderOpen, setInputFile, setFileUploadState]);

  //Handle navigation event to close everything
  useEffect(() => {
    const handleNavigation = () => {
      resetNavigationState();
    };
    window.addEventListener("popstate", handleNavigation);
    return () => window.removeEventListener("popstate", handleNavigation);
  }, [resetNavigationState]);

  useEffect(() => {
    resetDiagramState();
  }, [username, repo, branch, file, resetDiagramState]);

  const handleNodeClick = useCallback(
    (node: GraphNode | null) => {
      setSelectedNode(node);
    },
    [setSelectedNode]
  );

  const handleDetailsCardClose = () => {
    setSelectedNode(null);
  };

  useEffect(() => {
    toast.dismiss();
    if (error) toast.error(error);
  }, [error]);

  const handleRefresh = useCallback(() => {
    resetGraphState();
    svgRef.current = null;
    setForceRefresh(prev => !prev);
  }, [resetGraphState]);

  const resetGraph = () => {
    resetDiagramState();
    svgRef.current = null;
  };

  return (
    <div className="flex flex-col h-full">
      {isFixPlanDialogOpen && (
        <FixPlanCard
          onClose={() => setFixPlanDialogOpen(false)}
          onDownload={async () => {
            await downloadFixPlanPDF(fixPlanRef);
          }}
          fixPlanRef={fixPlanRef}
          regenerateFixPlan={generateFixPlan}
          ecosystemOptions={ecosystemOptions}
        />
      )}
      <div
        className={
          selectedNode && !isMobile
            ? "w-[65%] flex flex-col items-center justify-center"
            : "flex-1"
        }
      >
        <HistorySidebar addButtonRef={addButtonRef} />
        {fileHeaderOpen ? (
          <TopHeaderFile
            inputFile={inputFile}
            setInputFile={setInputFile}
            resetGraphSvg={resetGraph}
          />
        ) : (
          <TopHeaderGithub
            inputUrl={inputUrl}
            handleInputChange={handleInputChange}
            onRefresh={handleRefresh}
            resetGraphSvg={resetGraph}
            addButtonRef={addButtonRef}
          />
        )}
        <HeaderControls
          ecosystemOptions={ecosystemOptions}
          selectedEcosystem={selectedEcosystem}
          onEcosystemChange={setSelectedEcosystem}
          generateFixPlan={generateFixPlan}
        />
        <DepDiagram
          svgRef={svgRef}
          selectedEcosystem={selectedEcosystem}
          isMobile={isMobile}
          windowSize={windowSize}
          onNodeClick={handleNodeClick}
        />
      </div>
      {selectedNode && (
        <DependencyDetailsCard
          node={selectedNode}
          isMobile={isMobile}
          onClose={handleDetailsCardClose}
        />
      )}
    </div>
  );
};

const PageContent = () => {
  return (
    // <TextSelectionProvider>
    <>
      <Page />
      {/* <FloatingAiForm /> */}
    </>
    // </TextSelectionProvider>
  );
};

export default PageContent;
