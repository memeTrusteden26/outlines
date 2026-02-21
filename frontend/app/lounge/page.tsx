'use client';

import { useState, useEffect } from 'react';
import { useAccount, useWriteContract, useWatchContractEvent, usePublicClient } from 'wagmi';
import { LIZARD_LOUNGE_ADDRESS, LIZARD_LOUNGE_ABI } from '@/config/contracts';
import Sidebar from '@/components/Lounge/Sidebar';
import ChatWindow from '@/components/Lounge/ChatWindow';
import SkillAnnouncer from '@/components/Lounge/SkillAnnouncer';
import LizardLab from '@/components/LizardLab/LizardLab';

interface Table {
    id: number;
    name: string;
    topic: string;
    host: string;
}

interface Message {
    tableId: number;
    sender: string;
    content: string;
    timestamp: number;
    lizardName?: string;
}

export default function LoungePage() {
  const { address } = useAccount();
  const { writeContract, isPending } = useWriteContract();
  const publicClient = usePublicClient();

  const [tables, setTables] = useState<Table[]>([]);
  const [activeTableId, setActiveTableId] = useState(0);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isMember, setIsMember] = useState(false);
  const [tableHost, setTableHost] = useState<string | undefined>(undefined);
  const [isLabOpen, setIsLabOpen] = useState(false);

  // Load Tables
  useEffect(() => {
    if (!publicClient) return;

    const fetchTables = async () => {
        try {
            const logs = await publicClient.getContractEvents({
                address: LIZARD_LOUNGE_ADDRESS as `0x${string}`,
                abi: LIZARD_LOUNGE_ABI,
                eventName: 'TableCreated',
                fromBlock: 0n,
            });

            const loadedTables = logs.map(log => ({
                id: Number(log.args.tableId),
                name: log.args.name || 'Unknown',
                host: log.args.host || '0x0',
                topic: log.args.topic || ''
            }));

            setTables(loadedTables);
        } catch (e) {
            console.error("Failed to fetch tables", e);
        }
    };

    fetchTables();
  }, [publicClient]);

  // Load Messages & Check Membership
  useEffect(() => {
    if (!publicClient) return;

    const fetchMessages = async () => {
        try {
            const logs = await publicClient.getContractEvents({
                address: LIZARD_LOUNGE_ADDRESS as `0x${string}`,
                abi: LIZARD_LOUNGE_ABI,
                eventName: 'Message',
                args: { tableId: BigInt(activeTableId) },
                fromBlock: 0n,
            });

            const loadedMessages = logs.map(log => ({
                tableId: Number(log.args.tableId),
                sender: log.args.sender || 'Unknown',
                content: log.args.content || '',
                timestamp: Number(log.args.timestamp),
                lizardName: log.args.lizardName || ''
            }));

            setMessages(loadedMessages);
        } catch (e) {
            console.error("Failed to fetch messages", e);
        }
    };

    const checkMembership = async () => {
        if (!address || activeTableId === 0) {
            setIsMember(true); // Everyone is member of Main Lounge
            return;
        }

        try {
            const result = await publicClient.readContract({
                address: LIZARD_LOUNGE_ADDRESS as `0x${string}`,
                abi: LIZARD_LOUNGE_ABI,
                functionName: 'tableMembers',
                args: [BigInt(activeTableId), address]
            });
            setIsMember(result as boolean);
        } catch (e) {
            console.error("Error checking membership", e);
            setIsMember(false);
        }
    };

    fetchMessages();
    checkMembership();

    // Update Host info
    if (activeTableId === 0) {
        setTableHost(undefined);
    } else {
        const currentTable = tables.find(t => t.id === activeTableId);
        setTableHost(currentTable?.host);
    }

  }, [activeTableId, publicClient, tables, address]);

  // Real-time updates
  useWatchContractEvent({
    address: LIZARD_LOUNGE_ADDRESS as `0x${string}`,
    abi: LIZARD_LOUNGE_ABI,
    eventName: 'Message',
    onLogs(logs) {
        const newMessages = logs
            .filter(log => Number(log.args.tableId) === activeTableId)
            .map(log => ({
                tableId: Number(log.args.tableId),
                sender: log.args.sender || 'Unknown',
                content: log.args.content || '',
                timestamp: Number(log.args.timestamp) || Math.floor(Date.now()/1000),
                lizardName: log.args.lizardName || ''
            }));
        if (newMessages.length > 0) {
            setMessages(prev => [...prev, ...newMessages]);
        }
    },
  });

  useWatchContractEvent({
    address: LIZARD_LOUNGE_ADDRESS as `0x${string}`,
    abi: LIZARD_LOUNGE_ABI,
    eventName: 'TableCreated',
    onLogs(logs) {
         const newTables = logs.map(log => ({
            id: Number(log.args.tableId),
            name: log.args.name || 'Unknown',
            host: log.args.host || '0x0',
            topic: log.args.topic || ''
        }));
        setTables(prev => {
            // Dedup
            const existingIds = new Set(prev.map(t => t.id));
            const uniqueNew = newTables.filter(t => !existingIds.has(t.id));
            return [...prev, ...uniqueNew];
        });
    }
  });

  // Actions
  const handleSendMessage = (content: string) => {
    writeContract({
        address: LIZARD_LOUNGE_ADDRESS as `0x${string}`,
        abi: LIZARD_LOUNGE_ABI,
        functionName: 'postMessage',
        args: [BigInt(activeTableId), content]
    });
  };

  const handleCreateTable = (name: string, topic: string) => {
    writeContract({
        address: LIZARD_LOUNGE_ADDRESS as `0x${string}`,
        abi: LIZARD_LOUNGE_ABI,
        functionName: 'createTable',
        args: [name, topic]
    });
  };

  const handleAnnounceSkill = (skill: string) => {
    writeContract({
        address: LIZARD_LOUNGE_ADDRESS as `0x${string}`,
        abi: LIZARD_LOUNGE_ABI,
        functionName: 'announceSkill',
        args: [skill]
    });
  };

  const handleJoinTable = (tableId: number) => {
    writeContract({
        address: LIZARD_LOUNGE_ADDRESS as `0x${string}`,
        abi: LIZARD_LOUNGE_ABI,
        functionName: 'requestJoin',
        args: [BigInt(tableId)]
    });
  };

  const handleKickMember = (tableId: number, member: string) => {
    writeContract({
        address: LIZARD_LOUNGE_ADDRESS as `0x${string}`,
        abi: LIZARD_LOUNGE_ABI,
        functionName: 'kickMember',
        args: [BigInt(tableId), member as `0x${string}`]
    });
  };

  return (
    <div className="flex h-screen bg-black text-white overflow-hidden">
      <Sidebar
        tables={tables}
        activeTableId={activeTableId}
        onSelectTable={(id) => {
            setActiveTableId(id);
            setIsLabOpen(false);
        }}
        onCreateTable={handleCreateTable}
        isCreating={isPending}
        onOpenLab={() => setIsLabOpen(true)}
        isLabOpen={isLabOpen}
      />

      <div className="flex-1 flex flex-col relative h-full">
        {/* Top Bar with Skill Announcer */}
        <div className="absolute top-4 right-4 z-20">
             <SkillAnnouncer
                onAnnounce={handleAnnounceSkill}
                isAnnouncing={isPending}
            />
        </div>

        {isLabOpen ? (
            <div className="flex-1 overflow-y-auto bg-gray-900 p-8">
                <LizardLab />
            </div>
        ) : (
            <ChatWindow
                activeTableId={activeTableId}
                messages={messages}
                onSendMessage={handleSendMessage}
                onJoinTable={handleJoinTable}
                onKickMember={handleKickMember}
                isMember={isMember}
                currentUser={address}
                tableHost={tableHost}
            />
        )}
      </div>
    </div>
  );
}
