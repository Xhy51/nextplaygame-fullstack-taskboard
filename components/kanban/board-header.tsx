'use client';

import { Button } from '@/components/ui/button';
import { signOut } from '@/lib/supabase';
import { toast } from 'sonner';
import { LogOut, Settings } from 'lucide-react';
import { useState } from 'react';

interface BoardHeaderProps {
  boardName: string;
  onBoardNameChange?: (name: string) => void;
}

export function BoardHeader({ boardName, onBoardNameChange }: BoardHeaderProps) {
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState(boardName);
  const [isSigning, setIsSigning] = useState(false);

  const handleSaveNameChange = async () => {
    if (editedName.trim() && editedName !== boardName) {
      await onBoardNameChange?.(editedName.trim());
    }
    setIsEditingName(false);
    setEditedName(boardName);
  };

  const handleSignOut = async () => {
    setIsSigning(true);
    try {
      await signOut();
      window.location.reload();
    } catch (error) {
      toast.error('Failed to sign out');
      console.error('Sign out error:', error);
    } finally {
      setIsSigning(false);
    }
  };

  return (
    <header className="bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 sticky top-0 z-40">
      <div className="px-6 py-4 flex items-center justify-between">
        <div className="flex-1">
          {isEditingName ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={editedName}
                onChange={(e) => setEditedName(e.target.value)}
                onBlur={handleSaveNameChange}
                onKeyDown={(e) => e.key === 'Enter' && handleSaveNameChange()}
                className="text-2xl font-bold bg-transparent border-b-2 border-blue-600 outline-none text-gray-900 dark:text-white"
                autoFocus
              />
            </div>
          ) : (
            <h1
              onClick={() => setIsEditingName(true)}
              className="text-2xl font-bold text-gray-900 dark:text-white cursor-pointer hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              {boardName}
            </h1>
          )}
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Collaborate in real-time, drag tasks between columns
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSignOut}
            disabled={isSigning}
            title="Sign out"
            className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
          >
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </header>
  );
}
