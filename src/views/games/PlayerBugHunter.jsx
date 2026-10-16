import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Send, Trophy } from 'lucide-react';
import { useRoom } from '../../firebase/useRoom';
import { auth } from '../../firebase/config';
import { submitBugAnswer } from '../../firebase/bugHunterState';
import { validateBugFix } from '../../data/bugHunterQuestions';
import './BugHunter.css';

const PlayerBugHunter = () => {
  const { pin } = useParams();
  const navigate = useNavigate();
  const { room, loading } = useRoom(pin);
  const myUid = auth.currentUser?.uid;

  const game = room?.game;
  const phase = game?.phase || 'idle';
  const round = game?.round || 0;
  const instructionsVisible = game?.instructionsVisible ?? false;
  const answers = useMemo(() => game?.answers || {}, [game?.answers]);
  const myAnswer = myUid ? answers[myUid] : null;
  const playerName = room?.players?.[myUid]?.name || 'Player';
  const [input, setInput] = useState('');

  // Auto-return to lobby if host leaves
  useEffect(() => {
    if (!room) return;
    if (room.status === 'waiting' && room.gameType === 'lobby') {
      navigate(`/play/${pin}`);
    }
  }, [room, pin, navigate]);

  const handleSubmit = async () => {
    if (!input.trim() || myAnswer || phase !== 'answering') return;
    const correct = validateBugFix(input, game?.currentQuestion?.correct);
    await submitBugAnswer(pin, myUid, playerName, input, correct);
  };

  if (loading) return <div className="bh-loading">Loading...</div>;
  if (!room) return <div className="bh-loading">Room not found</div>;

  const me = myUid ? room.players?.[myUid] : null;
  const players = Object.entries(room.players || {})
    .filter(([, p]) => !p.isHost)
    .map(([uid, p]) => ({ uid, ...p }));

  // -------- FINISHED --------
  if (room.status === 'finished' || phase === 'finished') {
    const sorted = [...players].sort((a, b) => (b.score || 0) - (a.score || 0));
    const myRank = sorted.findIndex((p) => p.uid === myUid) + 1;
    return (
      <div className="bh-container">
        <div className="bh-ranking">
          <Trophy size={48} color="#ffc107" style={{ margin: '0 auto' }} />
          <h2>
            Your Rank: #{myRank} — {me?.score || 0} pts
          </h2>
          {sorted.slice(0, 10).map((p, i) => (
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
        </div>
      </div>
    );
  }

  // -------- WAITING --------
  if (phase === 'idle') {
    return (
      <div className="bh-container">
        <BugHunterInstructions visible={instructionsVisible} />
        <div className="bh-main">
          <div className="bh-phrase">
            <div className="label">Get Ready</div>
            <div className="text">Waiting for the teacher...</div>
          </div>
        </div>
      </div>
    );
  }

  // -------- ANSWERING / RESULTS --------
  const q = game?.currentQuestion;

  return (
    <div className="bh-container">
      <BugHunterInstructions visible={instructionsVisible} />

      <div className="bh-header">
        <div className="bh-room-info">
          Round <span className="pin-badge">{round}</span>
        </div>
      </div>

      <div className="bh-main">
        {q && (
          <>
            <div className="bh-question-prompt">
              <span className="bh-label">🐛 Bug found</span>
              <span className="bh-text">{q.buggy}</span>
            </div>

            {!myAnswer && phase === 'answering' && (
              <div className="bh-input-group">
                <input
                  key={`bug-input-${round}`}
                  type="text"
                  placeholder="Type the corrected part..."
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
                className={`bh-answer-feedback ${
                  myAnswer.correct ? 'correct' : 'incorrect'
                }`}
              >
                {myAnswer.correct ? '✅ Correct!' : '❌ Not quite.'}
                <div className="bh-answer-written">
                  You wrote: <code>{myAnswer.text}</code>
                </div>
              </div>
            )}

            {phase === 'results' && (
              <div className="bh-correct-answer">
                <span className="bh-label">✅ Correct fix</span>
                <span className="bh-text">{q.correct}</span>
                <div className="bh-hint-box">💡 {q.hint}</div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

// -------- Instructions modal (read-only) --------
const BugHunterInstructions = ({ visible }) => {
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
            You must type the <strong>correct fix</strong>.
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
        <div className="bh-modal-waiting">
          ⏳ Waiting for the teacher to start...
        </div>
      </div>
    </div>
  );
};

export default PlayerBugHunter;