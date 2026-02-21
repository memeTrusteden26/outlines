import { useState } from 'react';

interface Table {
  id: number;
  name: string;
  topic: string;
  host: string;
}

interface SidebarProps {
  tables: Table[];
  activeTableId: number;
  onSelectTable: (id: number) => void;
  onCreateTable: (name: string, topic: string) => void;
  isCreating: boolean;
}

export default function Sidebar({ tables, activeTableId, onSelectTable, onCreateTable, isCreating }: SidebarProps) {
  const [newName, setNewName] = useState("");
  const [newTopic, setNewTopic] = useState("");
  const [showCreate, setShowCreate] = useState(false);

  const handleCreate = () => {
    if (newName && newTopic) {
        onCreateTable(newName, newTopic);
        setNewName("");
        setNewTopic("");
        setShowCreate(false);
    }
  };

  return (
    <div className="w-64 bg-gray-800 text-white flex flex-col h-full border-r border-gray-700">
      <div className="p-4 border-b border-gray-700 font-bold text-xl flex items-center">
        <span>🦎 Lizard Lounge</span>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div
            className={`p-3 cursor-pointer hover:bg-gray-700 ${activeTableId === 0 ? 'bg-gray-700 border-l-4 border-green-500' : ''}`}
            onClick={() => onSelectTable(0)}
        >
            <h3 className="font-bold">Main Lounge</h3>
            <p className="text-xs text-gray-400">Public Chat</p>
        </div>

        <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase">Tables</div>

        {tables.map(table => (
            <div
                key={table.id}
                className={`p-3 cursor-pointer hover:bg-gray-700 ${activeTableId === Number(table.id) ? 'bg-gray-700 border-l-4 border-green-500' : ''}`}
                onClick={() => onSelectTable(Number(table.id))}
            >
                <h3 className="font-bold truncate">#{table.name}</h3>
                <p className="text-xs text-gray-400 truncate">{table.topic}</p>
            </div>
        ))}
      </div>

      <div className="p-4 border-t border-gray-700">
        {!showCreate ? (
            <button
                onClick={() => setShowCreate(true)}
                className="w-full bg-green-600 hover:bg-green-700 text-white py-2 rounded text-sm font-bold"
            >
                + New Table
            </button>
        ) : (
            <div className="space-y-2">
                <input
                    type="text"
                    placeholder="Table Name"
                    className="w-full bg-gray-900 border border-gray-600 rounded px-2 py-1 text-sm"
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                />
                <input
                    type="text"
                    placeholder="Topic"
                    className="w-full bg-gray-900 border border-gray-600 rounded px-2 py-1 text-sm"
                    value={newTopic}
                    onChange={e => setNewTopic(e.target.value)}
                />
                <div className="flex gap-2">
                    <button
                        onClick={handleCreate}
                        disabled={isCreating}
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white py-1 rounded text-xs font-bold"
                    >
                        {isCreating ? 'Creating...' : 'Create'}
                    </button>
                    <button
                        onClick={() => setShowCreate(false)}
                        className="flex-1 bg-gray-600 hover:bg-gray-500 text-white py-1 rounded text-xs font-bold"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        )}
      </div>
    </div>
  );
}
