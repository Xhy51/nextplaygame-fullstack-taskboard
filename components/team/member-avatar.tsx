'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Profile } from '@/lib/types';

interface MemberAvatarProps {
  profile?: Profile | null;
  size?: 'sm' | 'md';
  className?: string;
}

const sizeClasses = {
  sm: 'h-7 w-7 text-[11px]',
  md: 'h-9 w-9 text-xs',
};

export function MemberAvatar({ profile, size = 'sm', className }: MemberAvatarProps) {
  const initials =
    profile?.display_name?.slice(0, 1).toUpperCase() ||
    profile?.username?.slice(0, 1).toUpperCase() ||
    profile?.email?.slice(0, 1).toUpperCase() ||
    '?';

  return (
    <Avatar className={`${sizeClasses[size]} border border-white/90 shadow-sm ${className ?? ''}`.trim()}>
      <AvatarImage src={profile?.avatar_url || undefined} />
      <AvatarFallback
        className="font-semibold text-slate-700"
        style={{ backgroundColor: profile?.color || '#e2e8f0' }}
      >
        {initials}
      </AvatarFallback>
    </Avatar>
  );
}
