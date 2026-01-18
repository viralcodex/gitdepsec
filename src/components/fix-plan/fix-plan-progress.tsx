import { Progress } from "../ui/progress";
import { cn } from "@/lib/utils";
import { CheckCircle } from "lucide-react";
import { PHASES } from "@/constants/constants";

interface FixPlanProgressProps {
  isLoading: boolean;
  currentPhase: string;
  progress: number;
}

const FixPlanProgress = ({
  isLoading = false,
  currentPhase = "Preprocessing",
  progress = 0,
}: FixPlanProgressProps) => {
  // Calculate which phase we're on
  const currentPhaseIndex = PHASES.findIndex((p) => p.id === currentPhase);

  return (
    <div
      className={cn(
        "space-y-2 py-2 px-4 mx-4 mb-2 bg-muted/60 rounded-b-lg border border-muted transition-all duration-500 ease-in-out overflow-hidden",
        !isLoading && "max-h-0 opacity-0 py-0 my-0 border-0",
      )}
    >
      {/* Phase Indicators */}
      <div className="flex items-center justify-between gap-1">
        {PHASES.map((phase, index) => {
          const PhaseIcon = phase.icon;
          const isActive = index === currentPhaseIndex;
          const isCompleted = index < currentPhaseIndex;

          return (
            <div
              key={phase.id}
              className={cn(
                "flex flex-col items-center gap-0.5 flex-1 transition-all duration-300",
                isActive && "scale-105",
              )}
            >
              <div
                className={cn(
                  "w-7 h-7 rounded-full flex items-center justify-center border transition-all",
                  isCompleted && "bg-green-500 border-green-500",
                  isActive && "bg-primary border-primary animate-pulse",
                  !isActive &&
                    !isCompleted &&
                    "bg-muted border-muted-foreground/20",
                )}
              >
                {isCompleted ? (
                  <CheckCircle className="w-3.5 h-3.5 text-white" />
                ) : isActive ? (
                  <PhaseIcon className={cn("w-3.5 h-3.5", phase.color)} />
                ) : (
                  <PhaseIcon className="w-3.5 h-3.5 text-muted-foreground" />
                )}
              </div>
              <span
                className={cn(
                  "text-[10px] text-center max-w-25 transition-all hidden sm:block leading-tight",
                  isActive && "font-semibold text-foreground",
                  isCompleted && "text-green-600 dark:text-green-400",
                  !isActive && !isCompleted && "text-muted-foreground",
                )}
              >
                {phase.name}
              </span>
            </div>
          );
        })}
      </div>
      {/* Progress Bar */}
      <div className="space-x-3 mx-[5%] flex flex-row items-center justify-between">
        <div className="flex justify-end items-center">
          <span className="text-[10px] text-muted-foreground">
            {Math.round(progress)}%
          </span>
        </div>
        <Progress value={progress} className="h-1.5" />
      </div>
    </div>
  );
};

export default FixPlanProgress;
