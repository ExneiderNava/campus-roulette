import { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { useRoom } from '../firebase/useRoom';
import { useNavigate } from 'react-router-dom';
import { Users, Play, Copy, Check } from 'lucide-react';
import './LobbyView.css';

const LobbyView = ({ pin, isHost }) => {
  const navigate = useNavigate();
  const { room, loading } = useRoom(pin);
  const [copied, setCopied] = useState(false);

  // URL that students scan → goes straight to join
  const joinUrl = `${window.location.origin}${window.location.pathname}#/join/${pin}`;

  // -------- Auto-redirect players when host starts a game --------
  useEffect(() => {
    if (isHost) return;
    if (!room) return;
    if (room.status !== 'playing') return;

    if (room.gameType === 'negative-roulette') {
      navigate(`/play/${pin}/negative-roulette`);
    } else if (room.gameType === 'battle-city') {
      navigate(`/play/${pin}/battle-city`);
    } else if (room.gameType === 'impostor') {
      navigate(`/play/${pin}/impostor`);
    } else if (room.gameType === 'grammar-sniper') {
      navigate(`/play/${pin}/grammar-sniper`);
    } else if (room.gameType === 'bug-hunter') {
      navigate(`/play/${pin}/bug-hunter`);
    } else if (room.gameType === 'blank-race') {
      navigate(`/play/${pin}/blank-race`);
    }
  }, [room, isHost, pin, navigate]);

  if (loading) return <div className="lobby-loading">Loading room...</div>;
  if (!room) return <div className="lobby-loading">Room not found</div>;

  const players = Object.entries(room.players || {}).map(([uid, p]) => ({
    uid,
    ...p,
  }));

  const copyPin = () => {
    navigator.clipboard.writeText(pin);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const startGame = () => {
    navigate(`/host/${pin}/select-game`);
  };

  return (
    <div className="lobby-container">
      <div className="lobby-header">
        <div className="lobby-pin">
          <span className="label">Room PIN</span>
          <span className="pin">{pin}</span>
          <button onClick={copyPin} className="copy-btn">
            {copied ? <Check size={18} /> : <Copy size={18} />}
          </button>
        </div>

        <div className="lobby-qr">
          <QRCodeSVG value={joinUrl} size={160} bgColor="#ffffff" fgColor="#0a192f" />
          <p>Scan to join</p>
        </div>
      </div>

      <div className="lobby-players">
        <h2>
          <Users size={20} /> Players ({players.length})
        </h2>
        <div className="players-grid">
          {players.map((p) => (
            <div key={p.uid} className="player-chip">
              {p.isHost && '👑 '}
              {p.name}
            </div>
          ))}
        </div>
      </div>

      {isHost && (
        <button className="btn-start" onClick={startGame} disabled={players.length < 1}>
          <Play size={20} /> Start Game
        </button>
      )}

      {!isHost && (
        <div className="lobby-waiting">
          ⏳ Waiting for the teacher...
        </div>
      )}
    </div>
  );
};

export default LobbyView;