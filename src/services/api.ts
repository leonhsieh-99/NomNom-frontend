import type { Restaurant } from "../types";

const API_BASE = import.meta.env.VITE_BACKEND_URL;

export async function fetchRandomRestaurant(queryString = ''): Promise<Restaurant> {
    const response = await fetch(`${API_BASE}/api/random_restaurant?${queryString}`);
    const data = await response.json();

    if (!response.ok || data.error) {
        throw new Error(data.error || 'API error');
    }
    return data
}