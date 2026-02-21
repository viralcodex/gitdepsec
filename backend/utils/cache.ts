import { Response } from "express";

import { CachedAnalysis, DependencyApiResponse } from "../constants/model";
import {
  upsertAudit as upsertCache,
  deleteCachedAudit as deleteCache,
  getFileDetails as getFileCache,
  getCachedAudit,
  insertFile,
} from "../db/actions";

export const cachedAudit = async (
  username: string,
  repo: string,
  branch: string,
  res: Response,
) => {
  let cachedData: CachedAnalysis[] = [];

  try {
    cachedData = await getCachedAudit(username, repo, branch);

    if (cachedData.length > 0 && cachedData[0].data) {
      return res.json(cachedData[0].data);
    }
  } catch (dbError) {
    console.error("Database error checking cache:", dbError);
  }
};

export const upsertAudit = async ({
  username,
  repo,
  branch,
  data,
  branches,
}: {
  username: string;
  repo: string;
  branch: string;
  data: DependencyApiResponse;
  branches: string[];
}) => {
  await upsertCache({
    username,
    repo,
    branch,
    data,
    branches,
  });
};

export const deleteCachedAudit = async (username: string, repo: string, branch: string) => {
  await deleteCache(username, repo, branch);
};

export const getCachedFileDetails = (fileId: string) => {
  return getFileCache(fileId);
};

export const insertFileCache = async (fileData: { name: string; content: string }) => {
  await insertFile(fileData);
};
