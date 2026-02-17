"use client";

import { Sparkles, AlertTriangle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { parseCodeString, wrapInCodeTag } from "../shared/utilities";
import { CollapsibleSection } from "../components/collapsible-section";
import { UnifiedFixPlan } from "@/constants/model";
import { SectionHeading } from "../components/section-heading";
import { SectionSkeleton } from "../components/section-skeleton";
import CriticalPaths from "../components/critical-paths";

interface IntelligenceTabProps {
  dependency_intelligence?: UnifiedFixPlan["dependency_intelligence"];
  isLoading?: boolean;
}

export const IntelligenceTab = ({ dependency_intelligence, isLoading }: IntelligenceTabProps) => {
  const hasData = !!dependency_intelligence;

  return (
    <div className="space-y-4 mt-4">
      <SectionHeading heading="Dependency Intelligence" />
      {hasData ? (
        <div className="space-y-3">
          {/* Smart Actions */}
          <CollapsibleSection title="Recommended Actions" icon={Sparkles} defaultOpen>
            {dependency_intelligence?.smart_actions ? (
              <div className="grid gap-3 md:grid-cols-3">
                {dependency_intelligence.smart_actions.map((action, i) => (
                  <div
                    key={i}
                    className="flex flex-col h-full bg-muted border border-black rounded-lg p-3 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-semibold text-sm">{action.title}</h4>
                    </div>
                    <span className="text-xs text-muted-foreground mb-2">
                      {parseCodeString(action.description)}
                    </span>
                    <div className="flex justify-between text-xs mt-auto">
                      <p className="flex-[65%] font-medium text-green-400">{action.impact}</p>
                    </div>
                    {action.command && (
                      <div className="mt-2">{parseCodeString(wrapInCodeTag(action.command))}</div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              isLoading && (
                <div className="mb-6">
                  <div className="grid gap-3 md:grid-cols-3">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="border border-muted rounded-lg p-4 bg-muted/30">
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
          </CollapsibleSection>

          {/* Critical Paths */}
          {dependency_intelligence?.critical_paths &&
            dependency_intelligence.critical_paths.length > 0 && (
              <CollapsibleSection
                title="Critical Dependency Paths"
                icon={AlertTriangle}
                defaultOpen
              >
                <CriticalPaths
                  data={dependency_intelligence.critical_paths}
                  sharedTransitiveVulnerabilities={
                    dependency_intelligence.shared_transitive_vulnerabilities
                  }
                />
              </CollapsibleSection>
            )}

          {/* Version Conflicts */}
          {dependency_intelligence?.version_conflicts &&
            dependency_intelligence.version_conflicts.length > 0 && (
              <CollapsibleSection title="Version Conflicts" icon={AlertTriangle}>
                <div className="flex flex-col sm:flex-row flex-wrap gap-3">
                  {dependency_intelligence.version_conflicts.map((conflict, i) => (
                    <div
                      key={i}
                      className="flex-1 min-w-70 p-3 bg-muted rounded-lg border border-muted text-sm space-y-2 hover:shadow-md transition-shadow"
                    >
                      <div className="font-medium text-orange-600">{conflict.conflict}</div>
                      {conflict.affected_packages && (
                        <div className="text-xs text-muted-foreground">
                          Affects: {conflict.affected_packages.join(", ")}
                        </div>
                      )}
                      <div className="text-green-400">{parseCodeString(conflict.resolution)}</div>
                    </div>
                  ))}
                </div>
              </CollapsibleSection>
            )}
        </div>
      ) : (
        isLoading && <SectionSkeleton />
      )}
    </div>
  );
};
