import { CharacterBadge } from './CharacterBadge';
import type { Character } from '../types';

interface Props {
  characters: Character[];
  activeCharacter: string | undefined;
}

export function CharacterRoster({ characters, activeCharacter }: Props) {
  return (
    <div className="space-y-2">
      <h3 className="text-xs font-semibold uppercase tracking-widest text-slate-400">Characters</h3>
      <div className="flex flex-wrap gap-2">
        {characters.map((c) => (
          <div
            key={c.name}
            className={`flex flex-col gap-0.5 transition-transform duration-200 ${
              activeCharacter === c.name ? 'scale-105' : ''
            }`}
            title={c.description}
          >
            <CharacterBadge name={c.name} color={c.color} />
            {activeCharacter === c.name && (
              <span className="text-[10px] text-center text-slate-400 animate-pulse-slow">speaking</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
