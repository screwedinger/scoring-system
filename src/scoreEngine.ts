import type { PounceStatus, Team } from './types';

export const POUNCE_CORRECT_POINTS = 15;
export const POUNCE_INCORRECT_POINTS = -10;

export function pounceDelta(status: PounceStatus): number {
  return status === 'incorrect' ? POUNCE_INCORRECT_POINTS : POUNCE_CORRECT_POINTS;
}

export function applyScoreDeltas(
  teams: Team[],
  deltas: Record<number, number>,
): Team[] {
  return teams.map((team) => ({
    ...team,
    score: team.score + (deltas[team.id] ?? 0),
  }));
}

export function nextDirectTeamIndex(
  currentIndex: number,
  teamCount: number,
  direction: 'clockwise' | 'anticlockwise',
): number {
  if (teamCount <= 0) return 0;
  const step = direction === 'clockwise' ? 1 : -1;
  return (currentIndex + step + teamCount) % teamCount;
}

export function defaultBouncePoints(selectionNumber: number): number {
  if (selectionNumber <= 1) return 10;
  if (selectionNumber === 2) return 5;
  return 3.3;
}
