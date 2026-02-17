import { Dependency, ShowMoreDescProps, ShowMoreRefsProps, Vulnerability } from "@/constants/model";
import React, { useState } from "react";
import removeMarkdown from "remove-markdown";
import { Badge } from "../ui/badge";
import { ExternalLink } from "lucide-react";
import Link from "next/link";
import { cn, getVulnerabilityUrl } from "@/lib/utils";

interface ProcessedVulnerability extends Vulnerability {
  groupedRefs: { [type: string]: string[] };
}

interface DependencyDetailsProps {
  processedVulns?: ProcessedVulnerability[];
  allDetails?: Dependency | undefined;
  transitiveNodeDetails?: Dependency | undefined;
  matchedTransitiveNode?: Dependency | undefined;
  isMobile?: boolean;
  getSeverityBadge: (score: string) => React.ReactNode;
}

const DependencyDetails = (props: DependencyDetailsProps) => {
  const { processedVulns, allDetails, transitiveNodeDetails, isMobile, getSeverityBadge } = props;

  const [showMoreRefs, setShowMoreRefs] = useState<ShowMoreRefsProps>({});
  const [showMoreDesc, setShowMoreDesc] = useState<ShowMoreDescProps>({});

  return (
    <div className="px-4 py-3">
      {processedVulns && processedVulns.length > 0 ? (
        <div className="space-y-4">
          {processedVulns?.map((vuln, index) => (
            <div key={index} className="pb-4 border-b border-border/40 last:border-b-0">
              {/* Vulnerability Title */}
              <h4 className={cn(isMobile ? "text-sm" : "text-base", "font-semibold text-foreground leading-snug mb-2")}>
                {vuln.summary
                  ? removeMarkdown(vuln.summary.toTitleCase(), {
                    replaceLinksWithURL: true,
                    useImgAltText: true,
                    gfm: true,
                  })
                  : "No summary available"}
              </h4>

              {/* File Path */}
              <p className="text-xs text-muted-foreground mb-3">
                {allDetails?.filePath ? allDetails?.filePath : transitiveNodeDetails?.filePath}
              </p>

              {/* Fix Available Badge */}
              <div className="mb-3">
                {vuln.fixAvailable ? (
                  <Badge className={cn(isMobile ? "text-xs" : "text-xs", "bg-emerald-600/90 text-white")}>
                    Fix Available from v{vuln.fixAvailable}
                  </Badge>
                ) : (
                  <Badge className={cn(isMobile ? "text-xs" : "text-xs", "bg-red-600/90 text-white")}>
                    No Fix Available
                  </Badge>
                )}
              </div>
              {/* Details */}
              <div className="space-y-4">
                <p className={cn(isMobile ? "text-xs" : "text-sm", "text-muted-foreground leading-relaxed")}>
                  {vuln.details ? (
                    vuln.details.length > 200 ? (
                      showMoreDesc[index] ? (
                        <>
                          {removeMarkdown(vuln.details, {
                            replaceLinksWithURL: true,
                            useImgAltText: true,
                            gfm: true,
                          })}
                          <button
                            className="ml-1 text-primary hover:underline font-medium"
                            onClick={() =>
                              setShowMoreDesc((prev) => ({
                                ...prev,
                                [index]: !prev[index],
                              }))
                            }
                          >
                            Show less
                          </button>
                        </>
                      ) : (
                        <>
                          {removeMarkdown(vuln.details, {
                            replaceLinksWithURL: true,
                            useImgAltText: true,
                            gfm: true,
                          }).slice(0, 200)}
                          ...
                          <button
                            className="ml-1 text-primary hover:underline font-medium"
                            onClick={() =>
                              setShowMoreDesc((prev) => ({
                                ...prev,
                                [index]: !prev[index],
                              }))
                            }
                          >
                            Show more
                          </button>
                        </>
                      )
                    ) : (
                      removeMarkdown(vuln.details, {
                        replaceLinksWithURL: true,
                        useImgAltText: true,
                        gfm: true,
                      })
                    )
                  ) : (
                    <span className="italic">No details available</span>
                  )}
                </p>
                {/* Vulnerability ID */}
                {vuln.id && (
                  <div className="space-y-1">
                    <p className={cn(isMobile ? "text-sm" : "text-sm", "font-semibold text-foreground")}>
                      Vulnerability ID
                    </p>
                    <a
                      className="inline-flex items-center gap-1.5 text-primary hover:underline text-sm"
                      href={getVulnerabilityUrl(vuln.id)}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {vuln.id}
                      <ExternalLink className="size-3.5" />
                    </a>
                  </div>
                )}
                {/* Severity Scores */}
                {vuln.severityScore && (
                  <div className="space-y-2">
                    <p className={cn(isMobile ? "text-sm" : "text-sm", "font-semibold text-foreground")}>
                      Severity
                    </p>
                    <div className="flex flex-col gap-1.5">
                      <p className={cn(isMobile ? "text-xs" : "text-sm", "text-muted-foreground flex items-center gap-2")}>
                        CVSS V3: {getSeverityBadge(vuln.severityScore.cvss_v3 ?? "unknown")}
                      </p>
                      <p className={cn(isMobile ? "text-xs" : "text-sm", "text-muted-foreground flex items-center gap-2")}>
                        CVSS V4: {getSeverityBadge(vuln.severityScore.cvss_v4 ?? "unknown")}
                      </p>
                    </div>
                  </div>
                )}
                {/* References */}
                {vuln.references && vuln.references.length > 0 && (
                  <div className="space-y-2">
                    <p className={cn(isMobile ? "text-sm" : "text-sm", "font-semibold text-foreground")}>
                      References
                    </p>
                    <div className="space-y-3">
                      {Object.entries(vuln.groupedRefs).map(([type, urls]) => (
                        <div key={type}>
                          <p className="text-xs font-medium text-muted-foreground mb-1">
                            {type.slice(0, 1) + type.slice(1).toLowerCase()}
                          </p>
                          <div className="space-y-1">
                            {(showMoreRefs[type] ? urls : urls.slice(0, 3)).map((url, refIndex) => (
                              <div key={refIndex} className="break-all">
                                <Link
                                  href={url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className={cn(
                                    isMobile ? "text-xs" : "text-xs",
                                    "text-primary/80 hover:text-primary hover:underline transition-colors",
                                  )}
                                >
                                  {url}
                                </Link>
                              </div>
                            ))}
                          </div>
                          {urls.length > 3 && (
                            <button
                              onClick={() =>
                                setShowMoreRefs((prev) => ({
                                  ...prev,
                                  [type]: !prev[type],
                                }))
                              }
                              className="text-xs text-primary hover:underline mt-1"
                            >
                              {showMoreRefs[type] ? "Show less" : `Show ${urls.length - 3} more...`}
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground text-center py-8">
          No vulnerabilities found for this dependency.
        </p>
      )}
    </div>
  );
};

export default DependencyDetails;
