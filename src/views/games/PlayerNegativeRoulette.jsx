import { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Send, Trophy } from 'lucide-react';
import RouletteWheel from '../../components/RouletteWheel';
import { useRoom } from '../../firebase/useRoom';
import { auth } from '../../firebase/config';
import { submitAnswer } from '../../firebase/gameState';
import {
  validateAnswer,
  NEGATIVE_ROULETTE_QUESTIONS,
} from '../../data/negativeRouletteQuestions';
import './NegativeRoulette.css';

const ROUND_DURATION = 30;

const PlayerNegativeRoulette = () => {
  const { pin } = useParams();
  const navigate = useNavigate();
  const { room, loading } = useRoom(pin);

  const [input, setInput] = useState('');
  const [timeLeft, setTimeLeft] = useState(ROUND_DURATION);
  const timerRef = useRef(null);
  const currentRoundRef = useRef(0);
  const myUid = auth.currentUser?.uid;

  const game = room?.game;
  const phase = game?.phase || 'idle';
  const round = game?.round || 0;
  const answers = useMemo(() => game?.answers || {}, [game?.answers]);
  const myAnswer = myUid ? answers[myUid] : null;
  const instructionsVisible = game?.instructionsVisible ?? false;

  const playerName = room?.players?.[myUid]?.name || 'Player';

  // -------- Reset input when a new round starts --------
  useEffect(() => {
    if (round !== currentRoundRef.current) {
      currentRoundRef.current = round;
      setInput('');
    }
  }, [round]);

  // -------- If the host leaves the game, return to the lobby --------
  useEffect(() => {
    if (!room) return;
    if (room.status === 'waiting' && room.gameType === 'lobby') {
      navigate(`/play/${pin}`);
    }
  }, [room, pin, navigate]);

  // -------- Timer --------
  useEffect(() => {
    if (phase !== 'answering') {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }
    const roundStart = game?.roundStartTime || Date.now();
    const tick = () => {
      const elapsed = Math.floor((Date.now() - roundStart) / 1000);
      setTimeLeft(Math.max(0, ROUND_DURATION - elapsed));
    };
    tick();
    timerRef.current = setInterval(tick, 500);
    return () => clearInterval(timerRef.current);
  }, [phase, game?.roundStartTime]);

  const handleSubmit = async () => {
    if (!input.trim() || myAnswer || phase !== 'answering') return;
    const isCorrect = validateAnswer(input, game?.correctAnswer);
    await submitAnswer(pin, myUid, playerName, input, isCorrect);
  };

  if (loading) return <div className="nr-loading">Loading...</div>;
  if (!room) return <div className="nr-loading">Room not found</div>;

  const me = myUid ? room.players?.[myUid] : null;

  // -------- FINISHED --------
  if (room.status === 'finished') {
    const players = Object.entries(room.players || {})
      .filter(([, p]) => !p.isHost)
      .map(([uid, p]) => ({ uid, ...p }));
    const sorted = [...players].sort((a, b) => (b.score || 0) - (a.score || 0));
    const myRank = sorted.findIndex((p) => p.uid === myUid) + 1;
    return (
      <div className="nr-container">
        <div className="nr-ranking">
          <Trophy size={48} color="#ffc107" style={{ margin: '0 auto' }} />
          <h2>
            Your Rank: #{myRank} — {me?.score || 0} pts
          </h2>
          {sorted.slice(0, 10).map((p, i) => (
            <div
              key={p.uid}
              className={`nr-ranking-row ${i === 0 ? 'first' : ''}`}
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

  // -------- SPINNING / IDLE (show wheel) --------
  if (phase === 'idle' || phase === 'spinning') {
    return (
      <div className="nr-container">
        <InstructionsModal visible={instructionsVisible} />
        <div className="nr-main">
          <div className="nr-phrase">
            <div className="label">
              {phase === 'spinning' ? 'Spinning...' : 'Get Ready'}
            </div>
            <div className="text">
              {phase === 'spinning'
                ? 'Watch the wheel!'
                : 'Waiting for the teacher...'}
            </div>
          </div>
          {phase === 'spinning' && (
            <div className="nr-wheel-wrap">
              <RouletteWheel
                items={NEGATIVE_ROULETTE_QUESTIONS.map((q) => q.phrase)}
                forcedWinner={game?.targetPhrase}
                autoSpin={true}
              />
            </div>
          )}
        </div>
      </div>
    );
  }

  // -------- ANSWERING / RESULTS --------
  const visibleTimeLeft = phase === 'answering' ? timeLeft : ROUND_DURATION;

  return (
    <div className="nr-container">
      <InstructionsModal visible={instructionsVisible} />
      <div className="nr-header">
        <div className="nr-room-info">
          Room: <span className="pin-badge">{pin}</span>
        </div>
        <div className="nr-round-badge">Round {round}</div>
        {phase === 'answering' && (
          <div className={`nr-timer ${visibleTimeLeft <= 5 ? 'danger' : ''}`}>
            {visibleTimeLeft}s
          </div>
        )}
      </div>

      <div className="nr-main">
        <div className="nr-phrase">
          <div className="label">Phrase</div>
          <div className="text">{game.currentPhrase}</div>
          <div className="nr-hint">{game.hint}</div>
        </div>

        {!myAnswer && phase === 'answering' && (
          <div className="nr-input-group">
            <input
              type="text"
              placeholder="Type the negative version..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              autoFocus
            />
            <button onClick={handleSubmit} disabled={!input.trim()}>
              <Send size={18} /> Send
            </button>
          </div>
        )}

        {myAnswer && (
          <div
            className={`nr-answer-feedback ${
              myAnswer.correct ? 'correct' : 'incorrect'
            }`}
          >
            {myAnswer.correct ? '✅ Correct!' : '❌ Not quite.'}
            <div
              style={{
                marginTop: 8,
                fontWeight: 'normal',
                fontSize: '0.9rem',
              }}
            >
              You wrote: <code>{myAnswer.text}</code>
            </div>
          </div>
        )}

        {!myAnswer && phase === 'results' && (
          <div className="nr-answer-feedback waiting">
            ⏰ Time's up — you didn't answer this round.
          </div>
        )}

        {phase === 'results' && (
          <div className="nr-answer-feedback waiting">
            Correct answer: <strong>{game.correctAnswer}</strong>
          </div>
        )}

        {phase === 'results' && (
          <div className="nr-players-status">
            {Object.entries(answers).map(([uid, ans]) => (
              <div
                key={uid}
                className={`nr-player-row ${
                  ans.correct ? 'correct' : 'incorrect'
                }`}
              >
                <span className="nr-player-name">
                  {ans.correct ? '✅' : '❌'} {ans.name}
                </span>
                <span className="nr-player-answer">{ans.text}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// -------- Instructions modal (read-only for players) --------
const InstructionsModal = ({ visible }) => {
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
        <div className="nr-modal-waiting">
          ⏳ Waiting for the teacher to start...
        </div>
      </div>
    </div>
  );
};

export default PlayerNegativeRoulette;