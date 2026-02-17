import { useMemo, memo, useState } from "react";
import { ExternalLink, Plus } from "lucide-react";
import { getSeverityConfig, getVulnerabilityUrl, parseRisk, cn } from "@/lib/utils";
import { ReactFlow, Node, Edge, Background, Controls, Handle, Position } from "@xyflow/react";

interface CriticalPathData {
  path?: string;
  risk?: string;
  resolution?: string;
  estimated_impact?: string;
  cve_id?: string;
}

interface SharedTransitiveVulnerability {
  package?: string;
  vulnerability_count?: number;
  vulnerability_ids?: string[];
  used_by?: string[];
  impact_multiplier?: string;
}

interface CriticalPathsProps {
  data?: CriticalPathData[];
  sharedTransitiveVulnerabilities?: SharedTransitiveVulnerability[];
}

interface NodeData {
  label?: string;
  resolution?: string;
  cve_id?: string;
  risk?: string;
  impact?: string;
  packageName?: string;
  hasDetails?: boolean;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  vulnerabilityDetails?: SharedTransitiveVulnerability;
}

// Layout constants
const LAYOUT = {
  FILE_PATH_X: 0,
  RESOLUTION_X: 350,
  IMPACT_X: 750,
  DETAILS_X: 1200,
  ROW_HEIGHT: 150,
  EXPANDED_ROW_HEIGHT: 300,
  GROUP_GAP: 50,
};

// Edge configuration
const EDGE_CONFIG = {
  type: "default",
  animated: false,
  style: { stroke: "#888", strokeWidth: 2, strokeDasharray: "5,5" },
  markerEnd: { type: "arrowclosed" as const, color: "#888" },
};

// Custom node component for file paths
const FilePathNode = memo(({ data }: { data: NodeData }) => (
  <div className="flex shadow-lg flex-row items-center justify-center px-3 py-2 bg-muted rounded-lg border border-muted font-mono text-xs break-all min-w-32 max-w-48">
    {data.label}
    <Handle type="source" position={Position.Right} />
  </div>
));

FilePathNode.displayName = "FilePathNode";

// Custom node component for resolutions
const ResolutionNode = memo(({ data }: { data: NodeData }) => {
  const parsedRisk = parseRisk(data.risk);
  const severityConfig = getSeverityConfig(parsedRisk.cvss);

  return (
    <div className="p-3 shadow-lg bg-sidebar-primary rounded-lg border border-muted w-75 space-y-2">
      <Handle type="target" position={Position.Left} />
      <div className="text-sm font-medium text-green-400">{data.resolution}</div>
      <hr className="" />
      <div className="flex flex-col gap-2">
        {data.cve_id && (
          <a
            href={getVulnerabilityUrl(data.cve_id)}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              "flex items-center justify-center gap-1 px-2 py-1 text-xs font-bold tracking-wide rounded hover:opacity-80 transition-opacity",
              severityConfig.className,
            )}
            title="View vulnerability details"
          >
            {data.cve_id}
            <ExternalLink className="w-4 h-4 font-bold" />
          </a>
        )}
        <span className={cn("px-2 py-1 text-xs font-bold text-center", severityConfig.className)}>
          {severityConfig.text}
        </span>
        {parsedRisk.exploitAvailable && (
          <span className="px-2 py-1 text-xs font-bold rounded border border-red-500/20 bg-red-500/10 text-red-500 text-center">
            Exploit Available
          </span>
        )}
      </div>
      <Handle type="source" position={Position.Right} />
    </div>
  );
});
ResolutionNode.displayName = "ResolutionNode";

// Custom node component for impacts
const ImpactNode = memo(({ data }: { data: NodeData }) => (
  <div className="p-3 shadow-lg bg-blue-500 rounded-lg border border-blue-500/20 w-90 relative">
    <Handle type="target" position={Position.Left} />
    {data.hasDetails && (
      <button
        onClick={data.onToggleExpand}
        className="absolute -top-2 -right-2 p-1 bg-primary text-primary-foreground rounded-full hover:scale-110 transition-transform shadow-md"
        title="Show vulnerability details"
      >
        <Plus className={cn("w-3.5 h-3.5 transition-transform", data.isExpanded && "rotate-45")} />
      </button>
    )}
    <div className="text-xs font-bold mb-1">Impact:</div>
    <div className="text-xs text-accent">{data.impact}</div>
    {data.hasDetails && <Handle type="source" position={Position.Right} />}
  </div>
));
ImpactNode.displayName = "ImpactNode";

// Custom node component for vulnerability details
const VulnerabilityDetailsNode = memo(({ data }: { data: NodeData }) => {
  const vuln = data.vulnerabilityDetails;
  if (!vuln) return null;

  return (
    <div className="p-3 shadow-xl bg-muted/95 backdrop-blur rounded-lg w-80 space-y-3">
      <Handle type="target" position={Position.Left} />
      {/* Package Name */}
      <div className="font-mono font-semibold text-sm border-b border-muted-foreground/20 pb-2">
        {vuln.package}
      </div>

      {/* CVE IDs */}
      {vuln.vulnerability_ids && vuln.vulnerability_ids.length > 0 && (
        <div className="space-y-1">
          <div className="text-xs text-muted-foreground">CVE IDs:</div>
          <div className="flex flex-wrap gap-1 max-h-25 overflow-y-auto scrollbar-background-thumb scrollbar-background-bg">
            {vuln.vulnerability_ids.slice(0, 10).map((cve, idx) => (
              <a
                href={getVulnerabilityUrl(cve)}
                key={idx}
                className="px-1.5 py-0.5 rounded text-xs font-mono bg-red-500/10 text-red-400 border border-red-500/20"
              >
                {cve}
              </a>
            ))}
            {vuln.vulnerability_ids.length > 10 && (
              <span className="px-1.5 py-0.5 text-xs text-muted-foreground">
                +{vuln.vulnerability_ids.length - 10} more
              </span>
            )}
          </div>
        </div>
      )}

      {/* Used By Packages */}
      {vuln.used_by && vuln.used_by.length > 0 && (
        <div className="space-y-1">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            Used by {vuln.used_by.length} {vuln.used_by.length === 1 ? "package" : "packages"}
          </div>
          <div className="flex flex-wrap gap-1">
            {vuln.used_by.slice(0, 3).map((pkg, idx) => (
              <span
                key={idx}
                className="px-1.5 py-0.5 rounded text-xs font-mono bg-blue-500/10 text-blue-400 border border-blue-500/20"
              >
                {pkg}
              </span>
            ))}
            {vuln.used_by.length > 3 && (
              <span className="px-1.5 py-0.5 text-xs text-muted-foreground">
                +{vuln.used_by.length - 3} more
              </span>
            )}
          </div>
        </div>
      )}

      {/* Impact Multiplier */}
      {vuln.impact_multiplier && (
        <div className="text-xs text-muted-foreground leading-relaxed border-t border-muted-foreground/20 pt-2">
          {vuln.impact_multiplier}
        </div>
      )}
    </div>
  );
});
VulnerabilityDetailsNode.displayName = "VulnerabilityDetailsNode";

const nodeTypes = {
  filePathNode: FilePathNode,
  resolutionNode: ResolutionNode,
  impactNode: ImpactNode,
  vulnerabilityDetailsNode: VulnerabilityDetailsNode,
};

// Extract package name from resolution text
const extractPackageName = (resolution?: string): string | null => {
  if (!resolution) return null;

  const resolveMatch = resolution.match(/to resolve\s+([\w@/-]+)/i);
  if (resolveMatch) return resolveMatch[1];

  const upgradeMatch = resolution.match(/(?:Upgrade|Update)\s+([\w@/-]+)(?:@[\d.]+)?/i);
  return upgradeMatch ? upgradeMatch[1] : null;
};

// Find vulnerability data for a package
const findVulnerabilityData = (
  packageName: string | null,
  vulnerabilities?: SharedTransitiveVulnerability[],
): SharedTransitiveVulnerability | undefined => {
  if (!packageName || !vulnerabilities) return undefined;

  const searchPackage = packageName.split("@")[0];
  return vulnerabilities.find((v) => v.package?.split("@")[0] === searchPackage);
};

const CriticalPaths = ({ data, sharedTransitiveVulnerabilities }: CriticalPathsProps) => {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  const toggleExpand = (nodeId: string) => {
    setExpandedNodes((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(nodeId)) {
        newSet.delete(nodeId);
      } else {
        newSet.add(nodeId);
      }
      return newSet;
    });
  };

  const { nodes, edges } = useMemo(() => {
    if (!data?.length) return { nodes: [], edges: [] };

    const nodes: Node[] = [];
    const edges: Edge[] = [];

    // Group paths by file
    const grouped = data.reduce(
      (acc, item) => {
        const filePath = item.path?.split(" -> ")[0] || "Unknown";
        (acc[filePath] ||= []).push(item);
        return acc;
      },
      {} as Record<string, CriticalPathData[]>,
    );

    let yPosition = 0;

    Object.entries(grouped).forEach(([filePath, paths]) => {
      const fileNodeId = `file-${filePath}`;

      nodes.push({
        id: fileNodeId,
        type: "filePathNode",
        position: {
          x: LAYOUT.FILE_PATH_X,
          y: yPosition + (paths.length * LAYOUT.ROW_HEIGHT) / 2 - 40,
        },
        data: { label: filePath },
        draggable: true,
      });

      paths.forEach((pathData, pathIndex) => {
        const resolutionNodeId = `resolution-${filePath}-${pathIndex}`;
        const impactNodeId = `impact-${filePath}-${pathIndex}`;
        const packageName = extractPackageName(pathData.resolution);
        const vulnerabilityData = findVulnerabilityData(
          packageName,
          sharedTransitiveVulnerabilities,
        );
        const isExpanded = expandedNodes.has(impactNodeId);

        nodes.push(
          {
            id: resolutionNodeId,
            type: "resolutionNode",
            position: { x: LAYOUT.RESOLUTION_X, y: yPosition },
            data: { resolution: pathData.resolution, cve_id: pathData.cve_id, risk: pathData.risk },
          },
          {
            id: impactNodeId,
            type: "impactNode",
            position: { x: LAYOUT.IMPACT_X, y: yPosition },
            data: {
              impact: pathData.estimated_impact,
              packageName,
              hasDetails: !!vulnerabilityData,
              isExpanded,
              onToggleExpand: () => toggleExpand(impactNodeId),
            },
          },
        );

        // DETAILS NODE
        if (isExpanded && vulnerabilityData) {
          const detailsId = `details-${filePath}-${pathIndex}`;
          nodes.push({
            id: detailsId,
            type: "vulnerabilityDetailsNode",
            position: { x: LAYOUT.DETAILS_X, y: yPosition },
            data: { vulnerabilityDetails: vulnerabilityData },
            draggable: true,
          });
          edges.push({
            id: `e-${impactNodeId}-details`,
            source: impactNodeId,
            target: detailsId,
            ...EDGE_CONFIG,
          });
        }

        //EDGES
        edges.push(
          {
            id: `e-${fileNodeId}-${resolutionNodeId}`,
            source: fileNodeId,
            target: resolutionNodeId,
            ...EDGE_CONFIG,
          },
          {
            id: `e-${resolutionNodeId}-${impactNodeId}`,
            source: resolutionNodeId,
            target: impactNodeId,
            ...EDGE_CONFIG,
          },
        );

        yPosition += isExpanded ? LAYOUT.EXPANDED_ROW_HEIGHT : LAYOUT.ROW_HEIGHT;
      });
      yPosition += LAYOUT.GROUP_GAP;
    });
    return { nodes, edges };
  }, [data, sharedTransitiveVulnerabilities, expandedNodes]);

  if (!data?.length) {
    return <div className="text-sm text-muted-foreground">No critical paths available.</div>;
  }

  return (
    <div className="w-full h-150 border border-muted rounded-md">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.4, minZoom: 0.5, maxZoom: 2 }}
        proOptions={{ hideAttribution: true }}
        defaultEdgeOptions={EDGE_CONFIG}
        minZoom={0.5}
        maxZoom={4}
        nodesDraggable={true}
        nodesConnectable={false}
        elementsSelectable={true}
      >
        <Background />
        <Controls
          position="bottom-right"
          showInteractive={false}
          className="[&>button]:bg-sidebar-primary! [&>button]:text-accent! [&>button]:border! [&>button]:border-border! [&>button:hover]:bg-accent! [&>button:hover]:text-accent-foreground!"
        />
      </ReactFlow>
    </div>
  );
};

export default CriticalPaths;
