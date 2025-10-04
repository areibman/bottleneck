import { GitPullRequest, GitBranch, Zap, Users } from "lucide-react";

export default function WelcomeView() {
  return (
    <div className="flex flex-col items-center justify-center h-full bg-gray-900 p-8">
      <div className="max-w-2xl text-center">
        <div className="mb-8">
          <div className="flex justify-center mb-4">
            <div className="p-4 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl shadow-2xl">
              <GitPullRequest className="w-16 h-16 text-white" />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-white mb-3">
            Welcome to Bottleneck
          </h1>
          <p className="text-lg text-gray-400">
            Fast GitHub PR review and branch management
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="flex justify-center mb-3">
              <Zap className="w-8 h-8 text-yellow-400" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">
              Lightning Fast
            </h3>
            <p className="text-sm text-gray-400">
              Near-instant navigation and diff rendering
            </p>
          </div>

          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="flex justify-center mb-3">
              <GitBranch className="w-8 h-8 text-green-400" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">
              Smart Management
            </h3>
            <p className="text-sm text-gray-400">
              Bulk actions and intelligent PR grouping
            </p>
          </div>

          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="flex justify-center mb-3">
              <Users className="w-8 h-8 text-blue-400" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">
              Team Focused
            </h3>
            <p className="text-sm text-gray-400">
              Optimized for collaborative workflows
            </p>
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-3">Get Started</h3>
          <p className="text-gray-400 mb-4">
            Select a repository from the dropdown above to view and manage your
            pull requests.
          </p>
          <div className="flex justify-center">
            <div className="inline-flex items-center px-4 py-2 bg-gray-700 rounded-lg text-sm text-gray-300">
              <GitBranch className="w-4 h-4 mr-2" />
              Click "Select Repository" in the top bar
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
