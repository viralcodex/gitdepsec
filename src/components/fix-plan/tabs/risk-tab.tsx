"use client";

import { AlertTriangle, CheckCircle, FileCode } from "lucide-react";
import { parseCodeString } from "../shared/utilities";
import { CollapsibleSection } from "../components/collapsible-section";
import { UnifiedFixPlan } from "@/constants/model";
import { SectionHeading } from "../components/section-heading";
import { SectionSkeleton } from "../components/section-skeleton";

interface RiskTabProps {
  risk_management?: UnifiedFixPlan["risk_management"];
  long_term_strategy?: UnifiedFixPlan["long_term_strategy"];
  isLoading?: boolean;
}

export const RiskTab = ({ risk_management, long_term_strategy, isLoading }: RiskTabProps) => {
  const hasData = !!risk_management;

  return (
    <div className="space-y-4 mt-4">
      <SectionHeading heading="Risk Management & Strategy" />
      {hasData ? (
        <div className="space-y-3">
          {/* Overall Risk Assessment */}
          {risk_management?.overall_assessment && (
            <div className="p-3 bg-muted rounded-md">
              <h3 className="font-semibold mb-2">Overall Risk Assessment</h3>
              <p className="text-sm text-muted-foreground">{risk_management.overall_assessment}</p>
            </div>
          )}

          {/* Breaking Changes Summary */}
          {risk_management?.breaking_changes_summary && (
            <CollapsibleSection title="Breaking Changes Summary" icon={AlertTriangle} defaultOpen>
              {risk_management.breaking_changes_summary.has_breaking_changes ? (
                <div className="space-y-2 text-sm">
                  <div>
                    <strong>Has Breaking Changes:</strong>{" "}
                    {risk_management.breaking_changes_summary.has_breaking_changes ? "Yes" : "No"}
                  </div>
                  {risk_management.breaking_changes_summary.count && (
                    <div>
                      <strong>Count:</strong> {risk_management.breaking_changes_summary.count}
                    </div>
                  )}
                  {risk_management.breaking_changes_summary.affected_areas && (
                    <div>
                      <strong>Affected Areas:</strong>
                      <ul className="list-disc list-inside ml-2 mt-1">
                        {risk_management.breaking_changes_summary.affected_areas.map((area, i) => (
                          <li key={i}>{area}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {risk_management.breaking_changes_summary.mitigation_steps && (
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
                <div className="text-sm text-muted-foreground">No breaking changes detected</div>
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
              <CollapsibleSection title="Rollback Procedures" icon={AlertTriangle}>
                <div className="space-y-2">
                  {risk_management.rollback_procedures.map((proc, i) => (
                    <div key={i} className="p-2 bg-accent-foreground rounded text-sm">
                      <div className="font-medium">Phase {proc.phase}</div>
                      <div className="text-muted-foreground mt-1">
                        {parseCodeString(proc.procedure)}
                      </div>
                      {proc.validation && (
                        <div className="text-green-400 text-xs mt-1">{proc.validation}</div>
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
                      {long_term_strategy.preventive_measures.map((measure, i) => (
                        <li key={i}>{measure}</li>
                      ))}
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
                    <span className="text-primary">{long_term_strategy.update_cadence}</span>
                  </div>
                )}
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
