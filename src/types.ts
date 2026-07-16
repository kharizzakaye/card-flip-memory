export interface CardOption {
  pairs: number;
  label: string;
}

export interface Player {
  name: string;
  score: number;
}

export interface CardData {
  id: number;
  symbol: string;
  flipped: boolean;
  matched: boolean;
}

export interface GameState {
  cards: CardData[];
  players: Player[];
  currentPlayer: number;
  flippedIndices: number[];
  shakeIndices: number[];
  lock: boolean;
  moves: number;
  showWin: boolean;
}

export interface WinnerInfo {
  heading: string;
  sub: string;
}
