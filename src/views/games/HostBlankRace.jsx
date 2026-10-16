import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Trophy, ArrowLeft, Play, Info } from 'lucide-react';
import { useRoom } from '../../firebase/useRoom';
import {
  startBlankRace,
  startBlankRaceRound,
  showBlankRaceResults,
  awardBlankRaceRound,
  finishBlankRace,
  setBlankRaceInstructionsVisible,
} from '../../firebase/blankRaceState';
import { resetRoomToLobby } from '../../firebase/gameState';
import { BLANK_RACE_QUESTIONS } from '../../data/blankRaceQuestions';
import './BlankRace.css';

const ROUND_DURATION = 45;
const TOTAL_ROUNDS = BLANK_RACE_QUESTIONS.length;

const HostBlankRace = () => {
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
    if (room.gameType === 'blank-race') return;
    startBlankRace(pin);
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
        showBlankRaceResults(pin);
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
    awardBlankRaceRound(pin);
  }, [phase, round, pin]);

  const handleStartFirstRound = () => startBlankRaceRound(pin, 1);

  const handleNextRound = () => {
    if (round >= TOTAL_ROUNDS) {
      finishBlankRace(pin);
      return;
    }
    startBlankRaceRound(pin, round + 1);
  };

  const handleFinish = () => finishBlankRace(pin);

  const handleShowInstructions = () =>
    setBlankRaceInstructionsVisible(pin, true);

  const handleBack = async () => {
    await resetRoomToLobby(pin);
    navigate(`/host/${pin}/select-game`);
  };

  if (loading) return <div className="br-loading">Loading...</div>;
  if (!room) return <div className="br-loading">Room not found</div>;

  // -------- FINISHED --------
  if (room.status === 'finished' || phase === 'finished') {
    const sorted = [...players].sort((a, b) => (b.score || 0) - (a.score || 0));
    return (
      <div className="br-container">
        <div className="br-ranking">
          <Trophy size={48} color="#ffc107" style={{ margin: '0 auto' }} />
          <h2>Final Ranking</h2>
          {sorted.map((p, i) => (
            <div
              key={p.uid}
              className={`br-ranking-row ${i === 0 ? 'first' : ''}`}
            >
              <span>
                {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}{' '}
                {p.name}
              </span>
              <span>{p.score || 0} pts</span>
            </div>
          ))}
          <button
            className="br-btn primary"
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
      <div className="br-container">
        <BlankRaceInstructions
          visible={instructionsVisible}
          onClose={() => setBlankRaceInstructionsVisible(pin, false)}
          isHost={true}
        />
        <div className="br-header">
          <button className="br-btn" onClick={handleBack}>
            <ArrowLeft size={18} /> Back
          </button>
          <div className="br-round-badge">Round 0 / {TOTAL_ROUNDS}</div>
        </div>
        <div className="br-main">
          <div className="br-phrase">
            <div className="label">Ready to Play</div>
            <div className="text">Blank Race</div>
            <div className="br-hint">
              Fill in all the blanks before anyone else!
            </div>
          </div>
          <div className="br-btn-row">
            <button className="br-btn secondary" onClick={handleShowInstructions}>
              <Info size={18} /> Show Instructions
            </button>
            <button
              className="br-btn success"
              onClick={handleStartFirstRound}
              disabled={players.length === 0}
            >
              <Play size={20} /> Start First Round
            </button>
          </div>
          {players.length === 0 && (
            <div className="br-empty">Waiting for players to join...</div>
          )}
        </div>
      </div>
    );
  }

  // -------- ANSWERING / RESULTS --------
  const q = game?.currentQuestion;
  const visibleTimeLeft = phase === 'answering' ? timeLeft : ROUND_DURATION;

  return (
    <div className="br-container">
      <BlankRaceInstructions
        visible={instructionsVisible}
        onClose={() => setBlankRaceInstructionsVisible(pin, false)}
        isHost={true}
      />
      <div className="br-header">
        <button className="br-btn" onClick={handleBack}>
          <ArrowLeft size={18} /> Back
        </button>
        <div className="br-room-info">
          Room: <span className="pin-badge">{pin}</span>
        </div>
        <div className="br-round-badge">
          Round {round} / {TOTAL_ROUNDS}
        </div>
        {phase === 'answering' && (
          <div className={`br-timer ${visibleTimeLeft <= 10 ? 'danger' : ''}`}>
            {visibleTimeLeft}s
          </div>
        )}
      </div>

      <div className="br-main">
        {q && (
          <>
            <div className="br-question-prompt">
              <span className="br-label">✏️ Complete the sentence</span>
              <span className="br-text">{q.template}</span>
            </div>

            {phase === 'results' && (
              <div className="br-correct-answer">
                <span className="br-label">✅ Correct blanks</span>
                <div className="br-correct-list">
                  {q.blanks.map((b, i) => (
                    <span key={i} className="br-correct-chip">
                      {i + 1}. {b}
                    </span>
                  ))}
                </div>
                <div className="br-hint-box">💡 {q.hint}</div>
              </div>
            )}

            <div className="br-answers-status">
              {players.length === 0 && (
                <div className="br-empty">No players connected.</div>
              )}
              {players.map((p) => {
                const ans = answers[p.uid];
                return (
                  <div
                    key={p.uid}
                    className={`br-answer-row ${
                      !ans ? 'pending' : ans.correct ? 'correct' : 'incorrect'
                    }`}
                  >
                    <span className="br-answer-name">
                      {!ans ? '⏳' : ans.correct ? '✅' : '❌'} {p.name}
                    </span>
                    <span className="br-answer-text">
                      {ans
                        ? ans.values.map((v, i) => `${i + 1}. ${v}`).join(' | ')
                        : 'waiting...'}
                    </span>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {phase === 'results' && round < TOTAL_ROUNDS && (
          <div className="br-btn-row">
            <button className="br-btn success" onClick={handleNextRound}>
              <Play size={20} /> Next Round
            </button>
          </div>
        )}
        {phase === 'results' && round >= TOTAL_ROUNDS && (
          <div className="br-btn-row">
            <button className="br-btn primary" onClick={handleFinish}>
              <Trophy size={20} /> Show Final Ranking
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// -------- Instructions modal --------
const BlankRaceInstructions = ({ visible, onClose, isHost }) => {
  if (!visible) return null;
  return (
    <div className="br-modal-overlay">
      <div className="br-modal">
        <h2>📘 How to Play — Blank Race</h2>
        <ol>
          <li>
            A sentence appears with <strong>multiple blanks</strong>.
          </li>
          <li>
            Example: <em>"The CEO ___ us ___ waste any of the budget."</em>
          </li>
          <li>
            Fill in <strong>each blank</strong> with the correct word or phrase.
          </li>
          <li>
            Correct answers: <code>asked</code> and <code>not to</code>
          </li>
          <li>
            You have <strong>45 seconds</strong> per sentence.
          </li>
          <li>
            The <strong>first fully-correct submission</strong> gets{' '}
            <strong>+150 pts</strong>.
          </li>
          <li>Second: +100. Third: +50. The rest: +25.</li>
          <li>After all rounds, the ranking is shown.</li>
        </ol>
        <div className="br-modal-tip">
          💡 <strong>Remember:</strong> the correct structure is{' '}
          <code>not to + verb</code>.
        </div>
        {isHost ? (
          <button className="br-btn primary" onClick={onClose}>
            OK — Start Playing
          </button>
        ) : (
          <div className="br-modal-waiting">
            ⏳ Waiting for the teacher to start...
          </div>
        )}
      </div>
    </div>
  );
};

export default HostBlankRace;