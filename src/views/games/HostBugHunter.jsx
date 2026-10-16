import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Trophy, ArrowLeft, Play, Info } from 'lucide-react';
import { useRoom } from '../../firebase/useRoom';
import {
  startBugHunter,
  startBugHunterRound,
  showBugHunterResults,
  awardBugHunterRound,
  finishBugHunter,
  setBugHunterInstructionsVisible,
} from '../../firebase/bugHunterState';
import { resetRoomToLobby } from '../../firebase/gameState';
import { BUG_HUNTER_QUESTIONS } from '../../data/bugHunterQuestions';
import './BugHunter.css';

const ROUND_DURATION = 30;
const TOTAL_ROUNDS = BUG_HUNTER_QUESTIONS.length;

const HostBugHunter = () => {
  const { pin } = useParams();
  const navigate = useNavigate();
  const { room, loading } = useRoom(pin);
  const timerRef = useRef(null);
  const awardedRef = useRef(0);
  const [timeLeft, setTimeLeft] = useState(ROUND_DURATION);

  const game = room?.game;
  const phase = game?.phase || 'idle';
  const round = game?.round || 0;
  const instructionsVisible = game?.instructionsVisible ?? false;
  const answers = useMemo(() => game?.answers || {}, [game?.answers]);
  const players = useMemo(
    () =>
      Object.entries(room?.players || {})
        .filter(([, p]) => !p.isHost)
        .map(([uid, p]) => ({ uid, ...p })),
    [room?.players]
  );

  useEffect(() => {
    if (!room) return;
    if (room.gameType === 'bug-hunter') return;
    startBugHunter(pin);
  }, [room, pin]);

  useEffect(() => {
    if (phase !== 'answering') {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }
    const startTime = game?.roundStartTime || Date.now();
    const tick = () => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      const remaining = Math.max(0, ROUND_DURATION - elapsed);
      setTimeLeft(remaining);
      if (remaining <= 0 && timerRef.current) {
        clearInterval(timerRef.current);
        showBugHunterResults(pin);
      }
    };
    tick();
    timerRef.current = setInterval(tick, 500);
    return () => clearInterval(timerRef.current);
  }, [phase, game?.roundStartTime, pin]);

  useEffect(() => {
    if (phase !== 'results') return;
    if (awardedRef.current === round) return;
    awardedRef.current = round;
    awardBugHunterRound(pin);
  }, [phase, round, pin]);

  const handleStartFirstRound = () => startBugHunterRound(pin, 1);

  const handleNextRound = () => {
    if (round >= TOTAL_ROUNDS) {
      finishBugHunter(pin);
      return;
    }
    startBugHunterRound(pin, round + 1);
  };

  const handleFinish = () => finishBugHunter(pin);

  const handleShowInstructions = () =>
    setBugHunterInstructionsVisible(pin, true);

  const handleBack = async () => {
    await resetRoomToLobby(pin);
    navigate(`/host/${pin}/select-game`);
  };

  if (loading) return <div className="bh-loading">Loading...</div>;
  if (!room) return <div className="bh-loading">Room not found</div>;

  // -------- FINISHED --------
  if (room.status === 'finished' || phase === 'finished') {
    const sorted = [...players].sort((a, b) => (b.score || 0) - (a.score || 0));
    return (
      <div className="bh-container">
        <div className="bh-ranking">
          <Trophy size={48} color="#ffc107" style={{ margin: '0 auto' }} />
          <h2>Final Ranking</h2>
          {sorted.map((p, i) => (
            <div
              key={p.uid}
              className={`bh-ranking-row ${i === 0 ? 'first' : ''}`}
            >
              <span>
                {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}{' '}
                {p.name}
              </span>
              <span>{p.score || 0} pts</span>
            </div>
          ))}
          <button
            className="bh-btn primary"
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
  if (phase === 'idle') {
    return (
      <div className="bh-container">
        <BugHunterInstructions
          visible={instructionsVisible}
          onClose={() => setBugHunterInstructionsVisible(pin, false)}
          isHost={true}
        />
        <div className="bh-header">
          <button className="bh-btn" onClick={handleBack}>
            <ArrowLeft size={18} /> Back
          </button>
          <div className="bh-round-badge">Round 0 / {TOTAL_ROUNDS}</div>
        </div>
        <div className="bh-main">
          <div className="bh-phrase">
            <div className="label">Ready to Play</div>
            <div className="text">Bug Hunter</div>
            <div className="bh-hint">
              Find the grammar bug and write the fix!
            </div>
          </div>
          <div className="bh-btn-row">
            <button className="bh-btn secondary" onClick={handleShowInstructions}>
              <Info size={18} /> Show Instructions
            </button>
            <button
              className="bh-btn success"
              onClick={handleStartFirstRound}
              disabled={players.length === 0}
            >
              <Play size={20} /> Start First Round
            </button>
          </div>
          {players.length === 0 && (
            <div className="bh-empty">Waiting for players to join...</div>
          )}
        </div>
      </div>
    );
  }

  // -------- ANSWERING / RESULTS --------
  const q = game?.currentQuestion;
  const visibleTimeLeft = phase === 'answering' ? timeLeft : ROUND_DURATION;

  return (
    <div className="bh-container">
      <BugHunterInstructions
        visible={instructionsVisible}
        onClose={() => setBugHunterInstructionsVisible(pin, false)}
        isHost={true}
      />
      <div className="bh-header">
        <button className="bh-btn" onClick={handleBack}>
          <ArrowLeft size={18} /> Back
        </button>
        <div className="bh-room-info">
          Room: <span className="pin-badge">{pin}</span>
        </div>
        <div className="bh-round-badge">
          Round {round} / {TOTAL_ROUNDS}
        </div>
        {phase === 'answering' && (
          <div className={`bh-timer ${visibleTimeLeft <= 5 ? 'danger' : ''}`}>
            {visibleTimeLeft}s
          </div>
        )}
      </div>

      <div className="bh-main">
        {q && (
          <>
            <div className="bh-question-prompt">
              <span className="bh-label">🐛 Bug found</span>
              <span className="bh-text">{q.buggy}</span>
            </div>

            {phase === 'results' && (
              <div className="bh-correct-answer">
                <span className="bh-label">✅ Correct fix</span>
                <span className="bh-text">{q.correct}</span>
                <div className="bh-hint-box">💡 {q.hint}</div>
              </div>
            )}

            <div className="bh-answers-status">
              {players.length === 0 && (
                <div className="bh-empty">No players connected.</div>
              )}
              {players.map((p) => {
                const ans = answers[p.uid];
                return (
                  <div
                    key={p.uid}
                    className={`bh-answer-row ${
                      !ans ? 'pending' : ans.correct ? 'correct' : 'incorrect'
                    }`}
                  >
                    <span className="bh-answer-name">
                      {!ans ? '⏳' : ans.correct ? '✅' : '❌'} {p.name}
                    </span>
                    <span className="bh-answer-text">
                      {ans ? `"${ans.text}"` : 'waiting...'}
                    </span>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {phase === 'results' && round < TOTAL_ROUNDS && (
          <div className="bh-btn-row">
            <button className="bh-btn success" onClick={handleNextRound}>
              <Play size={20} /> Next Round
            </button>
          </div>
        )}
        {phase === 'results' && round >= TOTAL_ROUNDS && (
          <div className="bh-btn-row">
            <button className="bh-btn primary" onClick={handleFinish}>
              <Trophy size={20} /> Show Final Ranking
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// -------- Instructions modal --------
const BugHunterInstructions = ({ visible, onClose, isHost }) => {
  if (!visible) return null;
  return (
    <div className="bh-modal-overlay">
      <div className="bh-modal">
        <h2>📘 How to Play — Bug Hunter</h2>
        <ol>
          <li>A sentence appears with a grammar bug.</li>
          <li>
            Example: <em>"The Lead told me to no touch the production server."</em>
          </li>
          <li>
            You must type the <strong>correct fix</strong> (just the corrected
            part).
          </li>
          <li>
            Example fix: <code>not to touch</code>
          </li>
          <li>
            You have <strong>30 seconds</strong> per question.
          </li>
          <li>
            The <strong>first correct answer</strong> gets <strong>+150 pts</strong>.
          </li>
          <li>Second: +100. Third: +50. The rest: +25.</li>
          <li>After all rounds, the ranking is shown.</li>
        </ol>
        <div className="bh-modal-tip">
          💡 <strong>Remember:</strong> the correct structure is{' '}
          <code>not to + verb</code>.
        </div>
        {isHost ? (
          <button className="bh-btn primary" onClick={onClose}>
            OK — Start Playing
          </button>
        ) : (
          <div className="bh-modal-waiting">
            ⏳ Waiting for the teacher to start...
          </div>
        )}
      </div>
    </div>
  );
};

export default HostBugHunter;