"use client";
import { useState } from "react";
import { ConnectKitButton } from "connectkit";
import { PostJob } from "@/components/PostJob";
import { JobBoard } from "@/components/JobBoard";
import { MyJobs } from "@/components/MyJobs";
import { Profile } from "@/components/Profile";

export default function Home() {
  const [activeTab, setActiveTab] = useState("board");

  return (
    <div className="min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      <header className="flex justify-between items-center mb-12 flex-wrap gap-4">
        <h1 className="text-3xl font-bold">LazyTask Marketplace</h1>
        <div className="flex items-center gap-4 flex-wrap">
            <nav className="flex gap-4">
                <button
                    onClick={() => setActiveTab("board")}
                    className={`px-4 py-2 rounded-lg font-medium transition ${activeTab === "board" ? "bg-black text-white dark:bg-white dark:text-black" : "text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"}`}
                >
                    Job Board
                </button>
                <button
                    onClick={() => setActiveTab("myjobs")}
                    className={`px-4 py-2 rounded-lg font-medium transition ${activeTab === "myjobs" ? "bg-black text-white dark:bg-white dark:text-black" : "text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"}`}
                >
                    My Jobs
                </button>
                <button
                    onClick={() => setActiveTab("profile")}
                    className={`px-4 py-2 rounded-lg font-medium transition ${activeTab === "profile" ? "bg-black text-white dark:bg-white dark:text-black" : "text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"}`}
                >
                    Profile
                </button>
            </nav>
            <ConnectKitButton />
        </div>
      </header>

      <main>
        {activeTab === "board" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
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
            </div>
        )}

        {activeTab === "myjobs" && (
            <div className="bg-gray-50 dark:bg-gray-900 p-6 rounded-xl border border-gray-200 dark:border-gray-800">
                <MyJobs />
            </div>
        )}

        {activeTab === "profile" && (
            <div className="bg-gray-50 dark:bg-gray-900 p-6 rounded-xl border border-gray-200 dark:border-gray-800">
                <Profile />
            </div>
        )}
      </main>

      <footer className="row-start-3 flex gap-6 flex-wrap items-center justify-center mt-12 text-gray-400">
        <p>Built with OpenClaw & Hardhat</p>
      </footer>
    </div>
  );
}
