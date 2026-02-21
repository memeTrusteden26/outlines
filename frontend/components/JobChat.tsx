import { useState, useEffect, useRef } from "react";
import { useWriteContract, useWatchContractEvent, usePublicClient, useAccount } from "wagmi";
import { LIZARD_LOUNGE_ADDRESS, LIZARD_LOUNGE_ABI } from "@/config/contracts";

interface JobChatProps {
  jobId: bigint;
  isOpen: boolean;
  onClose: () => void;
  currentUser: string;
}

interface Message {
  sender: string;
  content: string;
  timestamp: number;
}

export default function JobChat({ jobId, isOpen, onClose, currentUser }: JobChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const { writeContract, isPending } = useWriteContract();
  const publicClient = usePublicClient();

  // Initial Fetch
  useEffect(() => {
    if (!isOpen || !publicClient) return;

    const fetchMessages = async () => {
      try {
        const logs = await publicClient.getContractEvents({
          address: LIZARD_LOUNGE_ADDRESS as `0x${string}`,
          abi: LIZARD_LOUNGE_ABI,
          eventName: "JobMessage",
          args: { jobId: jobId },
          fromBlock: 0n,
        });

        const loadedMessages = logs.map((log) => ({
          sender: log.args.sender || "Unknown",
          content: log.args.content || "",
          timestamp: Number(log.args.timestamp),
        }));

        setMessages(loadedMessages);
      } catch (e) {
        console.error("Failed to fetch job messages", e);
      }
    };

    fetchMessages();
  }, [isOpen, publicClient, jobId]);

  // Watch for new messages
  useWatchContractEvent({
    address: LIZARD_LOUNGE_ADDRESS as `0x${string}`,
    abi: LIZARD_LOUNGE_ABI,
    eventName: "JobMessage",
    onLogs(logs) {
      const newMessages = logs
        .filter((log) => log.args.jobId === jobId)
        .map((log) => ({
          sender: log.args.sender || "Unknown",
          content: log.args.content || "",
          timestamp: Number(log.args.timestamp),
        }));
      if (newMessages.length > 0) {
        setMessages((prev) => [...prev, ...newMessages]);
      }
    },
  });

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isOpen]);

  const handleSend = () => {
    if (!input.trim()) return;
    writeContract({
      address: LIZARD_LOUNGE_ADDRESS as `0x${string}`,
      abi: LIZARD_LOUNGE_ABI,
      functionName: "postJobMessage",
      args: [jobId, input],
    });
    setInput("");
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 w-96 h-[500px] rounded-lg shadow-xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-4 bg-gray-100 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <h3 className="font-bold">Job Chat #{jobId.toString()}</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
            ✕
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50 dark:bg-gray-800" ref={scrollRef}>
            {messages.length === 0 && <p className="text-xs text-gray-400 text-center">Start the conversation...</p>}
            {messages.map((msg, i) => {
                const isMe = msg.sender.toLowerCase() === currentUser.toLowerCase();
                return (
                    <div key={i} className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}>
                        <div className={`px-3 py-2 rounded-lg max-w-[80%] text-sm ${
                            isMe
                            ? "bg-blue-600 text-white rounded-br-none"
                            : "bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-bl-none"
                        }`}>
                            {msg.content}
                        </div>
                        <span className="text-[10px] text-gray-400 mt-1">
                            {isMe ? "You" : `${msg.sender.slice(0,6)}...`} • {new Date(msg.timestamp * 1000).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </span>
                    </div>
                )
            })}
        </div>

        {/* Input */}
        <div className="p-3 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 flex gap-2">
            <input
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSend()}
                placeholder="Type a message..."
                className="flex-1 px-3 py-2 border rounded text-sm dark:bg-gray-800 dark:border-gray-700 dark:text-white focus:outline-none focus:border-blue-500"
            />
            <button
                onClick={handleSend}
                disabled={isPending}
                className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded text-sm font-bold disabled:opacity-50"
            >
                Send
            </button>
        </div>
      </div>
    </div>
  );
}
