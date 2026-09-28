import { useState, useEffect } from 'react';
import { saveItems, loadItems } from '../utils/db';

export const useRouletteData = () => {
    const [items, setItems] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            const savedItems = await loadItems();
            if (savedItems.length > 0) {
                setItems(savedItems);
            } else {
                const defaultItems = Array.from({ length: 10 }, (_, i) => `Student ${i + 1}`);
                setItems(defaultItems);
                await saveItems(defaultItems);
            }
            setIsLoading(false);
        };
        fetchData();
    }, []);

    const updateItems = async (newItems) => {
        setItems(newItems);
        await saveItems(newItems);
    };

    return { items, updateItems, isLoading };
};