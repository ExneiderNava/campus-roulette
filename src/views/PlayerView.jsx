import { useParams } from 'react-router-dom';
import LobbyView from './LobbyView';

const PlayerView = () => {
  const { pin } = useParams();
  return <LobbyView pin={pin} isHost={false} />;
};

export default PlayerView;