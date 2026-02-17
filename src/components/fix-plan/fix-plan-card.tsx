import { Card, CardContent, CardHeader, CardFooter } from "../ui/card";
import { Download, RefreshCcw, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import Image from "next/image";
import { useErrorState, useFixPlanData, useFixPlanProgress, useFixPlanState } from "@/store/app-store";
import { useMemo } from "react";
import FixPlanProgress from "./fix-plan-progress";
import GlobalFixPlan from "./global-fix-plan";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../ui/tabs";
import { ServerError } from "../ui/error-state";

interface FixPlanCardProps {
  onClose: () => void;
  onDownload: () => void;
  regenerateFixPlan: (regenerateFixPlan: boolean) => void;
  ecosystemOptions?: string[];
}

const FixPlanCard = (props: FixPlanCardProps) => {
  const { onClose, onDownload, regenerateFixPlan, ecosystemOptions } = props;

  const { globalFixPlan } = useFixPlanData();
  const { fixPlanError } = useErrorState();
  const {
    isLoading: isFixPlanLoading,
    currentPhase: currentFixPlanPhase,
    progress: fixPlanProgress,
  } = useFixPlanProgress();

  const { ecosystemFixPlans, selectedEcosystem, setSelectedEcosystem, ecosystemProgress } =
    useFixPlanState();

  // Check if there's a global error
  const globalError = fixPlanError?._global;

  const shouldShowEcosystemTabs = useMemo(() => {
    return ecosystemOptions && ecosystemOptions.length > 1;
  }, [ecosystemOptions]);

  // Determine the active ecosystem tab (use first option if none selected)
  const activeEcosystem = useMemo(() => {
    if (!shouldShowEcosystemTabs || !ecosystemOptions) {
      return null;
    }
    return selectedEcosystem || ecosystemOptions[0];
  }, [shouldShowEcosystemTabs, ecosystemOptions, selectedEcosystem]);

  // Check if fix plan is complete
  const fixPlanComplete = useMemo(() => {
    if (globalFixPlan) return true;
    if (!shouldShowEcosystemTabs || !ecosystemOptions) return false;

    return ecosystemOptions.every((ecosystem) => {
      const plan = ecosystemFixPlans[ecosystem];
      const progress = ecosystemProgress[ecosystem]?.progress;
      return Boolean(plan) || progress === 100;
    });
  }, [
    globalFixPlan,
    ecosystemFixPlans,
    ecosystemProgress,
    shouldShowEcosystemTabs,
    ecosystemOptions,
  ]);

  return (
    <div className="fixed inset-0 z-106 flex items-center justify-center bg-black/20 backdrop-blur-xs p-2 sm:p-4">
      <Card className="bg-background border-none text-card w-full h-full flex flex-col gap-0 rounded-b-md">
        <CardHeader className="sm:px-6 px-2 py-2 gap-0 bg-muted rounded-t-md border-b-2 border-muted-foreground/50">
          <div className="flex flex-row items-center justify-between w-full">
            <div className="flex flex-row items-center gap-x-2">
              <Image
                priority
                src="/genaibutton.svg"
                alt="GenAI Glowing Button"
                width={36}
                height={36}
              />{" "}
              <span className="font-ui-pixel">AI Fix Plan</span>
            </div>
            <div className="flex flex-row justify-between space-x-2 sm:space-x-4 lg:space-x-8 xl:space-x-12">
              <Tooltip>
                <TooltipTrigger asChild id="regenerate-fix-plan">
                  <button disabled={!fixPlanComplete} onClick={() => regenerateFixPlan(true)}>
                    <RefreshCcw
                      className={cn(
                        fixPlanComplete
                          ? "cursor-pointer"
                          : "text-muted-foreground cursor-not-allowed",
                      )}
                    />
                  </button>
                </TooltipTrigger>
                <TooltipContent>Regenerate Fix Plan</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild id="download-fix-plan">
                  <button disabled={!fixPlanComplete} onClick={onDownload}>
                    <Download
                      className={cn(
                        fixPlanComplete
                          ? "cursor-pointer"
                          : "text-muted-foreground cursor-not-allowed",
                      )}
                    />
                  </button>
                </TooltipTrigger>
                <TooltipContent>Download Fix Plan</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild id="close-fix-plan">
                  <X className="cursor-pointer" onClick={onClose} />
                </TooltipTrigger>
                <TooltipContent>Close</TooltipContent>
              </Tooltip>
            </div>
          </div>
        </CardHeader>
        <CardContent className="h-full overflow-hidden">
          <div className="w-full h-full overflow-y-auto scrollbar-background-bg scrollbar-background-thumb">
            {globalError ? (
              <div className="flex items-center justify-center h-full min-h-75">
                <ServerError
                  title="Fix Plan Generation Failed"
                  message={globalError}
                  size="md"                  
                  primaryAction={{
                    label: "Try Again",
                    icon: <RefreshCcw className="w-4 h-4" />,
                    onClick: () => regenerateFixPlan(true),
                  }}
                />
              </div>
            ) : shouldShowEcosystemTabs ? (
              <Tabs
                value={activeEcosystem || ecosystemOptions![0]}
                onValueChange={setSelectedEcosystem}
                className="w-full"
                defaultValue={ecosystemOptions![0]}
              >
                <TabsList
                  className="w-full grid items-center rounded-t-none"
                  style={{
                    gridTemplateColumns: `repeat(${ecosystemOptions!.length}, minmax(0, 1fr))`,
                  }}
                >
                  {ecosystemOptions!.map((ecosystem) => (
                    <TabsTrigger
                      key={ecosystem}
                      value={ecosystem}
                      className="font-ui-heading font-bold tracking-wide cursor-pointer rounded-t-none"
                    >
                      {ecosystem.toUpperCase()}
                    </TabsTrigger>
                  ))}
                </TabsList>
                {ecosystemOptions!.map((ecosystem) => {
                  const ecosystemFixPlan = ecosystemFixPlans[ecosystem];
                  const ecosystemProgressData = ecosystemProgress[ecosystem];
                  // Ecosystem is done if it has a fix plan OR progress is 100%
                  const isEcosystemComplete =
                    Boolean(ecosystemFixPlan) || ecosystemProgressData?.progress === 100;
                  const isEcosystemLoading = isFixPlanLoading && !isEcosystemComplete;

                  return (
                    <TabsContent key={ecosystem} value={ecosystem} className="mt-0">
                      {isEcosystemLoading && (
                        <FixPlanProgress
                          isLoading={true}
                          currentPhase={ecosystemProgressData?.phase || ""}
                          progress={ecosystemProgressData?.progress || 0}
                        />
                      )}
                      <GlobalFixPlan
                        globalFixPlan={ecosystemFixPlan}
                        ecosystem={ecosystem}
                        isFixPlanLoading={isEcosystemLoading}
                      />
                    </TabsContent>
                  );
                })}
              </Tabs>
            ) : (
              <>
                <FixPlanProgress
                  isLoading={isFixPlanLoading}
                  currentPhase={currentFixPlanPhase || ""}
                  progress={fixPlanProgress}
                />
                {/* UNIFIED GLOBAL FIX PLAN */}
                <GlobalFixPlan globalFixPlan={globalFixPlan} isFixPlanLoading={isFixPlanLoading} />
              </>
            )}
          </div>
        </CardContent>
        <CardFooter className="px-4 flex flex-row">
          <p className={cn("text-xs", "italic text-foreground pb-2")}>
            *AI results can be inaccurate. Always verify before taking action.
          </p>
        </CardFooter>
      </Card>
    </div>
  );
};

export default FixPlanCard;
