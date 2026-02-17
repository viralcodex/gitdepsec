"use client";

import { Terminal } from "lucide-react";
import { CodeBlock } from "../components/code-block";
import { UnifiedFixPlan } from "@/constants/model";
import { SectionHeading } from "../components/section-heading";
import { SectionSkeleton } from "../components/section-skeleton";

interface AutomationTabProps {
  automated_execution?: UnifiedFixPlan["automated_execution"];
  isLoading?: boolean;
}

export const AutomationTab = ({ automated_execution, isLoading }: AutomationTabProps) => {
  const hasData = !!automated_execution;

  if (isLoading) return <SectionSkeleton />;

  return (
    <div className="space-y-4 mt-4">
      <SectionHeading heading="Automated Execution" />
      {hasData ? (
        <div className="space-y-4">
          {/* One-Click Script */}
          {automated_execution.one_click_script && (
            <div className="space-y-2">
              <h3 className="font-semibold flex items-center gap-2">
                <Terminal className="w-4 h-4" />
                One-Click Fix Script
              </h3>
              <CodeBlock code={automated_execution.one_click_script} />
            </div>
          )}

          {/* Safe Mode Script */}
          {automated_execution.safe_mode_script && (
            <div className="space-y-2">
              <h3 className="font-semibold flex items-center gap-2">
                <Terminal className="w-4 h-4" />
                Safe Mode Script (with backups)
              </h3>
              <CodeBlock code={automated_execution.safe_mode_script} />
            </div>
          )}

          {/* Phase Scripts */}
          {automated_execution.phase_scripts && automated_execution.phase_scripts.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-semibold">Individual Phase Scripts</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {automated_execution.phase_scripts.map((script, idx) => (
                  <div key={idx} className="space-y-2">
                    <h4 className="text-sm font-medium">
                      Phase {script.phase}: {script.name ?? `Phase ${script.phase}`}
                    </h4>
                    <CodeBlock code={script.script} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <p className="text-muted-foreground text-sm">No automation data available</p>
      )}
    </div>
  );
};
