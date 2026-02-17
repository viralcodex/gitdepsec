import { FileCode } from "lucide-react";

export const SectionHeading = ({ heading }: { heading: string }) => (
  <div className="flex flex-row items-center justify-start gap-2">
    <FileCode className="w-5 h-5 text-muted-foreground" />
    <h2 className="text-xl font-bold">{heading}</h2>
  </div>
);
