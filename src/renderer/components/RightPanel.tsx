import React, { useState } from 'react';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  User, 
  Tag, 
  GitBranch,
  Settings,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { useAppStore } from '../store/appStore';

export const RightPanel: React.FC = () => {
  const { 
    rightPanelVisible, 
    setRightPanelVisible, 
    selectedPR 
  } = useAppStore();
  const [activeTab, setActiveTab] = useState<'checks' | 'participants' | 'labels'>('checks');

  if (!rightPanelVisible) {
    return (
      <div className="w-8 bg-[#161b22] border-l border-[#30363d] flex flex-col items-center py-4">
        <button
          className="p-2 hover:bg-[#21262d] rounded"
          onClick={() => setRightPanelVisible(true)}
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
      </div>
    );
  }

  if (!selectedPR) {
    return (
      <div className="w-80 bg-[#161b22] border-l border-[#30363d] flex flex-col">
        <div className="p-4 border-b border-[#30363d] flex items-center justify-between">
          <h3 className="text-sm font-medium">Details</h3>
          <button
            className="p-1 hover:bg-[#21262d] rounded"
            onClick={() => setRightPanelVisible(false)}
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <p className="text-gray">Select a PR to view details</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-80 bg-[#161b22] border-l border-[#30363d] flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-[#30363d]">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium">Details</h3>
          <button
            className="p-1 hover:bg-[#21262d] rounded"
            onClick={() => setRightPanelVisible(false)}
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[#30363d]">
          <button
            className={`flex-1 p-2 text-sm font-medium border-b-2 ${
              activeTab === 'checks'
                ? 'border-[#1f6feb] text-white'
                : 'border-transparent text-gray hover:text-white'
            }`}
            onClick={() => setActiveTab('checks')}
          >
            Checks
          </button>
          <button
            className={`flex-1 p-2 text-sm font-medium border-b-2 ${
              activeTab === 'participants'
                ? 'border-[#1f6feb] text-white'
                : 'border-transparent text-gray hover:text-white'
            }`}
            onClick={() => setActiveTab('participants')}
          >
            People
          </button>
          <button
            className={`flex-1 p-2 text-sm font-medium border-b-2 ${
              activeTab === 'labels'
                ? 'border-[#1f6feb] text-white'
                : 'border-transparent text-gray hover:text-white'
            }`}
            onClick={() => setActiveTab('labels')}
          >
            Labels
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'checks' && <ChecksTab pr={selectedPR} />}
        {activeTab === 'participants' && <ParticipantsTab pr={selectedPR} />}
        {activeTab === 'labels' && <LabelsTab pr={selectedPR} />}
      </div>
    </div>
  );
};

const ChecksTab: React.FC<{ pr: any }> = ({ pr }) => {
  const checks: Array<{
    name: string;
    status: 'success' | 'pending' | 'failure' | 'error';
    description: string;
    details: string;
  }> = [
    {
      name: 'CI / Build',
      status: 'success',
      description: 'All checks passed',
      details: '2 of 2 checks passed'
    },
    {
      name: 'Code Quality',
      status: 'success',
      description: 'No issues found',
      details: 'Lint, type check, and security scan passed'
    },
    {
      name: 'Tests',
      status: 'pending',
      description: 'Running tests...',
      details: 'Unit tests and integration tests in progress'
    }
  ];

  return (
    <div className="p-4 space-y-4">
      {checks.map((check, index) => (
        <div key={index} className="p-3 bg-[#0d1117] rounded border border-[#30363d]">
          <div className="flex items-center gap-3 mb-2">
            {check.status === 'success' && <CheckCircle className="w-5 h-5 text-green-500" />}
            {(check.status === 'failure' || check.status === 'error') && <XCircle className="w-5 h-5 text-red-500" />}
            {check.status === 'pending' && <Clock className="w-5 h-5 text-yellow-500" />}
            <div className="flex-1">
              <h4 className="text-sm font-medium">{check.name}</h4>
              <p className="text-xs text-gray">{check.description}</p>
            </div>
          </div>
          <p className="text-xs text-gray">{check.details}</p>
        </div>
      ))}
    </div>
  );
};

const ParticipantsTab: React.FC<{ pr: any }> = ({ pr }) => {
  const participants = [
    {
      type: 'author',
      user: pr.author,
      role: 'Author',
      status: 'active'
    },
    ...pr.reviewers.map((reviewer: string) => ({
      type: 'reviewer',
      user: reviewer,
      role: 'Reviewer',
      status: 'pending'
    })),
    ...pr.assignees.map((assignee: string) => ({
      type: 'assignee',
      user: assignee,
      role: 'Assignee',
      status: 'active'
    }))
  ];

  return (
    <div className="p-4 space-y-3">
      {participants.map((participant, index) => (
        <div key={index} className="flex items-center gap-3 p-2 hover:bg-[#21262d] rounded">
          <div className="w-8 h-8 bg-[#21262d] rounded-full flex items-center justify-center">
            <User className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium truncate">{participant.user}</span>
              <span className="text-xs text-gray">{participant.role}</span>
            </div>
            <div className="flex items-center gap-1">
              <div className={`w-2 h-2 rounded-full ${
                participant.status === 'active' ? 'bg-green-500' :
                participant.status === 'pending' ? 'bg-yellow-500' :
                'bg-gray-500'
              }`} />
              <span className="text-xs text-gray capitalize">{participant.status}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

const LabelsTab: React.FC<{ pr: any }> = ({ pr }) => {
  const labelColors = {
    'bug': 'bg-red-900 text-red-200',
    'enhancement': 'bg-blue-900 text-blue-200',
    'feature': 'bg-green-900 text-green-200',
    'documentation': 'bg-yellow-900 text-yellow-200',
    'good first issue': 'bg-purple-900 text-purple-200',
    'help wanted': 'bg-pink-900 text-pink-200'
  };

  return (
    <div className="p-4">
      {pr.labels.length === 0 ? (
        <p className="text-gray text-sm">No labels</p>
      ) : (
        <div className="space-y-2">
          {pr.labels.map((label: string, index: number) => (
            <div
              key={index}
              className={`inline-block px-2 py-1 text-xs rounded ${
                labelColors[label as keyof typeof labelColors] || 'bg-gray-900 text-gray-200'
              }`}
            >
              {label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};