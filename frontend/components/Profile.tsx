"use client";

import { useAccount, useReadContract } from "wagmi";
import {
  REPUTATION_REGISTRY_ADDRESS,
  REPUTATION_REGISTRY_ABI,
  REWARD_ENGINE_ADDRESS,
  REWARD_ENGINE_ABI
} from "@/config/contracts";
import { formatEther } from "viem";

export function Profile() {
  const { address } = useAccount();

  const { data: score } = useReadContract({
    address: REPUTATION_REGISTRY_ADDRESS,
    abi: REPUTATION_REGISTRY_ABI,
    functionName: "reputationScores",
    args: address ? [address] : undefined,
  });

  const { data: history } = useReadContract({
    address: REPUTATION_REGISTRY_ADDRESS,
    abi: REPUTATION_REGISTRY_ABI,
    functionName: "getWorkerHistory",
    args: address ? [address] : undefined,
  }) as { data: any[] | undefined };

  const { data: balance } = useReadContract({
    address: REWARD_ENGINE_ADDRESS,
    abi: REWARD_ENGINE_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
  });

  if (!address) {
    return <p className="text-gray-500">Please connect your wallet to view your profile.</p>;
  }

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Reputation Score</h3>
          <p className="text-3xl font-bold mt-2">{score ? score.toString() : "0"}</p>
        </div>
        <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">LAZY Token Balance</h3>
          <p className="text-3xl font-bold mt-2">{balance ? formatEther(balance) : "0"}</p>
        </div>
      </div>

      <div>
        <h3 className="text-xl font-bold mb-4">Worker History</h3>
        {!history || history.length === 0 ? (
          <p className="text-gray-500">No history found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
              <thead>
                <tr>
                  <th className="py-2 px-4 border-b text-left">Job ID</th>
                  <th className="py-2 px-4 border-b text-left">Rating</th>
                  <th className="py-2 px-4 border-b text-left">Bounty</th>
                  <th className="py-2 px-4 border-b text-left">Date</th>
                </tr>
              </thead>
              <tbody>
                {history.map((record: any, index: number) => (
                  <tr key={index}>
                    <td className="py-2 px-4 border-b">#{record.jobId.toString()}</td>
                    <td className="py-2 px-4 border-b">{record.rating}/5</td>
                    <td className="py-2 px-4 border-b">{formatEther(record.bounty)} ETH</td>
                    <td className="py-2 px-4 border-b">
                      {new Date(Number(record.timestamp) * 1000).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
