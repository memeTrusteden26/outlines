"use client";

import { useState } from "react";
import { useReadContract, useWriteContract, useAccount } from "wagmi";
import { LAZY_TASK_MARKETPLACE_ADDRESS, LAZY_TASK_MARKETPLACE_ABI } from "@/config/contracts";
import { formatEther } from "viem";

export function MyJobs() {
  const { address } = useAccount();
  const { data: nextJobId } = useReadContract({
    address: LAZY_TASK_MARKETPLACE_ADDRESS,
    abi: LAZY_TASK_MARKETPLACE_ABI,
    functionName: "nextJobId",
  });

  const jobIds = nextJobId ? Array.from({ length: Number(nextJobId) }, (_, i) => BigInt(i)) : [];

  if (!address) {
    return <p className="text-gray-500">Please connect your wallet to view your jobs.</p>;
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-bold mb-4">Jobs I Posted</h2>
        <div className="space-y-4">
          {jobIds.length > 0 ? (
            jobIds.map((id) => (
              <MyJobCard key={Number(id)} jobId={id} userAddress={address} filterType="customer" />
            ))
          ) : (
             <p className="text-gray-500">No jobs found.</p>
          )}
        </div>
      </div>

      <div>
        <h2 className="text-xl font-bold mb-4">Jobs I Accepted</h2>
        <div className="space-y-4">
            {jobIds.length > 0 ? (
              jobIds.map((id) => (
              <MyJobCard key={Number(id)} jobId={id} userAddress={address} filterType="worker" />
            ))
          ) : (
             <p className="text-gray-500">No jobs found.</p>
          )}
        </div>
      </div>
    </div>
  );
}

export function MyJobCard({ jobId, userAddress, filterType }: { jobId: bigint, userAddress: string, filterType: "customer" | "worker" }) {
  const { data: job } = useReadContract({
    address: LAZY_TASK_MARKETPLACE_ADDRESS,
    abi: LAZY_TASK_MARKETPLACE_ABI,
    functionName: "jobs",
    args: [jobId],
  }) as { data: any };

  const { writeContract, isPending } = useWriteContract();

  if (!job) return null;

  return (
    <MyJobCardView
      job={job}
      jobId={jobId}
      userAddress={userAddress}
      filterType={filterType}
      writeContract={writeContract}
      isPending={isPending}
    />
  );
}

export function MyJobCardView({
  job,
  jobId,
  userAddress,
  filterType,
  writeContract,
  isPending
}: {
  job: any,
  jobId: bigint,
  userAddress: string,
  filterType: "customer" | "worker",
  writeContract: any,
  isPending: boolean
}) {
  const [evidenceHash, setEvidenceHash] = useState("");
  const [rating, setRating] = useState(5);

  // Filter logic
  // job[0] is customer, job[1] is worker
  const isMyJob = filterType === "customer"
    ? job[0].toLowerCase() === userAddress.toLowerCase()
    : job[1].toLowerCase() === userAddress.toLowerCase();

  if (!isMyJob) return null;

  // Status Enum: 0=Posted, 1=Accepted, 2=Completed, 3=Disputed, 4=Rejected
  const statusLabels = ["Posted", "Accepted", "Completed", "Disputed", "Rejected"];
  const jobStatus = job[6]; // job.status

  const handleSubmitEvidence = () => {
    writeContract({
      address: LAZY_TASK_MARKETPLACE_ADDRESS,
      abi: LAZY_TASK_MARKETPLACE_ABI,
      functionName: "submitEvidence",
      args: [jobId, evidenceHash],
    });
  };

  const handleCompleteJob = () => {
    writeContract({
      address: LAZY_TASK_MARKETPLACE_ADDRESS,
      abi: LAZY_TASK_MARKETPLACE_ABI,
      functionName: "completeJob",
      args: [jobId, rating],
    });
  };

  return (
    <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700">
      <div className="flex justify-between items-start mb-2">
        <h3 className="font-bold text-lg">{job[5]}</h3>
        <span className={`px-2 py-1 rounded text-xs font-medium ${
          jobStatus === 0 ? "bg-green-100 text-green-800" :
          jobStatus === 1 ? "bg-blue-100 text-blue-800" :
          "bg-gray-100 text-gray-800"
        }`}>
          {statusLabels[jobStatus]}
        </span>
      </div>
      <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1 mb-4">
        <p>Bounty: <span className="font-mono text-black dark:text-white">{formatEther(job[2])} ETH</span></p>
        <p>Bond: <span className="font-mono text-black dark:text-white">{formatEther(job[3])} ETH</span></p>
        <p>Job ID: #{jobId.toString()}</p>
        {filterType === "customer" && job[1] !== "0x0000000000000000000000000000000000000000" && (
            <p>Worker: {job[1].slice(0, 6)}...{job[1].slice(-4)}</p>
        )}
        {filterType === "worker" && (
            <p>Customer: {job[0].slice(0, 6)}...{job[0].slice(-4)}</p>
        )}
      </div>

      {/* Worker Actions */}
      {filterType === "worker" && jobStatus === 1 && (
        <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
          <label className="block text-sm font-medium mb-2">Submit Evidence (URL or Hash)</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={evidenceHash}
              onChange={(e) => setEvidenceHash(e.target.value)}
              placeholder="https://..."
              className="flex-1 px-3 py-2 border rounded text-sm dark:bg-gray-900 dark:border-gray-600"
            />
            <button
              onClick={handleSubmitEvidence}
              disabled={isPending || !evidenceHash}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm disabled:opacity-50"
            >
              {isPending ? "Submitting..." : "Submit"}
            </button>
          </div>
        </div>
      )}

      {/* Customer Actions */}
      {filterType === "customer" && jobStatus === 1 && (
        <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
          <label className="block text-sm font-medium mb-2">Complete & Rate Job</label>

          {job[7] && (
            <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-900 rounded text-sm break-all">
              <span className="font-bold">Evidence:</span> {job[7]}
              {job[7].startsWith("http") && (
                <a href={job[7]} target="_blank" rel="noreferrer" className="ml-2 text-blue-600 underline">
                  Open
                </a>
              )}
            </div>
          )}

          <div className="flex gap-2 items-center">
             <select
               value={rating}
               onChange={(e) => setRating(Number(e.target.value))}
               className="px-3 py-2 border rounded text-sm dark:bg-gray-900 dark:border-gray-600"
             >
               {[1, 2, 3, 4, 5].map(r => (
                 <option key={r} value={r}>{r} Stars</option>
               ))}
             </select>
            <button
              onClick={handleCompleteJob}
              disabled={isPending}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded text-sm disabled:opacity-50 flex-1"
            >
              {isPending ? "Completing..." : "Complete Job"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
