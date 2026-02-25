'use client';

import { useState, useEffect } from 'react';
import { useAccount, useWriteContract, usePublicClient } from 'wagmi';
import { LIZARD_TOKEN_ADDRESS, LIZARD_TOKEN_ABI, LIZARD_LOUNGE_ADDRESS, LIZARD_LOUNGE_ABI } from '@/config/contracts';

interface Lizard {
    id: number;
    name: string;
}

export default function LizardLab() {
    const { address } = useAccount();
    const { writeContract, isPending } = useWriteContract();
    const publicClient = usePublicClient();

    const [myLizards, setMyLizards] = useState<Lizard[]>([]);
    const [breedingParents, setBreedingParents] = useState<[Lizard | null, Lizard | null]>([null, null]);
    const [newName, setNewName] = useState("");
    const [equippedId, setEquippedId] = useState<number | null>(null);

    // Fetch Lizards & Equipped Status
    useEffect(() => {
        if (!address || !publicClient) return;

        const fetchData = async () => {
            try {
                // Fetch owned lizards
                const ids = await publicClient.readContract({
                    address: LIZARD_TOKEN_ADDRESS as `0x${string}`,
                    abi: LIZARD_TOKEN_ABI,
                    functionName: 'getLizardsByOwner',
                    args: [address]
                }) as unknown as bigint[];

                const lizardsWithNames = await Promise.all(ids.map(async (id) => {
                    const name = await publicClient.readContract({
                         address: LIZARD_TOKEN_ADDRESS as `0x${string}`,
                         abi: LIZARD_TOKEN_ABI,
                         functionName: 'lizardNames',
                         args: [id]
                    });
                    return { id: Number(id), name: name as string };
                }));

                setMyLizards(lizardsWithNames);

                // Fetch equipped lizard
                const equipped = await publicClient.readContract({
                    address: LIZARD_LOUNGE_ADDRESS as `0x${string}`,
                    abi: LIZARD_LOUNGE_ABI,
                    functionName: 'equippedLizard',
                    args: [address]
                }) as unknown as bigint;

                const hasEquipped = await publicClient.readContract({
                    address: LIZARD_LOUNGE_ADDRESS as `0x${string}`,
                    abi: LIZARD_LOUNGE_ABI,
                    functionName: 'hasEquipped',
                    args: [address]
                }) as boolean;

                if (hasEquipped) {
                    setEquippedId(Number(equipped));
                } else {
                    setEquippedId(null);
                }

            } catch (e) {
                console.error("Error fetching lizard data:", e);
            }
        };

        fetchData();
        const interval = setInterval(fetchData, 5000); // Poll for updates
        return () => clearInterval(interval);
    }, [address, publicClient, isPending]);

    const handleMint = () => {
        if (!newName) return;
        writeContract({
            address: LIZARD_TOKEN_ADDRESS as `0x${string}`,
            abi: LIZARD_TOKEN_ABI,
            functionName: 'mint',
            args: [newName]
        });
        setNewName("");
    };

    const handleBreed = () => {
        if (!breedingParents[0] || !breedingParents[1]) return;
        writeContract({
            address: LIZARD_TOKEN_ADDRESS as `0x${string}`,
            abi: LIZARD_TOKEN_ABI,
            functionName: 'breed',
            args: [BigInt(breedingParents[0].id), BigInt(breedingParents[1].id)]
        });
        setBreedingParents([null, null]);
    };

    const handleEquip = (id: number) => {
        writeContract({
            address: LIZARD_LOUNGE_ADDRESS as `0x${string}`,
            abi: LIZARD_LOUNGE_ABI,
            functionName: 'equipLizard',
            args: [BigInt(id)]
        });
    };

    const toggleParent = (lizard: Lizard) => {
        // If already selected, remove
        if (breedingParents[0]?.id === lizard.id) {
            setBreedingParents([null, breedingParents[1]]);
            return;
        }
        if (breedingParents[1]?.id === lizard.id) {
            setBreedingParents([breedingParents[0], null]);
            return;
        }

        // Add to first empty slot
        if (!breedingParents[0]) {
            setBreedingParents([lizard, breedingParents[1]]);
        } else if (!breedingParents[1]) {
            setBreedingParents([breedingParents[0], lizard]);
        }
    };

    const isParent = (id: number) => breedingParents[0]?.id === id || breedingParents[1]?.id === id;

    return (
        <div className="bg-gray-900 text-white p-6 rounded-lg shadow-lg max-w-4xl mx-auto mt-8">
            <h1 className="text-3xl font-bold mb-6 text-green-400">🧬 Lizard Lab</h1>

            {/* Minting Section */}
            <div className="mb-8 p-4 bg-gray-800 rounded border border-gray-700">
                <h2 className="text-xl font-bold mb-2">Create Base Lizard</h2>
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        placeholder="e.g. Space, Party, Ancient"
                        className="flex-1 bg-gray-700 border border-gray-600 rounded px-3 py-2"
                    />
                    <button
                        onClick={handleMint}
                        disabled={!newName || isPending}
                        className="bg-green-600 hover:bg-green-500 px-4 py-2 rounded font-bold disabled:opacity-50"
                    >
                        {isPending ? 'Minting...' : 'Mint'}
                    </button>
                </div>
            </div>

            {/* Breeding Section */}
            <div className="mb-8 p-4 bg-gray-800 rounded border border-gray-700 flex flex-col items-center">
                <h2 className="text-xl font-bold mb-4">Breeding Chamber</h2>
                <div className="flex items-center gap-4 mb-4">
                    <div className="w-32 h-32 border-2 border-dashed border-gray-500 rounded flex items-center justify-center bg-gray-900">
                        {breedingParents[0] ? (
                            <div className="text-center p-2">
                                <div className="text-2xl">🦎</div>
                                <div className="font-bold text-sm">{breedingParents[0].name}</div>
                            </div>
                        ) : <span className="text-gray-500">Select Parent 1</span>}
                    </div>
                    <div className="text-2xl font-bold text-green-500">+</div>
                    <div className="w-32 h-32 border-2 border-dashed border-gray-500 rounded flex items-center justify-center bg-gray-900">
                        {breedingParents[1] ? (
                            <div className="text-center p-2">
                                <div className="text-2xl">🦎</div>
                                <div className="font-bold text-sm">{breedingParents[1].name}</div>
                            </div>
                        ) : <span className="text-gray-500">Select Parent 2</span>}
                    </div>
                </div>
                <button
                    onClick={handleBreed}
                    disabled={!breedingParents[0] || !breedingParents[1] || isPending}
                    className="bg-purple-600 hover:bg-purple-500 px-8 py-2 rounded font-bold text-lg disabled:opacity-50"
                >
                    {isPending ? 'Breeding...' : 'Breed New Lizard'}
                </button>
            </div>

            {/* Inventory */}
            <div>
                <h2 className="text-xl font-bold mb-4">My Lizards ({myLizards.length})</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {myLizards.map(lizard => (
                        <div
                            key={lizard.id}
                            className={`p-3 rounded border cursor-pointer transition-all ${
                                isParent(lizard.id)
                                    ? 'border-purple-500 bg-purple-900/20'
                                    : equippedId === lizard.id
                                        ? 'border-green-500 bg-green-900/20'
                                        : 'border-gray-700 bg-gray-800 hover:border-gray-500'
                            }`}
                            onClick={() => toggleParent(lizard)}
                        >
                            <div className="flex justify-between items-start mb-2">
                                <span className="text-2xl">🦎</span>
                                <div className="text-xs text-gray-500">#{lizard.id}</div>
                            </div>
                            <h3 className="font-bold truncate" title={lizard.name}>{lizard.name}</h3>

                            <div className="mt-2 flex gap-1">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleEquip(lizard.id);
                                    }}
                                    disabled={equippedId === lizard.id || isPending}
                                    className={`flex-1 text-xs py-1 rounded font-bold ${
                                        equippedId === lizard.id
                                            ? 'bg-green-700 text-green-200 cursor-default'
                                            : 'bg-gray-600 hover:bg-gray-500'
                                    }`}
                                >
                                    {equippedId === lizard.id ? 'Equipped' : 'Equip'}
                                </button>
                            </div>
                        </div>
                    ))}
                    {myLizards.length === 0 && (
                        <div className="col-span-full text-center text-gray-500 py-8">
                            No lizards found. Mint one above!
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
