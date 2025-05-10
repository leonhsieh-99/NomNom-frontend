import { useState, useEffect, useRef } from 'react'
import { fetchRandomRestaurant } from './services/api'
import type { Restaurant } from './types'
import { Loader } from '@googlemaps/js-api-loader'
import './index.css'

// Add type definitions for Google Maps
declare global {
	interface Window {
		google: typeof google;
	}
}

function App() {
	const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
	const [location, setLocation] = useState("");
	const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(null);
	const [cuisine, setCuisine] = useState('');
	const [selectedPrices, setSelectedPrices] = useState<number[]>([]); // 1, 2 -> $, $$
	const [minRating, setMinRating] = useState<number>(0);
	const [openNow, setOpenNow] = useState<boolean>(false);
	const [shownRestaurants, setShownRestaurants] = useState<Set<string>>(new Set());
	const [locationError, setLocationError] = useState<boolean>(false);
	const [loading, setLoading] = useState(false);
	const locationInputRef = useRef<HTMLInputElement>(null);

	// Reset shown restaurants when filters change
	useEffect(() => {
		setShownRestaurants(new Set());
		setRestaurant(null);
	}, [location, coords, cuisine, selectedPrices, minRating, openNow]);

	useEffect(() => {
		const loader = new Loader({
			apiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY, // Replace with your actual API key
			version: 'weekly',
			libraries: ['places']
		});

		loader.load().then((google) => {
			if (locationInputRef.current) {
				const autocomplete = new google.maps.places.Autocomplete(locationInputRef.current, {
					types: ['(cities)'],
					fields: ['formatted_address', 'geometry']
				});

				autocomplete.addListener('place_changed', () => {
					const place = autocomplete.getPlace();
					if (place.geometry?.location) {
						setCoords({
							lat: place.geometry.location.lat(),
							lon: place.geometry.location.lng()
						});
						setLocation(place.formatted_address || '');
					}
				});
			}
		}).catch((error) => {
			console.error('Error loading Google Maps:', error);
		});
	}, []);

	const handleSubmit = async (e:React.FormEvent) => {
		e.preventDefault();
		setLoading(true);

		const query = new URLSearchParams();
		if (coords) {
			query.append('latitude', coords.lat.toString());
			query.append('longitude', coords.lon.toString());
		}
		else setLocationError(true);
		if (cuisine) query.append('term', cuisine);
		if (selectedPrices.length > 0) query.append('price', selectedPrices.join(', '));
		query.append('rating', minRating.toString());
		if (openNow) query.append('open_now', "true");

		try {
			const result = await fetchRandomRestaurant(query.toString());
			setLoading(false);
			
			// If we've shown all restaurants, reset the shown list
			if (shownRestaurants.size >= 50) { // Assuming max 50 results from Yelp
				setShownRestaurants(new Set());
			}

			// If this restaurant has been shown before, try again
			if (result && shownRestaurants.has(result.id)) {
				handleSubmit(e);
				return;
			}

			// Add the restaurant to shown list and display it
			if (result) {
				setShownRestaurants(prev => new Set([...prev, result.id]));
				setRestaurant(result);
			}
		} catch (err) {
			console.error("Error fetching restaurants: ", err);
			setRestaurant(null);
		}
	}

	const getCurrentLocation = () => {
		if (!navigator.geolocation) {
			alert("Geolocation is not supported by your browser");
			return;
		}

		navigator.geolocation.getCurrentPosition(
			(pos) => {
				setCoords({ lat: pos.coords.latitude, lon: pos.coords.longitude});
				setLocation("Current Location")
				setLocationError(false);
			},
			(err) => {
				console.error("Geolocation error: ", err);
				if (err.PERMISSION_DENIED)
					alert("Please enable location services on your device")
				else 
					alert("Couldn't get location")
			}
		)
	}

	const togglePrice = (value: number) => {
		setSelectedPrices((prev) =>
			prev.includes(value)
				? prev.filter((p) => p !== value)
				: [...prev, value]
		);
	};

	const RestaurantCard = ({ restaurant }: {restaurant: Restaurant | null}) => {
		const formatTime = (time: string) => {
			// Convert 24-hour format to 12-hour format
			const hour = parseInt(time.substring(0, 2));
			const minute = time.substring(2);
			const period = hour >= 12 ? 'PM' : 'AM';
			const hour12 = hour % 12 || 12;
			return `${hour12}:${minute} ${period}`;
		};

		const getTodayHours = () => {
			if (!restaurant?.hours?.[0]?.open) return null;
			const today = new Date().getDay();
			return restaurant.hours[0].open.filter(h => h.day === today);
		};

		const todayHours = getTodayHours();

		return (
			<div className='p-4 bg-white rounded-lg shadow-md min-h-[400px] w-[500px] flex flex-col'>
				{restaurant ? (
					<>
						<h2 className='text-2xl font-semibold mb-2'>{restaurant.name}</h2>
						<div className="grid grid-cols-2 gap-x-4 gap-y-1 mb-3">
							<p className='text-gray-700'><span className="font-medium">Rating:</span> {restaurant.rating}</p>
							<p className='text-gray-700'><span className="font-medium">Price:</span> {restaurant.price}</p>
							<p className='text-gray-700 col-span-2'><span className="font-medium">Categories:</span> {restaurant.categories?.map(c => c.title).join(', ')}</p>
							<p className='text-gray-700 col-span-2'><span className="font-medium">Address:</span> {restaurant.location?.address1}, {restaurant.location?.city}</p>
							{todayHours && todayHours.length > 0 && (
								<div className='text-gray-700 col-span-2'>
									<span className="font-medium">Today's Hours:</span>
									<ul className="mt-1">
										{todayHours.map((hours, index) => (
											<li key={index}>
												{formatTime(hours.start)} - {formatTime(hours.end)}
												{hours.is_overnight && " (overnight)"}
											</li>
										))}
									</ul>
								</div>
							)}
						</div>
						<a 
							href={restaurant.url} 
							target="_blank" 
							rel="noopener noreferrer" 
							className='text-indigo-600 hover:text-indigo-800 underline mb-3'
						>
							View on Yelp
						</a>
						{restaurant.image_url && (
							<div className="mt-auto">
								<img
									src={restaurant.image_url}
									alt={restaurant.name}
									className='w-full h-48 rounded-lg object-cover'
								/>
							</div>
						)}
					</>
				) : (
					<div className='flex-1 flex items-center justify-center text-gray-400'>
						<p>Select your preferences and click "Find Restaurant" to get started</p>
					</div>
				)}
			</div>
		);
	};

	return (
		<div className="min-h-screen">
			<main className="max-w-[1200px] mx-auto px-4 py-8">
				<h1 className='text-4xl font-bold text-center mb-7 text-indigo-600'>Nom Nom</h1>
				<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
					<form onSubmit={handleSubmit} className='w-full max-w-[500px] mx-auto lg:mx-0'>
						<div className="flex gap-2">
							<div className='w-full mb-2'>
								<input
									ref={locationInputRef}
									className={`w-full h-10 flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500
															${locationError ? 'border-red-500 ring-2 ring-red-300' : ''}`}
									type="text"
									placeholder="Location"
									value={location}
									onChange={(e) => {
										setLocation(e.target.value);
										setCoords(null);
										setLocationError(false);
									}}
								/>
								<div className='h-5'>
									{locationError && (
										<p className='text-sm text-red-500'>Please enter valid location</p>
									)}
								</div>
						</div>
							<button
								type="button"
								onClick={getCurrentLocation}
								className="h-10 px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg transition-colors"
							>
								<span>📍</span>
							</button>
						</div>

						<div className='mb-7'>
							<input
								className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500'
								type="text"
								placeholder="Cuisine"
								value={cuisine}
								onChange={(e) => setCuisine(e.target.value)}
							/>
						</div>

						<div className="flex justify-center gap-4 mb-7">
							{[1, 2, 3, 4].map((val) => {
								const selected = selectedPrices.includes(val);
								return (
									<button
										key={val}
										type="button"
										onClick={() => togglePrice(val)}
										className={`px-4 py-2 border rounded-lg text-lg transition-colors
											${selected ? 'bg-indigo-500 text-white border-indigo-500' : 'bg-white text-gray-700 border-gray-300'}
											hover:bg-indigo-400 hover:text-white hover:border-indigo-400`}
									>
										{'$'.repeat(val)}
									</button>
								);
							})}
						</div>

						<div className='flex items-center justify-center gap-10 mb-7'>
							<div className='flex items-center gap-2'>
								<label className='text-gray-700'>Min Rating:</label>
								<select
									value={minRating}
									onChange={(e) => {
										setMinRating(Number(e.target.value))
									}}
									className='px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500'	
								>
									<option value="0">Any</option>
									<option value="3">3+</option>
									<option value="3.5">3.5+</option>
									<option value="4">4+</option>
									<option value="4.5">4.5+</option>
								</select>
							</div>

							<label className='flex gap-2 items-center cursor-pointer'>
								<input
									type='checkbox'
									checked={openNow}
									onChange={() => setOpenNow(!openNow)}
									className='w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500'
								/>
								<span className='text-gray-700'>Open Now</span>
							</label>
						</div>

						<button 
							type="submit"
							disabled={loading}
							className={`relative w-full mb-7 py-3 font-semibold rounded-lg transition-colors flex gap-2 items-center justify-center ${
								loading 
								? 'bg-gray-500 cursor-not-allowed'
								:  'bg-indigo-500 hover:bg-indigo-600 text-white'
							}`}
						>
							<span>Find Restaurant</span>
							{loading && (
								<span className="absolute right-4 flex space-x-1">
									<span className="w-1.5 h-1.5 bg-white rounded-full animate-dots" style={{ animationDelay: '0s' }}></span>
									<span className="w-1.5 h-1.5 bg-white rounded-full animate-dots" style={{ animationDelay: '0.2s' }}></span>
									<span className="w-1.5 h-1.5 bg-white rounded-full animate-dots" style={{ animationDelay: '0.4s' }}></span>
								</span>
							)}
						</button>
					</form>

					<div className="w-full max-w-[500px] mx-auto lg:mx-0">
						<RestaurantCard restaurant={restaurant} />
					</div>
				</div>
			</main>
		</div>
	);
}

export default App;