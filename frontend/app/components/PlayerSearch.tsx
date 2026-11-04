type Props = {
  players: { id: number; name: string }[];
  value: string;
  onChange: (value: string) => void;
};

export function PlayerSearch({ players, value, onChange }: Props) {
  return <div className="mt-[30px] flex flex-col items-stretch gap-2 rounded-xl border border-line bg-white px-[18px] py-3.5 sm:flex-row sm:items-center sm:gap-4 [&>label]:shrink-0 [&>label]:text-[10px] [&>label]:font-extrabold [&>label]:tracking-wider [&>label]:text-blue">
    <label htmlFor="player-search">FIND A PLAYER</label>
    <div className="flex flex-1 items-center gap-2 [&_input]:min-w-0 [&_input]:flex-1 [&_input]:border-0 [&_input]:bg-transparent [&_input]:text-[13px] [&_input]:text-ink [&_input]:outline-none [&_input::placeholder]:text-muted [&_button]:rounded-md [&_button]:bg-blue-soft [&_button]:px-2 [&_button]:py-1 [&_button]:text-[11px] [&_button]:font-extrabold [&_button]:text-blue">
      <input id="player-search" list="event-player-names" type="search" placeholder="Search a player to see their standing and matches" value={value} onChange={event => onChange(event.target.value)} />
      <datalist id="event-player-names">{players.map(player => <option key={player.id} value={player.name} />)}</datalist>
      {value && <button type="button" onClick={() => onChange('')}>Clear</button>}
    </div>
  </div>;
}
