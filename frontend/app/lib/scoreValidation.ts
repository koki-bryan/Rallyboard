export function scoreError(scores: string[][], bestOf: number): string | null {
  const target = Math.floor(bestOf / 2) + 1;
  if (scores.length < target || scores.length > bestOf) {
    return `A best-of-${bestOf} match needs ${target} to ${bestOf} sets.`;
  }

  const wins = [0, 0];
  for (let index = 0; index < scores.length; index++) {
    const set = scores[index];
    if (set.length !== 2 || set.some(point => !/^\d+$/.test(point.trim()))) {
      return `Enter whole-number scores for set ${index + 1}.`;
    }
    const [left, right] = set.map(Number);
    if (![left, right].every(Number.isSafeInteger)) {
      return `Enter valid scores for set ${index + 1}.`;
    }
    const high = Math.max(left, right);
    const difference = Math.abs(left - right);
    if (high < 11 || (high === 11 && difference < 2) || (high > 11 && difference !== 2)) {
      return `Set ${index + 1} needs a winner at 11 or a two-point lead after deuce.`;
    }
    wins[left > right ? 0 : 1]++;
    if (Math.max(...wins) === target && index < scores.length - 1) {
      return `Remove sets played after the match was decided.`;
    }
  }
  if (Math.max(...wins) !== target) {
    return `Add or correct sets until one player wins ${target}.`;
  }
  return null;
}
