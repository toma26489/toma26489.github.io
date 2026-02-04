/**
 * WEATHER APP - MAIN SCRIPT
 * Auteur : Toma LEDENT
 */

// --- 1. CONFIGURATION & CONSTANTES ---

const API_KEY = 'e29a2cee4208640874c4b0e82ec71877';

const GEO_API_URL = 'https://api.openweathermap.org/geo/1.0/direct';

const WEATHER_API_URL = 'https://api.openweathermap.org/data/2.5/forecast';

const RECENT_CITIES_KEY = 'weatherAppRecentCities';

const MAX_RECENT_CITIES = 5;

// --- 2. SÉLECTION DU DOM ---
const dom = {
    cityInput: document.getElementById('city-input'),
    searchBtn: document.getElementById('search-btn'),
    geolocateBtn: document.getElementById('geolocate-btn'),
    seasonalBtn: document.getElementById('seasonal-btn'),
    cityName: document.getElementById('city-name'),
    currentTemp: document.getElementById('current-temp'),
    weatherDesc: document.getElementById('weather-desc'),
    windSpeed: document.getElementById('wind-speed'),
    humidity: document.getElementById('humidity'),
    pressure: document.getElementById('pressure'),
    visibility: document.getElementById('visibility'),
    forecastData: document.getElementById('forecast-data'),
    locationError: document.getElementById('location-error'),
    hourlySection: document.getElementById('hourly-forecast-section'),
    hourlyTitle: document.getElementById('hourly-title'),
    hourlyData: document.getElementById('hourly-forecast-data'),
    recentSearches: document.getElementById('recent-searches-container'),
    floatingMenu: document.getElementById('floating-menu'),
    // Iframes Cartes
    windyMap: document.getElementById('windy-map'),
    aifsFrame: document.getElementById('aifs-frame'),
    gefsFrame: document.getElementById('gefs-frame')
};

// Variables globales d'état
let tempChart = null;
let fullForecastList = [];
let lastClickedDay = null; // Variable essentielle pour le toggle !

// --- 3. FONCTIONS UTILITAIRES ---

// Traduit les codes icônes OpenWeather vers Weather Icons (CSS animé)
function getAnimatedIcon(iconCode) {
    const iconMap = {
        '01d': 'wi-day-sunny', '01n': 'wi-night-clear',
        '02d': 'wi-day-cloudy', '02n': 'wi-night-alt-cloudy',
        '03d': 'wi-cloud', '03n': 'wi-cloud',
        '04d': 'wi-cloudy', '04n': 'wi-cloudy',
        '09d': 'wi-showers', '09n': 'wi-showers',
        '10d': 'wi-day-rain', '10n': 'wi-night-alt-rain',
        '11d': 'wi-thunderstorm', '11n': 'wi-thunderstorm',
        '13d': 'wi-snow', '13n': 'wi-snow',
        '50d': 'wi-fog', '50n': 'wi-fog'
    };
    return iconMap[iconCode] || 'wi-na';
}

// Change le thème du body selon la météo
function updateBackground(cond) {
    document.body.className = ''; // Reset
    const c = cond.toLowerCase();
    if (c.includes('clear')) document.body.classList.add('weather-clear');
    else if (c.includes('cloud')) document.body.classList.add('weather-clouds');
    else if (c.includes('rain') || c.includes('drizzle')) document.body.classList.add('weather-rain');
    else if (c.includes('storm') || c.includes('thunder')) document.body.classList.add('weather-thunderstorm');
    else if (c.includes('snow')) document.body.classList.add('weather-snow');
}

// Gestion du chargement
function toggleLoading(isLoading) {
    document.body.style.cursor = isLoading ? 'wait' : 'default';
    dom.searchBtn.disabled = isLoading;
    dom.geolocateBtn.disabled = isLoading;
    dom.searchBtn.innerHTML = isLoading ? '<i class="fas fa-spinner fa-spin"></i>' : '<i class="fas fa-search"></i> Rechercher';
}

// Gestion des erreurs
function showError(msg) {
    dom.locationError.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${msg}`;
    dom.locationError.style.display = 'block';
    dom.locationError.classList.remove('shake');
    void dom.locationError.offsetWidth; // Trigger reflow
    dom.locationError.classList.add('shake');
}

// Mise à jour différée des Iframes (Lazy Loading)
function updateIframeSource(iframe, url) {
    iframe.dataset.src = url;
    if (iframe.parentElement.style.display !== 'none') {
        iframe.src = url;
    }
}

/**
 * Calcule le dernier run ECMWF disponible (BaseTime)
 */
function getECMWFBaseTime() {
    const now = new Date();
    now.setUTCHours(now.getUTCHours() - 8);
    
    const year = now.getUTCFullYear();
    const month = String(now.getUTCMonth() + 1).padStart(2, '0');
    const day = String(now.getUTCDate()).padStart(2, '0');
    const hour = now.getUTCHours() >= 12 ? '12' : '00';
    
    return `${year}${month}${day}${hour}00`;
}

// --- 4. LOGIQUE API (MÉTÉO) ---

async function getWeatherByCity(city) {
    dom.locationError.style.display = 'none';
    toggleLoading(true);
    try {
        const geoRes = await fetch(`${GEO_API_URL}?q=${encodeURIComponent(city)}&limit=1&appid=${API_KEY}`);
        const geoData = await geoRes.json();
        
        if (!geoData.length) throw new Error(`Ville "${city}" introuvable.`);
        await getWeatherByCoords(geoData[0].lat, geoData[0].lon);
    } catch (error) {
        showError(error.message);
    } finally {
        toggleLoading(false);
    }
}

async function getWeatherByCoords(lat, lon) {
    toggleLoading(true);
    try {
        const res = await fetch(`${WEATHER_API_URL}?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric&lang=fr`);
        if (!res.ok) throw new Error("Erreur lors de la récupération des données.");
        const data = await res.json();
        displayWeather(data);
    } catch (error) {
        showError("Impossible de récupérer la météo.");
    } finally {
        toggleLoading(false);
    }
}

// --- 5. LOGIQUE D'AFFICHAGE ---

function displayWeather(data) {
    fullForecastList = data.list;
    const current = data.list[0];
    const cityData = data.city;
    
    const lat = cityData.coord.lat;
    const lon = cityData.coord.lon;

    // --- Textes et Valeurs ---
    dom.cityName.textContent = `${cityData.name}, ${cityData.country}`;
    dom.weatherDesc.textContent = current.weather[0].description;
    dom.windSpeed.textContent = `${Math.round(current.wind.speed * 3.6)} km/h`;
    dom.humidity.textContent = `${current.main.humidity}%`;
    dom.pressure.textContent = `${current.main.pressure} hPa`;
    dom.visibility.textContent = `${(current.visibility / 1000).toFixed(1)} km`;

    // --- Température et Couleurs ---
    const tempValue = Math.round(current.main.temp);
    dom.currentTemp.textContent = `${tempValue}°C`;
    dom.currentTemp.className = 'temp';
    if (tempValue >= 30) dom.currentTemp.classList.add('temp-hot-extreme');
    else if (tempValue >= 20) dom.currentTemp.classList.add('temp-hot');
    else if (tempValue <= 10) dom.currentTemp.classList.add('temp-cold');
    else dom.currentTemp.classList.add('temp-mild');

    // --- Icône Principale ---
    const oldIcon = document.querySelector('.main-weather-icon');
    if (oldIcon) oldIcon.remove();
    const iconHtml = `<div class="main-weather-icon"><i class="wi ${getAnimatedIcon(current.weather[0].icon)}"></i></div>`;
    dom.cityName.insertAdjacentHTML('afterend', iconHtml);

    // --- Mise à jour des Cartes ---
    const windyUrl = `https://embed.windy.com/embed2.html?lat=${lat}&lon=${lon}&zoom=5&level=surface&overlay=wind&product=ecmwf&menu=&message=true&marker=true&calendar=now&pressure=&type=map&location=coordinates&detail=&metricWind=default&metricTemp=default&radarRange=-1`;
    const baseTime = getECMWFBaseTime();
    const stationName = cityData.name;
    const aifsUrl = `https://charts.ecmwf.int/products/aifs_ens_opencharts_meteogram?base_time=${baseTime}&epsgram=aifs_ens_classical_10d&lat=${lat}&lon=${lon}&station_name=${encodeURIComponent(stationName)}`;
    const gefsUrl = `https://www.meteociel.fr/modeles/gefs_table.php?ext=1&lat=${lat}&lon=${lon}&ville=${encodeURIComponent(stationName)}`;

    updateIframeSource(dom.windyMap, windyUrl);
    updateIframeSource(dom.aifsFrame, aifsUrl);
    updateIframeSource(dom.gefsFrame, gefsUrl);

    // --- Suite ---
    updateBackground(current.weather[0].main);
    saveCityToRecent(cityData.name);
    displayForecast(data.list);
    createTempChart(data.list);
}

function displayForecast(forecastList) {
    dom.forecastData.innerHTML = '';
    dom.hourlySection.style.display = 'none';
    lastClickedDay = null; // Réinitialise le toggle au chargement d'une nouvelle ville

    const dailyData = {};
    forecastList.forEach(item => {
        const dateObj = new Date(item.dt * 1000);
        const dayKey = dateObj.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
        
        if (!dailyData[dayKey]) {
            dailyData[dayKey] = {
                dayName: dateObj.toLocaleDateString('fr-FR', { weekday: 'long' }),
                dateStr: dayKey,
                temps: [],
                icons: []
            };
        }
        dailyData[dayKey].temps.push(item.main.temp);
        dailyData[dayKey].icons.push(item.weather[0].icon);
    });

    Object.values(dailyData).slice(0, 5).forEach(day => {
        const el = document.createElement('div');
        el.className = 'forecast-day';
        el.innerHTML = `
            <div class="day-name">${day.dayName}</div>
            <div class="date">${day.dateStr}</div>
            <div class="forecast-icon"><i class="wi ${getAnimatedIcon(day.icons[0])}"></i></div>
            <div class="forecast-temp">
                <div class="temp-item"><span class="temp-label">Max</span><span class="temp-max">${Math.round(Math.max(...day.temps))}°</span></div>
                <div class="temp-item"><span class="temp-label">Min</span><span class="temp-min">${Math.round(Math.min(...day.temps))}°</span></div>
            </div>`;
        
        // Clic : Lance la fonction avec la logique de fermeture automatique
        el.onclick = () => displayHourlyForecast(day.dateStr, day.dayName);
        dom.forecastData.appendChild(el);
    });
}

function displayHourlyForecast(dayKey, dayName) {
    // LOGIQUE TOGGLE : Si on clique sur le jour déjà ouvert, on le ferme.
    if (lastClickedDay === dayKey && dom.hourlySection.style.display === 'block') {
        dom.hourlySection.style.display = 'none';
        lastClickedDay = null; 
        return; 
    }

    const hourlyItems = fullForecastList.filter(item => 
        new Date(item.dt * 1000).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) === dayKey
    );

    dom.hourlyTitle.innerHTML = `<i class="fas fa-clock"></i> ${dayName} ${dayKey}`;
    dom.hourlyData.innerHTML = '';

    hourlyItems.forEach(item => {
        const time = new Date(item.dt * 1000).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
        const div = document.createElement('div');
        div.className = 'hourly-item';
        div.innerHTML = `
            <div class="hourly-time">${time}</div>
            <div class="hourly-icon"><i class="wi ${getAnimatedIcon(item.weather[0].icon)}"></i></div>
            <div class="hourly-temp">${Math.round(item.main.temp)}°C</div>
        `;
        dom.hourlyData.appendChild(div);
    });

    dom.hourlySection.style.display = 'block';
    lastClickedDay = dayKey; // On mémorise le jour actuel
}

function createTempChart(forecastList) {
    const dailyData = {};
    forecastList.forEach(item => {
        const dayKey = new Date(item.dt * 1000).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
        const dayLong = new Date(item.dt * 1000).toLocaleDateString('fr-FR', { weekday: 'long' });
        
        if (!dailyData[dayKey]) dailyData[dayKey] = { dayName: dayLong, temps: [], pops: [] };
        dailyData[dayKey].temps.push(item.main.temp);
        dailyData[dayKey].pops.push((item.pop || 0) * 100);
    });

    const labels = [];
    const maxTemps = [];
    const minTemps = [];
    const rainProbs = [];
    const dayNames = [];

    Object.entries(dailyData).slice(0, 5).forEach(([date, data]) => {
        labels.push(date);
        dayNames.push(data.dayName);
        maxTemps.push(Math.max(...data.temps));
        minTemps.push(Math.min(...data.temps));
        rainProbs.push(Math.max(...data.pops));
    });

    const ctx = document.getElementById('temp-chart').getContext('2d');
    if (tempChart) tempChart.destroy();

    tempChart = new Chart(ctx, {
        data: {
            labels: labels,
            datasets: [
                {
                    type: 'line', label: 'Pluie (%)', data: rainProbs,
                    borderColor: '#00f2fe', backgroundColor: 'rgba(0, 242, 254, 0.2)',
                    fill: true, tension: 0.4, yAxisID: 'y1'
                },
                {
                    type: 'bar', label: 'Max (°C)', data: maxTemps,
                    backgroundColor: 'rgba(255, 126, 95, 0.6)', borderColor: '#ff7e5f',
                    borderWidth: 2, borderRadius: 5, yAxisID: 'y'
                },
                {
                    type: 'bar', label: 'Min (°C)', data: minTemps,
                    backgroundColor: 'rgba(112, 225, 255, 0.6)', borderColor: '#70e1ff',
                    borderWidth: 2, borderRadius: 5, yAxisID: 'y'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            scales: {
                y: { position: 'left', ticks: { color: '#fff' }, grid: { color: 'rgba(255,255,255,0.1)' } },
                y1: { position: 'right', min: 0, max: 100, ticks: { color: '#00f2fe' }, grid: { display: false } },
                x: { ticks: { color: '#fff' } }
            },
            onClick: (e, activeEls) => {
                if (activeEls.length > 0) {
                    const idx = activeEls[0].index;
                    displayHourlyForecast(labels[idx], dayNames[idx]);
                }
            }
        }
    });
}

// --- 6. FONCTIONS EVENTS & NAVIGATION ---

function toggleSection(elementId, headerElement) {
    const content = document.getElementById(elementId);
    const icon = headerElement.querySelector('.toggle-icon');
    const isHidden = content.style.display === 'none';
    
    content.style.display = isHidden ? 'block' : 'none';
    
    if (icon) {
        if (isHidden) icon.classList.add('rotate-icon');
        else icon.classList.remove('rotate-icon');
    }
    
    const iframe = content.querySelector('iframe');
    if (isHidden && iframe && iframe.dataset.src) {
        iframe.src = iframe.dataset.src;
    }
}

function getRecentCities() {
    return JSON.parse(localStorage.getItem(RECENT_CITIES_KEY) || '[]');
}

function saveCityToRecent(city) {
    let cities = getRecentCities().filter(c => c.toLowerCase() !== city.toLowerCase());
    cities.unshift(city);
    localStorage.setItem(RECENT_CITIES_KEY, JSON.stringify(cities.slice(0, MAX_RECENT_CITIES)));
    renderRecentSearches();
}

function renderRecentSearches() {
    dom.recentSearches.innerHTML = '';
    getRecentCities().forEach(city => {
        const btn = document.createElement('button');
        btn.className = 'recent-search-btn';
        btn.textContent = city;
        btn.onclick = () => {
            dom.cityInput.value = city;
            getWeatherByCity(city);
        };
        dom.recentSearches.appendChild(btn);
    });
}

function handleSearch() {
    const val = dom.cityInput.value.trim();
    if (val) getWeatherByCity(val);
}

function scrollToTop(e) {
    e.preventDefault();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// --- 7. INITIALISATION & LISTENERS ---

dom.searchBtn.onclick = handleSearch;
dom.cityInput.onkeypress = (e) => { if (e.key === 'Enter') handleSearch(); };

dom.geolocateBtn.onclick = () => {
    if (navigator.geolocation) {
        toggleLoading(true);
        navigator.geolocation.getCurrentPosition(
            p => getWeatherByCoords(p.coords.latitude, p.coords.longitude),
            e => { toggleLoading(false); showError("Géolocalisation refusée ou impossible."); }
        );
    } else {
        showError("Géolocalisation non supportée par ce navigateur.");
    }
};

dom.seasonalBtn.onclick = () => window.open('https://meteo-express.com/previsions/previsions-saisonnieres/', '_blank');

window.onscroll = () => {
    if (window.scrollY > 300) dom.floatingMenu.classList.add('visible');
    else dom.floatingMenu.classList.remove('visible');
};

document.addEventListener('DOMContentLoaded', () => {
    renderRecentSearches();
    const history = getRecentCities();
    getWeatherByCity(history.length ? history[0] : 'Paris');
});

window.toggleSection = toggleSection;
window.scrollToTop = scrollToTop;