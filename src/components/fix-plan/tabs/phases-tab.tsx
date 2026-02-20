"use client";

import { useState } from "react";
import { Clock, AlertTriangle } from "lucide-react";
import { parseCodeString } from "../shared/utilities";
import { SectionHeading } from "../components/section-heading";
import { CollapsibleSection } from "../components/collapsible-section";
import { CodeBlock } from "../components/code-block";
import { UnifiedFixPlan } from "@/constants/model";
import { SectionSkeleton } from "../components/section-skeleton";

interface PhasesTabProps {
  priority_phases?: UnifiedFixPlan["priority_phases"];
  isLoading?: boolean;
}

export const PhasesTab = ({ priority_phases, isLoading }: PhasesTabProps) => {
  const [copiedCommand, setCopiedCommand] = useState<string | null>(null);
  const hasData = !!priority_phases && priority_phases.length > 0;

  const copyCommand = async (command: string) => {
    await navigator.clipboard.writeText(command);
    setCopiedCommand(command);
    setTimeout(() => setCopiedCommand(null), 2000);
  };

  return (
    <div className="space-y-4 mt-4">
      <SectionHeading heading="Priority Fix Phases" />
      {hasData ? (
        <div className="space-y-3">
          {priority_phases.map((phase, idx) => (
            <CollapsibleSection
              key={idx}
              title={`Phase ${phase.phase}: ${phase.name} (${phase.urgency})`}
              icon={Clock}
              defaultOpen={idx === 0}
            >
              <div className="space-y-3">
                <div className="text-sm">
                  <strong>Estimated Time:</strong> {phase.estimated_time ?? "N/A"}
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
                            <span className="font-semibold">{fix.package}</span>
                            {fix.breaking_changes && (
                              <span className="text-xs bg-orange-500/20 text-orange-600 px-2 py-0.5 rounded">
                                Breaking!
                              </span>
                            )}
                          </div>
                          <div className="text-muted-foreground">
                            <strong>Action:</strong> {parseCodeString(fix.action?.toTitleCase())}
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
                                  <span className="text-green-400">Copied!</span>
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
                {phase.batch_commands && phase.batch_commands.length > 0 && (
                  <div>
                    <div className="font-ui-pixel text-sm mb-1">Batch Commands:</div>
                    <CodeBlock code={phase.batch_commands.join("\n")} label="BATCH" />
                  </div>
                )}

                {/* Validation Steps */}
                {phase.validation_steps && phase.validation_steps.length > 0 && (
                  <div>
                    <div className="font-medium text-sm mb-1">Validation Steps:</div>
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
    </div>
  );
};
