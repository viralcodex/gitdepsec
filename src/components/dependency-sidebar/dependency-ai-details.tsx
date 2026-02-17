import { Dependency, VulnerabilitySummaryResponse } from "@/constants/model";
import { cn, getRemediationPriorityConfig } from "@/lib/utils";
import { Badge } from "../ui/badge";
import {
  AlertTriangle,
  LightbulbIcon as LightBulb,
  MinusCircle,
  Siren,
  type LucideIcon,
} from "lucide-react";
import { Progress } from "../ui/progress";
import useAISummaryProgress from "@/hooks/useAISummaryProgress";
import { ErrorState } from "../ui/error-state";

interface DependencyAIDetailsProps {
  dependency: Dependency | undefined;
  isMobile?: boolean;
  error: string | null;
  isLoading: boolean;
  summary: VulnerabilitySummaryResponse | null;
  isCopied: boolean;
  setIsCopied: (copied: boolean) => void;
  handleCopy: () => void;
  setError: (error: string | null) => void;
  setIsLoading: (loading: boolean) => void;
  getSeverityBadge: (score: string) => React.ReactNode;
}

const DependencyAIDetails = (props: DependencyAIDetailsProps) => {
  const { dependency, isMobile, error, isLoading, summary, handleCopy, getSeverityBadge } = props;

  const { progress, finalised, message } = useAISummaryProgress({
    isLoading,
    summary,
  });

  if (!dependency || !dependency.vulnerabilities || dependency.vulnerabilities.length === 0) {
    return (
      <div className="pt-12 px-4 text-center text-white/90">
        No dependency details available
      </div>
    );
  }

  // Summary is already parsed as VulnerabilitySummaryResponse object by the API layer
  const parsedSummary = summary;

  const iconMap: Record<string, LucideIcon> = {
    Siren,
    AlertTriangle,
    MinusCircle,
    LightBulb,
  };

  const getIconComponent = (iconName: string) => {
    const IconComponent = iconMap[iconName] || null;

    return IconComponent ? <IconComponent className="h-8 w-8" size={24} strokeWidth={3} /> : null;
  };

  const getRemediationPriorityBadge = (priority: string) => {
    const config = getRemediationPriorityConfig(priority);
    return (
      <Badge className={cn(isMobile ? "text-sm" : "text-xs", config.className)}>
        {getIconComponent(config.icon)}
        {config.text}
      </Badge>
    );
  };

  const getTimelineBadge = (timeline: string) => {
    timeline = timeline.split(",.")[0].trim();
    if (!timeline || timeline.toLowerCase() === "n/a") {
      return (
        <Badge
          className={cn(isMobile ? "text-sm" : "text-xs", "bg-gray-500 text-white rounded-sm m-0")}
        >
          N/A
        </Badge>
      );
    }
    return (
      <Badge
        className={cn(isMobile ? "text-sm" : "text-xs", "bg-blue-600 text-white rounded-sm m-0")}
      >
        {timeline.toTitleCase()}
      </Badge>
    );
  };

  const parseListItems = (actions: string[]) => {
    if (!actions || actions.length === 0) return <span className="text-white/90 italic">No actions available</span>;
    return (
      <ul className="space-y-2">
        {actions.map((action, idx) => {
          const processedAction = action.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
          const parts = processedAction.split(/(<code>.*?<\/code>)/g);
          return (
            <li key={idx} className="flex items-start gap-2">
              <span className="text-white">•</span>
              <span className="flex-1 text-white">
                {parts.map((part, i) => {
                  if (part.startsWith("<code>") && part.endsWith("</code>")) {
                    const code = part.replace(/<\/?code>/g, "");
                    return (
                      <span
                        key={i}
                        className="inline-flex items-center my-1 bg-muted/80 border border-border/50 rounded px-2 py-1 cursor-pointer hover:bg-muted transition-colors"
                        onClick={handleCopy}
                      >
                        <code className="text-xs font-mono text-white">{code}</code>
                      </span>
                    );
                  } else {
                    const cleanedPart = part.replace(/^[.,;:!?]\s*/, "");
                    return (
                      <span
                        key={i}
                        className="text-white/95"
                        dangerouslySetInnerHTML={{ __html: cleanedPart }}
                      />
                    );
                  }
                })}
              </span>
            </li>
          );
        })}
      </ul>
    );
  };

  const parseText = (text: string) => {
    if (!text) return "No text available";
    // Replace **bold** with <strong>bold</strong>
    return (
      <span
        className="text-white/95"
        dangerouslySetInnerHTML={{
          __html: text.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>"),
        }}
      />
    );
  };

  const getExploitVectorBadge = (vector: string) => {
    if (!vector || vector.toLowerCase() === "n/a") {
      return (
        <Badge
          className={cn(isMobile ? "text-sm" : "text-xs", "bg-gray-500 text-white rounded-sm m-0")}
        >
          N/A
        </Badge>
      );
    }
    return (
      <Badge
        className={cn(isMobile ? "text-sm" : "text-xs", "bg-amber-700 text-white rounded-sm m-0")}
      >
        {"Vector: " + vector.toTitleCase()}
      </Badge>
    );
  };

  return (
    <div className="px-4 py-3 h-full w-full">
      {!finalised ? (
        <div className="flex flex-col items-center justify-center h-full gap-3">
          <Progress value={progress} className="my-2 max-w-[75%] h-2" />
          <p className="text-sm text-white/95 animate-pulse">
            {progress < 90 ? "Generating AI Summary..." : message}
          </p>
        </div>
      ) : error ? (
        <div className="h-full flex items-center justify-center">
          <ErrorState
            variant="server"
            title="Summary Generation Failed"
            message={error}
            size={isMobile ? "sm" : "md"}
          />
        </div>
      ) : (
        <div className="space-y-5">
          {/* Badges Section */}
          <div className="flex flex-wrap gap-2">
            {getSeverityBadge(parsedSummary?.risk_score?.toString() ?? "0")}
            {getRemediationPriorityBadge(parsedSummary?.remediation_priority || "N/A")}
            {getTimelineBadge(parsedSummary?.timeline || "N/A")}
            {getExploitVectorBadge(parsedSummary?.exploit_vector || "N/A")}
          </div>
          {/* Remediation Actions */}
          <section className="space-y-2">
            <h2 className={cn(isMobile ? "text-base" : "text-lg", "font-bold text-white/90 tracking-wide uppercase")}>
              <span className="text-emerald-400">→</span> Remediation Actions
            </h2>
            <div className={cn(isMobile ? "text-xs" : "text-sm", "text-white/95")}>
              {parseListItems(parsedSummary?.recommended_actions || [])}
            </div>
          </section>
          {/* Summary */}
          <section className="space-y-2 mt-5">
            <h2 className={cn(isMobile ? "text-base" : "text-lg", "font-bold text-white/90 tracking-wide uppercase")}>
              <span className="text-blue-400">→</span> Summary
            </h2>
            <p className={cn(isMobile ? "text-xs" : "text-sm", "text-white/95 leading-relaxed")}>
              {parseText(parsedSummary?.summary ?? "")}
            </p>
          </section>
          <section className="space-y-2 mt-5">
            <h2 className={cn(isMobile ? "text-base" : "text-lg", "font-bold text-white/90 tracking-wide uppercase")}>
              <span className="text-amber-400">→</span> Impact
            </h2>
            <p className={cn(isMobile ? "text-xs" : "text-sm", "text-white/95 leading-relaxed")}>
              {parseText(parsedSummary?.impact ?? "")}
            </p>
          </section>

          {/* Affected Components */}
          <section className="space-y-2 mt-5">
            <h2 className={cn(isMobile ? "text-base" : "text-lg", "font-bold text-white/90 tracking-wide uppercase")}>
              <span className="text-rose-400">→</span> Affected Components
            </h2>
            <div className={cn(isMobile ? "text-xs" : "text-sm", "text-white/95")}>
              {parseListItems(parsedSummary?.affected_components ?? [])}
            </div>
          </section>

          {/* Risk Score Justification */}
          <section className="space-y-2 mt-5">
            <h2 className={cn(isMobile ? "text-base" : "text-lg", "font-bold text-white/90 tracking-wide uppercase")}>
              <span className="text-violet-400">→</span> Risk Score Justification
            </h2>
            <div className={cn(isMobile ? "text-xs" : "text-sm", "text-white/95")}>
              {parseListItems(parsedSummary?.risk_score_justification ?? [])}
            </div>
          </section>
        </div>
      )}
    </div>
  );
};

export default DependencyAIDetails;
