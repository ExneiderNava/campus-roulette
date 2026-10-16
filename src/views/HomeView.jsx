import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createRoom, joinRoom, roomExists } from '../firebase/rooms';
import { Users, Plus, LogIn } from 'lucide-react';
import './HomeView.css';

const HomeView = () => {
  const navigate = useNavigate();
  const [hostName, setHostName] = useState('');
  const [pin, setPin] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCreateRoom = async () => {
    if (!hostName.trim()) return setError('Please enter your name');
    setLoading(true);
    setError('');
    try {
      const { pin } = await createRoom(hostName.trim());
      navigate(`/host/${pin}`);
    } catch (e) {
      setError(e.message);
      setLoading(false);
    }
  };

  const handleJoinRoom = async () => {
    if (!pin.trim() || !playerName.trim()) {
      return setError('Please enter both PIN and name');
    }
    setLoading(true);
    setError('');
    try {
      const cleanPin = pin.trim().toUpperCase();
      const exists = await roomExists(cleanPin);
      if (!exists) throw new Error('Room not found');
      await joinRoom(cleanPin, playerName.trim());
      navigate(`/play/${cleanPin}`);
    } catch (e) {
      setError(e.message);
      setLoading(false);
    }
  };

  return (
    <div className="home-container">
      <div className="home-header">
        <Users size={64} color="#ffc107" />
        <h1>Campuslands Arcade</h1>
        <p>Multiplayer English Games</p>
      </div>

      {error && <div className="home-error">{error}</div>}

      <div className="home-cards">
        <div className="home-card">
          <h2>🎓 I'm a Teacher</h2>
          <p>Create a room and project the game</p>
          <input
            type="text"
            placeholder="Your name"
            value={hostName}
            onChange={(e) => setHostName(e.target.value)}
            maxLength={20}
          />
          <button onClick={handleCreateRoom} disabled={loading}>
            <Plus size={18} /> Create Room
          </button>
        </div>

        <div className="home-card">
          <h2>🎮 I'm a Student</h2>
          <p>Join with the PIN your teacher gave you</p>
          <input
            type="text"
            placeholder="Name"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            maxLength={20}
          />
          <input
            type="text"
            placeholder="PIN"
            value={pin}
            onChange={(e) => setPin(e.target.value.toUpperCase())}
            maxLength={6}
            className="pin-input"
          />
          <button onClick={handleJoinRoom} disabled={loading}>
            <LogIn size={18} /> Join
          </button>
        </div>
      </div>
    </div>
  );
};

export default HomeView;