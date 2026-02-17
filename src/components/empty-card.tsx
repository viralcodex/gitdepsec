"use client";

import Image from "next/image";
import React from "react";
import { cn } from "@/lib/utils";
import { Coffee, Inbox, Search, FileQuestion } from "lucide-react";
import { Button } from "./ui/button";

type EmptyVariant = "default" | "search" | "data" | "file";

interface EmptyAction {
  label: string;
  onClick?: () => void;
  icon?: React.ReactNode;
}

interface EmptyCardProps {
  /** Size of the icon/illustration */
  size?: "sm" | "md" | "lg";
  /** Visual variant */
  variant?: EmptyVariant;
  /** Custom title */
  title?: string;
  /** Custom message */
  message?: string;
  /** Optional action button */
  action?: EmptyAction;
  /** Use coffee cup illustration instead of icon */
  useCoffeeCup?: boolean;
  /** Additional CSS classes */
  className?: string;
}

const variantConfig: Record<EmptyVariant, { icon: React.ReactNode; defaultTitle: string; defaultMessage: string }> = {
  default: {
    icon: <Inbox className="w-full h-full" />,
    defaultTitle: "Nothing here yet",
    defaultMessage: "This space is emptier than my coffee cup on a Monday morning...",
  },
  search: {
    icon: <Search className="w-full h-full" />,
    defaultTitle: "No results found",
    defaultMessage: "Try adjusting your search or filter criteria",
  },
  data: {
    icon: <Coffee className="w-full h-full" />,
    defaultTitle: "No data available",
    defaultMessage: "There's nothing to display at the moment",
  },
  file: {
    icon: <FileQuestion className="w-full h-full" />,
    defaultTitle: "No files found",
    defaultMessage: "Upload a file or select a repository to get started",
  },
};

const sizeConfig = {
  sm: {
    container: "gap-3 p-6",
    iconWrapper: "w-12 h-12",
    imageSize: 48,
    title: "text-sm font-medium",
    message: "text-xs",
    button: "h-8 text-xs px-3",
  },
  md: {
    container: "gap-4 p-8",
    iconWrapper: "w-16 h-16",
    imageSize: 64,
    title: "text-base font-semibold",
    message: "text-sm",
    button: "h-9 text-sm px-4",
  },
  lg: {
    container: "gap-5 p-10",
    iconWrapper: "w-24 h-24",
    imageSize: 96,
    title: "text-lg font-semibold",
    message: "text-base",
    button: "h-10 text-base px-5",
  },
};

const EmptyCard = ({
  size = "md",
  variant = "default",
  title,
  message,
  action,
  useCoffeeCup = true,
  className,
}: EmptyCardProps) => {
  const config = variantConfig[variant];
  const sizes = sizeConfig[size];

  return (
    <div
      className={cn(
        "relative flex flex-col items-center justify-center text-center h-full",
        "rounded-lg border border-border/50 bg-muted/30 backdrop-blur-sm",
        "transition-all duration-300",
        sizes.container,
        className,
      )}
      role="status"
      aria-label={title || config.defaultTitle}
    >
      {/* Subtle gradient overlay */}
      <div className="absolute inset-0 rounded-lg bg-linear-to-b from-transparent via-transparent to-muted/20 pointer-events-none" />

      {/* Icon or Coffee Cup */}
      <div className="relative mb-2">
        {useCoffeeCup ? (
          <div className={cn("relative", sizes.iconWrapper)}>
            <Image
              src="/coffee-cup.svg"
              alt=""
              className="opacity-60 transition-opacity duration-300 group-hover:opacity-80"
              width={sizes.imageSize}
              height={sizes.imageSize}
              aria-hidden="true"
            />
          </div>
        ) : (
          <div
            className={cn(
              "relative flex items-center justify-center rounded-full",
              "bg-muted/50 border border-border/30",
              "text-muted-foreground/60",
              sizes.iconWrapper,
            )}
          >
            <div className={cn("w-1/2 h-1/2 transition-transform duration-300")}>
              {config.icon}
            </div>
          </div>
        )}
      </div>

      {/* Text content */}
      <div className="space-y-1.5 relative z-10">
        <h3 className={cn(sizes.title, "text-muted-foreground tracking-tight")}>
          {title || config.defaultTitle}
        </h3>
        <p className={cn(sizes.message, "text-muted-foreground/70 max-w-sm leading-relaxed")}>
          {message || config.defaultMessage}
        </p>
      </div>

      {/* Action button */}
      {action && (
        <Button
          variant="outline"
          className={cn(
            sizes.button,
            "mt-4 gap-2 border-border/50 hover:bg-muted/50 transition-all duration-200",
          )}
          onClick={action.onClick}
        >
          {action.icon}
          {action.label}
        </Button>
      )}
    </div>
  );
};

export default EmptyCard;
