import { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Trophy, ArrowLeft, Play, Info } from 'lucide-react';
import RouletteWheel from '../../components/RouletteWheel';
import { useRoom } from '../../firebase/useRoom';
import {
  startNegativeRoulette,
  setTargetPhrase,
  lockAnsweringPhase,
  showRoundResults,
  finishGame,
  addPoints,
  setInstructionsVisible,
  resetRoomToLobby,
} from '../../firebase/gameState';
import { NEGATIVE_ROULETTE_QUESTIONS } from '../../data/negativeRouletteQuestions';
import './NegativeRoulette.css';

const ROUND_DURATION = 30;

const HostNegativeRoulette = () => {
  const { pin } = useParams();
  const navigate = useNavigate();
  const { room, loading } = useRoom(pin);

  const [timeLeft, setTimeLeft] = useState(ROUND_DURATION);
  const timerRef = useRef(null);
  const awardedRoundRef = useRef(0);

  const game = room?.game;
  const phase = game?.phase || 'idle';
  const round = game?.round || 0;
  const answers = useMemo(() => game?.answers || {}, [game?.answers]);
  const instructionsVisible = game?.instructionsVisible ?? false;

  // Filter out the host from the player list
  const players = Object.entries(room?.players || {})
    .filter(([, p]) => !p.isHost)
    .map(([uid, p]) => ({ uid, ...p }));

  // -------- Init game once when entering this view --------
  useEffect(() => {
    if (!room) return;
    if (room.gameType === 'negative-roulette') return;
    startNegativeRoulette(pin, NEGATIVE_ROULETTE_QUESTIONS.length);
  }, [room, pin]);

  // -------- Timer for the answering phase --------
  useEffect(() => {
    if (phase !== 'answering') {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }
    const roundStart = game?.roundStartTime || Date.now();
    const tick = () => {
      const elapsed = Math.floor((Date.now() - roundStart) / 1000);
      const remaining = Math.max(0, ROUND_DURATION - elapsed);
      setTimeLeft(remaining);
      if (remaining <= 0 && timerRef.current) {
        clearInterval(timerRef.current);
        showRoundResults(pin);
      }
    };
    tick();
    timerRef.current = setInterval(tick, 500);
    return () => clearInterval(timerRef.current);
  }, [phase, game?.roundStartTime, pin]);

  // -------- Award points once per round --------
  useEffect(() => {
    if (phase !== 'results') return;
    if (awardedRoundRef.current === round) return;
    awardedRoundRef.current = round;

    Object.entries(answers).forEach(([uid, ans]) => {
      if (ans.correct) {
        const speedBonus = Math.max(0, Math.round((30 - ans.elapsed) * 1.66));
        const total = 100 + Math.min(50, speedBonus);
        addPoints(pin, uid, total);
      }
    });
  }, [phase, round, answers, pin]);

  // -------- Spin the wheel with a random phrase --------
  const handleSpin = () => {
    const randomIndex = Math.floor(Math.random() * NEGATIVE_ROULETTE_QUESTIONS.length);
    const question = NEGATIVE_ROULETTE_QUESTIONS[randomIndex];
    setTargetPhrase(pin, question.phrase, round + 1);
  };

  // -------- Wheel lands on a phrase (fires at the end of the animation) --------
  const handleSpinEnd = (winnerPhrase) => {
    const question = NEGATIVE_ROULETTE_QUESTIONS.find(
      (q) => q.phrase === winnerPhrase
    );
    if (!question) return;
    lockAnsweringPhase(pin, question);
  };

  const handleStartFirstRound = () => {
    startNegativeRoulette(pin, NEGATIVE_ROULETTE_QUESTIONS.length).then(() => {
      handleSpin();
    });
  };

  const handleNextRound = () => {
    handleSpin();
  };

  const handleFinish = () => {
    finishGame(pin);
  };

  const handleShowInstructions = () => {
    setInstructionsVisible(pin, true);
  };

  // -------- Leave the game and send everyone back to the lobby --------
  const handleBack = async () => {
    await resetRoomToLobby(pin);
    navigate(`/host/${pin}/select-game`);
  };

  if (loading) return <div className="nr-loading">Loading...</div>;
  if (!room) return <div className="nr-loading">Room not found</div>;

  // -------- FINISHED --------
  if (room.status === 'finished') {
    const sorted = [...players].sort((a, b) => (b.score || 0) - (a.score || 0));
    return (
      <div className="nr-container">
        <div className="nr-ranking">
          <Trophy size={48} color="#ffc107" style={{ margin: '0 auto' }} />
          <h2>Final Ranking</h2>
          {sorted.map((p, i) => (
            <div key={p.uid} className={`nr-ranking-row ${i === 0 ? 'first' : ''}`}>
              <span>
                {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}{' '}
                {p.name}
              </span>
              <span>{p.score || 0} pts</span>
            </div>
          ))}
          <button
            className="nr-btn primary"
            style={{ margin: '20px auto 0' }}
            onClick={handleBack}
          >
            Back to Game Menu
          </button>
        </div>
      </div>
    );
  }

  // -------- IDLE (start) --------
  if (phase === 'idle') {
    return (
      <div className="nr-container">
        <InstructionsModal
          visible={instructionsVisible}
          onClose={() => setInstructionsVisible(pin, false)}
          isHost={true}
        />
        <div className="nr-header">
          <button className="nr-btn" onClick={handleBack}>
            <ArrowLeft size={18} /> Back
          </button>
          <div className="nr-round-badge">
            Round 0 / {NEGATIVE_ROULETTE_QUESTIONS.length}
          </div>
        </div>
        <div className="nr-main">
          <div className="nr-phrase">
            <div className="label">Ready to Play</div>
            <div className="text">Negative Roulette</div>
            <div className="nr-hint">
              Spin the wheel. Students must turn the phrase into a negative.
            </div>
          </div>
          <div className="nr-btn-row">
            <button className="nr-btn secondary" onClick={handleShowInstructions}>
              <Info size={18} /> Show Instructions
            </button>
            <button className="nr-btn success" onClick={handleStartFirstRound}>
              <Play size={20} /> Start First Round
            </button>
          </div>
        </div>
      </div>
    );
  }

  // -------- SPINNING / ANSWERING / RESULTS --------
  const visibleTimeLeft = phase === 'answering' ? timeLeft : ROUND_DURATION;

  return (
    <div className="nr-container">
      <InstructionsModal
        visible={instructionsVisible}
        onClose={() => setInstructionsVisible(pin, false)}
        isHost={true}
      />

      <div className="nr-header">
        <button className="nr-btn" onClick={handleBack}>
          <ArrowLeft size={18} /> Back
        </button>
        <div className="nr-room-info">
          Room: <span className="pin-badge">{pin}</span>
        </div>
        <div className="nr-round-badge">
          Round {round} / {NEGATIVE_ROULETTE_QUESTIONS.length}
        </div>
        {phase === 'answering' && (
          <div className={`nr-timer ${visibleTimeLeft <= 5 ? 'danger' : ''}`}>
            {visibleTimeLeft}s
          </div>
        )}
      </div>

      <div className="nr-main">
        {/* The wheel — always auto-spin on the host side */}
        {(phase === 'spinning' || phase === 'answering' || phase === 'results') && (
          <div className="nr-wheel-wrap">
            <RouletteWheel
              items={NEGATIVE_ROULETTE_QUESTIONS.map((q) => q.phrase)}
              forcedWinner={game?.targetPhrase}
              onSpinEnd={handleSpinEnd}
              autoSpin={true}
            />
          </div>
        )}

        {/* Current phrase (only after spinning) */}
        {phase !== 'spinning' && game?.currentPhrase && (
          <div className="nr-phrase">
            <div className="label">Phrase</div>
            <div className="text">{game.currentPhrase}</div>
            <div className="nr-hint">{game.hint}</div>
          </div>
        )}

        {/* Player answers */}
        {phase !== 'spinning' && (
          <div className="nr-players-status">
            {players.length === 0 && (
              <div className="nr-empty">No players connected yet.</div>
            )}
            {players.map((p) => {
              const ans = answers[p.uid];
              const statusClass = !ans
                ? 'pending'
                : ans.correct
                ? 'correct'
                : 'incorrect';
              return (
                <div key={p.uid} className={`nr-player-row ${statusClass}`}>
                  <span className="nr-player-name">
                    {ans?.correct ? '✅' : ans ? '❌' : '⏳'} {p.name}
                  </span>
                  <span className="nr-player-answer">
                    {ans ? ans.text : 'waiting...'}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* Action buttons */}
        {phase === 'results' && round < NEGATIVE_ROULETTE_QUESTIONS.length && (
          <div className="nr-btn-row">
            <button className="nr-btn success" onClick={handleNextRound}>
              <Play size={20} /> Next Round
            </button>
          </div>
        )}

        {phase === 'results' && round >= NEGATIVE_ROULETTE_QUESTIONS.length && (
          <div className="nr-btn-row">
            <button className="nr-btn primary" onClick={handleFinish}>
              <Trophy size={20} /> Show Final Ranking
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// -------- Instructions modal --------
const InstructionsModal = ({ visible, onClose, isHost }) => {
  if (!visible) return null;
  return (
    <div className="nr-modal-overlay">
      <div className="nr-modal">
        <h2>📘 How to Play — Negative Roulette</h2>
        <ol>
          <li>The wheel spins and lands on an IT phrase (e.g. "delete the logs").</li>
          <li>You must turn it into a <strong>negative infinitive</strong>.</li>
          <li>Use the structure: <code>not to + verb</code>.</li>
          <li>Example: <em>"delete the logs" → "not to delete the logs"</em>.</li>
          <li>You have <strong>30 seconds</strong> per round.</li>
          <li>Correct answers earn <strong>100 points</strong> + speed bonus.</li>
          <li>Wrong answers don't lose points — just try again next round.</li>
          <li>After 10 rounds, the ranking is shown.</li>
        </ol>
        <div className="nr-modal-tip">
          💡 <strong>Remember:</strong> "not to delete", never "to not delete".
        </div>
        {isHost ? (
          <button className="nr-btn primary" onClick={onClose}>
            OK — Start Playing
          </button>
        ) : (
          <div className="nr-modal-waiting">
            ⏳ Waiting for the teacher to start...
          </div>
        )}
      </div>
    </div>
  );
};

export default HostNegativeRoulette;