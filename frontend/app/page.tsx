"use client";
import { ConnectKitButton } from "connectkit";
import { PostJob } from "@/components/PostJob";
import { JobBoard } from "@/components/JobBoard";

export default function Home() {
  return (
    <div className="min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      <header className="flex justify-between items-center mb-12">
        <h1 className="text-3xl font-bold">LazyTask Marketplace</h1>
        <ConnectKitButton />
      </header>

      <main className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
        <section className="bg-gray-50 dark:bg-gray-900 p-6 rounded-xl border border-gray-200 dark:border-gray-800">
          <h2 className="text-xl font-semibold mb-4">Post a Job</h2>
          <p className="text-gray-500 mb-4">Connect your wallet to post a new task.</p>
          <PostJob />
        </section>

        <section className="bg-gray-50 dark:bg-gray-900 p-6 rounded-xl border border-gray-200 dark:border-gray-800">
          <h2 className="text-xl font-semibold mb-4">Available Jobs</h2>
          <p className="text-gray-500 mb-4">Connect your wallet to see available tasks.</p>
          <JobBoard />
        </section>
      </main>

      <footer className="row-start-3 flex gap-6 flex-wrap items-center justify-center mt-12 text-gray-400">
        <p>Built with OpenClaw & Hardhat</p>
      </footer>
    </div>
  );
}
