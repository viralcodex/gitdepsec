"use client";
import { useState, useEffect } from "react";
import { uploadFile } from "@/lib/api";
import { verifyFile } from "@/lib/utils";
import toast from "react-hot-toast";
import { useErrorState, useFileState } from "@/store/app-store";

export const useFileUpload = () => {
  const { setNewFileName, setUploaded } =
    useFileState();

  const [inputFile, setInputFile] = useState<File | null>(null);
  const { setError } = useErrorState();

  // Handle file upload
  useEffect(() => {
    if (inputFile) {
      setUploaded(false);
      const result = verifyFile(inputFile, setError, setInputFile);
      if (!result) {
        setError(
          "Invalid file type. Please select a file of type .json, .yaml, .xml, .txt"
        );
      } else {
        setError("");
        void uploadFile(inputFile)
          .then((response) => {
            setNewFileName(response.newFileName);
            setUploaded(true);
            toast.success("File uploaded successfully");
          })
          .catch((err) => {
            setError(err);
            setUploaded(false);
            toast.error("Failed to upload file. Please try again later.");
          });
      }
    }
  }, [inputFile, setError, setNewFileName, setUploaded]);

  return {
    inputFile,
    setInputFile,
  };
};

export default useFileUpload;
