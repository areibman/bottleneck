import { Users } from 'lucide-react';
import { cn } from '../../utils/cn';
import { ParticipantStat } from './types';
import { ParticipantCard } from './ParticipantCard';

interface ParticipantsSidebarProps {
  participants: ParticipantStat[];
  theme: 'light' | 'dark';
}

export function ParticipantsSidebar({ participants, theme }: ParticipantsSidebarProps) {
  return (
    <div className={cn(
      "w-80 border-l overflow-y-auto",
      theme === 'dark' ? "bg-gray-900 border-gray-700" : "bg-gray-50 border-gray-200"
    )}>
      <div className="p-4">
        <h3 className={cn(
          "text-sm font-semibold mb-4 flex items-center",
          theme === 'dark' ? "text-gray-300" : "text-gray-700"
        )}>
          <Users className="w-4 h-4 mr-2" />
          Participants ({participants.length})
        </h3>
        
        <div className="space-y-3">
          {participants.map(participant => (
            <ParticipantCard
              key={participant.user.login}
              participant={participant}
              theme={theme}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
