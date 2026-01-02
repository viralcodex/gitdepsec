"use client"
import { useState, useEffect } from "react";
import { verifyUrl } from "@/lib/utils";
import { useErrorState } from "@/store/app-store";

interface UseUrlInputProps {
  username: string;
  repo: string;
  branch: string;
}

export const useUrlInput = ({ username, repo, branch }: UseUrlInputProps) => {
  const [inputUrl, setInputUrl] = useState<string>("");
  const { setBranchError } = useErrorState();

  // Initialize URL from route parameters when route changes
  useEffect(() => {
    if (username && repo && !username.includes("file_upload")) {
      const githubUrl = `https://github.com/${username}/${repo}`;
      setInputUrl(githubUrl);
    }
  }, [username, repo, branch]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const url = e.target.value.trim();
    setInputUrl(url);
    if (url && !verifyUrl(url, setBranchError)) {
      return;
    }
    setBranchError("");
  };

  return {
    inputUrl,
    handleInputChange,
  };
};

export default useUrlInput;
