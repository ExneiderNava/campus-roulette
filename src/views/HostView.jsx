import { useParams } from 'react-router-dom';
import LobbyView from './LobbyView';

const HostView = () => {
  const { pin } = useParams();
  return <LobbyView pin={pin} isHost={true} />;
};

export default HostView;