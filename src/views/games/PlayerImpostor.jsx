import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Send, Trophy, Check } from 'lucide-react';
import { useRoom } from '../../firebase/useRoom';
import { auth } from '../../firebase/config';
import { submitClue, submitVote } from '../../firebase/impostorState';
import { validateClue } from '../../data/impostorQuestions';
import './Impostor.css';

const PlayerImpostor = () => {
  const { pin } = useParams();
  const navigate = useNavigate();
  const { room, loading } = useRoom(pin);
  const myUid = auth.currentUser?.uid;

  const game = room?.game;
  const phase = game?.phase || 'idle';
  const round = game?.round || 0;
  const instructionsVisible = game?.instructionsVisible ?? false;
  const myWord = game?.assignments?.[myUid];
  const [clueInput, setClueInput] = useState('');
  const [pendingVote, setPendingVote] = useState(null);

  // Auto-return to lobby if host leaves
  useEffect(() => {
    if (!room) return;
    if (room.status === 'waiting' && room.gameType === 'lobby') {
      navigate(`/play/${pin}`);
    }
  }, [room, pin, navigate]);

  const myClue = game?.clues?.[myUid];
  const myVote = game?.votes?.[myUid] || null;

  const players = useMemo(
    () =>
      Object.entries(room?.players || {})
        .filter(([, p]) => !p.isHost)
        .map(([uid, p]) => ({ uid, ...p })),
    [room?.players]
  );

  const otherPlayers = players.filter((p) => p.uid !== myUid);
  const isImpostor = game?.impostorIds?.includes(myUid);

  const handleSubmitClue = async () => {
    if (!validateClue(clueInput)) return;
    await submitClue(pin, myUid, clueInput);
  };

  const handleConfirmVote = async () => {
    if (!pendingVote || myVote) return;
    await submitVote(pin, myUid, pendingVote);
  };

  if (loading) return <div className="imp-loading">Loading...</div>;
  if (!room) return <div className="imp-loading">Room not found</div>;

  const me = myUid ? room.players?.[myUid] : null;

  // -------- FINISHED --------
  if (room.status === 'finished' || phase === 'finished') {
    const sorted = [...players].sort((a, b) => (b.score || 0) - (a.score || 0));
    const myRank = sorted.findIndex((p) => p.uid === myUid) + 1;
    return (
      <div className="imp-container">
        <div className="imp-ranking">
          <Trophy size={48} color="#ffc107" style={{ margin: '0 auto' }} />
          <h2>
            Your Rank: #{myRank} — {me?.score || 0} pts
          </h2>
          {sorted.slice(0, 10).map((p, i) => (
            <div
              key={p.uid}
              className={`imp-ranking-row ${i === 0 ? 'first' : ''}`}
            >
              <span>
                {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}{' '}
                {p.name}
              </span>
              <span>{p.score || 0} pts</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // -------- WAITING --------
  if (phase === 'idle' || phase === 'instructions') {
    return (
      <div className="imp-container">
        <ImpostorInstructions visible={instructionsVisible} />
        <div className="imp-main">
          <div className="imp-phrase">
            <div className="label">Get Ready</div>
            <div className="text">Waiting for the teacher...</div>
          </div>
        </div>
      </div>
    );
  }

  // -------- PLAYING --------
  const otherClues = players.filter(
    (p) => p.uid !== myUid && game?.clues?.[p.uid]
  );

  return (
    <div className="imp-container">
      <ImpostorInstructions visible={instructionsVisible} />

      <div className="imp-header">
        <div className="imp-room-info">
          Round <span className="pin-badge">{round}</span>
        </div>
        <div className="imp-phase-chip">
          {phase === 'reveal' && '👀 Reveal'}
          {phase === 'clues' && '✍️ Clues'}
          {phase === 'voting' && '🗳️ Voting'}
          {phase === 'results' && '🎯 Results'}
        </div>
      </div>

      <div className="imp-main">
        {/* Reveal */}
        {phase === 'reveal' && myWord && (
          <div className="imp-reveal">
            <div className="imp-reveal-label">Your secret word is:</div>
            <div className="imp-reveal-word">{myWord}</div>
            {isImpostor && (
              <div className="imp-impostor-hint">
                🕵️ You are the <strong>IMPOSTOR</strong> — blend in!
              </div>
            )}
            <div className="imp-reveal-note">
              Memorize it. Don't say it directly in your clue.
            </div>
          </div>
        )}

        {/* Clues input */}
        {phase === 'clues' && (
          <>
            <div className="imp-reveal small">
              <div className="imp-reveal-label">Your word:</div>
              <div className="imp-reveal-word small">{myWord}</div>
              {isImpostor && (
                <div className="imp-impostor-hint small">
                  🕵️ You are the IMPOSTOR
                </div>
              )}
            </div>

            {!myClue ? (
              <div className="imp-input-group">
                <input
                  key={`clue-input-${round}`}
                  type="text"
                  placeholder="Write a short clue (2-60 chars)..."
                  value={clueInput}
                  onChange={(e) => setClueInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSubmitClue()}
                  maxLength={60}
                  autoFocus
                />
                <button
                  onClick={handleSubmitClue}
                  disabled={!validateClue(clueInput)}
                >
                  <Send size={18} /> Send
                </button>
              </div>
            ) : (
              <div className="imp-answer-feedback correct">
                ✅ Your clue: <code>{myClue.text}</code>
              </div>
            )}

            <div className="imp-clues">
              <h3>Clues so far</h3>
              {otherClues.length === 0 && (
                <div className="imp-empty">No clues yet...</div>
              )}
              {otherClues.map((p) => (
                <div key={p.uid} className="imp-clue-row">
                  <span className="imp-clue-name">{p.name}</span>
                  <span className="imp-clue-text">
                    {game.clues[p.uid].text}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Voting */}
        {phase === 'voting' && (
          <>
            <div className="imp-reveal small">
              <div className="imp-reveal-label">Your word:</div>
              <div className="imp-reveal-word small">{myWord}</div>
              {isImpostor && (
                <div className="imp-impostor-hint small">
                  🕵️ You are the IMPOSTOR
                </div>
              )}
            </div>

            <div className="imp-vote-prompt">Who is the impostor?</div>

            <div className="imp-vote-grid">
              {otherPlayers.map((p) => (
                <button
                  key={p.uid}
                  className={`imp-vote-btn ${
                    pendingVote === p.uid ? 'selected' : ''
                  } ${
                    myVote === p.uid ? 'confirmed' : ''
                  }`}
                  onClick={() => !myVote && setPendingVote(p.uid)}
                  disabled={!!myVote}
                >
                  {p.name}
                </button>
              ))}
            </div>

            {/* Confirm button */}
            {!myVote && (
              <button
                className="imp-btn success"
                onClick={handleConfirmVote}
                disabled={!pendingVote}
              >
                <Check size={18} /> Confirm Vote
                {pendingVote && ` → ${room.players?.[pendingVote]?.name}`}
              </button>
            )}

            {myVote && (
              <div className="imp-answer-feedback correct">
                ✅ Voted for {room.players?.[myVote]?.name}
              </div>
            )}
          </>
        )}

        {/* Results */}
        {phase === 'results' && (
          <div className="imp-results">
            <h3>The impostors were:</h3>
            <div className="imp-impostor-list">
              {(game?.impostorIds || []).map((uid) => (
                <span key={uid} className="imp-impostor-chip">
                  🕵️ {room.players?.[uid]?.name || 'Unknown'}
                </span>
              ))}
            </div>
            <div className="imp-verdict">
              {game.caughtImpostor
                ? '✅ Citizens win! They caught an impostor.'
                : '❌ The impostors win! They were not caught.'}
            </div>
            {isImpostor && (
              <div className="imp-personal">
                {game.caughtImpostor
                  ? '❌ You were caught.'
                  : '🎉 You got away!'}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// -------- Instructions modal (read-only for players) --------
const ImpostorInstructions = ({ visible }) => {
  if (!visible) return null;
  return (
    <div className="imp-modal-overlay">
      <div className="imp-modal">
        <h2>📘 How to Play — Impostor</h2>
        <ol>
          <li>All players receive a secret word — <strong>except the impostors</strong>.</li>
          <li>Impostors get a <strong>similar but different</strong> word.</li>
          <li>Each player writes <strong>one clue</strong> about their word.</li>
          <li>Clues are read together. Try to spot who's off.</li>
          <li>Everyone votes for the player they think is the impostor.</li>
          <li>If the majority votes an impostor: <strong>citizens win +150 pts</strong>.</li>
          <li>If not: <strong>impostors win +150 pts</strong>.</li>
          <li>3 rounds total — highest score wins.</li>
        </ol>
        <div className="imp-modal-tip">
          💡 <strong>Tip:</strong> don't make your clue too obvious, or the impostor will copy you!
        </div>
        <div className="imp-modal-waiting">
          ⏳ Waiting for the teacher to start...
        </div>
      </div>
    </div>
  );
};

export default PlayerImpostor;