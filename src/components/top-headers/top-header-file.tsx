import { LucideLoader2, LucideArrowBigRight } from "lucide-react";
import React from "react";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import { Input } from "../ui/input";
import toast from "react-hot-toast";
import { cn, parseFileName } from "@/lib/utils";
import { useRouter } from "next/navigation";
import HeaderToggle from "../header-toggle";
import {
  useGraphState,
  useDiagramState,
  useErrorState,
  useUIState,
  useRepoState,
  useFileState,
} from "@/store/app-store";

interface TopHeaderFileProps {
  inputFile: File | null;
  setInputFile: (file: File | null) => void;
  resetGraphSvg: () => void;
}

const TopHeaderFile = (props: TopHeaderFileProps) => {
  const { inputFile, setInputFile, resetGraphSvg } = props;
  // Store hooks
  const { resetRepoState } = useRepoState();
  const { uploaded, newFileName } = useFileState();
  const { loading, setLoading } = useGraphState();
  const { isDiagramExpanded } = useDiagramState();
  const { setError } = useErrorState();
  const { setFileHeaderOpen } = useUIState();

  const router = useRouter();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!inputFile) {
      setError("No file selected");
      return;
    }
    if (!uploaded) {
      setError("File not uploaded yet. Please wait.");
      toast.error("File not uploaded yet. Please wait.");
      return;
    }
    // Redirect or perform any action with the uploaded file
    console.log("File ready for analysis:", newFileName);
    toast.success("File ready for analysis");
    setLoading(true);
    setError("");
    resetGraphSvg();
    resetRepoState();
    router.push(`/file_upload/${encodeURIComponent(newFileName)}`);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={cn(
        isDiagramExpanded ? "hidden" : "w-full flex flex-col items-center justify-center",
      )}
      aria-label="File analysis form"
    >
      <div className="flex flex-col items-center justify-center px-4 pt-4 w-full">
        <Card className="relative max-h-[200px] bg-background sm:max-w-[700px] w-full border-2 border-accent mx-auto mt-4 flex justify-between p-4 gap-4 sm:flex-row flex-col">
          <HeaderToggle from="file" setIsFileHeaderOpen={setFileHeaderOpen} />
          <div className="flex flex-col items-center justify-center sm:w-[54.5%] h-14 rounded-md border-1 px-4 py-2">
            <Input
              className="font-ui-mono flex flex-col items-center justify-center border-none cursor-pointer text-sm"
              type="file"
              onChange={(e) => {
                setInputFile(e.target.files?.[0] || null);
                setError("");
              }}
              aria-label="Upload manifest file for analysis"
            />
          </div>
          <div className="font-ui-mono border-1 rounded-md text-accent text-md flex flex-col items-center justify-center sm:w-[42%] w-full p-2">
            <span className="">{parseFileName(newFileName)}</span>
          </div>
          <Button
            className="font-ui-heading sm:h-14 sm:w-15 bg-muted-foreground disabled:bg-muted-foreground disabled:opacity-80 hover:bg-input text-sm font-semibold cursor-pointer"
            type="submit"
            disabled={loading || !uploaded || !inputFile}
          >
            {loading ? (
              <LucideLoader2 className="animate-spin" strokeWidth={3} />
            ) : (
              <span className="flex flex-row items-center justify-center">
                <span className="sm:hidden">Analyse</span>
                <LucideArrowBigRight strokeWidth={3} />
              </span>
            )}
          </Button>
        </Card>
      </div>
    </form>
  );
};

export default TopHeaderFile;
