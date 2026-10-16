import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Trophy, ArrowLeft, Play, Info, Check } from 'lucide-react';
import { useRoom } from '../../firebase/useRoom';
import {
  startImpostor,
  startImpostorRound,
  setImpostorPhase,
  showImpostorResults,
  awardImpostorRound,
  finishImpostor,
  setImpostorInstructionsVisible,
} from '../../firebase/impostorState';
import { resetRoomToLobby } from '../../firebase/gameState';
import './Impostor.css';

const TOTAL_ROUNDS = 3;

const HostImpostor = () => {
  const { pin } = useParams();
  const navigate = useNavigate();
  const { room, loading } = useRoom(pin);
  const awardedRef = useRef(0);
  const [impostorCount, setImpostorCount] = useState(1);

  const game = room?.game;
  const phase = game?.phase || 'idle';
  const round = game?.round || 0;
  const instructionsVisible = game?.instructionsVisible ?? false;
  const players = useMemo(
    () =>
      Object.entries(room?.players || {})
        .filter(([, p]) => !p.isHost)
        .map(([uid, p]) => ({ uid, ...p })),
    [room?.players]
  );

  // Init when entering
  useEffect(() => {
    if (!room) return;
    if (room.gameType === 'impostor') return;
    if (players.length === 0) return;
    startImpostor(pin, players, 1);
  }, [room, pin, players]);

  // Auto-award points when results appear
  useEffect(() => {
    if (phase !== 'results') return;
    if (awardedRef.current === round) return;
    if (game?.pointsAwarded) {
      awardedRef.current = round;
      return;
    }
    awardedRef.current = round;
    awardImpostorRound(pin);
  }, [phase, round, game?.pointsAwarded, pin]);

  const handleStartFirstRound = async () => {
    await startImpostorRound(pin, 1, players.map((p) => p.uid), impostorCount);
  };

  const handleNextRound = async () => {
    if (round >= TOTAL_ROUNDS) {
      finishImpostor(pin);
      return;
    }
    await startImpostorRound(
      pin,
      round + 1,
      players.map((p) => p.uid),
      impostorCount
    );
  };

  const handleFinish = () => finishImpostor(pin);

  const handleShowInstructions = () =>
    setImpostorInstructionsVisible(pin, true);

  const handleCloseInstructions = () =>
    setImpostorInstructionsVisible(pin, false);

  const handleBack = async () => {
    await resetRoomToLobby(pin);
    navigate(`/host/${pin}/select-game`);
  };

  const handleAdvanceFromReveal = async () => {
    await setImpostorPhase(pin, 'clues');
  };

  const handleAdvanceFromClues = async () => {
    await setImpostorPhase(pin, 'voting');
  };

  const handleAdvanceFromVoting = async () => {
    await showImpostorResults(pin);
  };

  if (loading) return <div className="imp-loading">Loading...</div>;
  if (!room) return <div className="imp-loading">Room not found</div>;

  // -------- FINISHED --------
  if (room.status === 'finished' || phase === 'finished') {
    const sorted = [...players].sort((a, b) => (b.score || 0) - (a.score || 0));
    return (
      <div className="imp-container">
        <div className="imp-ranking">
          <Trophy size={48} color="#ffc107" style={{ margin: '0 auto' }} />
          <h2>Final Ranking</h2>
          {sorted.map((p, i) => (
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
          <button
            className="imp-btn primary"
            style={{ margin: '20px auto 0' }}
            onClick={handleBack}
          >
            Back to Game Menu
          </button>
        </div>
      </div>
    );
  }

  // -------- IDLE --------
  if (phase === 'idle' || phase === 'instructions') {
    return (
      <div className="imp-container">
        <ImpostorInstructions
          visible={instructionsVisible}
          onClose={handleCloseInstructions}
          isHost={true}
        />
        <div className="imp-header">
          <button className="imp-btn" onClick={handleBack}>
            <ArrowLeft size={18} /> Back
          </button>
          <div className="imp-round-badge">Round 0 / {TOTAL_ROUNDS}</div>
        </div>
        <div className="imp-main">
          <div className="imp-phrase">
            <div className="label">Ready to Play</div>
            <div className="text">Impostor</div>
            <div className="imp-hint">
              One player has a different word. Find them!
            </div>
          </div>

          <div className="imp-setup">
            <label>
              <span>Impostors:</span>
              <select
                value={impostorCount}
                onChange={(e) => setImpostorCount(parseInt(e.target.value))}
              >
                <option value={1}>1</option>
                <option value={2}>2</option>
                <option value={3}>3</option>
              </select>
            </label>
            <span className="imp-setup-note">
              {players.length} player{players.length !== 1 && 's'} connected
            </span>
          </div>

          <div className="imp-btn-row">
            <button className="imp-btn secondary" onClick={handleShowInstructions}>
              <Info size={18} /> Show Instructions
            </button>
            <button
              className="imp-btn success"
              onClick={handleStartFirstRound}
              disabled={players.length < 3}
            >
              <Play size={20} /> Start First Round
            </button>
          </div>
          {players.length < 3 && (
            <div className="imp-empty">
              Need at least 3 players to start.
            </div>
          )}
        </div>
      </div>
    );
  }

  // -------- PLAYING (reveal / clues / voting / results) --------
  const clues = game?.clues || {};
  const votes = game?.votes || {};
  const impostorIds = game?.impostorIds || [];

  return (
    <div className="imp-container">
      <ImpostorInstructions
        visible={instructionsVisible}
        onClose={handleCloseInstructions}
        isHost={true}
      />

      <div className="imp-header">
        <button className="imp-btn" onClick={handleBack}>
          <ArrowLeft size={18} /> Back
        </button>
        <div className="imp-room-info">
          Room: <span className="pin-badge">{pin}</span>
        </div>
        <div className="imp-round-badge">
          Round {round} / {TOTAL_ROUNDS}
        </div>
      </div>

      <div className="imp-main">
        {/* Phase indicator */}
        <div className="imp-phase">
          {phase === 'reveal' && '👀 Reveal — players see their secret word'}
          {phase === 'clues' && '✍️ Clues — players write a hint'}
          {phase === 'voting' && '🗳️ Voting — choose who you think is the impostor'}
          {phase === 'results' && '🎯 Results'}
        </div>

        {/* Topic (visible to host only after reveal) */}
        {phase !== 'reveal' && game?.topic && (
          <div className="imp-topic">
            <span className="label">Topic</span>
            <span className="text">{game.topic}</span>
          </div>
        )}

        {/* Reveal phase: host sees impostor list */}
        {phase === 'reveal' && (
            <div className="imp-host-reveal">
                <p>Everyone is seeing their word right now...</p>
                <p className="imp-tiny">
                (The impostors are hidden until the end)
                </p>
                <div className="imp-host-secret">
                <strong>🔒 Host only — impostors this round:</strong>
                <div className="imp-impostor-list">
                    {impostorIds.map((uid) => (
                    <span key={uid} className="imp-impostor-chip">
                        🕵️ {room.players?.[uid]?.name || 'Unknown'}
                    </span>
                    ))}
                </div>
                </div>
            </div>
            )}

        {/* Clues list */}
        {(phase === 'clues' || phase === 'voting' || phase === 'results') && (
          <div className="imp-clues">
            <h3>Clues</h3>
            {players.map((p) => {
              const clue = clues[p.uid];
              return (
                <div key={p.uid} className="imp-clue-row">
                  <span className="imp-clue-name">{p.name}</span>
                  <span className="imp-clue-text">
                    {clue ? clue.text : '...'}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* Votes list (host sees after voting) */}
        {(phase === 'voting' || phase === 'results') && (
          <div className="imp-votes">
            <h3>Votes</h3>
            {players.map((p) => {
              const targetId = votes[p.uid];
              const targetName = targetId
                ? room.players?.[targetId]?.name || '—'
                : '...';
              return (
                <div key={p.uid} className="imp-vote-row">
                  <span>{p.name}</span>
                  <span>→ {targetName}</span>
                </div>
              );
            })}
          </div>
        )}

        {/* Results */}
        {phase === 'results' && (
          <div className="imp-results">
            <h3>The impostors were:</h3>
            <div className="imp-impostor-list">
              {impostorIds.map((uid) => (
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
          </div>
        )}

        {/* Phase advance buttons */}
        {phase === 'reveal' && (
          <div className="imp-btn-row">
            <button className="imp-btn success" onClick={handleAdvanceFromReveal}>
              <Check size={18} /> Start Clues Phase
            </button>
          </div>
        )}
        {phase === 'clues' && (
          <div className="imp-btn-row">
            <button className="imp-btn success" onClick={handleAdvanceFromClues}>
              <Check size={18} /> Start Voting Phase
            </button>
          </div>
        )}
        {phase === 'voting' && (
          <div className="imp-btn-row">
            <button className="imp-btn success" onClick={handleAdvanceFromVoting}>
              <Trophy size={18} /> Reveal Results
            </button>
          </div>
        )}
        {phase === 'results' && round < TOTAL_ROUNDS && (
          <div className="imp-btn-row">
            <button className="imp-btn success" onClick={handleNextRound}>
              <Play size={20} /> Next Round
            </button>
          </div>
        )}
        {phase === 'results' && round >= TOTAL_ROUNDS && (
          <div className="imp-btn-row">
            <button className="imp-btn primary" onClick={handleFinish}>
              <Trophy size={20} /> Show Final Ranking
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// -------- Instructions modal --------
const ImpostorInstructions = ({ visible, onClose, isHost }) => {
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
        {isHost ? (
          <button className="imp-btn primary" onClick={onClose}>
            OK — Start Playing
          </button>
        ) : (
          <div className="imp-modal-waiting">
            ⏳ Waiting for the teacher to start...
          </div>
        )}
      </div>
    </div>
  );
};

export default HostImpostor;