import type { CSSProperties } from 'react';
import { initials } from '~/lib/types';

type Props = { playerId: number; name: string; size?: 'sm' | 'md' };

export function PlayerAvatar({ playerId, name, size = 'sm' }: Props) {
  // Golden-angle spacing gives each player a stable, distinct muted hue.
  const hue = (playerId * 137.508 + 25) % 360;
  const color = { '--player-hue': `${hue}deg` } as CSSProperties;
  return <span
    aria-hidden="true"
    style={color}
    className={`grid shrink-0 place-items-center rounded-full border border-[hsl(var(--player-hue)_35%_78%)] bg-[hsl(var(--player-hue)_42%_88%)] font-bold text-[hsl(var(--player-hue)_40%_26%)] ${size === 'md' ? 'size-[35px] text-[11px]' : 'size-[31px] text-[11px]'}`}
  >{initials(name)}</span>;
}
