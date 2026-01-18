import {
  BranchesApiResponse,
  ManifestFileContentsApiResponse,
  ProgressSSE,
  Vulnerability,
  GlobalFixPlanSSEMessage,
  VulnerabilitySummaryResponse,
} from "@/constants/model";
import { encryptData, getNewFileName, getSessionId } from "./utils";
import { PROGRESS_STEPS } from "@/constants/constants";

const baseUrl =
  process.env.NODE_ENV === "production"
    ? process.env.NEXT_PUBLIC_API_PROD_URL
    : process.env.NEXT_PUBLIC_API_DEV_URL;

// Get GitHub PAT from localStorage (client-side only)
const github_pat =
  typeof window !== "undefined"
    ? (localStorage.getItem("github_pat") ?? undefined)
    : undefined;

// Default timeout for API calls (20 seconds)
const DEFAULT_TIMEOUT = 20000;

// Store credentials on backend for session (with encryption)
export async function setCredentialsOnBackend(
  apiKey?: string,
  model?: string,
): Promise<void> {
  try {
    const sessionId = getSessionId();
    const url = new URL(`${baseUrl}/setCredentials`);
    
    // Encrypt credentials before sending
    const encryptedKey = apiKey ? await encryptData(apiKey) : undefined;
    const encryptedModel = model ? await encryptData(model) : undefined;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ 
        sessionId, 
        apiKey: encryptedKey, 
        model: encryptedModel,
        encrypted: true,
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to store credentials");
    }
    
    console.log("🔒 Encrypted credentials stored on backend");
  } catch (error) {
    console.error("Error storing credentials:", error);
    throw error;
  }
}

// Clear credentials from backend
export async function clearCredentialsOnBackend(): Promise<void> {
  try {
    const sessionId = getSessionId();
    const url = new URL(`${baseUrl}/clearCredentials`);

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ sessionId }),
    });

    if (!response.ok) {
      throw new Error("Failed to clear credentials");
    }
    console.log("Credentials cleared from backend");
  } catch (error) {
    console.error("Error clearing credentials:", error);
    throw error;
  }
}

export async function getRepoBranches(
  username: string,
  repo: string,
  page?: number,
  pageSize?: number
): Promise<BranchesApiResponse> {
  try {
    if (!page) page = 1;
    if (!pageSize) pageSize = 100;

    // console.log("repourl", `${baseUrl}/branches`);
    const url = new URL(`${baseUrl}/branches`);

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ username, repo, github_pat, page, pageSize }),
      signal: AbortSignal.timeout(DEFAULT_TIMEOUT),
    });

    if (response.status === 429) {
      return response.json();
    }

    const data = (await response.json()) as BranchesApiResponse;
    return data;
  } catch (error) {
    console.error("Error fetching branches:", error);
    return { error: "Failed to fetch branches. Please try again later." };
  }
}

export async function getManifestFileContents(
  username: string,
  repo: string,
  branch: string
): Promise<ManifestFileContentsApiResponse> {
  try {
    const url = new URL(`${baseUrl}/manifestData`);

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ username, repo, branch, github_pat }),
      signal: AbortSignal.timeout(DEFAULT_TIMEOUT),
    });

    if (response.status === 429) {
      return await response.json();
    }

    const data = (await response.json()) as ManifestFileContentsApiResponse;
    return data;
  } catch (error) {
    console.error("Error fetching manifest file contents:", error);
    if (error instanceof Error && error.name === "TimeoutError") {
      throw new Error("Request timed out. Please try again.");
    }
    throw new Error(
      "Failed to fetch manifest file contents. Please try again later."
    );
  }
}

export async function analyseDependencies(
  username: string,
  repo: string,
  branch: string,
  file: string,
  forceRefresh: boolean = false
): Promise<ManifestFileContentsApiResponse> {
  try {
    const url = file
      ? new URL(`${baseUrl}/analyseFile`)
      : new URL(`${baseUrl}/analyseDependencies`);

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: file
        ? JSON.stringify({ file })
        : JSON.stringify({ username, repo, branch, github_pat, forceRefresh }),
      signal: AbortSignal.timeout(60000), // 60 seconds for analysis
    });

    if (response.status === 429) {
      return await response.json();
    }

    const data = (await response.json()) as ManifestFileContentsApiResponse;
    return data;
  } catch (error) {
    console.error("Error analysing dependencies:", error);
    if (error instanceof Error && error.name === "TimeoutError") {
      throw new Error("Request timed out. Please try again.");
    }
    throw new Error("Failed to analyse dependencies. Please try again later.");
  }
}

export async function uploadFile(
  file: File
): Promise<{ response: JSON; newFileName: string }> {
  try {
    const url = new URL(`${baseUrl}/uploadFile`);

    const formData = new FormData();
    const newFileName = getNewFileName(file.name);
    const newFile = new File([file], newFileName, {
      type: file.type,
    });

    formData.append("file", newFile);

    const response = await fetch(url, {
      method: "POST",
      body: formData,
      signal: AbortSignal.timeout(DEFAULT_TIMEOUT),
    });

    if (!response.ok) {
      throw new Error("Failed to upload file");
    }

    if (response.status === 429) {
      return { response: await response.json(), newFileName };
    }

    return { response: await response.json(), newFileName };
  } catch (error) {
    console.error("Error uploading file:", error);
    if (error instanceof Error && error.name === "TimeoutError") {
      throw new Error("File upload timed out. Please try again.");
    }
    throw new Error("Failed to upload file. Please try again later.");
  }
}

export async function getAiVulnerabilitiesSummary(vulnerabilities: {
  name: string;
  version: string;
  vulnerabilities: Vulnerability[];
}): Promise<VulnerabilitySummaryResponse> {
  try {
    const url = new URL(`${baseUrl}/aiVulnSummary`);
    const sessionId = getSessionId();

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        vulnerabilities,
        sessionId,
      }),
      signal: AbortSignal.timeout(60000), // 60 seconds for AI requests
    });

    if (!response.ok) {
      throw new Error("Failed to generate AI vulnerabilities summary");
    }

    if (response.status === 429) {
      return await response.json();
    }

    // Backend now returns stringified JSON, so parse it
    const stringData = await response.json();
    const data =
      typeof stringData === "string" ? JSON.parse(stringData) : stringData;
    console.log("AI Vulnerabilities Summary:", data);
    return data;
  } catch (error) {
    console.error("Error generating AI vulnerabilities summary:", error);
    if (error instanceof Error && error.name === "TimeoutError") {
      throw new Error("AI summary generation timed out. Please try again.");
    }
    throw new Error(
      "Failed to generate AI vulnerabilities summary. Please try again later."
    );
  }
}

export async function getInlineAiResponse(
  prompt: string,
  selectedText: string,
  context?: {
    name?: string;
    version?: string;
    vulnerabilities?: Vulnerability[];
  }
): Promise<string> {
  try {
    const url = new URL(`${baseUrl}/inlineai`);
    const sessionId = getSessionId();

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt,
        selectedText,
        context,
        sessionId,
      }),
      signal: AbortSignal.timeout(60000), // 60 seconds for AI requests
    });

    if (!response.ok) {
      throw new Error("Failed to get inline AI response");
    }

    if (response.status === 429) {
      return await response.json();
    }

    const data = await response.json();
    const parsedResponse =
      typeof data.response === "string"
        ? JSON.parse(data.response)
        : data.response;
    return parsedResponse;
  } catch (error) {
    console.error("Error getting inline AI response:", error);
    if (error instanceof Error && error.name === "TimeoutError") {
      throw new Error("AI response timed out. Please try again.");
    }
    throw new Error(
      "Failed to get inline AI response. Please try again later."
    );
  }
}

export function progressSSE(
  onProgress: (step: string, progress: number) => void,
  onConnection: () => void,
  onError: (error: string) => void
): EventSource {
  try {
    const url = new URL(`${baseUrl}/progress`);
    const eventSource = new EventSource(url.toString());
    let lastStepIndex = -1; // To track the last step index processed
    eventSource.onmessage = (event) => {
      try {
        const data: ProgressSSE = JSON.parse(event.data);
        // console.log("SSE Data:", data);
        if (data.type === "connection") {
          // console.log("SSE Connection established:", data.message);
          onConnection();
          return;
        }
        if (data.step && typeof data.progress === "number") {
          const currentStepIndex = Object.keys(PROGRESS_STEPS).indexOf(
            data.step
          );

          // Only process if step is in correct order or is a valid step
          if (currentStepIndex >= lastStepIndex) {
            lastStepIndex = Math.max(lastStepIndex, currentStepIndex);
            onProgress(PROGRESS_STEPS[data.step], data.progress);
          } else {
            console.warn(
              `Out of order step received: ${data.step} (index: ${currentStepIndex}, last: ${lastStepIndex})`
            );
          }
        }
      } catch (parseError) {
        console.error("Error parsing SSE data:", parseError);
        onError("Error parsing server response");
        eventSource.close();
      }
    };

    eventSource.onerror = (error) => {
      console.error("SSE connection error:", error);
      onError("Connection error occurred");
      eventSource.close();
    };

    return eventSource;
  } catch (error) {
    console.error("SSE connection error:", error);
    onError("Failed to connect to progress stream");
    throw error;
  }
}

export async function getFixPlanSSE(
  username: string,
  repo: string,
  branch: string,
  onError: (error: string) => void,
  onComplete: () => void,
  onGlobalFixPlanMessage: (data: GlobalFixPlanSSEMessage) => void,
  onProgress?: (data: {
    step?: string;
    progress?: string | number;
    data?: Record<string, unknown>;
  }) => void
): Promise<EventSource> {
  const url = new URL(`${baseUrl}/fixPlan`);
  url.searchParams.append("username", username);
  url.searchParams.append("repo", repo);
  url.searchParams.append("branch", branch);

  const eventSource = new EventSource(url.toString());

  eventSource.onmessage = (event: MessageEvent) => {
    try {
      const data = JSON.parse(event.data);
      if (data.type === "connection") {
        return;
      }
      switch (data.step) {
        //phase 2: unified fix plan
        case "global_planning_start":
          break;
        case "global_planning_complete":
          onGlobalFixPlanMessage((data.data as GlobalFixPlanSSEMessage) ?? {});
          break;
        case "global_planning_error":
          onError(data.progress as string);
          break;
        // New 5-phase architecture steps
        case "preprocessing_start":
        case "preprocessing_complete":
        case "parallel_analysis_start":
        case "parallel_analysis_complete":
        case "intelligence_start":
        case "intelligence_complete":
        case "batch_start":
        case "batch_processing":
        case "batch_processing_complete":
        case "batch_complete":
        case "synthesis_start":
        case "synthesis_executive_complete":
        case "synthesis_intelligence_start":
        case "synthesis_intelligence_complete":
        case "synthesis_phases_start":
        case "synthesis_phases_complete":
        case "synthesis_risk_start":
        case "synthesis_risk_complete":
        case "synthesis_complete":
        case "enrichment_start":
        case "enrichment_complete":
          // Progress updates - pass all data to onProgress callback
          if (onProgress) {
            onProgress({
              step: data.step,
              progress: data.progress,
              data: data.data,
            });
          }
          break;
        case "analysis_complete":
          onComplete();
          break;
      }
    } catch (parseError) {
      console.error("Error parsing SSE data:", parseError);
      onError("Error parsing server response");
      eventSource.close();
    }
  };

  eventSource.addEventListener("end", () => {
    onComplete?.();
    eventSource.close();
  });

  eventSource.onerror = () => {
    console.error("SSE connection error");
    const errorMsg =
      typeof navigator !== "undefined" && !navigator.onLine
        ? "You appear to be offline. Please check your internet connection."
        : "Server connection error. Please try again.";
    onError?.(errorMsg);
    eventSource.close();
  };

  // Return the EventSource so caller can close it manually if needed
  return eventSource;
}

export const healthCheck = async (): Promise<{
  response: string;
  environment: string;
  timestamp: string;
  status: string;
}> => {
  try {
    const url = new URL(`${baseUrl}/health`);
    const response = await fetch(url, {
      method: "GET",
      signal: AbortSignal.timeout(5000), // 5 seconds timeout
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error("Health check failed");
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error during health check:", error);
    throw new Error("Failed to perform health check. Please try again later.");
  }
};
