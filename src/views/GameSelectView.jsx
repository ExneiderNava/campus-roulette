import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Gamepad2 } from 'lucide-react';
import './GameSelectView.css';

const GAMES = [
  {
    id: 'negative-roulette',
    emoji: '🎡',
    title: 'Negative Roulette',
    description: 'Spin the wheel and turn the phrase into a negative',
    accent: '#ffc107',
  },
  {
    id: 'battle-city',
    emoji: '🏎️',
    title: 'Battle City',
    description: 'Arrange words with your car in teams',
    accent: '#007bff',
  },
  {
    id: 'impostor',
    emoji: '🕵️',
    title: 'Impostor',
    description: 'Find out who has the different word',
    accent: '#d32f2f',
  },
  {
    id: 'grammar-sniper',
    emoji: '🎯',
    title: 'Grammar Sniper',
    description: 'Shoot the correct structure before anyone else',
    accent: '#2e7d32',
  },
  {
    id: 'bug-hunter',
    emoji: '🐛',
    title: 'Bug Hunter',
    description: 'Find and fix the grammar mistake',
    accent: '#6a0dad',
  },
  {
    id: 'blank-race',
    emoji: '🏁',
    title: 'Blank Race',
    description: 'Complete the sentence before everyone else',
    accent: '#ff6b35',
  },
];

const GameSelectView = () => {
  const { pin } = useParams();
  const navigate = useNavigate();

  const handleSelectGame = (gameId) => {
  if (gameId === 'negative-roulette') {
    navigate(`/host/${pin}/play/negative-roulette`);
  } else if (gameId === 'battle-city') {
    navigate(`/host/${pin}/play/battle-city`);
  } else if (gameId === 'impostor') {
    navigate(`/host/${pin}/play/impostor`);
  } else if (gameId === 'grammar-sniper') {
    navigate(`/host/${pin}/play/grammar-sniper`);
  } else if (gameId === 'bug-hunter') {
    navigate(`/host/${pin}/play/bug-hunter`);
  } else if (gameId === 'blank-race') {
    navigate(`/host/${pin}/play/blank-race`);
  }
  else {
    alert(`The game "${gameId}" is coming soon 🚧`);
  }
};

  return (
    <div className="gameselect-container">
      <header className="gameselect-header">
        <button className="btn-back" onClick={() => navigate(`/host/${pin}`)}>
          <ArrowLeft size={20} /> Back to Lobby
        </button>
        <div className="gameselect-title">
          <Gamepad2 size={48} color="#ffc107" />
          <h1>Choose a Game</h1>
          <p>Room: <span className="pin-badge">{pin}</span></p>
        </div>
      </header>

      <div className="games-grid">
        {GAMES.map((game) => (
          <button
            key={game.id}
            className="game-card"
            onClick={() => handleSelectGame(game.id)}
            style={{ '--accent': game.accent }}
          >
            <span className="game-emoji">{game.emoji}</span>
            <h2>{game.title}</h2>
            <p>{game.description}</p>
          </button>
        ))}
      </div>
    </div>
  );
};

export default GameSelectView;