import { StrictMode } from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import HomeView from './views/HomeView.jsx';
import HostView from './views/HostView.jsx';
import PlayerView from './views/PlayerView.jsx';
import JoinRedirect from './views/JoinRedirect.jsx';
import GameSelectView from './views/GameSelectView.jsx';
import HostNegativeRoulette from './views/games/HostNegativeRoulette.jsx';
import PlayerNegativeRoulette from './views/games/PlayerNegativeRoulette.jsx';
import HostBattleCity from './views/games/HostBattleCity.jsx';
import PlayerBattleCity from './views/games/PlayerBattleCity.jsx';
import HostImpostor from './views/games/HostImpostor.jsx';
import PlayerImpostor from './views/games/PlayerImpostor.jsx';
import HostGrammarSniper from './views/games/HostGrammarSniper.jsx';
import PlayerGrammarSniper from './views/games/PlayerGrammarSniper.jsx';
import HostBugHunter from './views/games/HostBugHunter.jsx';
import PlayerBugHunter from './views/games/PlayerBugHunter.jsx';
import HostBlankRace from './views/games/HostBlankRace.jsx';
import PlayerBlankRace from './views/games/PlayerBlankRace.jsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <StrictMode>
    <HashRouter>
      <Routes>
        <Route path="/" element={<HomeView />} />
        <Route path="/host/:pin" element={<HostView />} />
        <Route path="/host/:pin/select-game" element={<GameSelectView />} />
        <Route path="/host/:pin/play/negative-roulette" element={<HostNegativeRoulette />} />
        <Route path="/host/:pin/play/battle-city" element={<HostBattleCity />} />
        <Route path="/play/:pin" element={<PlayerView />} />
        <Route path="/play/:pin/negative-roulette" element={<PlayerNegativeRoulette />} />
        <Route path="/play/:pin/battle-city" element={<PlayerBattleCity />} />
        <Route path="/host/:pin/play/impostor" element={<HostImpostor />} />
        <Route path="/play/:pin/impostor" element={<PlayerImpostor />} />
        <Route path="/join/:pin" element={<JoinRedirect />} />
        <Route path="*" element={<Navigate to="/" />} />
        <Route path="/host/:pin/play/grammar-sniper" element={<HostGrammarSniper />} />
        <Route path="/play/:pin/grammar-sniper" element={<PlayerGrammarSniper />} />
        <Route path="/host/:pin/play/bug-hunter" element={<HostBugHunter />} />
        <Route path="/play/:pin/bug-hunter" element={<PlayerBugHunter />} />
        <Route path="/host/:pin/play/blank-race" element={<HostBlankRace />} />
        <Route path="/play/:pin/blank-race" element={<PlayerBlankRace />} />
      </Routes>
    </HashRouter>
  </StrictMode>,
);