"use client";
import { useEffect, useState } from "react";

const getViewportWidth = () =>
  typeof document !== "undefined" ? document.documentElement.clientWidth : 1024;

const getViewportHeight = () =>
  typeof document !== "undefined" ? document.documentElement.clientHeight : 768;

const useWindowSize = () => {
  const [windowSize, setWindowSize] = useState({
    width: getViewportWidth(),
    height: getViewportHeight(),
  });

  useEffect(() => {
    const handleResize = () => {
      setWindowSize({
        width: getViewportWidth(),
        height: getViewportHeight(),
      });
    };

    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return { windowSize, setWindowSize };
};

export default useWindowSize;
