import { initials, type Standing } from '~/lib/types';
export function Standings({ rows }: { rows: Standing[] }) {
  return <section className="panel standings-panel"><div className="section-head"><div><div className="section-kicker">THE COMPETITION</div><h2>Current standings</h2><p>Ranked by wins, set difference, then point difference.</p></div><span className="section-count">{rows.length} PLAYERS</span></div>
    <div className="table-scroll"><table className="standings-table"><thead><tr>{['RANK', 'PLAYER', 'PLAYED', 'W / L', 'SETS', 'SET +/-', 'POINTS', 'POINT +/-'].map(label => <th key={label}>{label}</th>)}</tr></thead><tbody>{rows.map((row, index) => <tr key={row.player_id}>
      <td><span className={`rank-badge ${index === 0 && row.played > 0 ? 'rank-first' : ''}`}>{String(row.rank).padStart(2, '0')}</span></td>
      <td><div className="player-cell"><span className={`player-avatar avatar-${index % 3}`}>{initials(row.name)}</span><span>{row.name}{index === 0 && row.played > 0 && <small>LEADER</small>}</span></div></td>
      <td>{row.played}</td><td><strong>{row.wins}</strong> <span className="muted">/ {row.losses}</span></td><td>{row.sets_won} <span className="muted">/ {row.sets_lost}</span></td>
      <td><span className={row.set_difference > 0 ? 'positive' : row.set_difference < 0 ? 'negative' : ''}>{row.set_difference > 0 ? '+' : ''}{row.set_difference}</span></td>
      <td>{row.points_won} <span className="muted">/ {row.points_lost}</span></td>
      <td><span className={row.point_difference > 0 ? 'positive' : row.point_difference < 0 ? 'negative' : ''}>{row.point_difference > 0 ? '+' : ''}{row.point_difference}</span></td>
    </tr>)}</tbody></table></div><div className="panel-note">Ties after all numeric criteria use head to head for two players; other ties share a rank.</div>
  </section>;
}
