"use client";
import { useState, useEffect } from "react";
import { verifyUrl } from "@/lib/utils";
import { useErrorState } from "@/store/app-store";

interface UseUrlInputProps {
  username: string;
  repo: string;
}

export const useUrlInput = ({ username, repo }: UseUrlInputProps) => {
  // Initialize URL directly from props to avoid delay
  const initialUrl =
    username && repo && !username.includes("file_upload")
      ? `https://github.com/${username}/${repo}`
      : "";
  const [inputUrl, setInputUrl] = useState<string>(initialUrl);
  const { setBranchError } = useErrorState();

  // Update URL when route parameters change
  useEffect(() => {
    if (username && repo && !username.includes("file_upload")) {
      const githubUrl = `https://github.com/${username}/${repo}`;
      setInputUrl(githubUrl);
    }
  }, [username, repo]);

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
