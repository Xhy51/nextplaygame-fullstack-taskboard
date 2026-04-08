'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth-context';
import { OrganizationMember } from '@/lib/types';
import { toast } from 'sonner';
import { LogOut } from 'lucide-react';
import { MemberAvatar } from '@/components/team/member-avatar';

interface BoardHeaderProps {
  boardName: string;
  onBoardNameChange?: (name: string) => void;
  teamMembers?: OrganizationMember[];
}

export function BoardHeader({ boardName, onBoardNameChange, teamMembers = [] }: BoardHeaderProps) {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState(boardName);
  const [isSigning, setIsSigning] = useState(false);
  const displayName = useMemo(() => {
    if (!user?.email) return 'Signed in';
    return user.email.split('@')[0] || user.email;
  }, [user?.email]);

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
      router.replace('/login');
    } catch (error) {
      toast.error('Failed to sign out');
      console.error('Sign out error:', error);
    } finally {
      setIsSigning(false);
    }
  };

  return (
    <header className="bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 sticky top-0 z-40">
      <div className="px-6 py-2 flex items-center justify-between">
        <div className="flex-1">
          {isEditingName ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={editedName}
                onChange={(e) => setEditedName(e.target.value)}
                onBlur={handleSaveNameChange}
                onKeyDown={(e) => e.key === 'Enter' && handleSaveNameChange()}
                className="text-[1.75rem] font-bold leading-none bg-transparent border-b-2 border-blue-600 outline-none text-gray-900 dark:text-white"
                autoFocus
              />
            </div>
          ) : (
            <h1
              onClick={() => setIsEditingName(true)}
              className="text-[1.75rem] font-bold leading-none text-gray-900 dark:text-white cursor-pointer hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              {boardName}
            </h1>
          )}
          <p className="mt-0.5 text-[13px] text-gray-600 dark:text-gray-400">
            Collaborate in real-time, drag tasks between columns
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-sm font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
            {displayName}
          </div>
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

      {teamMembers.length > 0 ? (
        <div className="border-t border-slate-200/70 bg-slate-50/80 px-6 py-1.5 dark:border-slate-700/70 dark:bg-slate-900/60">
          <div className="flex items-center gap-2.5 overflow-x-auto">
            <div className="shrink-0 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
              Team Members
            </div>
            <div className="flex items-center gap-2">
              {teamMembers.map((member) => (
                <div
                  key={member.user_id}
                  className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-2.5 py-0.5 shadow-sm dark:border-slate-700 dark:bg-slate-800"
                  title={member.profile?.email || member.profile?.display_name || member.user_id}
                >
                  <MemberAvatar profile={member.profile} />
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                    {member.profile?.display_name || member.profile?.username || member.profile?.email}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </header>
  );
}
