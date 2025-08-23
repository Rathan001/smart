import axios from 'axios';

const API_KEY = '473ebbd3153406298c57634962adefc6'; // Replace with your API key
const BASE_URL = 'https://api.openweathermap.org/data/2.5/forecast';

export const getWeatherForecast = async (location) => {
  try {
    const response = await axios.get(BASE_URL, {
      params: {
        q: location, // City name
        units: 'metric', // Celsius
        appid: API_KEY
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching weather data:', error);
    throw error;
  }
};

export const checkExtremeWeather = (forecast) => {
  const extremeConditions = forecast.list.filter(item =>
    item.main.temp > 35 || item.main.temp < 5 // Extreme heat (>35°C) or cold (<5°C)
  );

  return extremeConditions.length > 0
    ? 'Warning: Extreme weather conditions detected!'
    : null;
};