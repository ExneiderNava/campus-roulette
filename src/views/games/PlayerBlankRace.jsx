import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Send, Trophy } from 'lucide-react';
import { useRoom } from '../../firebase/useRoom';
import { auth } from '../../firebase/config';
import { submitBlankAnswer } from '../../firebase/blankRaceState';
import { validateAllBlanks } from '../../data/blankRaceQuestions';
import './BlankRace.css';

const PlayerBlankRace = () => {
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

  const question = game?.currentQuestion;
  const [values, setValues] = useState([]);

  // Auto-return to lobby if host leaves
  useEffect(() => {
    if (!room) return;
    if (room.status === 'waiting' && room.gameType === 'lobby') {
      navigate(`/play/${pin}`);
    }
  }, [room, pin, navigate]);

  const handleSubmit = async () => {
    if (myAnswer || phase !== 'answering') return;
    if (values.some((v) => !v.trim())) return;
    const correct = validateAllBlanks(values, question.blanks);
    await submitBlankAnswer(pin, myUid, playerName, values, correct);
  };

  const updateValue = (i, v) => {
    const copy = [...values];
    copy[i] = v;
    setValues(copy);
  };

  if (loading) return <div className="br-loading">Loading...</div>;
  if (!room) return <div className="br-loading">Room not found</div>;

  const me = myUid ? room.players?.[myUid] : null;
  const players = Object.entries(room.players || {})
    .filter(([, p]) => !p.isHost)
    .map(([uid, p]) => ({ uid, ...p }));

  // -------- FINISHED --------
  if (room.status === 'finished' || phase === 'finished') {
    const sorted = [...players].sort((a, b) => (b.score || 0) - (a.score || 0));
    const myRank = sorted.findIndex((p) => p.uid === myUid) + 1;
    return (
      <div className="br-container">
        <div className="br-ranking">
          <Trophy size={48} color="#ffc107" style={{ margin: '0 auto' }} />
          <h2>
            Your Rank: #{myRank} — {me?.score || 0} pts
          </h2>
          {sorted.slice(0, 10).map((p, i) => (
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
        </div>
      </div>
    );
  }

  // -------- WAITING --------
  if (phase === 'idle') {
    return (
      <div className="br-container">
        <BlankRaceInstructions visible={instructionsVisible} />
        <div className="br-main">
          <div className="br-phrase">
            <div className="label">Get Ready</div>
            <div className="text">Waiting for the teacher...</div>
          </div>
        </div>
      </div>
    );
  }

  // -------- ANSWERING / RESULTS --------
  return (
    <div className="br-container">
      <BlankRaceInstructions visible={instructionsVisible} />

      <div className="br-header">
        <div className="br-room-info">
          Round <span className="pin-badge">{round}</span>
        </div>
      </div>

      <div className="br-main">
        {question && (
          <>
            <div className="br-question-prompt">
              <span className="br-label">✏️ Complete the sentence</span>
              <span className="br-text">{question.template}</span>
            </div>

            {!myAnswer && phase === 'answering' && (
              <div key={`blanks-form-${round}`} className="br-blanks-form">
                {question.blanks.map((_, i) => (
                  <div key={i} className="br-blank-field">
                    <label>Blank {i + 1}</label>
                    <input
                      type="text"
                      placeholder={`Write blank ${i + 1}...`}
                      value={values[i] || ''}
                      onChange={(e) => updateValue(i, e.target.value)}
                      onKeyDown={(e) =>
                        e.key === 'Enter' &&
                        i === question.blanks.length - 1
                          ? handleSubmit()
                          : null
                      }
                      autoFocus={i === 0}
                    />
                  </div>
                ))}
                <button
                  className="br-btn success"
                  onClick={handleSubmit}
                  disabled={values.some((v) => !v.trim())}
                >
                  <Send size={18} /> Send all
                </button>
              </div>
            )}

            {myAnswer && (
              <div
                className={`br-answer-feedback ${
                  myAnswer.correct ? 'correct' : 'incorrect'
                }`}
              >
                {myAnswer.correct ? '✅ Correct!' : '❌ Not quite.'}
                <div className="br-answer-written">
                  You wrote:{' '}
                  {myAnswer.values.map((v, i) => (
                    <code key={i}>
                      {i + 1}. {v}
                    </code>
                  ))}
                </div>
              </div>
            )}

            {phase === 'results' && (
              <div className="br-correct-answer">
                <span className="br-label">✅ Correct blanks</span>
                <div className="br-correct-list">
                  {question.blanks.map((b, i) => (
                    <span key={i} className="br-correct-chip">
                      {i + 1}. {b}
                    </span>
                  ))}
                </div>
                <div className="br-hint-box">💡 {question.hint}</div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

// -------- Instructions modal (read-only) --------
const BlankRaceInstructions = ({ visible }) => {
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
            Fill in <strong>each blank</strong> with the correct word or phrase.
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
        <div className="br-modal-waiting">
          ⏳ Waiting for the teacher to start...
        </div>
      </div>
    </div>
  );
};

export default PlayerBlankRace;