import { useState, useEffect, useRef } from 'react';

interface Message {
  tableId: number;
  sender: string;
  content: string;
  timestamp: number;
  lizardName?: string;
}

interface ChatWindowProps {
  activeTableId: number;
  messages: Message[];
  onSendMessage: (content: string) => void;
  onJoinTable: (id: number) => void;
  onKickMember: (tableId: number, member: string) => void;
  isMember: boolean;
  currentUser: string | undefined;
  tableHost: string | undefined;
}

export default function ChatWindow({
    activeTableId,
    messages,
    onSendMessage,
    onJoinTable,
    onKickMember,
    isMember,
    currentUser,
    tableHost
}: ChatWindowProps) {
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = () => {
    if (input.trim()) {
        onSendMessage(input);
        setInput("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
        handleSend();
    }
  };

  const isHost = tableHost?.toLowerCase() === currentUser?.toLowerCase();

  // Format time
  const formatTime = (ts: number) => {
    return new Date(ts * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex-1 flex flex-col bg-gray-900 text-white h-full relative">
        {/* Header */}
        <div className="p-4 border-b border-gray-700 flex justify-between items-center bg-gray-800">
            <h2 className="font-bold text-lg flex items-center">
                <span className="mr-2">🦎</span>
                {activeTableId === 0 ? "Main Lounge" : `Table #${activeTableId}`}
            </h2>
            {activeTableId !== 0 && (
                <span className="text-xs text-gray-400">Host: {tableHost?.slice(0,6)}...</span>
            )}
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-900" ref={scrollRef}>
            {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-gray-500 mt-10">
                    <div className="text-4xl mb-4">🦎</div>
                    <p>No messages yet. Start chatting!</p>
                </div>
            )}
            {messages.map((msg, idx) => {
                const isMe = msg.sender.toLowerCase() === currentUser?.toLowerCase();
                return (
                    <div key={idx} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                        <div className="flex items-center space-x-2 text-xs text-gray-400 mb-1">
                            {msg.lizardName && (
                                <span className="text-purple-400 font-bold text-xs bg-purple-900/30 px-1 rounded border border-purple-500/30">
                                    {msg.lizardName}
                                </span>
                            )}
                            <span className="font-mono text-gray-500">
                                {isMe ? 'You' : `${msg.sender.slice(0, 6)}...`}
                            </span>
                            <span className="text-gray-600">
                                {formatTime(msg.timestamp)}
                            </span>
                            {isHost && !isMe && activeTableId !== 0 && (
                                <button
                                    onClick={() => onKickMember(activeTableId, msg.sender)}
                                    className="text-red-500 ml-2 hover:underline text-xs"
                                    title="Kick Member"
                                >
                                    [Kick]
                                </button>
                            )}
                        </div>
                        <div className={`px-4 py-2 rounded-2xl max-w-md break-words shadow-sm ${
                            isMe
                                ? 'bg-green-600 text-white rounded-br-none'
                                : 'bg-gray-800 text-gray-200 rounded-bl-none border border-gray-700'
                        }`}>
                            {msg.content}
                        </div>
                    </div>
                );
            })}
        </div>

        {/* Input Area */}
        <div className="p-4 bg-gray-800 border-t border-gray-700">
            {activeTableId === 0 || isMember ? (
                <div className="flex space-x-2">
                    <input
                        type="text"
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={`Message #${activeTableId === 0 ? 'Main Lounge' : activeTableId}...`}
                        className="flex-1 bg-gray-900 border border-gray-600 rounded px-4 py-2 text-white focus:outline-none focus:border-green-500 transition-colors"
                    />
                    <button
                        onClick={handleSend}
                        className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded font-bold transition-colors shadow-lg"
                    >
                        Send
                    </button>
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center p-4 bg-gray-700/50 rounded border border-gray-600">
                    <p className="mb-2 text-gray-300">You are viewing a private table.</p>
                    <button
                        onClick={() => onJoinTable(activeTableId)}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded font-bold transition-colors shadow-lg"
                    >
                        Request to Join Table #{activeTableId}
                    </button>
                </div>
            )}
        </div>
    </div>
  );
}
