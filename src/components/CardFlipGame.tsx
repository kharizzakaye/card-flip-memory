import { useState, useEffect, useRef, type ChangeEvent, type KeyboardEvent } from "react";
import type { CardData, GameState, WinnerInfo } from "../types";
import { UNIQUE_ICONS, PLAYER_OPTIONS, CARD_OPTIONS } from "../constants";

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function bestGridColumns(total: number): number {
  if (total === 12) return 6;
  if (total === 16) return 8;
  const ratio = 4 / 3;
  const cols = Math.round(Math.sqrt(total * ratio));
  return Math.max(3, Math.min(cols, 12));
}

export default function CardFlipGame() {
  const [numPlayers, setNumPlayers] = useState<number>(2);
  const [cardPairs, setCardPairs] = useState<number>(8);
  const [names, setNames] = useState<string[]>(["", ""]);
  const [game, setGame] = useState<GameState | null>(null);
  const pendingRef = useRef<[number[], CardData[]] | null>(null);

  useEffect(() => {
    const pending = pendingRef.current;
    if (pending) {
      pendingRef.current = null;
      scheduleResolve(pending[0], pending[1]);
    }
  });

  useEffect(() => {
    setNames((prev) => {
      const next = [...prev];
      while (next.length < numPlayers) next.push("");
      return next.slice(0, numPlayers);
    });
  }, [numPlayers]);

  function startGame(): void {
    const players = names.map((n, i) => ({
      name: n.trim() ? n.trim() : `Player ${i + 1}`,
      score: 0,
    }));

    const pairSymbols = shuffle(UNIQUE_ICONS).slice(0, cardPairs);
    const deck = shuffle(pairSymbols.concat(pairSymbols));
    const cards: CardData[] = deck.map((symbol, i) => ({
      id: i,
      symbol,
      flipped: false,
      matched: false,
    }));

    setGame({
      cards,
      players,
      currentPlayer: 0,
      flippedIndices: [],
      shakeIndices: [],
      lock: false,
      moves: 0,
      showWin: false,
    });
  }

  function returnToSetup(): void {
    setGame(null);
  }

  function scheduleResolve(pair: number[], cardsSnapshot: CardData[]): void {
    const [a, b] = pair;
    const isMatch = cardsSnapshot[a].symbol === cardsSnapshot[b].symbol;

    if (isMatch) {
      setTimeout(() => {
        setGame((prev) => {
          if (!prev) return prev;
          const cards = prev.cards.map((c, i) =>
            i === a || i === b ? { ...c, matched: true } : c
          );
          const players = prev.players.map((p, i) =>
            i === prev.currentPlayer ? { ...p, score: p.score + 1 } : p
          );
          const allMatched = cards.every((c) => c.matched);
          return {
            ...prev,
            cards,
            players,
            flippedIndices: [],
            lock: false,
            showWin: allMatched,
          };
        });
      }, 450);
    } else {
      setTimeout(() => {
        setGame((prev) => (prev ? { ...prev, shakeIndices: [a, b] } : prev));
      }, 200);
      setTimeout(() => {
        setGame((prev) => {
          if (!prev) return prev;
          const cards = prev.cards.map((c, i) =>
            i === a || i === b ? { ...c, flipped: false } : c
          );
          const currentPlayer = (prev.currentPlayer + 1) % prev.players.length;
          return {
            ...prev,
            cards,
            flippedIndices: [],
            shakeIndices: [],
            lock: false,
            currentPlayer,
          };
        });
      }, 1000);
    }
  }

  function handleCardClick(idx: number): void {
    setGame((prev) => {
      if (!prev || prev.lock) return prev;
      const card = prev.cards[idx];
      if (card.flipped || card.matched) return prev;

      const cards = prev.cards.map((c, i) =>
        i === idx ? { ...c, flipped: true } : c
      );
      const flippedIndices = [...prev.flippedIndices, idx];

      if (flippedIndices.length < 2) {
        return { ...prev, cards, flippedIndices };
      }

      const moves = prev.moves + 1;
      pendingRef.current = [flippedIndices, cards];
      return { ...prev, cards, flippedIndices, lock: true, moves };
    });
  }

  function getWinnerInfo(): WinnerInfo {
    if (!game) return { heading: "", sub: "" };
    if (game.players.length === 1) {
      return {
        heading: "Table cleared",
        sub: `You finished in ${game.moves} ${game.moves === 1 ? "move" : "moves"}.`,
      };
    }
    const maxScore = Math.max(...game.players.map((p) => p.score));
    const winners = game.players.filter((p) => p.score === maxScore);
    if (winners.length > 1) {
      return {
        heading: "It's a tie",
        sub: `${winners.map((w) => w.name).join(" and ")} both found ${maxScore} pairs.`,
      };
    }
    return {
      heading: `${winners[0].name} wins`,
      sub: `${winners[0].name} found ${maxScore} pairs in ${game.moves} moves.`,
    };
  }

  return (
    <div
      className="min-h-screen font-inter text-cream px-4 pt-8 pb-16 flex justify-center bg-gradient-to-tr from-[#6B0000] to-[#2B0000]"
    >
      <div className="w-full max-w-[1024px]">
        <div className="text-center mb-7">
          <p className="font-fraunces font-bold text-[44px] tracking-[0.5px] text-gold m-0">
            Card Flip - Memory Game
          </p>
          <p className="text-[13px] tracking-[3px] uppercase text-cream-muted mt-1.5">
            Can you remember what was flipped?
          </p>
        </div>

        {!game && (
          <div className="bg-gradient-to-b from-black/18 to-black/32 border border-gold-dark/14 rounded-xl p-8 shadow-[0_20px_50px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,255,255,0.04)] max-[520px]:!p-[22px]">
            <p className="font-fraunces text-[19px] text-gold mb-[14px]">
              How many players?
            </p>
            <div className="flex flex-wrap gap-3 mb-[30px]">
              {PLAYER_OPTIONS.map((n) => (
                <button
                  key={n}
                  className={
                    "appearance-none border font-inter text-[15px] font-semibold px-5 py-3 rounded-full cursor-pointer transition-all duration-150 min-w-[74px] focus-visible:outline-2 focus-visible:outline-gold focus-visible:outline-offset-2 " +
                    (n === numPlayers
                      ? "bg-gold-dark border-gold text-ink font-bold shadow-[0_3px_10px_rgba(0,0,0,0.35)] hover:bg-gold hover:border-gold"
                      : "bg-black/25 border-gold-darker text-cream hover:border-gold-dark hover:bg-gold-dark/12")
                  }
                  aria-pressed={n === numPlayers}
                  onClick={() => setNumPlayers(n)}
                >
                  {n}
                </button>
              ))}
            </div>

            {numPlayers > 1 && (
              <>
                <p className="font-fraunces text-[19px] text-gold mb-[14px]">
                  Name your players
                </p>
                <div className="flex flex-wrap gap-3 mb-[30px]">
                  {names.map((val, i) => (
                    <input
                      key={i}
                      value={val}
                      maxLength={14}
                      placeholder={`Player ${i + 1}`}
                      className="bg-black/25 border border-gold-darker rounded-lg px-3.5 py-[11px] text-cream font-inter text-sm flex-[1_1_150px] placeholder-cream-muted/60 focus-visible:outline-2 focus-visible:outline-gold focus-visible:outline-offset-1"
                      onChange={(e: ChangeEvent<HTMLInputElement>) =>
                        setNames((prev) =>
                          prev.map((v, idx) => (idx === i ? e.target.value : v))
                        )
                      }
                    />
                  ))}
                </div>
              </>
            )}

            <p className="font-fraunces text-[19px] text-gold mb-[14px]">
              How many cards on the table?
            </p>
            <div className="flex flex-wrap gap-3 mb-[30px]">
              {CARD_OPTIONS.map((opt) => (
                <button
                  key={opt.pairs}
                  className={
                    "appearance-none border font-inter text-[15px] font-semibold w-14 h-14 p-0 rounded-full cursor-pointer transition-all duration-150 focus-visible:outline-2 focus-visible:outline-gold focus-visible:outline-offset-2 " +
                    (opt.pairs === cardPairs
                      ? "bg-gold-dark border-gold text-ink font-bold shadow-[0_3px_10px_rgba(0,0,0,0.35)] hover:bg-gold hover:border-gold"
                      : "bg-black/25 border-gold-darker text-cream hover:border-gold-dark hover:bg-gold-dark/12")
                  }
                  aria-pressed={opt.pairs === cardPairs}
                  onClick={() => setCardPairs(opt.pairs)}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <button
              className="appearance-none border-none w-full p-4 rounded-[10px] bg-gradient-to-b from-gold to-gold-dark text-ink font-fraunces font-bold text-lg tracking-[0.5px] cursor-pointer shadow-[0_8px_20px_rgba(0,0,0,0.35)] hover:from-gold-dark hover:to-gold-dark hover:shadow-[0_8px_24px_rgba(0,0,0,0.5)] active:scale-[0.98] transition-all duration-150"
              onClick={startGame}
            >
              Deal the cards
            </button>
          </div>
        )}

        {game && (
          <>
            {/* <div className="flex justify-end mb-5">
              <button
                className="appearance-none border-none px-[22px] py-3 rounded-[10px] bg-gradient-to-b from-gold to-gold-darker text-ink font-fraunces font-bold text-md cursor-pointer shadow-[0_6px_16px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.4)] hover:from-gold-dark hover:to-gold-dark transition-all duration-150 active:scale-[0.97]"
                onClick={returnToSetup}
              >
                New game
              </button>
            </div> */}
          
            <div>
              <div className="flex items-center justify-between gap-4 flex-wrap mb-6 pt-5">
                <div className="bg-gradient-to-b from-gold to-gold-darker text-ink rounded-[10px] px-[22px] py-3 font-fraunces font-bold text-md shadow-[0_6px_16px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.4)]">
                  {game.players.length === 1
                    ? "Your turn"
                    : `${game.players[game.currentPlayer].name}'s turn`}
                </div>
                <div className="flex gap-2.5 flex-wrap">
                  {game.players.map((p, i) => (
                    <div
                      key={i}
                      className={
                        "flex items-center gap-2 bg-black/28 border rounded-full px-3.5 pl-2.5 py-1.5 text-[13px] transition-all duration-150 " +
                        (i === game.currentPlayer
                          ? "border-gold bg-gold-dark/16"
                          : "border-gold-dark/14")
                      }
                    >
                      <span
                        className={
                          "w-[9px] h-[9px] rounded-full " +
                          (i === game.currentPlayer ? "bg-gold" : "bg-gold-darker")
                        }
                      />
                      <span className="font-semibold">{p.name}</span>
                      <span className="text-cream-muted">{p.score}</span>
                    </div>
                  ))}
                </div>
              </div>
              

              <div className="text-md text-cream-muted mb-6 flex justify-between items-center">
                <span>{game.moves} {game.moves === 1 ? "move" : "moves"}</span>

                <button
                  className="appearance-none border-none px-[22px] py-3 rounded-[10px] bg-gradient-to-b from-gold to-gold-darker text-ink font-fraunces font-bold text-md cursor-pointer shadow-[0_6px_16px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.4)] hover:from-gold-dark hover:to-gold-dark transition-all duration-150 active:scale-[0.97]"
                  onClick={returnToSetup}
                >
                  New game
                </button>
              </div>

              <div
                className="grid gap-3 perspective-[1000px]"
                style={{
                  gridTemplateColumns: `repeat(${bestGridColumns(game.cards.length)}, 1fr)`,
                }}
              >
                {game.cards.map((card, idx) => (
                  <div
                    key={card.id}
                    className={
                      "card relative aspect-[3/4] rounded-lg" +
                      (card.matched ? " cursor-default" : " cursor-pointer") +
                      (card.flipped ? " flipped" : "") +
                      (card.matched ? " matched" : "") +
                      (game.shakeIndices.includes(idx) ? " shake" : "")
                    }
                    role="button"
                    tabIndex={0}
                    aria-label="Face-down card"
                    onClick={() => handleCardClick(idx)}
                    onKeyDown={(e: KeyboardEvent<HTMLDivElement>) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        handleCardClick(idx);
                      }
                    }}
                  >
                    <div className="card-inner relative w-full h-full">
                      <div className="card-face card-back absolute inset-0 rounded-lg flex items-center justify-center bg-[radial-gradient(circle_at_center,rgba(228,196,104,0.12),transparent_70%),#3D0000] border-[1.5px] border-gold-darker shadow-[inset_0_0_0_4px_rgba(201,168,76,0.08)]">
                        <span className="text-gold text-[30px] opacity-85">★</span>
                      </div>
                      <div className={"card-face card-front absolute inset-0 rounded-lg flex items-center justify-center border-[1.5px] border-gold-darker text-[clamp(40px,9vw,60px)]" + (card.matched ? " bg-[#e7dfc4] opacity-65" : " bg-cream")}>{card.symbol}</div>
                    </div>
                  </div>
                ))}
              </div>

              {game.showWin && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-20 p-5">
                  <div className="bg-gradient-to-b from-felt to-felt-dark border border-gold rounded-2xl px-9 py-10 text-center max-w-[380px] shadow-[0_30px_70px_rgba(0,0,0,0.6)]">
                    <p className="text-xs tracking-[3px] uppercase text-gold-dark mb-2.5">
                      Table cleared
                    </p>
                    <h2 className="font-fraunces text-[30px] m-0 mb-2 text-gold">
                      {getWinnerInfo().heading}
                    </h2>
                    <p className="text-cream-muted text-sm m-0 mb-6">
                      {getWinnerInfo().sub}
                    </p>
                    <button
                      className="appearance-none border-none px-7 py-3.5 rounded-[10px] bg-gradient-to-b from-gold to-gold-dark text-ink font-fraunces font-bold text-base cursor-pointer"
                      onClick={returnToSetup}
                    >
                      Play again
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
