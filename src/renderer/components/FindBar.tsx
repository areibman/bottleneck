import React, { useState, useEffect, useRef } from "react";

interface FindBarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function FindBar({ isOpen, onClose }: FindBarProps) {
  const [searchText, setSearchText] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleClose();
      } else if (e.key === "Enter") {
        if (e.shiftKey) {
          findPrevious();
        } else {
          findNext();
        }
      }
    };

    if (isOpen) {
      window.addEventListener("keydown", handleEscape);
      return () => window.removeEventListener("keydown", handleEscape);
    }
  }, [isOpen, searchText]);

  const handleClose = () => {
    window.electron.find.stop("clearSelection");
    setSearchText("");
    onClose();
  };

  const handleSearch = (text: string) => {
    setSearchText(text);
    if (text) {
      window.electron.find.search(text);
    } else {
      window.electron.find.stop("clearSelection");
    }
  };

  const findNext = () => {
    if (searchText) {
      window.electron.find.search(searchText, { forward: true, findNext: true });
    }
  };

  const findPrevious = () => {
    if (searchText) {
      window.electron.find.search(searchText, { forward: false, findNext: true });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed top-0 right-4 z-50 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-b-md shadow-lg flex items-center gap-2 p-2">
      <input
        ref={inputRef}
        type="text"
        value={searchText}
        onChange={(e) => handleSearch(e.target.value)}
        placeholder="Find"
        className="px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
        style={{ width: "200px" }}
      />
      <button
        onClick={findPrevious}
        disabled={!searchText}
        className="px-2 py-1 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded disabled:opacity-50 disabled:cursor-not-allowed"
        title="Previous (Shift+Enter)"
      >
        ↑
      </button>
      <button
        onClick={findNext}
        disabled={!searchText}
        className="px-2 py-1 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded disabled:opacity-50 disabled:cursor-not-allowed"
        title="Next (Enter)"
      >
        ↓
      </button>
      <button
        onClick={handleClose}
        className="px-2 py-1 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
        title="Close (Escape)"
      >
        ✕
      </button>
    </div>
  );
}
