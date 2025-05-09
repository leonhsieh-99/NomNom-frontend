import type { Restaurant } from "../types";

export async function fetchRandomRestaurant(queryString = ''): Promise<Restaurant> {
    const response = await fetch(`/api/random_restaurant?${queryString}`);
    const data = await response.json();

    if (!response.ok || data.error) {
        throw new Error(data.error || 'API error');
    }
    return data
}