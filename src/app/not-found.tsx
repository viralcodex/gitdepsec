import { NotFoundError } from "@/components/ui/error-state";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "404 - Page Not Found | GitDepSec",
  description:
    "The page you're looking for doesn't exist. Return to GitDepSec to analyze your dependencies for security vulnerabilities.",
};

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[60vh]">
      <NotFoundError
        title="Repository Not Found"
        message="Oops! The repository you're looking for doesn't exist or may have been moved."
        size="lg"
      />
    </div>
  );
}
