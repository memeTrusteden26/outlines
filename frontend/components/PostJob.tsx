"use client";

import { useWriteContract } from "wagmi";
import { LAZY_TASK_MARKETPLACE_ADDRESS, LAZY_TASK_MARKETPLACE_ABI } from "@/config/contracts";
import { parseEther } from "viem";
import { useState } from "react";

export function PostJob() {
  const { writeContract, isPending, isSuccess } = useWriteContract();
  const [jobType, setJobType] = useState("");
  const [bounty, setBounty] = useState("");
  const [bond, setBond] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!jobType || !bounty || !bond) return;

    writeContract({
      address: LAZY_TASK_MARKETPLACE_ADDRESS,
      abi: LAZY_TASK_MARKETPLACE_ABI,
      functionName: "postJob",
      args: [jobType, parseEther(bond)],
      value: parseEther(bounty),
    });
  };

  if (isSuccess) {
    return (
      <div className="p-4 bg-green-50 text-green-700 rounded-lg">
        Job posted successfully! Refresh to see it on the board.
        <button
          onClick={() => window.location.reload()}
          className="block mt-2 text-sm underline"
        >
          Post another
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1">Task Description</label>
        <input
          type="text"
          value={jobType}
          onChange={(e) => setJobType(e.target.value)}
          placeholder="e.g. Get coffee from Starbucks"
          className="w-full p-2 rounded border border-gray-300 dark:border-gray-700 dark:bg-gray-800"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Bounty (ETH)</label>
          <input
            type="number"
            step="0.001"
            value={bounty}
            onChange={(e) => setBounty(e.target.value)}
            placeholder="0.01"
            className="w-full p-2 rounded border border-gray-300 dark:border-gray-700 dark:bg-gray-800"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Required Bond (ETH)</label>
          <input
            type="number"
            step="0.001"
            value={bond}
            onChange={(e) => setBond(e.target.value)}
            placeholder="0.005"
            className="w-full p-2 rounded border border-gray-300 dark:border-gray-700 dark:bg-gray-800"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="w-full bg-black dark:bg-white text-white dark:text-black font-bold py-2 px-4 rounded hover:opacity-90 transition disabled:opacity-50"
      >
        {isPending ? "Posting..." : "Post Job"}
      </button>
    </form>
  );
}
