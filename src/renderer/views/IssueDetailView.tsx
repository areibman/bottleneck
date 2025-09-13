import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft,
  AlertCircle,
  CheckCircle,
  MessageSquare,
  User,
  Tag
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useAuthStore } from '../stores/authStore';
import { GitHubAPI, Issue, Comment } from '../services/github';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '../utils/cn';
import { mockIssues } from '../mockData'; // Assuming mock comments for issues will be added
import { useUIStore } from '../stores/uiStore';
import { Markdown } from '../components/Markdown';

export default function IssueDetailView() {
  const { owner, repo, number } = useParams<{ owner: string; repo: string; number: string }>();
  const navigate = useNavigate();
  const { token } = useAuthStore();
  const { theme } = useUIStore();
  
  const [issue, setIssue] = useState<Issue | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (owner && repo && number) {
      loadIssueData();
    }
  }, [owner, repo, number, token]);

  const loadIssueData = async () => {
    setLoading(true);
    
    try {
      if (!token || token === 'dev-token') {
        const issueNumber = parseInt(number || '0');
        const mockIssue = mockIssues.find(i => i.number === issueNumber) || mockIssues[0];
        
        setIssue(mockIssue as any);
        // setComments(mockIssueComments as any); // TODO: Add mock comments for issues
      } else if (owner && repo && number) {
        const api = new GitHubAPI(token);
        const issueNumber = parseInt(number);
        
        const issueData = await api.getIssue(owner, repo, issueNumber);
        // const commentsData = await api.getIssueComments(owner, repo, issueNumber);
        
        setIssue(issueData);
        // setComments(commentsData);
      }
    } catch (error) {
      console.error('Failed to load issue data:', error);
    } finally {
      setLoading(false);
    }
  };
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className={cn(theme === 'dark' ? "text-gray-400" : "text-gray-600")}>
          Loading issue...
        </div>
      </div>
    );
  }

  if (!issue) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className={cn(theme === 'dark' ? "text-gray-400" : "text-gray-600")}>
          Issue not found
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className={cn(
        "p-4 border-b",
        theme === 'dark' 
          ? "bg-gray-800 border-gray-700" 
          : "bg-gray-50 border-gray-200"
      )}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => navigate('/issues')}
              className={cn(
                "p-1 rounded transition-colors",
                theme === 'dark' ? "hover:bg-gray-700" : "hover:bg-gray-100"
              )}
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            
            <div className="flex items-center space-x-2">
              {issue.state === 'open' ? (
                <AlertCircle className="w-5 h-5 text-green-400" title="Open" />
              ) : (
                <CheckCircle className="w-5 h-5 text-purple-400" title="Closed" />
              )}
              
              <h1 className="text-lg font-semibold">
                {issue.title}
                <span className={cn(
                  "ml-2 text-sm",
                  theme === 'dark' ? "text-gray-500" : "text-gray-600"
                )}>#{issue.number}</span>
              </h1>
            </div>
          </div>
        </div>
        
        <div className={cn(
          "flex items-center space-x-4 text-sm ml-12",
          theme === 'dark' ? "text-gray-400" : "text-gray-600"
        )}>
          <div className="flex items-center space-x-2">
            <img
              src={issue.user.avatar_url}
              alt={issue.user.login}
              className="w-5 h-5 rounded-full"
            />
            <span>{issue.user.login} opened this issue</span>
          </div>
          
          <span>
            {formatDistanceToNow(new Date(issue.created_at), { addSuffix: true })}
          </span>
          
          <div className="flex items-center space-x-1">
            <MessageSquare className="w-4 h-4" />
            <span>{issue.comments} comments</span>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex space-x-6">
            {/* Main content */}
            <div className="flex-1">
              <div className={cn(
                "p-4 rounded-lg border",
                theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
              )}>
                {issue.body ? <Markdown content={issue.body} /> : <p className="text-gray-500 italic">No description provided.</p>}
              </div>
            </div>

            {/* Sidebar */}
            <aside className="w-64">
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-semibold mb-2">Assignees</h3>
                  {issue.assignees.length > 0 ? (
                    issue.assignees.map(a => (
                      <div key={a.login} className="flex items-center space-x-2">
                        <img src={a.avatar_url} alt={a.login} className="w-6 h-6 rounded-full" />
                        <span>{a.login}</span>
                      </div>
                    ))
                  ) : <p className="text-sm text-gray-500">No one assigned</p>}
                </div>

                <div>
                  <h3 className="text-sm font-semibold mb-2">Labels</h3>
                  {issue.labels.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {issue.labels.map(l => (
                        <span
                          key={l.name}
                          className="px-2 py-0.5 text-xs rounded"
                          style={{
                            backgroundColor: `#${l.color}30`,
                            color: `#${l.color}`,
                          }}
                        >
                          {l.name}
                        </span>
                      ))}
                    </div>
                  ) : <p className="text-sm text-gray-500">None yet</p>}
                </div>
              </div>
            </aside>
          </div>
        </div>
      </div>
    </div>
  );
}
