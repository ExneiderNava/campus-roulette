import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { joinRoom } from '../firebase/rooms';

const JoinRedirect = () => {
  const { pin } = useParams();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleJoin = async () => {
    if (!name.trim()) return setError('Please enter your name');
    setLoading(true);
    try {
      await joinRoom(pin, name.trim());
      navigate(`/play/${pin}`);
    } catch (e) {
      setError(e.message);
      setLoading(false);
    }
  };

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', gap: 15,
      alignItems: 'center', justifyContent: 'center',
      minHeight: '100vh', padding: 20
    }}>
      <h1 style={{ color: '#ffc107' }}>Join Room {pin}</h1>
      {error && <div style={{ color: '#ff8a8a' }}>{error}</div>}
      <input
        type="text"
        placeholder="Your name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        maxLength={20}
        style={{
          padding: 12, borderRadius: 10, border: '1px solid #555',
          background: 'rgba(0,0,0,0.3)', color: 'white', fontSize: '1rem',
          width: '100%', maxWidth: 300, textAlign: 'center'
        }}
      />
      <button
        onClick={handleJoin}
        disabled={loading}
        style={{
          padding: '12px 40px', borderRadius: 10, border: 'none',
          background: 'linear-gradient(135deg, #007bff, #6a0dad)',
          color: 'white', fontWeight: 'bold', cursor: 'pointer'
        }}
      >
        Join
      </button>
    </div>
  );
};

export default JoinRedirect;