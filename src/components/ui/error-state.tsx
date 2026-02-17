"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { AlertTriangle, RefreshCcw, Home, ArrowLeft, XCircle, WifiOff, ServerCrash } from "lucide-react";
import { Button } from "./button";
import { Badge } from "./badge";
import Link from "next/link";

type ErrorVariant = "default" | "network" | "server" | "notFound" | "permission";

interface ErrorAction {
    label: string;
    onClick?: () => void;
    href?: string;
    icon?: React.ReactNode;
    variant?: "default" | "outline" | "ghost";
}

interface ErrorStateProps {
    title?: string;
    message?: string;
    variant?: ErrorVariant;
    size?: "sm" | "md" | "lg";
    primaryAction?: ErrorAction;
    secondaryAction?: ErrorAction;
    className?: string;
    icon?: React.ReactNode;
    code?: string | number;
}

const variantConfig: Record<ErrorVariant, { icon: React.ReactNode; defaultTitle: string; color: string }> = {
    default: { icon: <XCircle />, defaultTitle: "Something went wrong", color: "text-destructive" },
    network: { icon: <WifiOff />, defaultTitle: "Connection Lost", color: "text-amber-500" },
    server: { icon: <ServerCrash />, defaultTitle: "Server Error", color: "text-destructive" },
    notFound: { icon: <AlertTriangle />, defaultTitle: "Not Found", color: "text-muted-foreground" },
    permission: { icon: <AlertTriangle />, defaultTitle: "Access Denied", color: "text-orange-500" },
};

const sizeConfig = {
    sm: { container: "gap-3 p-4", icon: "size-10", title: "text-base", message: "text-xs", code: "text-[10px]" },
    md: { container: "gap-4 p-6", icon: "size-16", title: "text-lg", message: "text-sm", code: "text-xs" },
    lg: { container: "gap-6 p-8", icon: "size-20", title: "text-2xl", message: "text-base", code: "text-sm" },
};

const ErrorState = ({
    title,
    message,
    variant = "default",
    size = "md",
    primaryAction,
    secondaryAction,
    className,
    icon,
    code,
}: ErrorStateProps) => {
    const config = variantConfig[variant];
    const sizes = sizeConfig[size];

    const ActionButton = ({ action, isPrimary }: { action: ErrorAction; isPrimary: boolean }) => {
        const btn = (
            <Button
                variant={action.variant || (isPrimary ? "default" : "outline")}
                className="gap-2"
                onClick={action.onClick}
            >
                {action.icon}
                {action.label}
            </Button>
        );
        return action.href ? <Link href={action.href}>{btn}</Link> : btn;
    };

    return (
        <div className={cn("flex flex-col items-center justify-center text-center", sizes.container, className)}>
            {code && (
                <Badge variant="outline" className={cn("mb-2 rounded-full font-mono tracking-wider uppercase", sizes.code)}>
                    Error {code}
                </Badge>
            )}

            <div className={cn("flex items-center justify-center rounded-full bg-muted border border-border/30", sizes.icon, config.color)}>
                {icon || config.icon}
            </div>

            <h3 className={cn("font-semibold tracking-tight", sizes.title, config.color)}>
                {title || config.defaultTitle}
            </h3>

            {message && (
                <p className={cn("text-muted-foreground max-w-sm", sizes.message)}>{message}</p>
            )}

            {(primaryAction || secondaryAction) && (
                <div className="flex flex-wrap items-center justify-center gap-3 mt-4">
                    {primaryAction && <ActionButton action={primaryAction} isPrimary />}
                    {secondaryAction && <ActionButton action={secondaryAction} isPrimary={false} />}
                </div>
            )}
        </div>
    );
};

// Pre-configured variants for common use cases
export const NetworkError = (props: Partial<ErrorStateProps>) => (
    <ErrorState
        variant="network"
        message="Please check your internet connection and try again."
        primaryAction={{
            label: "Retry",
            icon: <RefreshCcw className="w-4 h-4" />,
            ...props.primaryAction,
        }}
        {...props}
    />
);

export const ServerError = (props: Partial<ErrorStateProps>) => (
    <ErrorState
        variant="server"
        message="The server encountered an error. Please try again later."
        primaryAction={{
            label: "Try Again",
            icon: <RefreshCcw className="w-4 h-4" />,
            ...props.primaryAction,
        }}
        {...props}
    />
);

export const NotFoundError = (props: Partial<ErrorStateProps>) => (
    <ErrorState
        variant="notFound"
        code="404"
        message="The page you're looking for doesn't exist or may have been moved."
        primaryAction={{
            label: "Go Home",
            href: "/",
            icon: <Home className="w-4 h-4" />,
            ...props.primaryAction,
        }}
        secondaryAction={{
            label: "Go Back",
            icon: <ArrowLeft className="w-4 h-4" />,
            onClick: () => window.history.back(),
            variant: "ghost",
            ...props.secondaryAction,
        }}
        {...props}
    />
);

export { ErrorState };
export type { ErrorStateProps, ErrorAction, ErrorVariant };
