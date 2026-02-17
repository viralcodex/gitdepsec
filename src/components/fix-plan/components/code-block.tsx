import { Check, Copy } from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";

export const CodeBlock = ({ code }: { code?: string }) => {
  const [copied, setCopied] = useState(false);

  if (!code) return null;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    toast.success("Copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group">
      <button
        onClick={handleCopy}
        className="absolute top-2 right-2 p-1.5 bg-background/80 hover:bg-background cursor-pointer rounded-md transition-colors z-10"
        title="Copy to clipboard"
      >
        {copied ? (
          <Check className="w-4 h-4 text-green-500" />
        ) : (
          <Copy className="w-4 h-4 text-muted-foreground" />
        )}
      </button>
      <pre className="bg-accent-foreground p-3 rounded-md overflow-x-auto text-sm font-mono scrollbar-background-thumb scrollbar-background-bg">
        <code>{code}</code>
      </pre>
    </div>
  );
};
