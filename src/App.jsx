import React from 'react';
import { useRouletteData } from './hooks/useRouletteData';
import RouletteWheel from './components/RouletteWheel';
import ControlPanel from './components/ControlPanel';
import './App.css';
import logo from './assets/logo.png'; // Asegúrate de tener el logo aquí

function App() {
  const { items, updateItems, isLoading } = useRouletteData();

  const handleSpinEnd = (winner) => {
    console.log("Winner:", winner);
    // Aquí podrías agregar efectos de sonido o confeti
  };

  if (isLoading) {
    return <div className="loading">Loading Campuslands Roulette...</div>;
  }

  return (
    <div className="app-container">
      <header className="app-header">
        <img src={logo} alt="Campuslands Logo" className="logo" />
        <h1>English Class Roulette</h1>
        <p>Spin the wheel to pick a student or number!</p>
      </header>

      <main className="main-content">
        <ControlPanel onUpdateItems={updateItems} currentItems={items} />
        <RouletteWheel items={items} onSpinEnd={handleSpinEnd} />
      </main>

    </div>
  );
}

export default App;