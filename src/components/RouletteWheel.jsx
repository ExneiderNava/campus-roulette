import { useState, useEffect, useRef } from 'react';
import './RouletteWheel.css';

const RouletteWheel = ({ items, onSpinEnd, forcedWinner, autoSpin = false }) => {
  const [isSpinning, setIsSpinning] = useState(false);
  const [ballAngle, setBallAngle] = useState(0);
  const [ballRadius, setBallRadius] = useState(0);
  const [winner, setWinner] = useState(null);

  const animationRef = useRef(null);
  const startTimeRef = useRef(null);
  const startAngleRef = useRef(0);
  const targetAngleRef = useRef(0);
  const spinDuration = 5;

  const colors = ['#d32f2f', '#1a1a1a', '#2e7d32', '#007bff', '#6a0dad', '#ffc107'];
  const anglePerItem = items.length > 0 ? 360 / items.length : 0;

  // -------- Auto-spin effect --------
  useEffect(() => {
    if (!autoSpin) return;
    if (!forcedWinner) return;
    if (items.length === 0) return;

    const targetIndex = Math.max(0, items.indexOf(forcedWinner));
    const segmentCenter = targetIndex * anglePerItem + anglePerItem / 2;
    const desiredAngleMod = ((-segmentCenter) % 360 + 360) % 360;
    const extraSpins = 360 * 8;

    const startAngle = 0;
    const targetAngle = startAngle + extraSpins + desiredAngleMod;

    startAngleRef.current = startAngle;
    targetAngleRef.current = targetAngle;
    startTimeRef.current = null;

    let cancelled = false;
    let kicked = false;

    // Local animation function — all setState calls happen HERE (async)
    const step = (timestamp) => {
      if (cancelled) return;

      // First frame: flip state now that we're inside the async callback
      if (!kicked) {
        kicked = true;
        setIsSpinning(true);
        setWinner(null);
      }

      if (!startTimeRef.current) startTimeRef.current = timestamp;
      const progress = Math.min(
        (timestamp - startTimeRef.current) / (spinDuration * 1000),
        1
      );
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);

      setBallAngle(startAngle + (targetAngle - startAngle) * easeOutQuart);

      const radiusProgress = progress < 0.7 ? Math.pow(progress / 0.7, 0.5) : 1;
      setBallRadius(180 * radiusProgress);

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(step);
      } else {
        setIsSpinning(false);
        const finalIndex = Math.floor(targetAngle / anglePerItem) % items.length;
        const finalWinner = items[finalIndex];
        setWinner(finalWinner);
        if (onSpinEnd) onSpinEnd(finalWinner);
      }
    };

    animationRef.current = requestAnimationFrame(step);

    return () => {
      cancelled = true;
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
    // Only re-run when autoSpin or forcedWinner changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoSpin, forcedWinner]);

  // -------- Manual spin (when autoSpin is false) --------
  const handleManualSpin = () => {
    if (isSpinning || items.length === 0) return;

    const randomIndex = Math.floor(Math.random() * items.length);
    const segmentCenter = randomIndex * anglePerItem + anglePerItem / 2;
    const desiredAngleMod = ((-segmentCenter) % 360 + 360) % 360;
    const extraSpins = 360 * 8;

    const startAngle = 0;
    const targetAngle = startAngle + extraSpins + desiredAngleMod;

    startAngleRef.current = startAngle;
    targetAngleRef.current = targetAngle;
    startTimeRef.current = null;

    setIsSpinning(true);
    setWinner(null);

    const step = (timestamp) => {
      if (!startTimeRef.current) startTimeRef.current = timestamp;
      const progress = Math.min(
        (timestamp - startTimeRef.current) / (spinDuration * 1000),
        1
      );
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);

      setBallAngle(startAngle + (targetAngle - startAngle) * easeOutQuart);
      const radiusProgress = progress < 0.7 ? Math.pow(progress / 0.7, 0.5) : 1;
      setBallRadius(180 * radiusProgress);

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(step);
      } else {
        setIsSpinning(false);
        const finalIndex = Math.floor(targetAngle / anglePerItem) % items.length;
        const finalWinner = items[finalIndex];
        setWinner(finalWinner);
        if (onSpinEnd) onSpinEnd(finalWinner);
      }
    };
    animationRef.current = requestAnimationFrame(step);
  };

  // -------- Cleanup on unmount --------
  useEffect(() => {
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, []);

  if (items.length === 0) {
    return <div className="roulette-empty">Add items to start</div>;
  }

  const radius = 200;
  const center = 250;

  const createSegmentPath = (startAngle, endAngle) => {
    const startRad = (startAngle - 90) * (Math.PI / 180);
    const endRad = (endAngle - 90) * (Math.PI / 180);
    const x1 = center + radius * Math.cos(startRad);
    const y1 = center + radius * Math.sin(startRad);
    const x2 = center + radius * Math.cos(endRad);
    const y2 = center + radius * Math.sin(endRad);
    const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';
    return `M ${center} ${center} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;
  };

  const ballX = center + ballRadius * Math.cos((ballAngle - 90) * (Math.PI / 180));
  const ballY = center + ballRadius * Math.sin((ballAngle - 90) * (Math.PI / 180));

  return (
    <div className="roulette-container">
      <div className="pointer"></div>
      <div className="wheel-wrapper">
        <svg viewBox="0 0 500 500" className="wheel-svg">
          <defs>
            <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="0" stdDeviation="5" floodColor="#000" floodOpacity="0.5" />
            </filter>
            <radialGradient id="wheelGradient" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#333" />
              <stop offset="100%" stopColor="#111" />
            </radialGradient>
          </defs>

          <circle cx="250" cy="250" r="240" fill="url(#wheelGradient)" filter="url(#shadow)" />
          <circle cx="250" cy="250" r="230" fill="#222" stroke="gold" strokeWidth="4" />

          {items.map((item, index) => {
            const startAngle = index * anglePerItem;
            const endAngle = (index + 1) * anglePerItem;
            const path = createSegmentPath(startAngle, endAngle);
            const color = colors[index % colors.length];

            const textAngle = startAngle + anglePerItem / 2;
            const textRad = (textAngle - 90) * (Math.PI / 180);
            const textX = center + radius * 0.7 * Math.cos(textRad);
            const textY = center + radius * 0.7 * Math.sin(textRad);

            return (
              <g key={index}>
                <path d={path} fill={color} stroke="gold" strokeWidth="2" />
                <text
                  x={textX}
                  y={textY}
                  fill="white"
                  fontSize="14"
                  fontWeight="bold"
                  textAnchor="middle"
                  dominantBaseline="middle"
                  transform={`rotate(${textAngle}, ${textX}, ${textY})`}
                  style={{ textShadow: '1px 1px 2px black' }}
                >
                  {item.length > 10 ? item.substring(0, 10) + '…' : item}
                </text>
              </g>
            );
          })}

          <circle cx="250" cy="250" r="40" fill="gold" stroke="#333" strokeWidth="4" />
          <circle cx="250" cy="250" r="20" fill="#333" />
        </svg>
      </div>

      {isSpinning || ballRadius > 0 ? (
        <div
          className="ball"
          style={{
            left: `${(ballX / 500) * 100}%`,
            top: `${(ballY / 500) * 100}%`,
            transform: 'translate(-50%, -50%)',
            transition: 'none',
          }}
        >
          <div className="ball-inner"></div>
        </div>
      ) : null}

      {!autoSpin && (
        <button
          className={`spin-button ${isSpinning ? 'disabled' : ''}`}
          onClick={handleManualSpin}
          disabled={isSpinning}
        >
          {isSpinning ? 'Spinning...' : 'SPIN'}
        </button>
      )}

      {winner && !isSpinning && !autoSpin && (
        <div className="winner-display">
          <span>Winner: {winner}</span>
        </div>
      )}
    </div>
  );
};

export default RouletteWheel;