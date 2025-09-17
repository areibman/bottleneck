import { useMemo } from "react";
import {
  UncontrolledTreeEnvironment,
  Tree,
  StaticTreeDataProvider,
  TreeItem,
  TreeItemIndex,
} from "react-complex-tree";
import "react-complex-tree/lib/style-modern.css";
import {
  Folder,
  FileDiff,
  Eye,
  FilePlus,
  FileMinus,
  FileEdit,
} from "lucide-react";
import { File } from "../../services/github";
import { cn } from "../../utils/cn";

type TreeData = {
  isFolder: boolean;
  file?: File;
};

interface FileTreeProps {
  files: File[];
  selectedFile?: File | null;
  viewedFiles: Set<string>;
  onFileSelect: (file: File) => void;
  theme: "dark" | "light";
}

export function FileTree({
  files,
  viewedFiles,
  onFileSelect,
  theme,
}: FileTreeProps) {
  const treeItems = useMemo(() => {
    if (!files || files.length === 0) {
      return {};
    }

    const items: Record<TreeItemIndex, TreeItem<TreeData>> = {
      root: {
        index: "root",
        isFolder: true,
        children: [],
        data: { isFolder: true },
      },
    };

    for (const file of files) {
      const pathParts = file.filename.split("/");
      let currentPath = "";
      let parentIndex: TreeItemIndex = "root";

      for (let i = 0; i < pathParts.length; i++) {
        const part = pathParts[i];
        currentPath = currentPath ? `${currentPath}/${part}` : part;
        const isFolder = i < pathParts.length - 1;

        if (!items[currentPath]) {
          items[currentPath] = {
            index: currentPath,
            isFolder,
            children: [],
            data: { isFolder, file: isFolder ? undefined : file },
          };

          const parent: TreeItem<TreeData> = items[parentIndex];
          if (parent && parent.children) {
            // Check if the child is already there before adding
            if (!parent.children.includes(currentPath)) {
              parent.children.push(currentPath);
            }
          }
        }
        parentIndex = currentPath;
      }
    }

    // Sort children alphabetically, folders first
    for (const item of Object.values(items)) {
      if (item.children) {
        item.children.sort((a, b) => {
          const itemA = items[a];
          const itemB = items[b];
          if (itemA.isFolder && !itemB.isFolder) return -1;
          if (!itemA.isFolder && itemB.isFolder) return 1;
          return a > b ? 1 : -1;
        });
      }
    }
    return items;
  }, [files]);

  const treeDataProvider: StaticTreeDataProvider<TreeData> = useMemo(() => {
    return new StaticTreeDataProvider<TreeData>(treeItems);
  }, [treeItems]);

  return (
    <UncontrolledTreeEnvironment
      dataProvider={treeDataProvider}
      getItemTitle={(item) => item.index.toString().split("/").pop() || ""}
      viewState={{
        "pr-files": {
          expandedItems: Array.from(
            (Object.values(treeItems) as TreeItem<TreeData>[])
              .filter(
                (item: TreeItem<TreeData>) =>
                  item.isFolder && (item.children?.length ?? 0) > 0,
              )
              .map((item: TreeItem<TreeData>) => item.index),
          ),
        },
      }}
      onPrimaryAction={(item: TreeItem<TreeData>) => {
        if (item && !item.isFolder && item.data.file) {
          onFileSelect(item.data.file);
        }
      }}
      renderItemTitle={({ title, item }) => (
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center space-x-1.5 flex-1 min-w-0">
            <span className="text-xs truncate font-mono flex items-center">
              {item.isFolder ? (
                <Folder
                  className={cn(
                    "w-3 h-3 flex-shrink-0 mx-1",
                    theme === "dark" ? "text-gray-500" : "text-gray-600",
                  )}
                />
              ) : (
                <FileDiff
                  className={cn(
                    "w-3 h-3 flex-shrink-0 mx-1",
                    theme === "dark" ? "text-gray-500" : "text-gray-600",
                  )}
                />
              )}

              {title}
            </span>
          </div>

          {item.data.file && (
            <div className="flex items-center space-x-1 ml-2">
              {viewedFiles.has(item.data.file.filename) && (
                <Eye
                  className={cn(
                    "w-3 h-3",
                    theme === "dark" ? "text-gray-500" : "text-gray-600",
                  )}
                />
              )}
              <div className="flex items-center space-x-1 text-[10px]">
                {item.data.file.status === "added" ? (
                  <>
                    <FilePlus className="w-3 h-3 text-green-500" />
                    <span className="text-green-500">
                      +{item.data.file.additions}
                    </span>
                  </>
                ) : item.data.file.status === "removed" ? (
                  <>
                    <FileMinus className="w-3 h-3 text-red-500" />
                    <span className="text-red-500">
                      -{item.data.file.deletions}
                    </span>
                  </>
                ) : item.data.file.status === "modified" ? (
                  <>
                    <FileEdit className="w-3 h-3 text-yellow-500" />
                    <span className="text-green-400">
                      +{item.data.file.additions}
                    </span>
                    <span className="text-red-400">
                      -{item.data.file.deletions}
                    </span>
                  </>
                ) : (
                  <>
                    <span className="text-green-400">
                      +{item.data.file.additions}
                    </span>
                    <span className="text-red-400">
                      -{item.data.file.deletions}
                    </span>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    >
      <Tree treeId="pr-files" rootItem="root" />
    </UncontrolledTreeEnvironment>
  );
}
