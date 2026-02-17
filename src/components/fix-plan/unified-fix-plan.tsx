"use client";
import React, { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { UnifiedFixPlan } from "@/constants/model";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Skeleton } from "../ui/skeleton";
import { Clock, Terminal, Shield, Zap, Copy, X } from "lucide-react";
import { cn } from "@/lib/utils";

// Dynamic imports for tab components with loading states
const OverviewTab = dynamic(
  () => import("./tabs/overview-tab").then((mod) => ({ default: mod.OverviewTab })),
  {
    loading: () => (
      <div className="space-y-4 mt-4">
        <Skeleton className="h-100 w-full" />
      </div>
    ),
  },
);

const IntelligenceTab = dynamic(
  () => import("./tabs/intelligence-tab").then((mod) => ({ default: mod.IntelligenceTab })),
  {
    loading: () => (
      <div className="space-y-4 mt-4">
        <Skeleton className="h-100 w-full" />
      </div>
    ),
  },
);

const PhasesTab = dynamic(
  () => import("./tabs/phases-tab").then((mod) => ({ default: mod.PhasesTab })),
  {
    loading: () => (
      <div className="space-y-4 mt-4">
        <Skeleton className="h-100 w-full" />
      </div>
    ),
  },
);

const AutomationTab = dynamic(
  () => import("./tabs/automation-tab").then((mod) => ({ default: mod.AutomationTab })),
  {
    loading: () => (
      <div className="space-y-4 mt-4">
        <Skeleton className="h-100 w-full" />
      </div>
    ),
  },
);

const RiskTab = dynamic(() => import("./tabs/risk-tab").then((mod) => ({ default: mod.RiskTab })), {
  loading: () => (
    <div className="space-y-4 mt-4">
      <Skeleton className="h-100 w-full" />
    </div>
  ),
});

interface UnifiedFixPlanProps {
  fixPlan: UnifiedFixPlan | null;
  partialFixPlan?: Partial<Record<string, unknown>>;
  isLoading?: boolean;
}

const UnifiedFixPlanComponent = ({ fixPlan, partialFixPlan, isLoading }: UnifiedFixPlanProps) => {
  const [activeTab, setActiveTab] = useState("overview");

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
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
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

        {/* Tab Content - Dynamically Loaded */}
        <TabsContent value="overview">
          <OverviewTab
            executive_summary={executive_summary}
            isLoading={isLoading}
            onNavigateToPhases={() => setActiveTab("phases")}
          />
        </TabsContent>

        <TabsContent value="intelligence">
          <IntelligenceTab
            dependency_intelligence={dependency_intelligence}
            isLoading={isLoading}
          />
        </TabsContent>

        <TabsContent value="phases">
          <PhasesTab priority_phases={priority_phases} isLoading={isLoading} />
        </TabsContent>

        <TabsContent value="automation">
          <AutomationTab automated_execution={automated_execution} isLoading={isLoading} />
        </TabsContent>

        <TabsContent value="risk">
          <RiskTab
            risk_management={risk_management}
            long_term_strategy={long_term_strategy}
            isLoading={isLoading}
          />
        </TabsContent>
      </Tabs>

      {/* Metadata Footer */}
      {metadata && (
        <div className="mt-3 pt-2 border-t border-muted text-xs text-muted-foreground">
          <div className="flex flex-wrap gap-4">
            {metadata.generated_at && (
              <span>Generated: {new Date(metadata.generated_at).toLocaleString()}</span>
            )}
            {metadata.analysis_duration && <span>Duration: {metadata.analysis_duration}</span>}
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
