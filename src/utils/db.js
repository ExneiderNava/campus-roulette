import localforage from 'localforage';

const store = localforage.createInstance({
    name: "CampusRouletteDB",
    storeName: "roulette_items"
});

export const saveItems = async (items) => {
    try {
        await store.setItem('currentItems', items);
    } catch (err) {
        console.error("Error guardando en IndexedDB:", err);
    }
};

export const loadItems = async () => {
    try {
        const items = await store.getItem('currentItems');
        return items || [];
    } catch (err) {
        console.error("Error cargando de IndexedDB:", err);
        return [];
    }
};