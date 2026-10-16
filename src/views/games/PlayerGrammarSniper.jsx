import { useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Trophy } from 'lucide-react';
import { useRoom } from '../../firebase/useRoom';
import { auth } from '../../firebase/config';
import { submitGrammarAnswer } from '../../firebase/grammarSniperState';
import { isCorrectChoice } from '../../data/grammarSniperQuestions';
import './GrammarSniper.css';

const PlayerGrammarSniper = () => {
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

  // Auto-return to lobby if host leaves
  useEffect(() => {
    if (!room) return;
    if (room.status === 'waiting' && room.gameType === 'lobby') {
      navigate(`/play/${pin}`);
    }
  }, [room, pin, navigate]);

  const handleChoose = async (index) => {
    if (myAnswer || phase !== 'answering') return;
    const correct = isCorrectChoice(game?.currentQuestion, index);
    await submitGrammarAnswer(pin, myUid, playerName, index, correct);
  };

  if (loading) return <div className="gs-loading">Loading...</div>;
  if (!room) return <div className="gs-loading">Room not found</div>;

  const me = myUid ? room.players?.[myUid] : null;
  const players = Object.entries(room.players || {})
    .filter(([, p]) => !p.isHost)
    .map(([uid, p]) => ({ uid, ...p }));

  // -------- FINISHED --------
  if (room.status === 'finished' || phase === 'finished') {
    const sorted = [...players].sort((a, b) => (b.score || 0) - (a.score || 0));
    const myRank = sorted.findIndex((p) => p.uid === myUid) + 1;
    return (
      <div className="gs-container">
        <div className="gs-ranking">
          <Trophy size={48} color="#ffc107" style={{ margin: '0 auto' }} />
          <h2>
            Your Rank: #{myRank} — {me?.score || 0} pts
          </h2>
          {sorted.slice(0, 10).map((p, i) => (
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
        </div>
      </div>
    );
  }

  // -------- WAITING --------
  if (phase === 'idle') {
    return (
      <div className="gs-container">
        <GrammarSniperInstructions visible={instructionsVisible} />
        <div className="gs-main">
          <div className="gs-phrase">
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
    <div className="gs-container">
      <GrammarSniperInstructions visible={instructionsVisible} />

      <div className="gs-header">
        <div className="gs-room-info">
          Round <span className="pin-badge">{round}</span>
        </div>
      </div>

      <div className="gs-main">
        {q && (
          <>
            <div className="gs-question-prompt">{q.prompt}</div>

            <div className="gs-options-grid">
              {q.options.map((opt, i) => (
                <button
                  key={i}
                  className={`gs-option-btn ${
                    myAnswer?.choiceIndex === i ? 'selected' : ''
                  } ${
                    phase === 'results' && i === q.correctIndex ? 'correct' : ''
                  }`}
                  onClick={() => handleChoose(i)}
                  disabled={!!myAnswer || phase !== 'answering'}
                >
                  <span className="gs-option-letter">
                    {String.fromCharCode(65 + i)}
                  </span>
                  {opt}
                </button>
              ))}
            </div>

            {myAnswer && (
              <div
                className={`gs-answer-feedback ${
                  myAnswer.correct ? 'correct' : 'incorrect'
                }`}
              >
                {myAnswer.correct ? '✅ Correct!' : '❌ Not quite.'}
              </div>
            )}

            {phase === 'results' && (
              <div className="gs-hint-box">💡 {q.hint}</div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

// -------- Instructions modal (read-only) --------
const GrammarSniperInstructions = ({ visible }) => {
  if (!visible) return null;
  return (
    <div className="gs-modal-overlay">
      <div className="gs-modal">
        <h2>📘 How to Play — Grammar Sniper</h2>
        <ol>
          <li>A sentence appears with a blank.</li>
          <li>Three options appear. Only one is correct.</li>
          <li>Click the option you think is correct.</li>
          <li>
            You have <strong>20 seconds</strong> per question.
          </li>
          <li>
            The <strong>first correct answer</strong> gets <strong>+150 pts</strong>.
          </li>
          <li>Second: +100. Third: +50. The rest: +25.</li>
          <li>Wrong answers: 0 pts.</li>
          <li>After all rounds, the ranking is shown.</li>
        </ol>
        <div className="gs-modal-tip">
          💡 <strong>Remember:</strong> the correct structure is{' '}
          <code>not to + verb</code>.
        </div>
        <div className="gs-modal-waiting">
          ⏳ Waiting for the teacher to start...
        </div>
      </div>
    </div>
  );
};

export default PlayerGrammarSniper;