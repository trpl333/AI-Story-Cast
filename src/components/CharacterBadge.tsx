interface Props {
  name: string;
  color: string;
}

export function CharacterBadge({ name, color }: Props) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold text-white ${color} select-none`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-white/60 inline-block" />
      {name}
    </span>
  );
}
