"use client";
import { useGraph } from "@/hooks/useGraph";
import { useRepoData } from "@/hooks/useRepoData";
import { useParams, useSearchParams } from "next/navigation";
import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import TopHeaderGithub from "../../../components/top-header-github";
import { GraphNode } from "@/constants/model";
import TopHeaderFile from "@/components/top-header-file";
import {
  downloadFixPlanPDF,
} from "@/lib/utils";
import toast from "react-hot-toast";
import { useIsMobile } from "@/hooks/useMobile";
import {
  useRepoState,
  useErrorState,
  useGraphState,
  useUIState,
  useDiagramState,
  useFileState,
} from "@/store/app-store";
import { TextSelectionProvider } from "@/providers/textSelectionProvider";
import useFixPlanGeneration from "@/hooks/useFixPlanGeneration";
import useFileUpload from "@/hooks/useFileUpload";
import useWindowSize from "@/hooks/useWindowSize";
import useUrlInput from "@/hooks/useUrlInput";
import useBranchSync from "@/hooks/useBranchSync";
import HeaderControls from "@/components/header-controls";
import dynamic from "next/dynamic";
import DiagramProgress from "@/components/diagram-progress";

//LAZY LOADING COMPONENTS
const SavedHistory = dynamic(() => import("@/components/saved-history"));
const FloatingAiForm = dynamic(() => import("@/components/floating-ai-form"));
const DepDiagram = dynamic(() => import("@/components/dependency-diagram"), {
  ssr: false,
  loading: () => <DiagramProgress />,
});

// Lazy load heavy components to improve initial load time
const DependencyDetailsCard = dynamic(
  () => import("@/components/dependency-sidebar/dependency-sidebar"),
  { ssr: false }
);
const FixPlanCard = dynamic(
  () => import("@/components/fix-plan/fix-plan-card"),
  { ssr: false }
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
  const { currentUrl } = useRepoState();
  const { resetFileState } = useFileState();
  const { error } = useErrorState();
  const { graphData } = useGraphState();
  const {
    fileHeaderOpen,
    isFixPlanDialogOpen,
    setFileHeaderOpen,
    setFixPlanDialogOpen,
    resetUIState,
  } = useUIState();
  const { selectedNode, setSelectedNode, resetDiagramState } 
    = useDiagramState();

  // Custom hooks
  const { generateFixPlan } = useFixPlanGeneration({ username, repo, branch });
  const { inputFile, setInputFile, setUploaded, setNewFileName } = useFileUpload();
  const { windowSize } = useWindowSize();
  const { inputUrl, handleInputChange } = useUrlInput({ username, repo, branch});
  useBranchSync({ branchParam: branch });
  useGraph(username, repo, branch, file, forceRefresh);
  useRepoData(currentUrl);

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
      setUploaded(false);
      setNewFileName(file);
    } else {
      setFileHeaderOpen(false);
    }
  }, [file, setFileHeaderOpen, setInputFile, setUploaded, setNewFileName]);

  //Handle navigation event to close everything
  useEffect(() => {
    const handleNavigation = () => {
      resetFileState()
      resetUIState();
    };
    window.addEventListener("popstate", handleNavigation);
    return () => window.removeEventListener("popstate", handleNavigation);
  }, [resetFileState, resetUIState]);

  // Close sidebar and reset state when URL parameters change
  useEffect(() => {
    resetDiagramState();
  }, [username, repo, branch, file, resetDiagramState]);

  const handleNodeClick = useCallback(
    (node: GraphNode | null) => {
      if (selectedNode && selectedNode.id !== node?.id) {
        setSelectedNode(node);
        return;
      }
      // Otherwise, open sidebar with the clicked node
      setSelectedNode(node);
    },
    [selectedNode, setSelectedNode]
  );

  const handleDetailsCardClose = () => {
    setSelectedNode(null);
  };

  useEffect(() => {
    toast.dismiss();
    if (error) toast.error(error);
  }, [error]);

  const handleRefresh = useCallback(() => {
    // Set forceRefresh flag
    setForceRefresh(true);
    // Reset forceRefresh after a short delay to ensure it's used for this fetch only
    setTimeout(() => setForceRefresh(false), 100);
  }, []);

  const resetGraph = () => {
    resetDiagramState();
    svgRef.current = null;
  };

  // console.log("File Header:", newFileName, file, inputFile, uploaded);
  // console.log("LOADING:", inputUrl, currentUrl);
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
        }>
        <SavedHistory addButtonRef={addButtonRef} />
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
    <TextSelectionProvider>
      <Page />
      <FloatingAiForm />
    </TextSelectionProvider>
  );
};

export default PageContent;