import React, { useState, useEffect, useRef } from 'react';
import './RouletteWheel.css';

const RouletteWheel = ({ items, onSpinEnd }) => {
    const [isSpinning, setIsSpinning] = useState(false);
    const [ballAngle, setBallAngle] = useState(0);
    const [ballRadius, setBallRadius] = useState(0); // 0 = centro, 180 = borde exterior
    const [winner, setWinner] = useState(null);
    const [spinDuration, setSpinDuration] = useState(5);

    const animationRef = useRef(null);
    const startTimeRef = useRef(null);
    const startAngleRef = useRef(0);
    const targetAngleRef = useRef(0);
    const startRadiusRef = useRef(0);
    const targetRadiusRef = useRef(180);

    // Colores para los segmentos
    const colors = ['#d32f2f', '#1a1a1a', '#2e7d32', '#007bff', '#6a0dad', '#ffc107'];

    // Calcular el ángulo por segmento
    const anglePerItem = items.length > 0 ? 360 / items.length : 0;

    // Resetear si cambian los items
    useEffect(() => {
        setBallAngle(0);
        setBallRadius(0);
        setWinner(null);
        setIsSpinning(false);
    }, [items]);

    // Función de animación con requestAnimationFrame para física realista
    const animate = (timestamp) => {
        if (!startTimeRef.current) startTimeRef.current = timestamp;
        const progress = Math.min((timestamp - startTimeRef.current) / (spinDuration * 1000), 1);

        // Función de easing para desaceleración (simula fricción y gravedad)
        // Cubic-bezier(0.2, 0.8, 0.3, 1) es similar a una desaceleración física
        const easeOutQuart = 1 - Math.pow(1 - progress, 4);

        // Interpolar ángulo
        const currentAngle = startAngleRef.current + (targetAngleRef.current - startAngleRef.current) * easeOutQuart;
        setBallAngle(currentAngle);

        // Interpolar radio (la bola cae desde el centro hacia afuera)
        // Usamos una función diferente para la caída para simular gravedad
        // La bola cae rápidamente al principio y luego se asienta
        const radiusProgress = progress < 0.7
            ? Math.pow(progress / 0.7, 0.5) // Caída rápida inicial
            : 1; // Se mantiene en el borde
        const currentRadius = startRadiusRef.current + (targetRadiusRef.current - startRadiusRef.current) * radiusProgress;
        setBallRadius(currentRadius);

        if (progress < 1) {
            animationRef.current = requestAnimationFrame(animate);
        } else {
            // Animación terminada
            setIsSpinning(false);
            setWinner(items[Math.floor(targetAngleRef.current / anglePerItem) % items.length]);
            if (onSpinEnd) onSpinEnd(items[Math.floor(targetAngleRef.current / anglePerItem) % items.length]);
        }
    };

    // Función para girar
    const spin = () => {
        if (isSpinning || items.length === 0) return;

        setIsSpinning(true);
        setWinner(null);

        // Resetear referencias de animación
        startTimeRef.current = null;

        // Configurar valores iniciales
        startAngleRef.current = ballAngle;
        startRadiusRef.current = 0; // Empezar en el centro

        // Generar un ángulo final aleatorio (múltiples vueltas + ángulo aleatorio)
        const extraSpins = 360 * 8; // 8 vueltas completas para emoción
        const randomAngle = Math.random() * 360;
        targetAngleRef.current = ballAngle + extraSpins + randomAngle;

        // La bola siempre termina en el borde exterior
        targetRadiusRef.current = 180;

        // Iniciar animación
        animationRef.current = requestAnimationFrame(animate);
    };

    // Limpiar animación al desmontar
    useEffect(() => {
        return () => {
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
        };
    }, []);

    if (items.length === 0) {
        return <div className="roulette-empty">Add items to start</div>;
    }

    // Generar los paths del SVG
    const radius = 200;
    const center = 250;

    const createSegmentPath = (startAngle, endAngle) => {
        const startRad = (startAngle - 90) * (Math.PI / 180);
        const endRad = (endAngle - 90) * (Math.PI / 180);

        const x1 = center + radius * Math.cos(startRad);
        const y1 = center + radius * Math.sin(startRad);
        const x2 = center + radius * Math.cos(endRad);
        const y2 = center + radius * Math.sin(endRad);

        const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";

        return `M ${center} ${center} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;
    };

    // Calcular la posición de la bola basada en el ángulo y el radio
    const ballX = center + ballRadius * Math.cos((ballAngle - 90) * (Math.PI / 180));
    const ballY = center + ballRadius * Math.sin((ballAngle - 90) * (Math.PI / 180));

    return (
        <div className="roulette-container">
            {/* Puntero (Flecha) - Fijo en la parte superior */}
            <div className="pointer"></div>

            {/* Rueda - AHORA ES ESTÁTICA */}
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

                    {/* Borde exterior */}
                    <circle cx="250" cy="250" r="240" fill="url(#wheelGradient)" filter="url(#shadow)" />
                    <circle cx="250" cy="250" r="230" fill="#222" stroke="gold" strokeWidth="4" />

                    {/* Segmentos */}
                    {items.map((item, index) => {
                        const startAngle = index * anglePerItem;
                        const endAngle = (index + 1) * anglePerItem;
                        const path = createSegmentPath(startAngle, endAngle);
                        const color = colors[index % colors.length];

                        // Rotar el texto para que quede radial
                        const textAngle = startAngle + anglePerItem / 2;
                        const textRad = (textAngle - 90) * (Math.PI / 180);
                        const textX = center + (radius * 0.7) * Math.cos(textRad);
                        const textY = center + (radius * 0.7) * Math.sin(textRad);

                        return (
                            <g key={index}>
                                <path d={path} fill={color} stroke="gold" strokeWidth="2" />
                                <text
                                    x={textX}
                                    y={textY}
                                    fill="white"
                                    fontSize="16"
                                    fontWeight="bold"
                                    textAnchor="middle"
                                    dominantBaseline="middle"
                                    transform={`rotate(${textAngle}, ${textX}, ${textY})`}
                                    style={{ textShadow: '1px 1px 2px black' }}
                                >
                                    {item.length > 8 ? item.substring(0, 8) + '...' : item}
                                </text>
                            </g>
                        );
                    })}

                    {/* Centro */}
                    <circle cx="250" cy="250" r="40" fill="gold" stroke="#333" strokeWidth="4" />
                    <circle cx="250" cy="250" r="20" fill="#333" />
                </svg>
            </div>

            {/* Bola - Animada con física */}
            {isSpinning || ballRadius > 0 ? (
                <div
                    className="ball"
                    style={{
                        left: `${(ballX / 500) * 100}%`,
                        top: `${(ballY / 500) * 100}%`,
                        transform: 'translate(-50%, -50%)',
                        transition: 'none' // Controlado por requestAnimationFrame
                    }}
                >
                    <div className="ball-inner"></div>
                </div>
            ) : null}

            {/* Botón de Girar */}
            <button
                className={`spin-button ${isSpinning ? 'disabled' : ''}`}
                onClick={spin}
                disabled={isSpinning}
            >
                {isSpinning ? 'Spinning...' : 'SPIN'}
            </button>

            {/* Ganador */}
            {winner && !isSpinning && (
                <div className="winner-display">
                    <span> Winner: {winner}</span>
                </div>
            )}
        </div>
    );
};

export default RouletteWheel;