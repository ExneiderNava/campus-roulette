import { useEffect, useState } from 'react';
import { subscribeToRoom } from './rooms';

export const useRoom = (pin) => {
  const [room, setRoom] = useState(null);
  const [loading, setLoading] = useState(Boolean(pin));

  useEffect(() => {
    // Si no hay PIN, salida temprana sin tocar estado
    if (!pin) return;

    const unsubscribe = subscribeToRoom(pin, (data) => {
      // Estas actualizaciones son ASÍNCRONAS (Firebase responde después)
      setRoom(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [pin]);

  return { room, loading };
};