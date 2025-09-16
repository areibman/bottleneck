import { ExternalLink } from 'lucide-react';
import { cn } from '../../utils/cn';
import { VercelDeployment } from './types';

interface VercelDeploymentCardProps {
  deployments: VercelDeployment[];
  theme: 'light' | 'dark';
}

export function VercelDeploymentCard({ deployments, theme }: VercelDeploymentCardProps) {
  return (
    <div className={cn(
      "mt-2 pt-2 border-t",
      theme === 'dark' ? "border-gray-700" : "border-gray-200"
    )}>
      <div className={cn(
        "text-xs font-medium mb-1",
        theme === 'dark' ? "text-gray-400" : "text-gray-600"
      )}>
        Deployments
      </div>
      <div className="space-y-1">
        {deployments.map((deployment, index) => (
          <div
            key={index}
            className={cn(
              "p-2 rounded text-xs",
              theme === 'dark' ? "bg-gray-900" : "bg-gray-100"
            )}
          >
            <div className="flex items-center justify-between mb-1">
              <span className={cn(
                "font-medium",
                theme === 'dark' ? "text-gray-300" : "text-gray-700"
              )}>
                {deployment.project}
              </span>
              <span className={cn(
                "px-1.5 py-0.5 rounded text-[10px] font-medium",
                deployment.status === 'Ready' && "bg-green-500/20 text-green-400",
                deployment.status === 'Ignored' && "bg-gray-500/20 text-gray-400",
                deployment.status === 'Building' && "bg-yellow-500/20 text-yellow-400",
                deployment.status === 'Error' && "bg-red-500/20 text-red-400",
                deployment.status === 'Canceled' && "bg-gray-500/20 text-gray-400"
              )}>
                {deployment.status}
              </span>
            </div>
            {deployment.preview && (
              <a
                href={deployment.preview}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  "flex items-center text-[10px] transition-colors mt-1",
                  theme === 'dark'
                    ? "text-blue-400 hover:text-blue-300"
                    : "text-blue-600 hover:text-blue-700"
                )}
              >
                <ExternalLink className="w-3 h-3 mr-1 flex-shrink-0" />
                <span className="truncate">Preview</span>
              </a>
            )}
            <div className={cn(
              "text-[10px] mt-1",
              theme === 'dark' ? "text-gray-500" : "text-gray-600"
            )}>
              {deployment.updated}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
