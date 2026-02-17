"use client";

import toast from "react-hot-toast";

export const parseCodeString = (str?: string) => {
  if (!str) return null;

  const stringWithBoldWords = str.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
  const parts = stringWithBoldWords.split(/(<code>.*?<\/code>|<strong>.*?<\/strong>)/g);

  return (
    <span>
      {parts.map((part, index) => {
        if (part.match(/^<code>.*<\/code>$/)) {
          const codeText = part.replace(/<\/?code>/g, "");
          return (
            <code
              key={index}
              className="bg-accent-foreground px-1.5 py-0.5 rounded text-sm font-mono cursor-pointer wrap-break-word whitespace-pre-wrap inline-block max-w-full"
              onClick={() => {
                navigator.clipboard.writeText(codeText);
                toast.success("Copied to clipboard!");
              }}
            >
              {codeText}
            </code>
          );
        }
        if (part.match(/^<strong>.*<\/strong>$/)) {
          const boldText = part.replace(/<\/?strong>/g, "");
          return (
            <strong key={index} className="font-bold">
              {boldText}
            </strong>
          );
        }
        return <span key={index}>{part}</span>;
      })}
    </span>
  );
};

export const wrapInCodeTag = (text: string): string => {
  return text.includes("<code>") ? text : `<code>${text}</code>`;
};
