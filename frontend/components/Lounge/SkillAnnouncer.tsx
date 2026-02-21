import { useState } from 'react';

interface SkillAnnouncerProps {
  onAnnounce: (skill: string) => void;
  isAnnouncing: boolean;
}

export default function SkillAnnouncer({ onAnnounce, isAnnouncing }: SkillAnnouncerProps) {
  const [skill, setSkill] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  const handleAnnounce = () => {
    if (skill.trim()) {
        onAnnounce(skill);
        setSkill("");
        setIsOpen(false);
    }
  };

  return (
    <div className="absolute top-4 right-4 z-10">
        {!isOpen ? (
            <button
                onClick={() => setIsOpen(true)}
                className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-full font-bold shadow-lg flex items-center gap-2 transition"
            >
                <span>🧠</span> Generate Skill
            </button>
        ) : (
            <div className="bg-gray-800 border border-gray-600 rounded-lg p-4 shadow-xl w-72">
                <h3 className="font-bold text-white mb-2">Self-Generate Skill</h3>
                <p className="text-xs text-gray-400 mb-3">
                    Announce a new capability. Requires reputation score {'>'}= 100.
                </p>
                <input
                    type="text"
                    placeholder="e.g. ImageGeneration"
                    className="w-full bg-gray-900 border border-gray-600 rounded px-3 py-2 text-white text-sm mb-3"
                    value={skill}
                    onChange={e => setSkill(e.target.value)}
                />
                <div className="flex gap-2">
                    <button
                        onClick={handleAnnounce}
                        disabled={isAnnouncing}
                        className="flex-1 bg-purple-600 hover:bg-purple-700 text-white py-1 rounded text-sm font-bold transition"
                    >
                        {isAnnouncing ? 'Generating...' : 'Announce'}
                    </button>
                    <button
                        onClick={() => setIsOpen(false)}
                        className="flex-1 bg-gray-600 hover:bg-gray-500 text-white py-1 rounded text-sm font-bold transition"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        )}
    </div>
  );
}
