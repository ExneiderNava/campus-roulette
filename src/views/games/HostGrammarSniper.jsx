import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Trophy, ArrowLeft, Play, Info } from 'lucide-react';
import { useRoom } from '../../firebase/useRoom';
import {
  startGrammarSniper,
  startGrammarSniperRound,
  showGrammarResults,
  awardGrammarRound,
  finishGrammarSniper,
  setGrammarInstructionsVisible,
} from '../../firebase/grammarSniperState';
import { resetRoomToLobby } from '../../firebase/gameState';
import { GRAMMAR_SNIPER_QUESTIONS } from '../../data/grammarSniperQuestions';
import './GrammarSniper.css';

const ROUND_DURATION = 20;
const TOTAL_ROUNDS = GRAMMAR_SNIPER_QUESTIONS.length;

const HostGrammarSniper = () => {
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

  // Init game
  useEffect(() => {
    if (!room) return;
    if (room.gameType === 'grammar-sniper') return;
    startGrammarSniper(pin);
  }, [room, pin]);

  // Timer during answering
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
        showGrammarResults(pin);
      }
    };
    tick();
    timerRef.current = setInterval(tick, 500);
    return () => clearInterval(timerRef.current);
  }, [phase, game?.roundStartTime, pin]);

  // Award points once per round
  useEffect(() => {
    if (phase !== 'results') return;
    if (awardedRef.current === round) return;
    awardedRef.current = round;
    awardGrammarRound(pin);
  }, [phase, round, pin]);

  const handleStartFirstRound = () => startGrammarSniperRound(pin, 1);

  const handleNextRound = () => {
    if (round >= TOTAL_ROUNDS) {
      finishGrammarSniper(pin);
      return;
    }
    startGrammarSniperRound(pin, round + 1);
  };

  const handleFinish = () => finishGrammarSniper(pin);

  const handleShowInstructions = () =>
    setGrammarInstructionsVisible(pin, true);

  const handleBack = async () => {
    await resetRoomToLobby(pin);
    navigate(`/host/${pin}/select-game`);
  };

  if (loading) return <div className="gs-loading">Loading...</div>;
  if (!room) return <div className="gs-loading">Room not found</div>;

  // -------- FINISHED --------
  if (room.status === 'finished' || phase === 'finished') {
    const sorted = [...players].sort((a, b) => (b.score || 0) - (a.score || 0));
    return (
      <div className="gs-container">
        <div className="gs-ranking">
          <Trophy size={48} color="#ffc107" style={{ margin: '0 auto' }} />
          <h2>Final Ranking</h2>
          {sorted.map((p, i) => (
            <div
              key={p.uid}
              className={`gs-ranking-row ${i === 0 ? 'first' : ''}`}
            >
              <span>
                {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}{' '}
                {p.name}
              </span>
              <span>{p.score || 0} pts</span>
            </div>
          ))}
          <button
            className="gs-btn primary"
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
      <div className="gs-container">
        <GrammarSniperInstructions
          visible={instructionsVisible}
          onClose={() => setGrammarInstructionsVisible(pin, false)}
          isHost={true}
        />
        <div className="gs-header">
          <button className="gs-btn" onClick={handleBack}>
            <ArrowLeft size={18} /> Back
          </button>
          <div className="gs-round-badge">Round 0 / {TOTAL_ROUNDS}</div>
        </div>
        <div className="gs-main">
          <div className="gs-phrase">
            <div className="label">Ready to Play</div>
            <div className="text">Grammar Sniper</div>
            <div className="gs-hint">
              Shoot the correct structure before anyone else!
            </div>
          </div>
          <div className="gs-btn-row">
            <button className="gs-btn secondary" onClick={handleShowInstructions}>
              <Info size={18} /> Show Instructions
            </button>
            <button
              className="gs-btn success"
              onClick={handleStartFirstRound}
              disabled={players.length === 0}
            >
              <Play size={20} /> Start First Round
            </button>
          </div>
          {players.length === 0 && (
            <div className="gs-empty">Waiting for players to join...</div>
          )}
        </div>
      </div>
    );
  }

  // -------- ANSWERING / RESULTS --------
  const q = game?.currentQuestion;
  const visibleTimeLeft = phase === 'answering' ? timeLeft : ROUND_DURATION;

  return (
    <div className="gs-container">
      <GrammarSniperInstructions
        visible={instructionsVisible}
        onClose={() => setGrammarInstructionsVisible(pin, false)}
        isHost={true}
      />

      <div className="gs-header">
        <button className="gs-btn" onClick={handleBack}>
          <ArrowLeft size={18} /> Back
        </button>
        <div className="gs-room-info">
          Room: <span className="pin-badge">{pin}</span>
        </div>
        <div className="gs-round-badge">
          Round {round} / {TOTAL_ROUNDS}
        </div>
        {phase === 'answering' && (
          <div className={`gs-timer ${visibleTimeLeft <= 5 ? 'danger' : ''}`}>
            {visibleTimeLeft}s
          </div>
        )}
      </div>

      <div className="gs-main">
        {q && (
          <>
            <div className="gs-question-prompt">{q.prompt}</div>

            <div className="gs-options-grid">
              {q.options.map((opt, i) => (
                <div
                  key={i}
                  className={`gs-option ${
                    phase === 'results' && i === q.correctIndex ? 'correct' : ''
                  }`}
                >
                  <span className="gs-option-letter">
                    {String.fromCharCode(65 + i)}
                  </span>
                  {opt}
                </div>
              ))}
            </div>

            {phase === 'results' && (
              <div className="gs-hint-box">💡 {q.hint}</div>
            )}

            <div className="gs-answers-status">
              {players.length === 0 && (
                <div className="gs-empty">No players connected.</div>
              )}
              {players.map((p) => {
                const ans = answers[p.uid];
                return (
                  <div
                    key={p.uid}
                    className={`gs-answer-row ${
                      !ans ? 'pending' : ans.correct ? 'correct' : 'incorrect'
                    }`}
                  >
                    <span className="gs-answer-name">
                      {!ans ? '⏳' : ans.correct ? '✅' : '❌'} {p.name}
                    </span>
                    <span className="gs-answer-choice">
                      {ans
                        ? `Chose ${String.fromCharCode(65 + ans.choiceIndex)}`
                        : 'waiting...'}
                    </span>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {phase === 'results' && round < TOTAL_ROUNDS && (
          <div className="gs-btn-row">
            <button className="gs-btn success" onClick={handleNextRound}>
              <Play size={20} /> Next Round
            </button>
          </div>
        )}
        {phase === 'results' && round >= TOTAL_ROUNDS && (
          <div className="gs-btn-row">
            <button className="gs-btn primary" onClick={handleFinish}>
              <Trophy size={20} /> Show Final Ranking
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// -------- Instructions modal --------
const GrammarSniperInstructions = ({ visible, onClose, isHost }) => {
  if (!visible) return null;
  return (
    <div className="gs-modal-overlay">
      <div className="gs-modal">
        <h2>📘 How to Play — Grammar Sniper</h2>
        <ol>
          <li>
            A sentence appears with a blank:{' '}
            <em>"I asked him ___ reboot the router."</em>
          </li>
          <li>Three options appear. Only one is correct.</li>
          <li>Click the option you think is correct.</li>
          <li>
            You have <strong>20 seconds</strong> per question.
          </li>
          <li>
            The <strong>first correct answer</strong> gets{' '}
            <strong>+150 pts</strong>.
          </li>
          <li>Second: +100. Third: +50. The rest of correct answers: +25.</li>
          <li>Wrong answers: 0 pts.</li>
          <li>After all rounds, the ranking is shown.</li>
        </ol>
        <div className="gs-modal-tip">
          💡 <strong>Remember:</strong> the correct structure is{' '}
          <code>not to + verb</code>.
        </div>
        {isHost ? (
          <button className="gs-btn primary" onClick={onClose}>
            OK — Start Playing
          </button>
        ) : (
          <div className="gs-modal-waiting">
            ⏳ Waiting for the teacher to start...
          </div>
        )}
      </div>
    </div>
  );
};

export default HostGrammarSniper;