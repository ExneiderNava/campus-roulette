import { useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Trophy, ArrowLeft, Play, Info } from 'lucide-react';
import { useRoom } from '../../firebase/useRoom';
import {
  startBattleCity,
  startBattleCityRound,
  endBattleCityRound,
  finishBattleCity,
  setBattleCityInstructionsVisible,
} from '../../firebase/battleCityState';
import { resetRoomToLobby } from '../../firebase/gameState';
import { BATTLE_CITY_QUESTIONS } from '../../data/battleCityQuestions';
import './BattleCity.css';

const HostBattleCity = () => {
  const { pin } = useParams();
  const navigate = useNavigate();
  const { room, loading } = useRoom(pin);
  const endedRoundRef = useRef(0);

  const game = room?.game;
  const phase = game?.phase || 'idle';
  const round = game?.round || 0;
  const teams = game?.teams || null;
  const instructionsVisible = game?.instructionsVisible ?? false;
  const players = useMemo(
    () =>
      Object.entries(room?.players || {})
        .filter(([, p]) => !p.isHost)
        .map(([uid, p]) => ({ uid, ...p })),
    [room?.players]
  );

  // -------- Init when entering --------
  useEffect(() => {
    if (!room) return;
    if (room.gameType === 'battle-city') return;
    if (players.length === 0) return;
    startBattleCity(pin, players);
  }, [room, pin, players]);

  // -------- Watch for a team that completed the sentence --------
  useEffect(() => {
    if (phase !== 'playing') return;
    if (!teams) return;
    if (endedRoundRef.current === round) return;

    const redDone = teams.red?.completedAt;
    const blueDone = teams.blue?.completedAt;
    if (redDone || blueDone) {
      endedRoundRef.current = round;
      const winner =
        redDone && blueDone
          ? redDone < blueDone
            ? 'red'
            : 'blue'
          : redDone
          ? 'red'
          : 'blue';
      endBattleCityRound(pin, winner);
    }
  }, [phase, teams, round, pin]);

  const handleStartFirstRound = async () => {
    await startBattleCityRound(pin, 1);
  };

  const handleNextRound = async () => {
    if (round >= BATTLE_CITY_QUESTIONS.length) {
      finishBattleCity(pin);
      return;
    }
    await startBattleCityRound(pin, round + 1);
  };

  const handleFinish = () => finishBattleCity(pin);

  const handleShowInstructions = () =>
    setBattleCityInstructionsVisible(pin, true);

  const handleBack = async () => {
    await resetRoomToLobby(pin);
    navigate(`/host/${pin}/select-game`);
  };

  if (loading) return <div className="bc-loading">Loading...</div>;
  if (!room) return <div className="bc-loading">Room not found</div>;

  // -------- FINISHED --------
  if (room.status === 'finished' || phase === 'finished') {
    const sorted = [...players].sort((a, b) => (b.score || 0) - (a.score || 0));
    return (
      <div className="bc-container">
        <div className="bc-ranking">
          <Trophy size={48} color="#ffc107" style={{ margin: '0 auto' }} />
          <h2>Final Ranking</h2>
          {sorted.map((p, i) => (
            <div
              key={p.uid}
              className={`bc-ranking-row ${i === 0 ? 'first' : ''}`}
            >
              <span>
                {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}{' '}
                {p.name}
              </span>
              <span>{p.score || 0} pts</span>
            </div>
          ))}
          <button
            className="bc-btn primary"
            style={{ margin: '20px auto 0' }}
            onClick={handleBack}
          >
            Back to Game Menu
          </button>
        </div>
      </div>
    );
  }

  // -------- IDLE / INSTRUCTIONS --------
  if (phase === 'idle' || phase === 'instructions') {
    return (
      <div className="bc-container">
        <BattleCityInstructions
          visible={instructionsVisible}
          onClose={() => setBattleCityInstructionsVisible(pin, false)}
          isHost={true}
        />
        <div className="bc-header">
          <button className="bc-btn" onClick={handleBack}>
            <ArrowLeft size={18} /> Back
          </button>
          <div className="bc-round-badge">
            Round 0 / {BATTLE_CITY_QUESTIONS.length}
          </div>
        </div>
        <div className="bc-main">
          <div className="bc-phrase">
            <div className="label">Ready to Play</div>
            <div className="text">Battle City</div>
            <div className="bc-hint">
              Teams race to arrange the sentence in the correct order.
            </div>
          </div>
          <div className="bc-btn-row">
            <button className="bc-btn secondary" onClick={handleShowInstructions}>
              <Info size={18} /> Show Instructions
            </button>
            <button
              className="bc-btn success"
              onClick={handleStartFirstRound}
              disabled={players.length === 0}
            >
              <Play size={20} /> Start First Round
            </button>
          </div>
          {players.length === 0 && (
            <div className="bc-empty">Waiting for players to join...</div>
          )}
        </div>
      </div>
    );
  }

  // -------- PLAYING / ROUND-RESULTS --------
  return (
    <div className="bc-container">
      <BattleCityInstructions
        visible={instructionsVisible}
        onClose={() => setBattleCityInstructionsVisible(pin, false)}
        isHost={true}
      />
      <div className="bc-header">
        <button className="bc-btn" onClick={handleBack}>
          <ArrowLeft size={18} /> Back
        </button>
        <div className="bc-room-info">
          Room: <span className="pin-badge">{pin}</span>
        </div>
        <div className="bc-round-badge">
          Round {round} / {BATTLE_CITY_QUESTIONS.length}
        </div>
      </div>

      <div className="bc-main">
        {/* We no longer show the target sentence to the host either,
            so nobody sees the answer until the round is done. */}

        <div className="bc-teams-grid">
          <TeamPanel label="Red Team" color="#d32f2f" team={teams?.red} />
          <TeamPanel label="Blue Team" color="#007bff" team={teams?.blue} />
        </div>

        {/* Show the correct sentence only in round-results */}
        {phase === 'round-results' && (
          <div className="bc-sentence-target">
            <span className="label">Correct sentence</span>
            <span className="text">{game?.targetSentence}</span>
          </div>
        )}

        {phase === 'round-results' && round < BATTLE_CITY_QUESTIONS.length && (
          <div className="bc-btn-row">
            <button className="bc-btn success" onClick={handleNextRound}>
              <Play size={20} /> Next Round
            </button>
          </div>
        )}
        {phase === 'round-results' && round >= BATTLE_CITY_QUESTIONS.length && (
          <div className="bc-btn-row">
            <button className="bc-btn primary" onClick={handleFinish}>
              <Trophy size={20} /> Show Final Ranking
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

const TeamPanel = ({ label, color, team }) => {
  if (!team) return null;
  return (
    <div className="bc-team-panel" style={{ borderColor: color }}>
      <h3 style={{ color }}>{label}</h3>
      <div className="bc-team-info">
        <span>Score: {team.score || 0}</span>
        <span>Members: {team.members?.length || 0}</span>
      </div>
      <div className="bc-team-carried">
        {team.carrying ? `Carrying: ${team.carrying}` : 'Not carrying anything'}
      </div>
      <div className="bc-placed-words">
        {(team.placed || []).map((w, i) => (
          <span key={i} className="bc-placed-word">
            {w}
          </span>
        ))}
        {team.completedAt && <span className="bc-complete">✅ Done</span>}
      </div>
    </div>
  );
};

// -------- Instructions modal --------
const BattleCityInstructions = ({ visible, onClose, isHost }) => {
  if (!visible) return null;
  return (
    <div className="bc-modal-overlay">
      <div className="bc-modal">
        <h2>📘 How to Play — Battle City</h2>
        <ol>
          <li>Players are split into two teams: <strong>Red</strong> and <strong>Blue</strong>.</li>
          <li>Each team has a random <strong>pilot</strong> who drives the car.</li>
          <li>Members vote for which word the pilot should pick up next.</li>
          <li>The pilot moves with the <strong>arrow keys</strong> (or by clicking on mobile).</li>
          <li>Pick up words and place them in the correct order.</li>
          <li>The first team to build the full sentence wins the round (+100 team, +50 each).</li>
          <li>After 5 rounds, the final ranking is shown.</li>
        </ol>
        <div className="bc-modal-tip">
          💡 <strong>Tip:</strong> wrong placements drop the word — coordinate with your team!
        </div>
        {isHost ? (
          <button className="bc-btn primary" onClick={onClose}>
            OK — Start Playing
          </button>
        ) : (
          <div className="bc-modal-waiting">
            ⏳ Waiting for the teacher to start...
          </div>
        )}
      </div>
    </div>
  );
};

export default HostBattleCity;