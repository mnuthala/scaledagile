import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface Milestone {
  id: string;
  name: string;
  date: string;
  color: string; // NEW
}

interface MilestoneContextType {
  milestones: Milestone[];
  addMilestone: (milestone: Omit<Milestone, 'id'>) => void;
  updateMilestone: (id: string, milestone: Omit<Milestone, 'id'>) => void;
  deleteMilestone: (id: string) => void;
}

const MilestoneContext = createContext<MilestoneContextType | undefined>(undefined);

export const useMilestones = () => {
  const context = useContext(MilestoneContext);
  if (!context) {
    throw new Error('useMilestones must be used within a MilestoneProvider');
  }
  return context;
};

interface MilestoneProviderProps {
  children: ReactNode;
}

const DEFAULT_COLOURS = ['#7C3AED','#EF4444','#10B981','#3B82F6','#F59E0B','#EC4899','#14B8A6','#8B5CF6'];
const fallbackColor = (idx: number) => DEFAULT_COLOURS[idx % DEFAULT_COLOURS.length];

export const MilestoneProvider: React.FC<MilestoneProviderProps> = ({ children }) => {
  const [milestones, setMilestones] = useState<Milestone[]>(() => {
    const saved = localStorage.getItem('timelineMilestones');
    if (saved) {
      try {
        const parsed: any[] = JSON.parse(saved);
        // Migrate older records that lack color
        return parsed.map((m, i) => ({
          id: m.id ?? Date.now().toString(),
          name: m.name ?? '',
          date: m.date ?? '',
          color: m.color ?? fallbackColor(i),
        })) as Milestone[];
      } catch (error) {
        console.error('Failed to parse saved milestones:', error);
        return [];
      }
    }
    return [];
  });

  useEffect(() => {
    localStorage.setItem('timelineMilestones', JSON.stringify(milestones));
  }, [milestones]);

  const addMilestone = (milestone: Omit<Milestone, 'id'>) => {
    const newMilestone: Milestone = {
      ...milestone,
      id: Date.now().toString(),
    };
    setMilestones(prev => [...prev, newMilestone]);
  };

  const updateMilestone = (id: string, milestone: Omit<Milestone, 'id'>) => {
    setMilestones(prev => prev.map(m => (m.id === id ? { ...milestone, id } : m)));
  };

  const deleteMilestone = (id: string) => {
    setMilestones(prev => prev.filter(m => m.id !== id));
  };

  return (
    <MilestoneContext.Provider value={{ milestones, addMilestone, updateMilestone, deleteMilestone }}>
      {children}
    </MilestoneContext.Provider>
  );
};
