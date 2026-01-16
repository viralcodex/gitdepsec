import { PROGRESS_MESSAGES } from "@/constants/constants";
import { VulnerabilitySummaryResponse } from "@/constants/model";
import { useState, useEffect, useRef } from "react";

interface UseAISummaryProgressProps {
  isLoading: boolean;
  summary: VulnerabilitySummaryResponse | null;
}

export const useAISummaryProgress = (props: UseAISummaryProgressProps) => {
  const [progress, setProgress] = useState<number>(0);
  const [finalised, setFinalised] = useState<boolean>(false);
  const [message, setMessage] = useState<string>("Finalizing summary");
  const [dots, setDots] = useState<string>("");
  const [timeElapsed, setTimeElapsed] = useState<number>(0);

  const count = useRef<number>(0);
  const cyclingStarted = useRef<boolean>(false);
  const intervalRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const { isLoading, summary } = props;

  useEffect(() => {
    if (isLoading) {
      setFinalised(false);
      setProgress(0);
      setMessage("Finalizing summary");
      setTimeElapsed(0);
      count.current = 0;
      cyclingStarted.current = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = undefined;
      }

      const getRandomValueInRange = (min: number, max: number) => {
        return Math.floor(Math.random() * (max - min + 1)) + min;
      };

      const updateProgress = () => {
        setProgress((prevProgress) => {
          if (prevProgress <= 30)
            return Math.min(prevProgress + getRandomValueInRange(15, 20), 90);
          if (prevProgress <= 60)
            return Math.min(prevProgress + getRandomValueInRange(5, 10), 90);
          if (prevProgress < 90)
            return Math.min(prevProgress + getRandomValueInRange(3, 7), 90);
          return prevProgress;
        });
      };

      const interval = setInterval(
        updateProgress,
        getRandomValueInRange(1000, 2000),
      );

      return () => {
        clearInterval(interval);
      };
    }
  }, [count, cyclingStarted, intervalRef, isLoading]);

  useEffect(() => {
    if (summary) {
      setProgress(100);
      const timer = setTimeout(() => {
        setFinalised(true);
      }, 1000);

      return () => {
        clearTimeout(timer);
      };
    }
  }, [summary]);

  useEffect(() => {
    const interval = setTimeout(() => {
      setDots((prev) => {
        const newDots = prev.length >= 3 ? "" : prev + ".";
        return newDots;
      });
    }, 750);

    return () => clearTimeout(interval);
  }, [dots]);

  // Track time elapsed while loading
  useEffect(() => {
    let startTime: number;
    let interval: NodeJS.Timeout;
    if (progress >= 90 && !finalised) {
      startTime = Date.now();
      interval = setInterval(() => {
        setTimeElapsed(Date.now() - startTime);
      }, 100);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [finalised, progress]);

  //cycle messages after reaching 90% progress (when generation taking longer than 2 second)
  useEffect(() => {
    if (
      progress >= 90 &&
      !finalised &&
      timeElapsed >= 2000 &&
      !cyclingStarted.current
    ) {
      cyclingStarted.current = true;
      setMessage(PROGRESS_MESSAGES[count.current % PROGRESS_MESSAGES.length]);
      count.current++;
      intervalRef.current = setInterval(() => {
        setMessage(PROGRESS_MESSAGES[count.current % PROGRESS_MESSAGES.length]);
        count.current++;
      }, 2000);
    }
    return () => {
      if (finalised && intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = undefined;
      }
    };
  }, [
    progress,
    timeElapsed,
    finalised,
    setMessage,
    cyclingStarted,
    count,
    intervalRef,
  ]);

  return {
    progress,
    finalised,
    message: message + dots,
  };
};

export default useAISummaryProgress;
