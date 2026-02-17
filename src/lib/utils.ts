import { Dependency, ParsedRisk, UnifiedFixPlan } from "@/constants/model";
import { MANIFEST_FILES } from "@/constants/constants";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { FixPlanPDFGenerator } from "./pdfGenerator";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const getNewFileName = (originalName: string): string => {
  const uuid = crypto.randomUUID();
  const fileExtension = originalName.split(".").pop() || "";
  const baseName = originalName.replace(`.${fileExtension}`, "");
  return `${baseName}_${uuid}.${fileExtension}`;
};

/*
 * verify the repoUrl format and extract username and repo
 * @param repoUrl - The GitHub repository URL to verify
 * @param setError - Optional function to set error messages
 * @returns An object containing sanitizedUsername and sanitizedRepo if valid, otherwise undefined
 */
export const verifyUrl = (repoUrl: string, setError?: (error: string) => void) => {
  const githubUrlPattern = /^https?:\/\/github\.com\/([a-zA-Z0-9-_]+)\/([a-zA-Z0-9-_.]+)\/?$/;
  const match = githubUrlPattern.exec(repoUrl.trim());

  if (!match) {
    setError?.("Please enter a valid GitHub repository URL");
    return;
  }

  const [, username, repo] = match || [];
  if (!username || !repo) {
    setError?.("Invalid repository URL format");
    return;
  }
  const sanitizedUsername = encodeURIComponent(username);
  const sanitizedRepo = encodeURIComponent(repo);

  return { sanitizedUsername, sanitizedRepo };
};

/**
 * Extract repo key from GitHub URL for caching purposes
 * @param url - The GitHub repository URL
 * @returns Repo key in format "owner/repo" or null if invalid
 */
export const getRepoKeyFromUrl = (url: string): string | null => {
  const result = verifyUrl(url);
  console.log("getRepoKeyFromUrl result:", result);
  if (!result) return null;
  return `${decodeURIComponent(result.sanitizedUsername)}/${decodeURIComponent(result.sanitizedRepo)}`;
};

/*
 * verify the uploaded manifest file
 * @param file - The uploaded file to verify
 * @param setError - Function to set error messages
 * @param setFile - Function to set the valid file
 * @returns true if the file is valid, otherwise undefined
 */
export const verifyFile = (
  file: File,
  setError: (error: string) => void,
  setFile: (file: File) => void,
) => {
  if (!file) {
    setError("No file selected");
    return;
  }

  if (file.size > 5 * 1024 * 1024) {
    // 5MB limit
    setError("File size exceeds the 5MB limit");
    return;
  }

  const fileExtension = file.name.split(".").pop()?.toLowerCase();
  if (
    !fileExtension ||
    !Object.values(MANIFEST_FILES).some((f) => f.file.endsWith(fileExtension))
  ) {
    setError("Invalid manifest file type");
    return;
  }

  setError("");
  setFile(file);

  return true;
};

export const parseFileName = (file: string) => {
  if (!file) return "No file selected";
  const fileName = file.split("_")[0] + file.slice(file.indexOf("."));
  const ecosystem = Object.keys(MANIFEST_FILES).find((f) => MANIFEST_FILES[f].file === fileName);
  return `${ecosystem} : ${fileName}`;
};

export const getSeverityConfig = (score?: string) => {
  if (!score) return { text: "N/A", className: "bg-gray-500 text-white rounded-sm m-0" };
  const numericScore = parseFloat(score);

  if (numericScore >= 9.0)
    return {
      text: `${score} (Critical)`,
      className: "bg-red-600 text-white rounded-sm m-0",
    };
  if (numericScore >= 7.0)
    return {
      text: `${score} (High)`,
      className: "bg-orange-600 text-white rounded-sm m-0",
    };
  if (numericScore >= 4.0)
    return {
      text: `${score} (Medium)`,
      className: "bg-yellow-600 text-white rounded-sm m-0",
    };
  if (numericScore >= 0.1)
    return {
      text: `${score} (Low)`,
      className: "bg-green-600 text-white rounded-sm m-0",
    };
  return {
    text: "(N/A)",
    className: "bg-gray-500 text-white rounded-sm m-0",
  };
};

export const getFixTypeConfig = (fixType: string) => {
  switch (fixType.toLowerCase()) {
    case "upgrade":
      return {
        text: "Upgrade",
        icon: "ChevronsUp",
        className: "bg-blue-600 text-white rounded-sm m-0 px-1.5",
      };
    case "patch":
      return {
        text: "Patch",
        icon: "Bandage",
        className: "bg-purple-600 text-white rounded-sm m-0 px-1.5",
      };
    case "replace":
      return {
        text: "Replace",
        icon: "Replace",
        className: "bg-yellow-600 text-white rounded-sm m-0 px-1.5",
      };
    case "configuration":
      return {
        text: "Configuration",
        icon: "Wrench",
        className: "bg-yellow-600 text-white rounded-sm m-0 px-1.5",
      };
    case "remove":
      return {
        text: "Remove",
        icon: "Trash",
        className: "bg-gray-500 text-white rounded-sm m-0 px-1.5",
      };
    default:
      return {
        text: fixType,
        icon: "TriangleAlert",
        className: "bg-gray-500 text-white rounded-sm m-0 px-1.5",
      };
  }
};
export const getRemediationPriorityConfig = (priority: string) => {
  switch (priority.toLowerCase()) {
    case "immediate":
      return {
        text: "Immediate",
        icon: "Siren",
        className: "bg-red-600 text-white rounded-sm m-0 px-1.5",
      };
    case "urgent":
      return {
        text: "High",
        icon: "AlertTriangle",
        className: "bg-orange-600 text-white rounded-sm m-0 px-1.5",
      };
    case "medium":
      return {
        text: "Medium",
        icon: "MinusCircle",
        className: "bg-yellow-600 text-white rounded-sm m-0 px-1.5",
      };
    case "low":
      return {
        text: "Low",
        icon: "LightBulb",
        className: "bg-green-600 text-white rounded-sm m-0 px-1.5",
      };
    default:
      return {
        text: priority,
        icon: "BadgeQuestionMarkIcon",
        className: "bg-gray-500 text-white rounded-sm m-0 px-1.5",
      };
  }
};

export const parseRisk = (risk?: string): ParsedRisk => {
  if (!risk) {
    return {
      severity: "LOW",
      cvss: "0.0",
      exploitAvailable: false,
    };
  }

  const severityMatch = risk.match(/^(CRITICAL|HIGH|MEDIUM|LOW):/i);
  const cvssMatch = risk.match(/CVSS\s+([\d.]+)/i);
  const exploitAvailable = risk.toLowerCase().includes("exploit available");

  return {
    severity: (severityMatch?.[1]?.toUpperCase() as ParsedRisk["severity"]) || "LOW",
    cvss: cvssMatch?.[1] || "0.0",
    exploitAvailable,
  };
};

export const getVulnerabilityUrl = (id: string): string => {
  if (id.startsWith("GHSA-")) {
    return `https://github.com/advisories/${id}`;
  }

  if (/^(cve|CVE)-[0-9]{4}-[0-9]{4,}$/.test(id)) {
    return `https://nvd.nist.gov/vuln/detail/${id}`;
  }

  return `https://nvd.nist.gov/vuln/detail/${id}`;
};

export const depVulnCount = (deps: Dependency): boolean => {
  return deps.vulnerabilities && deps.vulnerabilities.length ? true : false;
};

String.prototype.toTitleCase = function (): string {
  return this.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.slice(1).toLowerCase());
};

const cleanMarkdownJson = (data: string): string => {
  return data.replace(/```json\s*/g, "").replace(/\s*```/g, "");
};

const parseFixPlanData = (data: string): UnifiedFixPlan => {
  let cleaned = data.includes("```json") ? cleanMarkdownJson(data) : data;
  let parsed = JSON.parse(cleaned);

  // Handle double-encoded JSON
  if (typeof parsed === "string") {
    cleaned = parsed.includes("```json") ? cleanMarkdownJson(parsed) : parsed;
    parsed = JSON.parse(cleaned);
  }

  return parsed as UnifiedFixPlan;
};

export const downloadFixPlanPDF = async (
  fixPlanData: string | null,
  repoName: string = "Repository",
) => {
  if (!fixPlanData) {
    throw new Error("No fix plan data available");
  }

  try {
    const parsedFixPlan =
      typeof fixPlanData === "string"
        ? parseFixPlanData(fixPlanData)
        : (fixPlanData as UnifiedFixPlan);

    const generator = new FixPlanPDFGenerator();
    const pdf = generator.generatePDF(parsedFixPlan, repoName);

    const fileName = `fix-plan-${repoName.replace(/[^a-z0-9]/gi, "-").toLowerCase()}-${new Date().toISOString().split("T")[0]}.pdf`;
    pdf.save(fileName);
  } catch (error) {
    console.error("Error generating PDF:", error);
    throw new Error("Failed to generate PDF report");
  }
};

// Helper to get OpenRouter credentials from localStorage
// Only sends credentials if user has provided their own key
export const getOpenRouterCredentials = () => {
  if (typeof window === "undefined") return { key: undefined, model: undefined };

  const key = localStorage.getItem("openrouter_key");
  const model = localStorage.getItem("openrouter_model");

  // Only return credentials if user has explicitly set them
  // Backend will use env vars if these are undefined
  return {
    key: key || undefined,
    model: model || undefined,
  };
};

// Helper to get or generate session ID
export const getSessionId = () => {
  if (typeof window === "undefined") return undefined;

  let sessionId = sessionStorage.getItem("api_session_id");
  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    sessionStorage.setItem("api_session_id", sessionId);
  }
  return sessionId;
};

// Encryption utilities for secure credential transmission
const ENCRYPTION_KEY =
  process.env.NEXT_PUBLIC_ENCRYPTION_KEY ?? "gitdepsec-2026-secure-key-v1-fallback";

export async function encryptData(data: string): Promise<string> {
  if (typeof window === "undefined") return data;

  try {
    // XOR encryption with base64 encoding
    const encrypted = Array.from(data)
      .map((char, i) =>
        String.fromCharCode(
          char.charCodeAt(0) ^ ENCRYPTION_KEY.charCodeAt(i % ENCRYPTION_KEY.length),
        ),
      )
      .join("");

    return btoa(encrypted); // Base64 encode
  } catch (error) {
    console.error("Encryption failed:", error);
    return data; // Fallback
  }
}
