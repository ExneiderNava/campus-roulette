import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Trophy } from 'lucide-react';
import { useRoom } from '../../firebase/useRoom';
import { auth } from '../../firebase/config';
import {
  movePilot,
  pickUpWord,
  dropWord,
  voteForWord,
  markTeamComplete,
} from '../../firebase/battleCityState';
import './BattleCity.css';

const FIELD_PADDING = 0.05;

const PlayerBattleCity = () => {
  const { pin } = useParams();
  const navigate = useNavigate();
  const { room, loading } = useRoom(pin);
  const myUid = auth.currentUser?.uid;

  const game = room?.game;
  const phase = game?.phase || 'idle';
  const teams = game?.teams;
  const round = game?.round || 0;
  const instructionsVisible = game?.instructionsVisible ?? false;

  // -------- Detect team & pilot --------
  const myTeam = useMemo(() => {
    if (!teams) return null;
    for (const key of ['red', 'blue']) {
      if (teams[key]?.members?.includes(myUid)) return key;
    }
    return null;
  }, [teams, myUid]);

  const teamData = myTeam ? teams?.[myTeam] : null;
  const isPilot = teamData?.pilotId === myUid;
  const pilotId = teamData?.pilotId;
  const pilotName = pilotId ? room?.players?.[pilotId]?.name || 'Pilot' : '—';

  // -------- Car position --------
  const [pilotCarPos, setPilotCarPos] = useState({ x: 0.25, y: 0.85 });
  const keysPressed = useRef({});
  const animRef = useRef(null);
  const handleDropRef = useRef(null);

  const carPos = isPilot
    ? pilotCarPos
    : { x: teamData?.x ?? 0.25, y: teamData?.y ?? 0.85 };

  // -------- Keep the drop handler in a ref --------
  useEffect(() => {
    handleDropRef.current = async () => {
      if (!isPilot || !teamData?.carrying) return;
      const success = await dropWord(pin, myTeam, game?.words || []);
      if (
        success &&
        (teamData.placed?.length || 0) + 1 === (game?.words?.length || 0)
      ) {
        await markTeamComplete(pin, myTeam);
      }
    };
  }, [isPilot, teamData, pin, myTeam, game?.words]);

  // -------- Pilot keyboard listener --------
  useEffect(() => {
    if (!isPilot) return;
    if (phase !== 'playing') return;

    const onDown = (e) => {
      if (
        ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(
          e.key
        )
      ) {
        e.preventDefault();
        keysPressed.current[e.key] = true;
      }
      if (e.key === ' ' && teamData?.carrying) {
        if (handleDropRef.current) handleDropRef.current();
      }
    };
    const onUp = (e) => {
      keysPressed.current[e.key] = false;
    };

    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    return () => {
      window.removeEventListener('keydown', onDown);
      window.removeEventListener('keyup', onUp);
    };
  }, [isPilot, phase, teamData?.carrying]);

  // -------- Pilot animation loop --------
  useEffect(() => {
    if (!isPilot) return;
    if (phase !== 'playing') return;

    let last = performance.now();
    let localPos = { ...pilotCarPos };
    const step = (t) => {
      const dt = (t - last) / 1000;
      last = t;
      const speed = 0.4;
      let { x, y } = localPos;
      if (keysPressed.current['ArrowLeft']) x -= speed * dt;
      if (keysPressed.current['ArrowRight']) x += speed * dt;
      if (keysPressed.current['ArrowUp']) y -= speed * dt;
      if (keysPressed.current['ArrowDown']) y += speed * dt;
      x = Math.max(FIELD_PADDING, Math.min(1 - FIELD_PADDING, x));
      y = Math.max(FIELD_PADDING, Math.min(1 - FIELD_PADDING, y));
      if (x !== localPos.x || y !== localPos.y) {
        localPos = { x, y };
        setPilotCarPos({ x, y });
        movePilot(pin, myTeam, x, y);
      }
      animRef.current = requestAnimationFrame(step);
    };
    animRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPilot, phase, myTeam, pin]);

  // -------- Auto-pickup --------
  useEffect(() => {
    if (!isPilot || phase !== 'playing') return;
    if (teamData?.carrying) return;
    const positions = game?.wordPositions || {};
    const placed = teamData?.placed || [];
    for (const [word, pos] of Object.entries(positions)) {
      if (placed.includes(word)) continue;
      const dist = Math.hypot(pos.x - pilotCarPos.x, pos.y - pilotCarPos.y);
      if (dist < 0.05) {
        pickUpWord(pin, myTeam, word);
        break;
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pilotCarPos, isPilot, phase, teamData?.carrying, teamData?.placed]);

  // -------- Auto-return to lobby if host leaves --------
  useEffect(() => {
    if (!room) return;
    if (room.status === 'waiting' && room.gameType === 'lobby') {
      navigate(`/play/${pin}`);
    }
  }, [room, pin, navigate]);

  // -------- Handlers --------
  const handleFieldClick = (e) => {
    if (!isPilot) return;
    if (phase !== 'playing') return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    setPilotCarPos({ x, y });
    movePilot(pin, myTeam, x, y);
  };

  const handleWordClick = async (word) => {
    if (isPilot) {
      if (teamData?.carrying) return;
      await pickUpWord(pin, myTeam, word);
    } else {
      await voteForWord(pin, myTeam, myUid, word);
    }
  };

  const handlePlaceButton = () => {
    if (handleDropRef.current) handleDropRef.current();
  };

  if (loading) return <div className="bc-loading">Loading...</div>;
  if (!room) return <div className="bc-loading">Room not found</div>;

  const me = myUid ? room.players?.[myUid] : null;

  // -------- FINISHED --------
  if (room.status === 'finished' || phase === 'finished') {
    const allPlayers = Object.entries(room.players || {})
      .filter(([, p]) => !p.isHost)
      .map(([uid, p]) => ({ uid, ...p }));
    const sorted = [...allPlayers].sort(
      (a, b) => (b.score || 0) - (a.score || 0)
    );
    const myRank = sorted.findIndex((p) => p.uid === myUid) + 1;
    return (
      <div className="bc-container">
        <div className="bc-ranking">
          <Trophy size={48} color="#ffc107" style={{ margin: '0 auto' }} />
          <h2>
            Your Rank: #{myRank} — {me?.score || 0} pts
          </h2>
          {sorted.slice(0, 10).map((p, i) => (
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
        </div>
      </div>
    );
  }

  // -------- WAITING (with synchronized instructions modal) --------
  if (phase === 'idle' || phase === 'instructions') {
    return (
      <div className="bc-container">
        <BattleCityInstructions visible={instructionsVisible} />
        <div className="bc-main">
          <div className="bc-phrase">
            <div className="label">Get Ready</div>
            <div className="text">Waiting for the teacher...</div>
          </div>
          {myTeam && (
            <div className={`bc-my-team ${myTeam}`}>
              You are on the <strong>{myTeam.toUpperCase()}</strong> team.
              {isPilot
                ? ' 🚗 You are the PILOT!'
                : ` 📣 Your pilot is ${pilotName}. Vote for words!`}
            </div>
          )}
        </div>
      </div>
    );
  }

  // -------- PLAYING / ROUND-RESULTS --------
  const words = game?.scrambled || [];
  const positions = game?.wordPositions || {};
  const placed = teamData?.placed || [];
  const remaining = words.filter((w) => !placed.includes(w));

  return (
    <div className="bc-container">
      <BattleCityInstructions visible={instructionsVisible} />

      <div className="bc-header">
        <div className="bc-room-info">
          Round <span className="pin-badge">{round}</span>
        </div>
        {myTeam && (
          <div className={`bc-team-badge ${myTeam}`}>
            {myTeam.toUpperCase()}
            {isPilot ? ' — YOU ARE THE PILOT 🚗' : ` — Pilot: ${pilotName}`}
          </div>
        )}
      </div>

      <div className="bc-main">
        {/* The target sentence is hidden during play. We only show it in results. */}
        {phase === 'round-results' && (
          <div className="bc-sentence-target small">
            <span className="label">Correct sentence</span>
            <span className="text">{game?.targetSentence}</span>
          </div>
        )}

        {/* Field */}
        <div
          className="bc-field"
          onClick={handleFieldClick}
          style={{ cursor: isPilot ? 'crosshair' : 'default' }}
        >
          {remaining.map((word) => {
            const pos = positions[word];
            if (!pos) return null;
            return (
              <button
                key={word}
                className="bc-word"
                style={{
                  left: `${pos.x * 100}%`,
                  top: `${pos.y * 100}%`,
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  handleWordClick(word);
                }}
              >
                {word}
              </button>
            );
          })}

          <div
            className={`bc-car ${myTeam}`}
            style={{
              left: `${carPos.x * 100}%`,
              top: `${carPos.y * 100}%`,
            }}
          >
            🚗
          </div>

          {teamData?.carrying && (
            <div
              className="bc-carrying"
              style={{
                left: `${carPos.x * 100}%`,
                top: `${carPos.y * 100}%`,
              }}
            >
              {teamData.carrying}
            </div>
          )}
        </div>

        {/* Placed words */}
        <div className="bc-placed">
          <div className="label">Your sentence so far</div>
          <div className="bc-placed-words">
            {placed.map((w, i) => (
              <span key={i} className="bc-placed-word">
                {w}
              </span>
            ))}
            {teamData?.carrying && (
              <span className="bc-placed-word carrying">
                {teamData.carrying} (carrying)
              </span>
            )}
          </div>
        </div>

        {/* Pilot controls */}
        {isPilot && phase === 'playing' && (
          <div className="bc-pilot-controls">
            <div className="bc-pilot-hint">
              {teamData?.carrying
                ? '🎯 Press SPACE or the button to place your word.'
                : '🚗 Move to a word to pick it up automatically.'}
            </div>
            {teamData?.carrying && (
              <button className="bc-btn success" onClick={handlePlaceButton}>
                Place word
              </button>
            )}
          </div>
        )}
        {!isPilot && phase === 'playing' && (
          <div className="bc-voter-hint">
            📣 Click a word to vote for your pilot to pick it up next.
          </div>
        )}

        {phase === 'round-results' && (
          <div className="bc-round-result">
            Round {round} finished! Get ready for the next one.
          </div>
        )}
      </div>
    </div>
  );
};

// -------- Instructions modal (read-only for players) --------
const BattleCityInstructions = ({ visible }) => {
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
        <div className="bc-modal-waiting">
          ⏳ Waiting for the teacher to start...
        </div>
      </div>
    </div>
  );
};

export default PlayerBattleCity;