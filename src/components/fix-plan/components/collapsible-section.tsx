import { ChevronDown, ChevronRight } from "lucide-react";
import { useState } from "react";

export const CollapsibleSection = ({
  title,
  icon: Icon,
  children,
  defaultOpen = false,
}: {
  title: string;
  icon?: React.ElementType;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border border-muted rounded-md shadow-xl">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-2 p-3 bg-muted hover:bg-muted/80 transition-colors cursor-pointer"
      >
        {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        {Icon && <Icon className="w-4 h-4" />}
        <span className="font-medium">{title}</span>
      </button>
      {isOpen && (
        <div className="p-3 space-y-2 scrollbar-background-thumb scrollbar-background-bg">
          {children}
        </div>
      )}
    </div>
  );
};
