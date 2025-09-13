import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  AlertCircle,
  CheckCircle,
  MessageSquare,
  Filter,
  MoreHorizontal,
  Tag,
  Users
} from 'lucide-react';
import { useIssueStore } from '../stores/issueStore';
import { usePRStore } from '../stores/prStore';
import { useUIStore } from '../stores/uiStore';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '../utils/cn';
import WelcomeView from './WelcomeView';
import { Issue } from '../services/github';

const IssueItem = React.memo(({ issue, onIssueClick, theme }: { 
  issue: Issue;
  onIssueClick: (issue: Issue) => void;
  theme: 'light' | 'dark';
}) => {
  return (
    <div
      className={cn(
        'px-4 py-3 cursor-pointer',
        theme === 'dark' 
          ? 'hover:bg-gray-800' 
          : 'hover:bg-gray-100',
      )}
      onClick={() => onIssueClick(issue)}
    >
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0 mt-1">
          {issue.state === 'open' ? (
            <AlertCircle className="w-5 h-5 text-green-400" title="Open" />
          ) : (
            <CheckCircle className="w-5 h-5 text-purple-400" title="Closed" />
          )}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <h3 className={cn(
                "text-sm font-medium truncate",
                theme === 'dark' ? "text-white" : "text-gray-900"
              )}>
                {issue.title}
              </h3>
              
              <div className={cn(
                "flex items-center mt-1 text-xs space-x-3",
                theme === 'dark' ? "text-gray-400" : "text-gray-600"
              )}>
                <span>#{issue.number}</span>
                <span>by {issue.user.login}</span>
                <span>
                  {formatDistanceToNow(new Date(issue.updated_at), { addSuffix: true })}
                </span>
              </div>
              
              {issue.labels.length > 0 && (
                <div className="flex items-center mt-2 space-x-1">
                  {issue.labels.slice(0, 5).map((label) => (
                    <span
                      key={label.name}
                      className="px-2 py-0-5 text-xs rounded"
                      style={{
                        backgroundColor: `#${label.color}30`,
                        color: `#${label.color}`,
                      }}
                    >
                      {label.name}
                    </span>
                  ))}
                </div>
              )}
            </div>
            
            <div className="flex items-center space-x-3 ml-4">
              {issue.assignees.length > 0 && (
                <div className="flex -space-x-2">
                  {issue.assignees.map((assignee) => (
                    <img
                      key={assignee.login}
                      src={assignee.avatar_url}
                      alt={assignee.login}
                      className={cn(
                        "w-6 h-6 rounded-full border-2",
                        theme === 'dark' ? "border-gray-800" : "border-white"
                      )}
                      title={`Assigned to: ${assignee.login}`}
                    />
                  ))}
                </div>
              )}

              <span className="flex items-center text-xs">
                <MessageSquare className="w-3 h-3 mr-1" />
                {issue.comments}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

export default function IssuesView() {
  const navigate = useNavigate();
  const { issues, loading, fetchIssues } = useIssueStore();
  const { selectedRepo } = usePRStore();
  const { theme } = useUIStore();
  const [sortBy, setSortBy] = useState<'updated' | 'created' | 'comments'>('updated');

  useEffect(() => {
    if (selectedRepo) {
      fetchIssues(selectedRepo.owner, selectedRepo.name);
    }
  }, [selectedRepo, fetchIssues]);

  // Cache date parsing in a separate map to avoid modifying objects
  const parsedDates = useMemo(() => {
    const dateMap = new Map();
    issues.forEach((issue, key) => {
      dateMap.set(key, {
        updated: new Date(issue.updated_at).getTime(),
        created: new Date(issue.created_at).getTime()
      });
    });
    return dateMap;
  }, [issues]);

  const filteredIssues = useMemo(() => {
    let issuesArray = Array.from(issues.values());
    
    // Sort using cached dates from the map
    issuesArray.sort((a, b) => {
      const aKey = `${a.repository?.owner.login || ''}/${a.repository?.name || ''}#${a.number}`;
      const bKey = `${b.repository?.owner.login || ''}/${b.repository?.name || ''}#${b.number}`;
      const aDates = parsedDates.get(aKey) || { updated: 0, created: 0 };
      const bDates = parsedDates.get(bKey) || { updated: 0, created: 0 };
      
      switch (sortBy) {
        case 'updated':
          return bDates.updated - aDates.updated;
        case 'created':
          return bDates.created - aDates.created;
        case 'comments':
          return b.comments - a.comments;
        default:
          return 0;
      }
    });
    
    return issuesArray;
  }, [issues, parsedDates, sortBy]);

  const handleIssueClick = useCallback((issue: Issue) => {
    if (selectedRepo) {
      navigate(`/issues/${selectedRepo.owner}/${selectedRepo.name}/${issue.number}`);
    }
  }, [navigate, selectedRepo]);

  if (!selectedRepo) {
    return <WelcomeView />;
  }

  return (
    <div className="flex flex-col h-full">
      <div className={cn(
        "p-4 border-b",
        theme === 'dark' 
          ? "bg-gray-800 border-gray-700" 
          : "bg-gray-50 border-gray-200"
      )}>
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold flex items-center">
            <AlertCircle className="w-5 h-5 mr-2" />
            Issues
            {selectedRepo && (
              <span className={cn(
                "ml-2 text-sm",
                theme === 'dark' ? "text-gray-400" : "text-gray-600"
              )}>in {selectedRepo.name}</span>
            )}
            <span className={cn(
              "ml-2 text-sm",
              theme === 'dark' ? "text-gray-500" : "text-gray-600"
            )}>({filteredIssues.length})</span>
          </h1>
          
          <div className="flex items-center space-x-2">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className={cn(
                "text-sm px-3 py-2 rounded-md transition-colors",
                theme === 'dark'
                  ? "bg-gray-700 border-gray-600 text-white"
                  : "bg-white border-gray-300 text-gray-900 border"
              )}
            >
              <option value="updated">Recently updated</option>
              <option value="created">Recently created</option>
              <option value="comments">Most commented</option>
            </select>
            
            <button className="btn btn-ghost p-2">
              <Filter className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className={cn(
              theme === 'dark' ? "text-gray-400" : "text-gray-600"
            )}>Loading issues...</div>
          </div>
        ) : filteredIssues.length === 0 ? (
          <div className={cn(
            "flex flex-col items-center justify-center h-64",
            theme === 'dark' ? "text-gray-400" : "text-gray-600"
          )}>
            <AlertCircle className="w-12 h-12 mb-4 opacity-50" />
            <p className="text-lg font-medium">No issues found</p>
            {selectedRepo && (
              <p className="text-sm mt-2">No issues in {selectedRepo.full_name}</p>
            )}
          </div>
        ) : (
          <div className={cn(
            "divide-y",
            theme === 'dark' ? "divide-gray-700" : "divide-gray-200"
          )}>
            {filteredIssues.map((issue) => (
              <IssueItem 
                key={issue.id} 
                issue={issue}
                onIssueClick={handleIssueClick}
                theme={theme}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
