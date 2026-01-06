import Banner from "@/components/banner";
import MainContent from "@/components/main-content";
import Image from "next/image";
import type { Metadata } from "next";
import dynamic from "next/dynamic";

const HistoryPanel = dynamic(
  () => import("@/components/history-items/history-panel"),
  { ssr: true }
);

export const metadata: Metadata = {
  title: "GitVulSafe - Free Dependency Vulnerability Scanner for GitHub & Manifest Files",
  description: "Scan your GitHub repositories and manifest files for security vulnerabilities. Visualize dependency graphs, get AI-powered fix recommendations, and secure your code. Supports npm, pip, Maven, Gradle, and more. 100% free and open-source.",
  openGraph: {
    title: "GitVulSafe - Free Dependency Vulnerability Scanner",
    description: "Scan GitHub repositories and manifest files for security vulnerabilities with AI-powered insights. Free and open-source.",
    type: "website",
  },
};

export default function Home() {
  return (
    <div className="h-full flex flex-col items-center justify-evenly">
      <div className="flex flex-col px-6 pt-10 items-center justify-evenly">
        <Banner />
      </div>
      <div className="flex-1 flex flex-col justify-evenly items-center max-w-4xl w-full px-4 sm:space-y-5">
        <MainContent />
        <HistoryPanel />
      </div>
      <div className="hidden sm:block absolute top-30 left-0 -z-10 w-[300px] h-[300px] opacity-40">
        <Image
          priority
          src="/file.svg"
          alt="Skull Dotted Image"
          width={300}
          height={300}
          style={{ objectFit: "contain" }}
        />
      </div>
      <div className="hidden sm:block absolute bottom-10 right-0 -z-10 w-[300px] h-[300px] opacity-40">
        <Image
          priority
          src="/file.svg"
          alt="Skull dotted Image"
          width={300}
          height={300}
          style={{ objectFit: "contain" }}
        />
      </div>
    </div>
  );
}
