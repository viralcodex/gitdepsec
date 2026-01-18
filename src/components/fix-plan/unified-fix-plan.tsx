import React, { useMemo, useState } from "react";
import { UnifiedFixPlan } from "@/constants/model";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Skeleton } from "../ui/skeleton";
import {
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  CheckCircle,
  Clock,
  Terminal,
  FileCode,
  Shield,
  Zap,
  Sparkles,
  Copy,
  Check,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

interface UnifiedFixPlanProps {
  fixPlan: UnifiedFixPlan | null;
  partialFixPlan?: Partial<Record<string, unknown>>;
  isLoading?: boolean;
}

const SectionSkeleton = () => (
  <div className="space-y-3">
    <Skeleton className="min-h-100 w-full rounded-xl" />
  </div>
);

const SectionHeading = ({ heading }: { heading: string }) => {
  return (
    <div className="flex flex-row items-center justify-start gap-2">
      <FileCode className="w-5 h-5 text-muted-foreground" />
      <h2 className="text-xl font-bold">{heading}</h2>
    </div>
  );
};

// Collapsible section for better performance with large content
const CollapsibleSection = ({
  title,
  icon: Icon,
  children,
  defaultOpen = false,
}: {
  title: string;
  icon?: React.ElementType;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border border-muted rounded-md overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-2 p-3 bg-muted hover:bg-muted/80 transition-colors cursor-pointer"
      >
        {isOpen ? (
          <ChevronDown className="w-4 h-4" />
        ) : (
          <ChevronRight className="w-4 h-4" />
        )}
        {Icon && <Icon className="w-4 h-4" />}
        <span className="font-medium">{title}</span>
      </button>
      {isOpen && (
        <div className="p-3 space-y-2 scrollbar-background-thumb scrollbar-background-bg">
          {children}
        </div>
      )}
    </div>
  );
};

// Code block component with proper formatting and copy functionality
const CodeBlock = ({ code }: { code?: string }) => {
  const [copied, setCopied] = useState(false);

  if (!code) return null;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    toast.success("Copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group">
      <button
        onClick={handleCopy}
        className="absolute top-2 right-2 p-1.5 bg-background/80 hover:bg-background cursor-pointer rounded-md transition-colors z-10"
        title="Copy to clipboard"
      >
        {copied ? (
          <Check className="w-4 h-4 text-green-500" />
        ) : (
          <Copy className="w-4 h-4 text-muted-foreground" />
        )}
      </button>
      <pre className="bg-accent-foreground p-3 rounded-md overflow-x-auto text-sm font-mono">
        <code>{code}</code>
      </pre>
    </div>
  );
};

// Parse strings with code tags and bold formatting
const parseCodeString = (str?: string) => {
  if (!str) return null;

  const stringWithBoldWords = str.replace(
    /\*\*(.*?)\*\*/g,
    "<strong>$1</strong>",
  );
  const parts = stringWithBoldWords.split(
    /(<code>.*?<\/code>|<strong>.*?<\/strong>)/g,
  );

  return (
    <span>
      {parts.map((part, index) => {
        if (part.match(/^<code>.*<\/code>$/)) {
          const codeText = part.replace(/<\/?code>/g, "");
          return (
            <code
              key={index}
              className="bg-accent-foreground px-1.5 py-0.5 rounded text-sm font-mono mx-1 cursor-pointer"
              onClick={() => {
                navigator.clipboard.writeText(codeText);
                toast.success("Copied to clipboard!");
              }}
            >
              {codeText}
            </code>
          );
        }
        if (part.match(/^<strong>.*<\/strong>$/)) {
          const boldText = part.replace(/<\/?strong>/g, "");
          return (
            <strong key={index} className="font-bold">
              {boldText}
            </strong>
          );
        }
        return <span key={index}>{part}</span>;
      })}
    </span>
  );
};

const UnifiedFixPlanComponent = ({
  fixPlan,
  partialFixPlan,
  isLoading,
}: UnifiedFixPlanProps) => {
  const [copiedCommand, setCopiedCommand] = useState<string | null>(null);

  const copyCommand = async (command: string) => {
    await navigator.clipboard.writeText(command);
    setCopiedCommand(command);
    setTimeout(() => setCopiedCommand(null), 2000);
  };

  // Memoize parsed data to avoid re-parsing on every render
  const parsedPlan = useMemo(() => {
    let basePlan: UnifiedFixPlan = {} as UnifiedFixPlan;

    // Parse the complete fix plan if available
    if (typeof fixPlan === "string") {
      try {
        basePlan = JSON.parse(fixPlan) as UnifiedFixPlan;
      } catch {
        basePlan = {} as UnifiedFixPlan;
      }
    } else if (fixPlan) {
      basePlan = fixPlan;
    }

    // Merge with streaming partial data (partial data takes precedence during streaming)
    if (partialFixPlan && Object.keys(partialFixPlan).length > 0) {
      return { ...basePlan, ...partialFixPlan } as UnifiedFixPlan;
    }

    return basePlan;
  }, [fixPlan, partialFixPlan]);

  const {
    executive_summary,
    dependency_intelligence,
    priority_phases,
    automated_execution,
    risk_management,
    long_term_strategy,
    metadata,
  } = parsedPlan;

  // Check which tabs have data available
  const hasOverviewData = !!executive_summary;
  const hasIntelligenceData = !!dependency_intelligence;
  const hasPhasesData = !!priority_phases && priority_phases.length > 0;
  const hasAutomationData = !!automated_execution;
  const hasRiskData = !!risk_management;

  return (
    <div className="px-4 w-full">
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-5 gap-x-2 items-center justify-center">
          <TabsTrigger
            value="overview"
            className={cn(
              "cursor-pointer relative overflow-visible",
              isLoading && !hasOverviewData && "tab-loading",
            )}
          >
            <Zap className="w-4 h-4 font-bold" />
            <span className="sm:inline hidden">Overview</span>
          </TabsTrigger>
          <TabsTrigger
            value="intelligence"
            className={cn(
              "cursor-pointer relative overflow-visible",
              isLoading && !hasIntelligenceData && "tab-loading",
            )}
          >
            <Terminal className="w-4 h-4 font-bold" />
            <span className="sm:inline hidden">Insights</span>
          </TabsTrigger>
          <TabsTrigger
            value="phases"
            className={cn(
              "cursor-pointer relative overflow-visible",
              isLoading && !hasPhasesData && "tab-loading",
            )}
          >
            <Clock className="w-4 h-4 font-bold" />
            <span className="sm:inline hidden">Phases</span>
          </TabsTrigger>
          <TabsTrigger
            value="automation"
            className={cn(
              "cursor-pointer relative overflow-visible",
              isLoading && !hasAutomationData && "tab-loading",
            )}
          >
            <Zap className="w-4 h-4 font-bold" />
            <span className="sm:inline hidden">Automation</span>
          </TabsTrigger>
          <TabsTrigger
            value="risk"
            className={cn(
              "cursor-pointer relative overflow-visible",
              isLoading && !hasRiskData && "tab-loading",
            )}
          >
            <Shield className="w-4 h-4 font-bold" />
            <span className="sm:inline hidden">Risk & Strategy</span>
          </TabsTrigger>
        </TabsList>

        <div
          id="tip"
          className="flex flex-row text-xs text-muted-foreground bg-muted/50 p-2 rounded-md items-center gap-2"
        >
          <Copy className="w-3 h-3" />
          <div className="w-full flex flex-row items-center justify-between">
            <span>
              <b>Tip:</b> Click on any command to copy it to clipboard
            </span>
            <button
              onClick={() => {
                const tipElement = document.getElementById("tip");
                if (tipElement) {
                  tipElement.style.display = "none";
                }
              }}
              className="cursor-pointer"
            >
              <X className="w-4 h-4 animate-marquee" />
            </button>
          </div>
        </div>
        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4 mt-4">
          <SectionHeading heading={"Executive Summary"} />
          {hasOverviewData ? (
            <>
              {/* Key Metrics */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="p-3 bg-muted rounded-md">
                  <div className="text-sm text-muted-foreground">
                    Total Vulnerabilities
                  </div>
                  <div className="sm:text-2xl text-xl font-bold">
                    {executive_summary?.total_vulnerabilities ?? "—"}
                  </div>
                </div>
                <div className="p-3 bg-muted rounded-md">
                  <div className="text-sm text-muted-foreground">Fixable</div>
                  <div className="sm:text-2xl text-xl font-bold text-green-500">
                    {executive_summary?.fixable_count ?? "—"}
                  </div>
                </div>
                <div className="p-3 bg-muted rounded-md">
                  <div className="text-sm text-muted-foreground">
                    Risk Score
                  </div>
                  <div className="sm:text-2xl text-xl font-bold text-orange-500">
                    {executive_summary?.risk_score?.toFixed(1) ?? "—"}
                  </div>
                </div>
                <div className="p-3 bg-muted rounded-md">
                  <div className="text-sm text-muted-foreground">
                    Estimated Time
                  </div>
                  <div className="sm:text-2xl text-xl font-bold">
                    {executive_summary?.estimated_fix_time ?? "—"}
                  </div>
                </div>
              </div>

              {/* Critical Insights */}
              {executive_summary?.critical_insights &&
                executive_summary.critical_insights.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="font-semibold flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-orange-500" />
                      Critical Insights
                    </h3>
                    <ul className="space-y-2">
                      {executive_summary.critical_insights.map((insight, i) => (
                        <li
                          key={i}
                          className="flex items-start gap-2 p-2 bg-muted rounded"
                        >
                          <div className="flex flex-row items-center justify-center gap-x-2">
                            <span className="text-muted-foreground">•</span>
                            <span className="text-sm">
                              {parseCodeString(insight)}
                            </span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

              {/* Quick Wins */}
              {executive_summary?.quick_wins &&
                executive_summary.quick_wins.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="font-semibold flex items-center gap-2">
                      <Zap className="w-4 h-4 text-yellow-500" />
                      Quick Wins
                    </h3>
                    <ul className="space-y-2">
                      {executive_summary.quick_wins.map((win, i) => (
                        <li
                          key={i}
                          className="flex items-start gap-2 p-2 bg-muted rounded"
                        >
                          <div className="flex flex-row items-center justify-center gap-x-2">
                            <span>•</span>
                            <p className="text-sm flex-1">
                              {parseCodeString(win)}
                            </p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
            </>
          ) : (
            isLoading && <SectionSkeleton />
          )}
        </TabsContent>

        {/* Priority Phases Tab */}
        <TabsContent value="phases" className="space-y-4 mt-4">
          <SectionHeading heading={"Priority Fix Phases"} />
          {hasPhasesData ? (
            <div className="space-y-3">
              {priority_phases.map((phase, idx) => (
                <CollapsibleSection
                  key={idx}
                  title={`Phase ${phase.phase}: ${phase.name} (${phase.urgency})`}
                  icon={Clock}
                  defaultOpen={idx === 0}
                >
                  {/* Phase Details */}
                  <div className="space-y-3">
                    <div className="text-sm">
                      <strong>Estimated Time:</strong>{" "}
                      {phase.estimated_time ?? "N/A"}
                    </div>

                    {/* Dependencies */}
                    {phase.dependencies && phase.dependencies.length > 0 && (
                      <div>
                        <div className="flex flex-row font-medium text-sm mb-1 gap-x-2">
                          Dependencies:
                          <div className="flex flex-wrap gap-1 font-bold tracking-wide">
                            {phase.dependencies.map((dep, i) => (
                              <span
                                key={i}
                                className="px-2 py-0.5 bg-accent-foreground rounded text-xs"
                              >
                                {dep}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Fixes */}
                    {phase.fixes && phase.fixes.length > 0 && (
                      <div>
                        <div className="font-medium text-sm mb-2">Fixes:</div>
                        <div className="flex flex-1 flex-wrap gap-3">
                          {phase.fixes.map((fix, i) => (
                            <div
                              key={i}
                              className="flex-1 min-w-70 p-3 bg-accent-foreground rounded-lg border border-muted text-sm space-y-2 hover:shadow-md transition-shadow"
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-semibold">
                                  {fix.package}
                                </span>
                                {fix.breaking_changes && (
                                  <span className="text-xs bg-orange-500/20 text-orange-600 px-2 py-0.5 rounded">
                                    Breaking!
                                  </span>
                                )}
                              </div>
                              <div className="text-muted-foreground">
                                <strong>Action:</strong>{" "}
                                {parseCodeString(fix.action?.toTitleCase())}
                              </div>
                              {fix.command && (
                                <div>
                                  <strong>Command:</strong>
                                  <code
                                    onClick={() => copyCommand(fix.command!)}
                                    className="ml-2 bg-background px-1.5 py-0.5 rounded text-xs font-mono cursor-pointer hover:bg-accent-foreground transition-colors"
                                    title="Click to copy"
                                  >
                                    {copiedCommand === fix.command ? (
                                      <span className="text-green-400">
                                        Copied!
                                      </span>
                                    ) : (
                                      fix.command
                                    )}
                                  </code>
                                </div>
                              )}
                              {fix.impact && (
                                <div className="text-muted-foreground">
                                  <strong>Impact:</strong> {fix.impact}
                                </div>
                              )}
                              {fix.breaking_change_details && (
                                <div className="text-orange-600 text-xs mt-1">
                                  ⚠️ {fix.breaking_change_details}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Batch Commands */}
                    {phase.batch_commands &&
                      phase.batch_commands.length > 0 && (
                        <div>
                          <div className="font-medium text-sm mb-1">
                            Batch Commands:
                          </div>
                          <CodeBlock code={phase.batch_commands.join("\n")} />
                        </div>
                      )}

                    {/* Validation Steps */}
                    {phase.validation_steps &&
                      phase.validation_steps.length > 0 && (
                        <div>
                          <div className="font-medium text-sm mb-1">
                            Validation Steps:
                          </div>
                          <ol className="list-decimal list-inside space-y-1 text-sm">
                            {phase.validation_steps.map((step, i) => (
                              <li key={i}>{parseCodeString(step)}</li>
                            ))}
                          </ol>
                        </div>
                      )}

                    {/* Rollback Plan */}
                    {phase.rollback_plan && (
                      <div>
                        <div className="font-medium text-sm mb-1 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          Rollback Plan:
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {parseCodeString(phase.rollback_plan)}
                        </div>
                      </div>
                    )}
                  </div>
                </CollapsibleSection>
              ))}
            </div>
          ) : (
            isLoading && <SectionSkeleton />
          )}
        </TabsContent>

        {/* Dependency Intelligence Tab */}
        <TabsContent value="intelligence" className="space-y-4 mt-4">
          <SectionHeading heading={"Dependency Intelligence"} />
          {hasIntelligenceData ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-5 h-5 text-muted-foreground" />
                <h3 className="text-lg font-semibold">Recommended Actions</h3>
              </div>
              {/* Smart Actions Section */}
              {dependency_intelligence?.smart_actions ? (
                <div className="mb-6">
                  <div className="grid gap-3 md:grid-cols-3">
                    {dependency_intelligence.smart_actions.map((action, i) => (
                      <div
                        key={i}
                        className="flex flex-col h-full bg-muted border border-black rounded-lg p-3 hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="font-semibold text-sm">
                            {action.title}
                          </h4>
                        </div>
                        <p className="text-xs text-muted-foreground mb-2">
                          {parseCodeString(action.description)}
                        </p>
                        <div className="flex justify-between text-xs mt-auto">
                          <p className="flex-[65%] font-medium text-green-400">
                            {action.impact}
                          </p>
                          <div className="flex flex-row flex-[35%] items-end justify-end m-0 gap-x-1">
                            <Clock className="h-3 w-3 mb-0.5" />
                            <p className="text-muted-foreground items-center text-xs">
                              {action.estimated_time}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                isLoading && (
                  <div className="mb-6">
                    <div className="grid gap-3 md:grid-cols-3">
                      {[1, 2, 3].map((i) => (
                        <div
                          key={i}
                          className="border border-muted rounded-lg p-4 bg-muted/30"
                        >
                          <div className="flex items-start justify-between mb-2">
                            <Skeleton className="h-4 w-32" />
                            <Skeleton className="h-5 w-8 rounded-full" />
                          </div>
                          <Skeleton className="h-10 w-full mb-3" />
                          <div className="flex items-center justify-between">
                            <Skeleton className="h-3 w-24" />
                            <Skeleton className="h-3 w-16" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              )}

              {/* Critical Paths */}
              {dependency_intelligence?.critical_paths &&
                dependency_intelligence.critical_paths.length > 0 && (
                  <CollapsibleSection
                    title="Critical Dependency Paths"
                    icon={AlertTriangle}
                    defaultOpen
                  >
                    <div className="flex flex-wrap gap-3">
                      {dependency_intelligence.critical_paths.map((path, i) => (
                        <div
                          key={i}
                          className="flex-1 min-w-70 p-3 bg-muted rounded-lg border border-muted text-sm space-y-4 hover:shadow-md transition-shadow"
                        >
                          <div className="font-mono text-md mb-1 break-all">
                            {path.path}
                          </div>
                          <div className="text-muted-foreground">
                            {path.risk?.toTitleCase()}
                          </div>
                          <div className="text-green-400">
                            <strong>Resolution:</strong>{" "}
                            {parseCodeString(path.resolution)}
                          </div>
                          {path.estimated_impact && (
                            <span
                              className={cn(
                                "inline-block mt-1 py-0.5 rounded text-xs",
                                path.estimated_impact === "critical" &&
                                  "bg-red-500/20 text-red-500",
                                path.estimated_impact === "high" &&
                                  "bg-orange-500/20 text-orange-500",
                                path.estimated_impact === "medium" &&
                                  "bg-yellow-500/20 text-yellow-500",
                                path.estimated_impact === "low" &&
                                  "bg-green-500/20 text-green-400",
                              )}
                            >
                              Impact: {path.estimated_impact}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </CollapsibleSection>
                )}

              {/* Shared Transitive Vulnerabilities */}
              {dependency_intelligence?.shared_transitive_vulnerabilities &&
                dependency_intelligence.shared_transitive_vulnerabilities
                  .length > 0 && (
                  <CollapsibleSection
                    title="Shared Transitive Vulnerabilities"
                    icon={Zap}
                  >
                    <div className="flex flex-wrap gap-3">
                      {dependency_intelligence.shared_transitive_vulnerabilities.map(
                        (vuln, i) => (
                          <div
                            key={i}
                            className="flex-1 min-w-70 p-3 bg-muted rounded-lg border border-muted text-sm space-y-2 hover:shadow-md transition-shadow"
                          >
                            <div className="font-semibold">{vuln.package}</div>
                            <div className="text-muted-foreground text-xs">
                              <strong>Used by:</strong>{" "}
                              {vuln.used_by?.join(", ")}
                            </div>
                            {vuln.vulnerability_count && (
                              <div className="text-red-600 text-xs">
                                {vuln.vulnerability_count} vulnerabilities
                              </div>
                            )}
                            <div className="text-green-400 mt-1">
                              <strong>Fix:</strong> {parseCodeString(vuln.fix)}
                            </div>
                            {vuln.impact_multiplier && (
                              <div className="text-xs mt-1">
                                {vuln.impact_multiplier}
                              </div>
                            )}
                          </div>
                        ),
                      )}
                    </div>
                  </CollapsibleSection>
                )}

              {/* Version Conflicts & Optimization Opportunities - Side by Side on Desktop */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Version Conflicts */}
                {dependency_intelligence?.version_conflicts &&
                  dependency_intelligence.version_conflicts.length > 0 && (
                    <CollapsibleSection
                      title="Version Conflicts"
                      icon={AlertTriangle}
                    >
                      <div className="space-y-2">
                        {dependency_intelligence.version_conflicts.map(
                          (conflict, i) => (
                            <div
                              key={i}
                              className="p-2 bg-muted rounded text-sm"
                            >
                              <div className="font-medium text-orange-600 ">
                                {conflict.conflict}
                              </div>
                              {conflict.affected_packages && (
                                <div className="text-xs text-muted-foreground mt-1">
                                  Affects:{" "}
                                  {conflict.affected_packages.join(", ")}
                                </div>
                              )}
                              <div className="text-green-400  mt-1">
                                {parseCodeString(conflict.resolution)}
                              </div>
                            </div>
                          ),
                        )}
                      </div>
                    </CollapsibleSection>
                  )}

                {/* Optimization Opportunities */}
                {dependency_intelligence?.optimization_opportunities &&
                  dependency_intelligence.optimization_opportunities.length >
                    0 && (
                    <CollapsibleSection
                      title="Optimization Opportunities"
                      icon={Zap}
                    >
                      <ul className="space-y-1 text-sm">
                        {dependency_intelligence.optimization_opportunities.map(
                          (opp, i) => (
                            <li key={i} className="flex items-start gap-2">
                              <CheckCircle className="w-4 h-4 mt-0.5 text-green-500" />
                              <span>{opp}</span>
                            </li>
                          ),
                        )}
                      </ul>
                    </CollapsibleSection>
                  )}
              </div>
            </div>
          ) : (
            isLoading && <SectionSkeleton />
          )}
        </TabsContent>

        {/* Automation Tab */}
        <TabsContent
          value="automation"
          className="space-y-4 mt-4 scrollbar-background-thumb scrollbar-background-bg"
        >
          <SectionHeading heading={"Automated Execution"} />
          {hasAutomationData ? (
            <div className="space-y-3">
              {/* One-Click Script */}
              {automated_execution?.one_click_script && (
                <CollapsibleSection
                  title="One-Click Fix Script"
                  icon={Terminal}
                  defaultOpen
                >
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                      Execute all fixes in proper sequence with this
                      comprehensive script:
                    </p>
                    <CodeBlock code={automated_execution.one_click_script} />
                  </div>
                </CollapsibleSection>
              )}

              {/* Safe Mode Script */}
              {automated_execution?.safe_mode_script && (
                <CollapsibleSection
                  title="Safe Mode Script (with Backups)"
                  icon={Shield}
                >
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                      Execute fixes with automatic backups and rollback
                      capabilities:
                    </p>
                    <CodeBlock code={automated_execution.safe_mode_script} />
                  </div>
                </CollapsibleSection>
              )}

              {/* Phase Scripts */}
              {automated_execution?.phase_scripts &&
                automated_execution.phase_scripts.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="font-semibold">Individual Phase Scripts</h3>
                    {automated_execution.phase_scripts.map((phaseScript, i) => (
                      <CollapsibleSection
                        key={i}
                        title={`Phase ${phaseScript.phase}: ${phaseScript.name ?? "Script"}`}
                        icon={FileCode}
                      >
                        <CodeBlock code={phaseScript.script} />
                      </CollapsibleSection>
                    ))}
                  </div>
                )}

              {!automated_execution?.one_click_script &&
                !automated_execution?.safe_mode_script &&
                !automated_execution?.phase_scripts && (
                  <div className="text-center text-muted-foreground py-8">
                    No automation scripts available
                  </div>
                )}
            </div>
          ) : (
            isLoading && <SectionSkeleton />
          )}
        </TabsContent>

        {/* Risk & Strategy Tab */}
        <TabsContent value="risk" className="space-y-4 mt-4">
          <SectionHeading heading={"Risk Management & Strategy"} />
          {hasRiskData ? (
            <div className="space-y-3">
              {/* Overall Risk Assessment */}
              {risk_management?.overall_assessment && (
                <div className="p-3 bg-muted rounded-md">
                  <h3 className="font-semibold mb-2">
                    Overall Risk Assessment
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {risk_management.overall_assessment}
                  </p>
                </div>
              )}

              {/* Breaking Changes Summary */}
              {risk_management?.breaking_changes_summary && (
                <CollapsibleSection
                  title="Breaking Changes Summary"
                  icon={AlertTriangle}
                  defaultOpen
                >
                  {risk_management.breaking_changes_summary
                    .has_breaking_changes ? (
                    <div className="space-y-2 text-sm">
                      <div>
                        <strong>Has Breaking Changes:</strong>{" "}
                        {risk_management.breaking_changes_summary
                          .has_breaking_changes
                          ? "Yes"
                          : "No"}
                      </div>
                      {risk_management.breaking_changes_summary.count && (
                        <div>
                          <strong>Count:</strong>{" "}
                          {risk_management.breaking_changes_summary.count}
                        </div>
                      )}
                      {risk_management.breaking_changes_summary
                        .affected_areas && (
                        <div>
                          <strong>Affected Areas:</strong>
                          <ul className="list-disc list-inside ml-2 mt-1">
                            {risk_management.breaking_changes_summary.affected_areas.map(
                              (area, i) => (
                                <li key={i}>{area}</li>
                              ),
                            )}
                          </ul>
                        </div>
                      )}
                      {risk_management.breaking_changes_summary
                        .mitigation_steps && (
                        <div>
                          <strong>Mitigation Steps:</strong>
                          <ol className="list-decimal list-inside ml-2 mt-1">
                            {risk_management.breaking_changes_summary.mitigation_steps.map(
                              (step, i) => (
                                <li key={i}>{parseCodeString(step)}</li>
                              ),
                            )}
                          </ol>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground">
                      No breaking changes detected
                    </div>
                  )}
                </CollapsibleSection>
              )}

              {/* Testing Strategy */}
              {risk_management?.testing_strategy && (
                <CollapsibleSection title="Testing Strategy" icon={CheckCircle}>
                  <div className="space-y-2 text-sm">
                    {risk_management.testing_strategy.unit_tests && (
                      <div>
                        <strong>Unit Tests:</strong>
                        <p className="text-muted-foreground mt-1">
                          {risk_management.testing_strategy.unit_tests}
                        </p>
                      </div>
                    )}
                    {risk_management.testing_strategy.integration_tests && (
                      <div>
                        <strong>Integration Tests:</strong>
                        <p className="text-muted-foreground mt-1">
                          {risk_management.testing_strategy.integration_tests}
                        </p>
                      </div>
                    )}
                    {risk_management.testing_strategy.security_validation && (
                      <div>
                        <strong>Security Validation:</strong>
                        <p className="text-muted-foreground mt-1">
                          {risk_management.testing_strategy.security_validation}
                        </p>
                      </div>
                    )}
                  </div>
                </CollapsibleSection>
              )}

              {/* Rollback Procedures */}
              {risk_management?.rollback_procedures &&
                risk_management.rollback_procedures.length > 0 && (
                  <CollapsibleSection
                    title="Rollback Procedures"
                    icon={AlertTriangle}
                  >
                    <div className="space-y-2">
                      {risk_management.rollback_procedures.map((proc, i) => (
                        <div
                          key={i}
                          className="p-2 bg-accent-foreground rounded text-sm"
                        >
                          <div className="font-medium">Phase {proc.phase}</div>
                          <div className="text-muted-foreground mt-1">
                            {parseCodeString(proc.procedure)}
                          </div>
                          {proc.validation && (
                            <div className="text-green-400  text-xs mt-1">
                              {proc.validation}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </CollapsibleSection>
                )}

              {/* Long-term Strategy */}
              {long_term_strategy && (
                <CollapsibleSection title="Long-term Strategy" icon={FileCode}>
                  <div className="space-y-2 text-sm">
                    {long_term_strategy.preventive_measures && (
                      <div>
                        <strong>Preventive Measures:</strong>
                        <ul className="list-disc list-inside ml-2 mt-1">
                          {long_term_strategy.preventive_measures.map(
                            (measure, i) => (
                              <li key={i}>{measure}</li>
                            ),
                          )}
                        </ul>
                      </div>
                    )}
                    {long_term_strategy.monitoring_setup && (
                      <div>
                        <strong>Monitoring Setup:</strong>
                        <p className="text-muted-foreground mt-1">
                          {long_term_strategy.monitoring_setup}
                        </p>
                      </div>
                    )}
                    {long_term_strategy.update_cadence && (
                      <div>
                        <strong>Recommended Update Cadence:</strong>{" "}
                        <span className="text-primary">
                          {long_term_strategy.update_cadence}
                        </span>
                      </div>
                    )}
                  </div>
                </CollapsibleSection>
              )}
            </div>
          ) : (
            isLoading && <SectionSkeleton />
          )}
        </TabsContent>
      </Tabs>

      {/* Metadata Footer */}
      {metadata && (
        <div className="mt-3 pt-2 border-t border-muted text-xs text-muted-foreground">
          <div className="flex flex-wrap gap-4">
            {metadata.generated_at && (
              <span>
                Generated: {new Date(metadata.generated_at).toLocaleString()}
              </span>
            )}
            {metadata.analysis_duration && (
              <span>Duration: {metadata.analysis_duration}</span>
            )}
            {metadata.total_packages_analyzed && (
              <span>Packages Analyzed: {metadata.total_packages_analyzed}</span>
            )}
            {metadata.ecosystem && <span>Ecosystem: {metadata.ecosystem}</span>}
          </div>
        </div>
      )}
    </div>
  );
};

export default UnifiedFixPlanComponent;
