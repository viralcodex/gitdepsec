import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardFooter, CardHeader } from "../ui/card";
import { Dependency, GraphNode, Vulnerability, VulnerabilitySummaryResponse } from "@/constants/model";
import removeMarkdown from "remove-markdown";
import { Check, Copy, RefreshCcw, X } from "lucide-react";
import { toast } from "react-hot-toast";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { cn, getSeverityConfig } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import DependencyDetails from "@/components/dependency-sidebar/dependency-details";
import DependencyAIDetails from "./dependency-ai-details";
import { getAiVulnerabilitiesSummary } from "@/lib/api";
import Image from "next/image";
import { useGraphState } from "@/store/app-store";

interface DependencyDetailsProps {
  node: GraphNode;
  isMobile?: boolean;
  onClose?: () => void;
}

const DependencyDetailsCard = ({ node, onClose, isMobile }: DependencyDetailsProps) => {
  const { dependencies } = useGraphState();
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<VulnerabilitySummaryResponse | null>(null);
  const [tabValue, setTabValue] = useState<string>("Vuln_details");

  let transitiveNodeDetails: Dependency | undefined;
  let matchedTransitiveNode: Dependency | undefined;

  const directDep = dependencies[node.ecosystem!]?.find(
    (dep) => `${dep.name}@${dep.version}` === node.id,
  );

  if (!directDep) {
    matchedTransitiveNode = Object.values(dependencies[node.ecosystem!])
      .flat()
      .find((dep) =>
        dep.transitiveDependencies?.nodes?.some(
          (transDep) => `${transDep.name}@${transDep.version}` === node.id,
        ),
      );
    if (matchedTransitiveNode) {
      transitiveNodeDetails = matchedTransitiveNode.transitiveDependencies?.nodes?.find(
        (transDep) => `${transDep.name}@${transDep.version}` === node.id,
      );
    }
  }

  const allDetails = transitiveNodeDetails ?? matchedTransitiveNode ?? directDep;

  // Group references by type
  const processedVulns = allDetails?.vulnerabilities?.map((vuln) => {
    const groupedRefs: { [type: string]: string[] } = {};
    if (vuln.references && vuln.references.length > 0) {
      vuln.references.forEach((ref) => {
        if (!groupedRefs[ref.type]) groupedRefs[ref.type] = [];
        groupedRefs[ref.type].push(ref.url);
      });
    }
    return { ...vuln, groupedRefs };
  });

  // Generate overall details text for copy/download
  const overallText = [
    `Dependency: ${node.label} (${node.version || "unknown"})`,
    ...(processedVulns ?? []).map((vuln, idx) => {
      let vulnText = `\nVulnerability ${idx + 1}:`;
      vulnText += `\nSummary: ${vuln.summary ? removeMarkdown(vuln.summary) : "No summary available"
        }`;
      vulnText += `\nDetails: ${vuln.details ? removeMarkdown(vuln.details) : "No details available"
        }`;
      if (vuln.severityScore) {
        vulnText += `\nSeverity:`;
        vulnText += `\n  CVSS V3 Score: ${vuln.severityScore.cvss_v3 || "N/A"}`;
        vulnText += `\n  CVSS V4 Score: ${vuln.severityScore.cvss_v4 || "N/A"}`;
      }
      if (vuln.references && Object.keys(vuln.groupedRefs).length > 0) {
        vulnText += `\nReferences:`;
        Object.entries(vuln.groupedRefs).forEach(([type, urls]) => {
          vulnText += `\n  ${type}:`;
          urls.forEach((url) => {
            vulnText += `\n    ${url}`;
          });
        });
      }
      return vulnText;
    }),
  ].join("\n");

  const handleCopy = () => {
    navigator.clipboard.writeText(overallText);
    setIsCopied(true);
    toast.success("Copied to clipboard!");
  };

  useEffect(() => {
    const timeout = setTimeout(() => {
      setIsCopied(false);
    }, 2000);
    return () => clearTimeout(timeout);
  }, [isCopied]);

  const fetchSummary = useCallback(async () => {
    if (!allDetails || !allDetails.vulnerabilities || allDetails.vulnerabilities.length === 0) {
      setError("No vulnerabilities available for this dependency");
      return;
    }
    setIsLoading(true);
    setError(null);
    const vulnerabilities = {
      name: allDetails?.name,
      version: allDetails?.version,
      vulnerabilities: allDetails?.vulnerabilities?.map((vuln: Vulnerability) => {
        return {
          ...vuln,
          affected: vuln.affected?.map((affected) => ({
            ...affected,
            versions: [],
          })),
        };
      }),
    };
    try {
      const response = await getAiVulnerabilitiesSummary(vulnerabilities);
      setSummary(response);
      // Update cache
      sessionStorage.removeItem(`ai-summary-${allDetails.name}@${allDetails.version}`);
      sessionStorage.setItem(
        `ai-summary-${allDetails.name}@${allDetails.version}`,
        JSON.stringify(response),
      );
      setIsLoading(false);
    } catch (err) {
      setError("Error: " + (err as Error).message);
      setIsLoading(false);
    }
  }, [allDetails]);

  useEffect(() => {
    if (sessionStorage) {
      const cachedSummary = sessionStorage.getItem(
        `ai-summary-${allDetails?.name}@${allDetails?.version}`,
      );
      if (cachedSummary) {
        setSummary(JSON.parse(cachedSummary));
        setIsLoading(false);
        return;
      }
    }
    if (!allDetails || !allDetails.vulnerabilities) {
      setError("No vulnerabilities available for this dependency");
      return;
    }
    fetchSummary();
  }, [allDetails, fetchSummary]);

  const refreshSummary = () => {
    setSummary(null);
    setError(null);
    setIsLoading(true);
    fetchSummary();
    toast.dismiss();
    toast.loading("Generating AI Summary...", {
      duration: 1500,
    });
  };

  const getSeverityColor = (severity: number) => {
    if (!severity) return "bg-gray-500";
    const numericSeverity = severity;
    if (numericSeverity >= 9.0) return "bg-red-600";
    if (numericSeverity >= 7.0) return "bg-orange-600";
    if (numericSeverity >= 4.0) return "bg-yellow-600";
    return "bg-green-600";
  };

  const getSeverityBadge = (score?: string) => {
    const config = getSeverityConfig(score);
    return (
      <Badge className={cn(isMobile ? "text-sm" : "text-xs", config.className)}>
        {config.text}
      </Badge>
    );
  };

  if (!node) {
    return <div className="text-center">No dependency selected</div>;
  }

  return (
    <div
      className={cn(
        "absolute right-0 flex flex-col z-105 p-1",
        isMobile ? "w-full h-[calc(100vh-4rem)]" : "w-[35%] h-[calc(100vh-4rem)]",
      )}
    >
      <Card
        className={cn(
          "bg-background/95 backdrop-blur-sm border border-border/50 text-accent p-0 gap-0 relative rounded-xl shadow-xl",
          isMobile ? "h-[92vh]" : "h-full",
        )}
      >
        <CardHeader
          className={cn(
            getSeverityColor(node.severity!),
            "px-4 py-4 rounded-t-lg",
          )}
        >
          <div className="flex items-center justify-between">
            <div className="flex flex-col items-start flex-1 min-w-0 gap-0.5">
              <p className="font-bold text-white tracking-tight truncate">
                {node.label.toTitleCase()}
              </p>
              <p className="text-sm sm:text-md text-white/70 font-medium">{node.version}</p>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleCopy}
                className="size-9 hover:bg-white/20"
              >
                {isCopied ? (
                  <Check className="size-7! text-white" />
                ) : (
                  <Copy className="size-7! text-white" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="size-10! hover:bg-white/20"
              >
                <X className="size-7! text-white" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="py-0 gap-0 whitespace-normal wrap-break-word overflow-y-auto w-full h-full">
          <Tabs defaultValue="Vuln_details" className="w-auto h-full flex flex-col">
            <div className="flex items-center justify-between border-b border-border/40 bg-muted/30">
              <TabsList className="h-11 bg-transparent rounded-none p-0 gap-0">
                <TabsTrigger
                  value="Vuln_details"
                  onClick={() => setTabValue("Vuln_details")}
                  className="h-11 rounded-none cursor-pointer border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 font-medium"
                >
                  Details
                </TabsTrigger>
                <TabsTrigger
                  value="AI_vuln_details"
                  onClick={() => setTabValue("AI_vuln_details")}
                  className="rounded-t-none cursor-pointer flex items-center px-5 font-semibold rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
                >
                  <Image
                    priority
                    src="/genai.svg"
                    alt="AI Icon"
                    width={20}
                    height={20}
                  />
                  AI Fix Plan
                </TabsTrigger>
              </TabsList>
              {tabValue === "AI_vuln_details" && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={refreshSummary}
                      className="mr-3"
                    >
                      <RefreshCcw className="size-5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Refresh AI Response</TooltipContent>
                </Tooltip>
              )}
            </div>
            <div className="flex-1 flex flex-col overflow-y-auto scrollbar-background-bg scrollbar-background-thumb">
              <TabsContent value="Vuln_details" className="mt-0">
                <DependencyDetails
                  processedVulns={processedVulns}
                  allDetails={allDetails}
                  getSeverityBadge={getSeverityBadge}
                  transitiveNodeDetails={transitiveNodeDetails}
                  matchedTransitiveNode={matchedTransitiveNode}
                  isMobile={isMobile}
                />
              </TabsContent>
              <TabsContent value="AI_vuln_details" className="mt-0">
                <DependencyAIDetails
                  dependency={allDetails}
                  error={error}
                  isLoading={isLoading}
                  summary={summary}
                  isCopied={isCopied}
                  setIsCopied={setIsCopied}
                  handleCopy={handleCopy}
                  getSeverityBadge={getSeverityBadge}
                  setError={setError}
                  setIsLoading={setIsLoading}
                  isMobile={isMobile}
                />
              </TabsContent>
            </div>
          </Tabs>
        </CardContent>
        <CardFooter className="p-3 border-t border-border/40 bg-muted/20">
          <p className={cn(isMobile ? "text-xs" : "text-[11px]", "text-muted-foreground text-center w-full leading-relaxed")}>
            AI results can be inaccurate. Always verify before taking action.
          </p>
        </CardFooter>
      </Card>
    </div>
  );
};

export default DependencyDetailsCard;
