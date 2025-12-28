import {
  TooltipProvider,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@radix-ui/react-tooltip";
import React from "react";
import { Dropdown } from "./ui/dropdown";
import Image from "next/image";

interface HeaderControlsProps {
  ecosystemOptions: string[];
  selectedEcosystem?: string;
  onEcosystemChange: (ecosystem: string) => void;
  generateFixPlan: (regenerateFixPlan?: boolean) => void;
}

const HeaderControls = ({
  ecosystemOptions,
  selectedEcosystem,
  onEcosystemChange,
  generateFixPlan,
}: HeaderControlsProps) => {
  return (
    <div
      id="Header Buttons"
      className={`flex flex-row items-center justify-center w-full gap-2 mt-4 mb-2`}
    >
      {ecosystemOptions.length > 1 && (
        <div className="sm:w-[200px] w-[40%]">
          <Dropdown
            isBranchDropdown={false}
            ecosystems={ecosystemOptions}
            selectedEcosystem={selectedEcosystem}
            onEcosystemChange={onEcosystemChange}
            className="shadow-none border-input border-1 text-sm"
          />
        </div>
      )}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger
            asChild
            id="generate-fix-plan"
            className="bg-accent-foreground"
          >
            <div
              onClick={() => generateFixPlan(false)}
              className="cursor-pointer gap-x-2 w-[45%] sm:w-[200px] flex flex-row items-center justify-center bg-background py-2.5 border-1 border-accent rounded-md"
            >
              <Image
                priority
                className="text-accent"
                src="/genai.svg"
                alt="Generate Fix Plan"
                width={28}
                height={28}
              />
              <p className="sm:text-md text-sm">Generate Fix Plan</p>
            </div>
          </TooltipTrigger>
          <TooltipContent
            side="bottom"
            sideOffset={-8}
            className="bg-background/80 text-accent text-xs px-2 py-1 rounded-md transition-all ease-in duration-300"
          >
            <p className="font-semibold">
              Fix plan may take several seconds depending on the size of
              project.
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
};

export default HeaderControls;
