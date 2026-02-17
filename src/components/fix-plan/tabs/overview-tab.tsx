"use client";

import { AlertTriangle, Zap, ChevronRight } from "lucide-react";
import { parseCodeString } from "../shared/utilities";
import { SectionHeading } from "../components/section-heading";
import { SectionSkeleton } from "../components/section-skeleton";
import { MetricCard } from "../components/metric-card";
import { UnifiedFixPlan } from "@/constants/model";

interface OverviewTabProps {
  executive_summary?: UnifiedFixPlan["executive_summary"];
  isLoading?: boolean;
  onNavigateToPhases: () => void;
}

export const OverviewTab = ({
  executive_summary,
  isLoading,
  onNavigateToPhases,
}: OverviewTabProps) => {
  const hasData = !!executive_summary;

  return (
    <div className="space-y-4 mt-4">
      <SectionHeading heading="Executive Summary" />
      {hasData ? (
        <>
          {/* Key Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <MetricCard
              label="Total Vulnerabilities"
              value={executive_summary?.total_vulnerabilities ?? "—"}
            />
            <MetricCard
              label="Fixable"
              value={executive_summary?.fixable_count ?? "—"}
              valueClass="text-green-500"
            />
            <MetricCard
              label="Risk Score"
              value={executive_summary?.risk_score?.toFixed(1) ?? "—"}
              valueClass="text-orange-500"
            />
            <MetricCard
              label="Estimated Time"
              value={executive_summary?.estimated_fix_time ?? "—"}
            />
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
                    <li key={i} className="flex items-start gap-2 p-2 bg-muted rounded">
                      <span className="text-muted-foreground">•</span>
                      <span className="text-sm">{parseCodeString(insight)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

          {/* Quick Wins */}
          {executive_summary?.quick_wins && executive_summary.quick_wins.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold flex items-center gap-2">
                  <Zap className="w-4 h-4 text-yellow-500" />
                  Quick Wins
                </h3>
                <button
                  onClick={onNavigateToPhases}
                  className="text-xs text-accent transition-colors flex items-center gap-1 cursor-pointer hover:underline"
                >
                  View in Phases <ChevronRight className="w-3 h-3" />
                </button>
              </div>
              <ul className="space-y-2">
                {executive_summary.quick_wins.map((win, i) => (
                  <li key={i} className="flex items-start gap-2 p-2 bg-muted rounded">
                    <span>•</span>
                    <span className="text-sm flex-1">{parseCodeString(win)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      ) : (
        isLoading && <SectionSkeleton />
      )}
    </div>
  );
};
