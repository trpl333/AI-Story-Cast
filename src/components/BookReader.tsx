import type { Paragraph, Character } from '../types';
import { CharacterBadge } from './CharacterBadge';

interface Props {
  paragraphs: Paragraph[];
  activeParagraphId: string | null;
  characters: Character[];
}

export function BookReader({ paragraphs, activeParagraphId, characters }: Props) {
  const getCharacter = (name: string | undefined) =>
    characters.find((c) => c.name === name);

  return (
    <div className="space-y-5 font-serif text-lg leading-relaxed text-slate-800">
      {paragraphs.map((p) => {
        const char = getCharacter(p.speaker);
        const isActive = p.id === activeParagraphId;

        return (
          <div
            key={p.id}
            id={`para-${p.id}`}
            className={`scroll-mt-24 rounded-xl px-4 py-3 transition-all duration-500 ${
              isActive
                ? 'bg-amber-50 border-l-4 border-amber-400 shadow-md'
                : 'border-l-4 border-transparent'
            }`}
          >
            {/* Speaker badge for dialogue */}
            {p.isDialogue && char && (
              <div className="mb-1">
                <CharacterBadge name={char.name} color={char.color} />
              </div>
            )}

            <p
              className={`${
                p.isDialogue
                  ? 'italic text-slate-700'
                  : 'text-slate-800'
              } ${isActive ? 'font-medium' : ''}`}
            >
              {p.text}
            </p>

            {/* Waveform animation when this paragraph is being spoken */}
            {isActive && (
              <div className="mt-2 flex items-end gap-0.5 h-4">
                {[...Array(8)].map((_, i) => (
                  <span
                    key={i}
                    className="inline-block w-1 bg-amber-400 rounded-full animate-bounce"
                    style={{
                      height: `${Math.random() * 12 + 4}px`,
                      animationDelay: `${i * 0.08}s`,
                      animationDuration: `${0.5 + Math.random() * 0.4}s`,
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
