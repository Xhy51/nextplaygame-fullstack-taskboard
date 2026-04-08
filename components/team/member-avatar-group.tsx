'use client';

import { Profile } from '@/lib/types';
import { MemberAvatar } from './member-avatar';

interface MemberAvatarGroupProps {
  profiles: Array<Profile | null | undefined>;
  maxVisible?: number;
}

export function MemberAvatarGroup({
  profiles,
  maxVisible = 3,
}: MemberAvatarGroupProps) {
  const visibleProfiles = profiles.filter(Boolean) as Profile[];
  const visible = visibleProfiles.slice(0, maxVisible);
  const hiddenCount = Math.max(visibleProfiles.length - visible.length, 0);

  if (visibleProfiles.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center">
      <div className="flex items-center">
        {visible.map((profile, index) => (
          <div
            key={profile.id}
            className={index === 0 ? '' : '-ml-2'}
            title={profile.display_name || profile.username || profile.email}
          >
            <MemberAvatar profile={profile} />
          </div>
        ))}
      </div>
      {hiddenCount > 0 ? (
        <div className="-ml-2 flex h-7 w-7 items-center justify-center rounded-full border border-white/90 bg-slate-200 text-[10px] font-semibold text-slate-700 shadow-sm">
          +{hiddenCount}
        </div>
      ) : null}
    </div>
  );
}
