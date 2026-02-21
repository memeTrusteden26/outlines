"use client";

import { useState } from "react";
import {
  useReadContract,
  useWriteContract,
  usePublicClient,
  useAccount,
} from "wagmi";
import { LAZY_TASK_MARKETPLACE_ADDRESS, LAZY_TASK_MARKETPLACE_ABI } from "@/config/contracts";
import { formatEther, parseEther } from "viem";

// Tuple type (matches your Job struct order)
type JobTuple = [
  `0x${string}`,     // 0: customer
  `0x${string}`,     // 1: worker
  bigint,            // 2: bounty
  bigint,            // 3: workerBond
  bigint,            // 4: timestamp
  string,            // 5: jobType / description
  number,            // 6: status
  string             // 7: evidenceHash
];

export function JobBoard() {
  const [filterType, setFilterType] = useState<string>("All");

  const { data: nextJobId } = useReadContract({
    address: LAZY_TASK_MARKETPLACE_ADDRESS,
    abi: LAZY_TASK_MARKETPLACE_ABI,
    functionName: "nextJobId",
  });

  const { data: activeJobTypes } = useReadContract({
    address: LAZY_TASK_MARKETPLACE_ADDRESS,
    abi: LAZY_TASK_MARKETPLACE_ABI,
    functionName: "getActiveJobTypes",
  });

  const jobIds = nextJobId ? Array.from({ length: Number(nextJobId) }, (_, i) => BigInt(i)) : [];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Filter by Type:</label>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="p-2 border rounded text-sm dark:bg-gray-800 dark:border-gray-700"
        >
          <option value="All">All Jobs</option>
          {activeJobTypes?.map((type: string) => (
            <option key={type} value={type}>{type}</option>
          ))}
        </select>
      </div>

      {jobIds.length === 0 ? (
        <p className="text-gray-500">No jobs available yet.</p>
      ) : (
        jobIds.map((id) => <JobCard key={Number(id)} jobId={id} filterType={filterType} />)
      )}
    </div>
  );
}

function JobCard({ jobId, filterType }: { jobId: bigint; filterType: string }) {
  const publicClient = usePublicClient();
  const { address: account } = useAccount();

  const { data: rawJob } = useReadContract({
    address: LAZY_TASK_MARKETPLACE_ADDRESS,
    abi: LAZY_TASK_MARKETPLACE_ABI,
    functionName: "jobs",
    args: [jobId],
  });

  const job = rawJob as JobTuple | undefined;

  const { writeContract, isPending, error } = useWriteContract();

  if (!job) return null;
  if (filterType !== "All" && job[5] !== filterType) return null;

  const statusLabels = ["Posted", "Accepted", "Completed", "Disputed", "Rejected"];

  const handleAccept = async () => {
    if (!job || !account || !publicClient) {
      console.error("Missing account or publicClient");
      return;
    }

    try {
      // Estimate gas
      const estimated = await publicClient.estimateContractGas({
        address: LAZY_TASK_MARKETPLACE_ADDRESS,
        abi: LAZY_TASK_MARKETPLACE_ABI,
        functionName: "acceptJob",
        args: [jobId],
        value: job[3],
        account,
      });

      console.log("Estimated gas units:", Number(estimated));

      // Add 30% buffer, but cap below Hardhat's typical safe limit
      let gasToUse = (estimated * 130n) / 100n;
      if (gasToUse > 16_000_000n) {
        gasToUse = 16_000_000n;
        console.warn("Capped gas limit to 16M to avoid Hardhat cap violation");
      }

      writeContract({
        address: LAZY_TASK_MARKETPLACE_ADDRESS,
        abi: LAZY_TASK_MARKETPLACE_ABI,
        functionName: "acceptJob",
        args: [jobId],
        value: job[3],
        gas: gasToUse,
      });
    } catch (err: any) {
      console.error("Accept preparation failed:", err);
      // Fallback: try with a safe manual gas (common for simple tx ~300k-800k)
      writeContract({
        address: LAZY_TASK_MARKETPLACE_ADDRESS,
        abi: LAZY_TASK_MARKETPLACE_ABI,
        functionName: "acceptJob",
        args: [jobId],
        value: job[3],
        gas: 2_000_000n,  // safe middle-ground; adjust up if needed
      });
    }
  };

  // Error message helper
  const getErrorMessage = () => {
    if (!error) return null;

    if (typeof error !== "object" || error === null) {
      return String(error) || "Unknown error";
    }

    let msg = (error as any).shortMessage || error.message || "Transaction failed";

    const reason = (error as any).cause?.reason;
    if (typeof reason === "string" && reason) {
      return `${msg} → ${reason}`;
    }

    return msg;
  };

  const errorMessage = getErrorMessage();

  return (
    <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700">
      <div className="flex justify-between items-start mb-2">
        <h3 className="font-bold text-lg">{job[5]}</h3>
        <span
          className={`px-2 py-1 rounded text-xs font-medium ${
            job[6] === 0 ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
          }`}
        >
          {statusLabels[job[6]]}
        </span>
      </div>

      <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1 mb-4">
        <p>Bounty: <span className="font-mono">{formatEther(job[2])} ETH</span></p>
        <p>Bond: <span className="font-mono">{formatEther(job[3])} ETH</span></p>
        <p>Customer: {job[0].slice(0,6)}...{job[0].slice(-4)}</p>
      </div>

      {job[6] === 0 && (
        <button
          onClick={handleAccept}
          disabled={isPending}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded disabled:opacity-50"
        >
          {isPending ? "Accepting..." : "Accept Job"}
        </button>
      )}

      {errorMessage && (
        <div className="mt-3 text-red-600 text-sm border-l-4 border-red-600 pl-3 py-1">
          Transaction failed: {errorMessage}
        </div>
      )}
    </div>
  );
}