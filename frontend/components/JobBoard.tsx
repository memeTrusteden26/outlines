"use client";

import { useReadContract, useWriteContract } from "wagmi";
import { LAZY_TASK_MARKETPLACE_ADDRESS, LAZY_TASK_MARKETPLACE_ABI } from "@/config/contracts";
import { formatEther } from "viem";

export function JobBoard() {
  const { data: nextJobId } = useReadContract({
    address: LAZY_TASK_MARKETPLACE_ADDRESS,
    abi: LAZY_TASK_MARKETPLACE_ABI,
    functionName: "nextJobId",
  });

  // In a real app, you'd fetch jobs properly (e.g., using The Graph or logs).
  // Here, we just blindly try to fetch the first few for demo.
  const jobIds = nextJobId ? Array.from({ length: Number(nextJobId) }, (_, i) => i) : [];

  return (
    <div className="space-y-4">
      {jobIds.length === 0 ? (
        <p className="text-gray-500">No jobs available yet.</p>
      ) : (
        jobIds.map((id) => <JobCard key={id} jobId={BigInt(id)} />)
      )}
    </div>
  );
}

function JobCard({ jobId }: { jobId: bigint }) {
  const { data: job } = useReadContract({
    address: LAZY_TASK_MARKETPLACE_ADDRESS,
    abi: LAZY_TASK_MARKETPLACE_ABI,
    functionName: "jobs",
    args: [jobId],
  }) as { data: any };

  const { writeContract, isPending } = useWriteContract();

  if (!job) return null;

  // Status Enum: 0=Posted, 1=Accepted, 2=Completed, 3=Disputed, 4=Rejected
  const statusLabels = ["Posted", "Accepted", "Completed", "Disputed", "Rejected"];

  const handleAccept = () => {
    writeContract({
      address: LAZY_TASK_MARKETPLACE_ADDRESS,
      abi: LAZY_TASK_MARKETPLACE_ABI,
      functionName: "acceptJob",
      args: [jobId],
      value: job.workerBond,
    });
  };

  return (
    <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700">
      <div className="flex justify-between items-start mb-2">
        <h3 className="font-bold text-lg">{job[5]}</h3>
        <span className={`px-2 py-1 rounded text-xs font-medium ${
          job.status === 0 ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
        }`}>
          {statusLabels[job[6]]}
        </span>
      </div>
      <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1 mb-4">
        <p>Bounty: <span className="font-mono text-black dark:text-white">{formatEther(job[2])} ETH</span></p>
        <p>Bond: <span className="font-mono text-black dark:text-white">{formatEther(job[3])} ETH</span></p>
        <p>Customer: {job[0].slice(0, 6)}...{job[0].slice(-4)}</p>
      </div>

      {job[6] === 0 && (
        <button
          onClick={handleAccept}
          disabled={isPending}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded transition disabled:opacity-50"
        >
          {isPending ? "Accepting..." : "Accept Job"}
        </button>
      )}
    </div>
  );
}
