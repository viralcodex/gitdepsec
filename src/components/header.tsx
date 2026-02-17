"use client";
import Link from "next/link";
import React, { useEffect, useState } from "react";
import { AiDialog } from "./dialogs/ai-dialog";
import { GithubDialog } from "../components/dialogs/github-dialog";
import { useIsMobile } from "@/hooks/useMobile";
import { KeyRound, Menu, Sparkle, X } from "lucide-react";
import { GithubIcon } from "@/components/icons";
import toast from "react-hot-toast";

const Header = () => {
  const [githubDialogOpen, setGithubDialogOpen] = useState(false);
  const [aiDialogOpen, setAIDialogOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const isMobile = useIsMobile();

  useEffect(() => {
    const handleResize = () => {
      if (!isMobile) {
        setIsMenuOpen(false);
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [isMobile]);

  return (
    <header
      className="absolute top-0 w-full border-primary border-b shadow-sm z-100"
      aria-label="Main site header"
    >
      <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-4 sm:px-8">
        <Link href="/" className="flex items-center space-x-2" aria-label="Home Page - GitDepSec">
          <span className="text-lg font-ui-pixel">
            <span className="text-gray-200">Git</span>
            <span className="text-foreground">Dep</span>
            <span className="text-blue-400">Sec</span>
          </span>
        </Link>
        <nav role="navigation" aria-label="Main navigation" className="text-white font-ui-strong">
          {isMobile ? (
            <div className="relative">
              {isMenuOpen ? (
                <button
                  onClick={() => setIsMenuOpen(false)}
                  className="cursor-pointer  border-none bg-transparent"
                  aria-label="Close menu"
                  aria-expanded="true"
                >
                  <X />
                </button>
              ) : (
                <button
                  onClick={() => setIsMenuOpen(true)}
                  className="cursor-pointer  border-none bg-transparent"
                  aria-label="Open menu"
                  aria-expanded="false"
                >
                  <Menu />
                </button>
              )}
            </div>
          ) : (
            <ul className="flex space-x-4" role="list">
              <li className="cursor-pointer">
                <Link
                  href="https://github.com/viralcodex/"
                  className="flex flex-row items-center space-x-1"
                  aria-label="Visit my GitHub profile"
                >
                  <GithubIcon className=" h-6 w-6" />
                  <span className="font-ui-strong">My Github</span>
                </Link>
              </li>
              <li className="flex flex-row items-center space-x-1 cursor-pointer" onClick={() => setGithubDialogOpen(true)}
              >
                <KeyRound className="" aria-hidden="true" />
                <button
                  className="cursor-pointer border-none bg-transparent"
                  aria-label="Set GitHub Personal Access Token"
                >
                  <span className="font-ui-strong">Github PAT</span>
                </button>
              </li>
              <li className="flex flex-row items-center space-x-1 cursor-pointer" onClick={() => setAIDialogOpen(true)}>
                <Sparkle className="" aria-hidden="true" />
                <button
                  className="cursor-pointer border-none bg-transparent"
                  aria-label="Set AI API Key"
                >
                  <span className="font-ui-strong">AI API Key</span>
                </button>
              </li>
            </ul>
          )}
        </nav>
        <GithubDialog
          isOpen={githubDialogOpen}
          onClose={() => setGithubDialogOpen(false)}
          onSubmit={(pat) => {
            localStorage.setItem("github_pat", pat);
            setGithubDialogOpen(false);
          }}
        />
        <AiDialog
          isOpen={aiDialogOpen}
          onClose={() => setAIDialogOpen(false)}
          onSubmit={async (aiKey, modelName) => {
            localStorage.setItem("openrouter_key", aiKey);
            if (modelName) {
              localStorage.setItem("openrouter_model", modelName);
            } else {
              localStorage.removeItem("openrouter_model");
            }
            // Store on backend for session-based access
            try {
              const { setCredentialsOnBackend } = await import("@/lib/api");
              await setCredentialsOnBackend(aiKey, modelName || undefined);
              toast.success("API credentials saved securely");
            } catch (error) {
              console.error("Failed to store credentials on backend:", error);
              toast.error("Failed to save credentials. Check console for details.");
            }
            setAIDialogOpen(false);
          }}
        />
        {isMenuOpen && (
          <div
            className="flex flex-col absolute right-4 top-18 bg-background border rounded-md shadow-lg py-2"
            role="menu"
            aria-label="Mobile navigation menu"
          >
            <ul className="text-white" role="list">
              <li className="" role="menuitem">
                <Link
                  href="https://github.com/viralcodex/"
                  className="cursor-pointer flex flex-row items-center space-x-2 hover:bg-white/20 pt-2 pb-2 px-4"
                  aria-label="Visit my GitHub profile"
                >
                  <GithubIcon className="h-6 w-6" />
                  <span className="font-ui-strong">My Github</span>
                </Link>
              </li>
              <li
                className="flex flex-row items-center space-x-2 hover:bg-white/20 py-2 px-4"
                role="menuitem"
              >
                <KeyRound className="" aria-hidden="true" />
                <button
                  onClick={() => setGithubDialogOpen(true)}
                  className="cursor-pointer border-none bg-transparent "
                  aria-label="Set GitHub Personal Access Token"
                >
                  <span className="font-ui-strong">Github PAT</span>
                </button>
              </li>
              <li
                className="flex flex-row items-center space-x-2 hover:bg-white/20 pt-2 pb-2 px-4"
                role="menuitem"
              >
                <Sparkle className="" aria-hidden="true" />
                <button
                  onClick={() => setAIDialogOpen(true)}
                  className="cursor-pointer border-none bg-transparent "
                  aria-label="Set AI API Key"
                >
                  <span className="font-ui-strong">AI API Key</span>
                </button>
              </li>
            </ul>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
