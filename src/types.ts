// src/types.ts

export interface Restaurant {
    id: string;
    name: string;
    image_url?: string;
    url?: string;
    rating?: number;
    price?: string;
    location?: {
      address1?: string;
      city?: string;
      state?: string;
      zip_code?: string;
    };
    categories?: {
      alias: string;
      title: string;
    }[];
    hours?: {
      open: {
        day: number;
        start: string;
        end: string;
        is_overnight: boolean;
      }[];
      is_open_now: boolean;
    }[];
}
  