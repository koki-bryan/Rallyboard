export type User = { id: number; name: string; email: string; role: string };
export type Standing = {
  player_id: number;
  name: string;
  rank: number;
  played: number;
  wins: number;
  losses: number;
  sets_won: number;
  sets_lost: number;
  set_difference: number;
  points_won: number;
  points_lost: number;
  point_difference: number;
};
export type Match = {
  id: number;
  round_number: number | null;
  sequence_number: number | null;
  player1_id: number;
  player2_id: number;
  player1: string;
  player2: string;
  winner_id: number | null;
  status: string;
  submitted_by: number | null;
  submitted_at: string | null;
  sets: number[][];
};
export type Event = {
  id: number;
  name: string;
  best_of: number;
  status: string;
  can_score: boolean;
  has_password: boolean;
  players: { id: number; name: string }[];
  standings: Standing[];
  matches: Match[];
};
export type EventItem = Pick<Event, "id" | "name" | "best_of" | "status">;
export const isCoach = (user: User | null) =>
  user?.role === "coach" || user?.role === "admin";
export const initials = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
