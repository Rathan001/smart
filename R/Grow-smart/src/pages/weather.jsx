import React, { useState, useEffect, useCallback } from 'react';

const Weather = ({ onWeatherChange }) => {
  // ---- state ----
  const [weatherData, setWeatherData] = useState(null);
  const [forecast, setForecast] = useState([]);
  const [location, setLocation] = useState(null); // { city, country }
  const [coords, setCoords] = useState(null);     // { lat, lon, source }
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [gardeningTips, setGardeningTips] = useState([]);

  // manual override
  const [showLocationInput, setShowLocationInput] = useState(false);
  const [locationQuery, setLocationQuery] = useState('');

  // ---- OpenWeather constants ----
  const OPENWEATHERMAP_API_KEY = '473ebbd3153406298c57634962adefc6';
  const OPENWEATHERMAP_CURRENT_URL = 'https://api.openweathermap.org/data/2.5/weather';
  const OPENWEATHERMAP_FORECAST_URL = 'https://api.openweathermap.org/data/2.5/forecast';
  const OWM_GEOCODE_DIRECT = 'https://api.openweathermap.org/geo/1.0/direct';
  const OWM_GEOCODE_REVERSE = 'https://api.openweathermap.org/geo/1.0/reverse';

  // ===== Utilities =====
  const fetchJSON = async (url) => {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Request failed: ${res.status}`);
    return res.json();
  };

  const reverseGeocode = useCallback(async (lat, lon) => {
    try {
      const url = `${OWM_GEOCODE_REVERSE}?lat=${lat}&lon=${lon}&limit=1&appid=${OPENWEATHERMAP_API_KEY}`;
      const data = await fetchJSON(url);
      if (Array.isArray(data) && data.length) {
        const { name, country, state } = data[0];
        // prefer city name; fall back to state if city absent
        const city = name || state || 'Unknown';
        return { city, country: country || '' };
      }
    } catch (e) {
      console.warn('Reverse geocode failed:', e);
    }
    return { city: 'Unknown', country: '' };
  }, []);

  const geocodeCity = useCallback(async (query) => {
    const q = encodeURIComponent(query.trim());
    const url = `${OWM_GEOCODE_DIRECT}?q=${q}&limit=1&appid=${OPENWEATHERMAP_API_KEY}`;
    const data = await fetchJSON(url);
    if (!Array.isArray(data) || !data.length) throw new Error('City not found');
    const { lat, lon, name, country, state } = data[0];
    return {
      lat,
      lon,
      label: { city: name || state || query, country: country || '' }
    };
  }, []);

  const processForecastListIntoDaily = (list) => {
    const daily = {};
    list.forEach(item => {
      const dateKey = new Date(item.dt * 1000).toLocaleDateString();
      if (!daily[dateKey]) {
        daily[dateKey] = {
          date: item.dt * 1000,
          temps: [],
          humidity: [],
          wind: [],
          conditions: item.weather?.[0]?.main || '',
          icon: item.weather?.[0]?.icon || '01d'
        };
      }
      daily[dateKey].temps.push(item.main.temp);
      daily[dateKey].humidity.push(item.main.humidity);
      daily[dateKey].wind.push(item.wind.speed);
    });

    return Object.values(daily)
      .map(d => ({
        date: d.date,
        high: Math.max(...d.temps),
        low: Math.min(...d.temps),
        conditions: d.conditions,
        icon: d.icon,
        humidity: (d.humidity.reduce((a, b) => a + b, 0) / d.humidity.length).toFixed(0),
        windSpeed: (d.wind.reduce((a, b) => a + b, 0) / d.wind.length).toFixed(1),
      }))
      .slice(0, 5);
  };

  const generateGardeningTips = (current, forecastDays) => {
    const tips = [];
    if (current.temperature > 80) {
      tips.push({ type: 'warning', icon: '🌡️', title: 'High Temp Alert', message: 'Provide shade & water more.' });
    }
    if (current.humidity > 80) {
      tips.push({ type: 'info', icon: '💧', title: 'High Humidity', message: 'Watch for fungal issues.' });
    }
    const rainForecastItem = forecastDays.find(day =>
      day.conditions && (day.conditions.includes('Rain') || day.conditions.includes('Drizzle') || day.conditions.includes('Thunderstorm'))
    );
    if (rainForecastItem) {
      tips.push({ type: 'success', icon: '🌧️', title: 'Rain Expected', message: `Rain predicted on ${new Date(rainForecastItem.date).toLocaleDateString()}.` });
    }
    if (current.windSpeed > 15) {
      tips.push({ type: 'warning', icon: '💨', title: 'Wind Alert', message: 'Secure tall plants.' });
    }
    tips.push({ type: 'info', icon: '🌱', title: 'Daily Garden Tip', message: 'Check soil moisture before watering.' });
    return tips;
  };

  const getWeatherIcon = (iconCode) => {
    const iconMap = {
      '01d': '☀️', '01n': '🌙',
      '02d': '⛅', '02n': '☁️',
      '03d': '☁️', '03n': '☁️',
      '04d': '☁️', '04n': '☁️',
      '09d': '🌧️', '09n': '🌧️',
      '10d': '🌦️', '10n': '🌦️',
      '11d': '⛈️', '11n': '⛈️',
      '13d': '❄️', '13n': '❄️',
      '50d': '🌫️', '50n': '🌫️'
    };
    return iconMap[iconCode] || '🌤️';
  };

  const getTipBadgeClass = (type) => {
    switch (type) {
      case 'warning': return 'status-badge status-warning';
      case 'success': return 'status-badge status-success';
      case 'error': return 'status-badge status-error';
      default: return 'status-badge status-info';
    }
  };

  // ===== Core loader =====
  const loadWeatherForCoords = useCallback(async (lat, lon, labelFrom = null) => {
    setLoading(true);
    setError(null);
    try {
      // fetch weather + forecast (imperial to match your current UI)
      const currentData = await fetchJSON(
        `${OPENWEATHERMAP_CURRENT_URL}?lat=${lat}&lon=${lon}&appid=${OPENWEATHERMAP_API_KEY}&units=imperial`
      );

      const forecastData = await fetchJSON(
        `${OPENWEATHERMAP_FORECAST_URL}?lat=${lat}&lon=${lon}&appid=${OPENWEATHERMAP_API_KEY}&units=imperial`
      );

      const processedForecast = processForecastListIntoDaily(forecastData.list);

      setWeatherData({
        temperature: currentData.main.temp,
        humidity: currentData.main.humidity,
        windSpeed: currentData.wind.speed,
        conditions: currentData.weather[0].main,
        description: currentData.weather[0].description,
        icon: currentData.weather[0].icon,
        uvIndex: 'N/A',
        pressure: currentData.main.pressure,
        sunrise: new Date(currentData.sys.sunrise * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        sunset: new Date(currentData.sys.sunset * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      });

      // prefer a reliable label: reverse geocode if not provided
      const label = labelFrom || await reverseGeocode(lat, lon);
      setLocation(label);

      setForecast(processedForecast);

      const tips = generateGardeningTips(
        {
          temperature: currentData.main.temp,
          humidity: currentData.main.humidity,
          windSpeed: currentData.wind.speed,
          conditions: currentData.weather[0].main,
          uvIndex: 'N/A'
        },
        processedForecast
      );
      setGardeningTips(tips);

      if (onWeatherChange) {
        onWeatherChange({ weather: currentData, tips });
      }

      setLoading(false);
    } catch (err) {
      console.error('loadWeatherForCoords error:', err);
      setError(`Failed to fetch weather data: ${err.message || err}`);
      setLoading(false);
    }
  }, [onWeatherChange, reverseGeocode]);

  // ===== Try manual location (saved) then geolocation =====
  useEffect(() => {
    const init = async () => {
      try {
        // 1) manual override from localStorage
        const saved = localStorage.getItem('weatherLocationOverride');
        if (saved) {
          const parsed = JSON.parse(saved); // { lat, lon, label }
          setCoords({ lat: parsed.lat, lon: parsed.lon, source: 'manual' });
          await loadWeatherForCoords(parsed.lat, parsed.lon, parsed.label);
          return;
        }

        // 2) high-accuracy geolocation
        if ('geolocation' in navigator) {
          await new Promise((resolve) => {
            navigator.geolocation.getCurrentPosition(async (pos) => {
              const { latitude, longitude, accuracy } = pos.coords;
              // High-accuracy request done; proceed
              setCoords({ lat: latitude, lon: longitude, source: 'geolocation', accuracy });
              await loadWeatherForCoords(latitude, longitude);
              resolve();
            }, async (geoErr) => {
              console.warn('Geolocation failed, falling back to default (Bengaluru):', geoErr);
              // 3) fallback to a sensible default (Bengaluru, IN) to avoid blank UI
              const fallback = { lat: 12.9716, lon: 77.5946 };
              setCoords({ ...fallback, source: 'fallback' });
              await loadWeatherForCoords(fallback.lat, fallback.lon, { city: 'Bengaluru', country: 'IN' });
              resolve();
            }, {
              enableHighAccuracy: true,
              timeout: 12000,
              maximumAge: 0
            });
          });
        } else {
          // no geolocation available: fallback
          const fallback = { lat: 12.9716, lon: 77.5946 };
          setCoords({ ...fallback, source: 'fallback' });
          await loadWeatherForCoords(fallback.lat, fallback.lon, { city: 'Bengaluru', country: 'IN' });
        }
      } catch (e) {
        console.error('init weather failed:', e);
        setError('Failed to initialize weather module.');
        setLoading(false);
      }
    };

    init();
  }, [loadWeatherForCoords]);

  // ===== Manual location handlers =====
  const handleApplyLocation = async (e) => {
    e.preventDefault();
    if (!locationQuery.trim()) return;

    try {
      setLoading(true);
      setError(null);
      const { lat, lon, label } = await geocodeCity(locationQuery);
      // save override
      localStorage.setItem('weatherLocationOverride', JSON.stringify({ lat, lon, label }));
      setCoords({ lat, lon, source: 'manual' });
      setShowLocationInput(false);
      setLocationQuery('');
      await loadWeatherForCoords(lat, lon, label);
    } catch (err) {
      console.error('Manual location set failed:', err);
      setError(err.message || 'Unable to set location');
      setLoading(false);
    }
  };

  const handleClearOverride = async () => {
    localStorage.removeItem('weatherLocationOverride');
    setShowLocationInput(false);
    setLocationQuery('');
    // re-init geolocation flow
    setLoading(true);
    setError(null);
    setCoords(null);
    setWeatherData(null);
    setForecast([]);
    setGardeningTips([]);
    setLocation(null);

    // trigger geolocation again
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(async (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        setCoords({ lat: latitude, lon: longitude, source: 'geolocation', accuracy });
        await loadWeatherForCoords(latitude, longitude);
      }, async () => {
        const fallback = { lat: 12.9716, lon: 77.5946 };
        setCoords({ ...fallback, source: 'fallback' });
        await loadWeatherForCoords(fallback.lat, fallback.lon, { city: 'Bengaluru', country: 'IN' });
      }, { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 });
    } else {
      const fallback = { lat: 12.9716, lon: 77.5946 };
      setCoords({ ...fallback, source: 'fallback' });
      await loadWeatherForCoords(fallback.lat, fallback.lon, { city: 'Bengaluru', country: 'IN' });
    }
  };

  // ===== UI states =====
  if (loading) {
    return (
      <div className="weather-page">
        <div className="loading-state text-center">
          <h2>🌤️ Loading Weather Data...</h2>
          <p>Getting current conditions for your garden</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="weather-page">
        <div className="error-state text-center">
          <h2>❌ Weather Unavailable</h2>
          <p>{error}</p>
          <div className="mt-md">
            <button className="btn btn-primary mr-sm" onClick={() => window.location.reload()}>
              Try Again
            </button>
            <button className="btn btn-outline" onClick={() => setShowLocationInput(true)}>
              Set Location Manually
            </button>
          </div>

          {showLocationInput && (
            <form onSubmit={handleApplyLocation} className="mt-md" style={{ maxWidth: 420, margin: '0 auto' }}>
              <div className="input-group">
                <label className="input-label">City, State (optional), Country</label>
                <input
                  type="text"
                  className="input-field"
                  value={locationQuery}
                  onChange={(e) => setLocationQuery(e.target.value)}
                  placeholder="e.g., Hyderabad, IN"
                  required
                />
              </div>
              <div className="form-actions">
                <button className="btn btn-primary" type="submit">Apply</button>
                <button className="btn btn-outline ml-sm" type="button" onClick={() => setShowLocationInput(false)}>Cancel</button>
              </div>
            </form>
          )}
        </div>
      </div>
    );
  }

  if (!weatherData || !location) {
    return (
      <div className="weather-page">
        <div className="loading-state text-center">
          <h2>No Data Available</h2>
          <p>Something went wrong after loading. Please refresh.</p>
        </div>
      </div>
    );
  }

  const usingOverride = coords?.source === 'manual';

  return (
    <div className="weather-page">
      <div className="page-header mb-lg">
        <h1>🌤️ Weather Dashboard</h1>
        <p>
          Weather-aware gardening insights for {location?.city}
          {location?.country ? `, ${location.country}` : ''}
        </p>

        {/* Tiny inline controls to fix "wrong area" without changing the page layout */}
        <div className="mt-sm" style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {!showLocationInput ? (
            <>
              <span className="status-badge">
                Source: {coords?.source === 'geolocation' ? 'Device GPS/IP' : coords?.source === 'manual' ? 'Manual' : 'Fallback'}
              </span>
              {usingOverride && (
                <button className="btn btn-outline btn-xs" onClick={handleClearOverride}>
                  Clear Manual Location
                </button>
              )}
              <button className="btn btn-outline btn-xs" onClick={() => setShowLocationInput(true)}>
                Change Location
              </button>
            </>
          ) : (
            <form onSubmit={handleApplyLocation} className="inline-form" style={{ display: 'flex', gap: 8 }}>
              <input
                type="text"
                className="input-field"
                style={{ minWidth: 240 }}
                value={locationQuery}
                onChange={(e) => setLocationQuery(e.target.value)}
                placeholder="City, State, Country"
                required
              />
              <button className="btn btn-primary btn-xs" type="submit">Apply</button>
              <button className="btn btn-outline btn-xs" type="button" onClick={() => setShowLocationInput(false)}>Cancel</button>
            </form>
          )}
        </div>
      </div>

      {/* Current Weather */}
      <div className="grid grid-cols-3 gap-lg mb-lg">
        <div className="card current-weather col-span-2">
          <div className="weather-header">
            <div className="weather-main">
              <div className="weather-icon">
                {getWeatherIcon(weatherData.icon)}
              </div>
              <div className="weather-temp">
                <span className="temperature">{weatherData.temperature}°F</span>
                <span className="conditions">{weatherData.conditions}</span>
                <span className="description">{weatherData.description}</span>
              </div>
            </div>
            <div className="weather-location">
              <h3>📍 {location.city}{location.country ? `, ${location.country}` : ''}</h3>
              <p>Last updated: Just now</p>
            </div>
          </div>

          <div className="weather-details">
            <div className="detail-grid">
              <div className="detail-item">
                <span className="detail-icon">💧</span>
                <span className="detail-label">Humidity</span>
                <span className="detail-value">{weatherData.humidity}%</span>
              </div>
              <div className="detail-item">
                <span className="detail-icon">💨</span>
                <span className="detail-label">Wind Speed</span>
                <span className="detail-value">{weatherData.windSpeed} mph</span>
              </div>
              <div className="detail-item">
                <span className="detail-icon">☀️</span>
                <span className="detail-label">UV Index</span>
                <span className="detail-value">{weatherData.uvIndex}</span>
              </div>
              <div className="detail-item">
                <span className="detail-icon">🌅</span>
                <span className="detail-label">Sunrise</span>
                <span className="detail-value">{weatherData.sunrise}</span>
              </div>
              <div className="detail-item">
                <span className="detail-icon">🌇</span>
                <span className="detail-label">Sunset</span>
                <span className="detail-value">{weatherData.sunset}</span>
              </div>
              <div className="detail-item">
                <span className="detail-icon">🌡️</span>
                <span className="detail-label">Pressure</span>
                <span className="detail-value">{weatherData.pressure} hPa</span>
              </div>
            </div>
          </div>
        </div>

        {/* Gardening Tips */}
        <div className="card gardening-tips">
          <h3>🌱 Smart Gardening Tips</h3>
          <div className="tips-list">
            {gardeningTips.map((tip, index) => (
              <div key={index} className="tip-item">
                <div className="tip-header">
                  <span className="tip-icon">{tip.icon}</span>
                  <span className={getTipBadgeClass(tip.type)}>
                    {tip.type}
                  </span>
                </div>
                <h4>{tip.title}</h4>
                <p>{tip.message}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 5-Day Forecast */}
      <div className="card forecast-section">
        <h2>📅 5-Day Forecast</h2>
        <div className="forecast-grid">
          {forecast.map((day, index) => (
            <div key={index} className="forecast-day">
              <div className="forecast-date">
                {index === 0 ? 'Today' : new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' })}
              </div>
              <div className="forecast-icon">
                {getWeatherIcon(day.icon)}
              </div>
              <div className="forecast-temps">
                <span className="high">{day.high}°</span>
                <span className="low">{day.low}°</span>
              </div>
              <div className="forecast-conditions">
                {day.conditions}
              </div>
              <div className="forecast-details">
                <small>💧 {day.humidity}% • 💨 {day.windSpeed}mph</small>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Watering Schedule */}
      <div className="card watering-schedule mt-lg">
        <h2>💧 Smart Watering Schedule</h2>
        <div className="schedule-info">
          <p>Based on current weather conditions and forecast:</p>
          <div className="schedule-recommendations">
            <div className="recommendation">
              <span className="rec-icon">✅</span>
              <span className="rec-text">Today: Good day for watering (no rain expected)</span>
            </div>
            <div className="recommendation">
              <span className="rec-icon">⏭️</span>
              <span className="rec-text">Tomorrow: Water early morning if no rain by evening</span>
            </div>
            <div className="recommendation">
              <span className="rec-icon">🌧️</span>
              <span className="rec-text">Day 3: Skip watering - rain expected</span>
            </div>
          </div>
        </div>
      </div>

      {/* Weather Alerts */}
      <div className="weather-alerts mt-lg">
        <div className="alert-card">
          <h3>⚠️ Weather Alerts</h3>
          <p>No current weather alerts for your area. Your plants are safe! 🌱</p>
        </div>
      </div>
    </div>
  );
};

export default Weather;
