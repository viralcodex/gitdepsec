"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { useState, useEffect } from "react";
import Link from "next/link";
import toast from "react-hot-toast";

interface AiDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (apiKey: string, modelName?: string) => void;
}

export function AiDialog({ isOpen, onClose, onSubmit }: AiDialogProps) {
  const [apiKey, setApiKey] = useState<string>("");
  const [modelName, setModelName] = useState<string>("");

  useEffect(() => {
    const storedKey = localStorage.getItem("openrouter_key");
    const storedModel = localStorage.getItem("openrouter_model");
    if (storedKey) {
      setApiKey(storedKey);
    }
    if (storedModel) {
      setModelName(storedModel);
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(apiKey, modelName || undefined);
    setApiKey("");
    setModelName("");
  };

  const handleClear = async () => {
    localStorage.removeItem("openrouter_key");
    localStorage.removeItem("openrouter_model");
    setApiKey("");
    setModelName("");
    // Clear from backend
    try {
      const { clearCredentialsOnBackend } = await import("@/lib/api");
      await clearCredentialsOnBackend();
      toast.success("API credentials cleared successfully");
    } catch (error) {
      console.error("Failed to clear credentials from backend:", error);
      toast.error("Failed to clear credentials from backend");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="border-[3px] border-accent bg-background p-6 shadow-[1px_1px_10px_2px_#000000] sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-primary-foreground">
            Enter OpenRouter API Key
          </DialogTitle>
        </DialogHeader>
        <form
          onSubmit={handleSubmit}
          className="space-y-4"
          aria-label="OpenRouter API key configuration"
        >
          <div className="text-sm" role="note">
            You can provide an OpenRouter API key to generate AI insights and Fix Plans. The key
            will be stored locally in your browser.
            <br />
            <br />
            <span className="font-medium">Get your OpenRouter API key </span>
            <Link
              href="https://openrouter.ai/keys"
              className="underline text-primary-foreground transition-colors duration-200 hover:text-muted-foreground"
              aria-label="Get OpenRouter API key (opens in new window)"
              target="_blank"
              rel="noopener noreferrer"
            >
              here
            </Link>
            .
          </div>
          <div className="rounded-md bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 p-3 text-xs">
            <p className="font-bold text-yellow-800 dark:text-yellow-200 mb-1">Security Notice</p>
            <p className="text-yellow-700 font-semibold dark:text-yellow-300">
              Your API key is <b>encrypted before transmission</b> and stored securely on the server
              for your session. Only a session ID is sent with subsequent requests. But still,{" "}
              <b>security issues</b> can occur and <b>I recommend for production use </b>
              <b>self-hosting</b> with environment variables is best.
            </p>
          </div>
          <details
            className="group text-sm [&>summary:focus-visible]:outline-none"
            aria-label="Data storage information"
          >
            <summary
              className="cursor-pointer font-medium text-primary-foreground hover:text-muted-foreground"
              tabIndex={0}
            >
              Data storage disclaimer
            </summary>
            <div className="animate-accordion-down mt-2 space-y-2 overflow-hidden pl-2">
              <p>
                All your API keys are stored locally in your browser and not used by me in any
                manner. However, localStorage is vulnerable to <b>XSS attacks</b> . If you still
                don&apos;t feel like sharing your key, you can also <b>self-host</b> this app by
                following the instructions here...{" "}
                <Link
                  href="https://github.com/viralcodex/gitdepsec#readme"
                  className="underline text-primary-foreground dark:text-[hsl(var(--text-color-link))] transition-colors duration-200 hover:text-muted-foreground"
                >
                  README
                </Link>
                .
              </p>
              <p className="text-xs italic text-muted-foreground mt-2">
                For maximum security, use environment variables on a self-hosted instance.
              </p>
            </div>
          </details>
          <div className="space-y-3">
            <Input
              type="password"
              placeholder="sk-or-v1-..."
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="flex-1 rounded-md border-[3px] border-black px-3 py-2 text-base font-bold shadow-[4px_4px_0_0_#000000] placeholder:text-base placeholder:font-normal"
              required
              aria-label="OpenRouter API key"
              aria-describedby="api-key-description"
            />
            <Input
              type="text"
              placeholder="Model name (optional, e.g., xiaomi/mimo-v2-flash:free)"
              value={modelName}
              onChange={(e) => setModelName(e.target.value)}
              className="flex-1 rounded-md border-[3px] border-black px-3 py-2 text-base font-bold shadow-[4px_4px_0_0_#000000] placeholder:text-base placeholder:font-normal"
              aria-label="OpenRouter model name (optional)"
            />
            <p className="text-xs text-muted-foreground">
              Optional: Specify a model name. Leave empty to use the default model.{" "}
              <Link
                href="https://openrouter.ai/models"
                className="underline hover:text-primary-foreground"
                target="_blank"
                rel="noopener noreferrer"
              >
                Browse models
              </Link>
            </p>
          </div>
          <div className="flex items-center justify-center">
            <div className="flex gap-3">
              <Button
                type="button"
                onClick={handleClear}
                className="border-[3px] bg-primary-foreground border-black px-4 py-2 text-black shadow-[4px_4px_0_0_#000000] transition-transform hover:-translate-x-0.5 hover:-translate-y-0.5 hover:bg-gray-200"
                aria-label="Clear stored API key"
              >
                Clear Key
              </Button>
              <Button
                type="submit"
                disabled={!apiKey.startsWith("sk-or-")}
                className="border-[3px] bg-muted text-accent border-black px-4 py-2 shadow-[4px_4px_0_0_#000000] transition-transform hover:-translate-x-0.5 hover:-translate-y-0.5 hover:bg-background disabled:opacity-50"
                aria-label="Save API key"
              >
                Save Key
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
