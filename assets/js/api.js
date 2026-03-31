/**
 * api.js - Lógica de consumo da API Open-Meteo
 * Desenvolvido para o projeto_clima
 */

// Mapeamento de ícones (Emojis) e descrições
const weatherDataMap = {
    0: { desc: 'Céu limpo', icon: '☀️' },
    1: { desc: 'Principalmente limpo', icon: '🌤️' },
    2: { desc: 'Parcialmente nublado', icon: '⛅' },
    3: { desc: 'Encoberto', icon: '☁️' },
    45: { desc: 'Nevoeiro', icon: '🌫️' },
    48: { desc: 'Nevoeiro com geada', icon: '🌫️' },
    51: { desc: 'Chuvisco leve', icon: '🌦️' },
    53: { desc: 'Chuvisco moderado', icon: '🌦️' },
    55: { desc: 'Chuvisco denso', icon: '🌦️' },
    61: { desc: 'Chuva leve', icon: '🌧️' },
    63: { desc: 'Chuva moderada', icon: '🌧️' },
    65: { desc: 'Chuva forte', icon: '🌧️' },
    71: { desc: 'Neve leve', icon: '🌨️' },
    73: { desc: 'Neve moderada', icon: '🌨️' },
    75: { desc: 'Neve forte', icon: '🌨️' },
    80: { desc: 'Pancadas de chuva leves', icon: '🌦️' },
    95: { desc: 'Trovoada', icon: '⛈️' }
};

// Elementos do DOM
const cityInput = document.getElementById('cityInput');
const searchBtn = document.getElementById('searchBtn');
const weatherResult = document.getElementById('weatherResult');
const displayName = document.getElementById('displayName');
const mainIcon = document.getElementById('mainIcon');
const tempValue = document.getElementById('tempValue');
const feelsLikeValue = document.getElementById('feelsLikeValue');
const humidityValue = document.getElementById('humidityValue');
const windValue = document.getElementById('windValue');
const descValue = document.getElementById('descValue');
const loading = document.getElementById('loading');
const error = document.getElementById('error');
const errorWrapper = document.getElementById('errorWrapper');
const searchBox = document.getElementById('searchBox');

const backBtn = document.getElementById('backBtn');
const errorBackBtn = document.getElementById('errorBackBtn');

/**
 * Função principal para buscar o clima
 */
async function fetchWeather() {
    const city = cityInput.value.trim();
    
    if (!city) {
        error.textContent = 'Por favor, digite o nome de uma cidade.';
        errorWrapper.classList.remove('hidden');
        searchBox.classList.add('hidden');
        return;
    }

    // Resetar interface
    hideElements();
    loading.classList.remove('hidden');
    searchBox.classList.add('hidden');

    try {
        // 1. Geocodificação: Transformar nome da cidade em coordenadas
        const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=pt&format=json`;
        const geoResponse = await fetch(geoUrl);
        const geoData = await geoResponse.json();

        if (!geoData.results || geoData.results.length === 0) {
            throw new Error('Cidade não encontrada');
        }

        const { latitude, longitude, name, admin1, country } = geoData.results[0];
        const locationLabel = `${name}${admin1 ? `, ${admin1}` : ''} - ${country}`;

        // 2. Previsão: Buscar clima usando as coordenadas (incluindo humidade e sensação)
        const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m`;
        const weatherResponse = await fetch(weatherUrl);
        const weatherData = await weatherResponse.json();

        if (!weatherData.current) {
            throw new Error('Dados meteorológicos não disponíveis');
        }

        // Renderizar dados
        renderWeather(weatherData.current, locationLabel);

    } catch (err) {
        console.error('Erro:', err);
        error.textContent = err.message === 'Cidade não encontrada' 
            ? 'Cidade não encontrada. Tente novamente.' 
            : 'Ocorreu um erro ao buscar os dados. Tente novamente.';
        errorWrapper.classList.remove('hidden');
        searchBox.classList.add('hidden');
    } finally {
        loading.classList.add('hidden');
    }
}

/**
 * Renderiza os dados na tela
 */
function renderWeather(data, location) {
    displayName.textContent = location;
    
    // Mapear campos da nova API (current)
    const temp = data.temperature_2m ?? data.temperature;
    const feelsLike = data.apparent_temperature ?? '--';
    const humidity = data.relative_humidity_2m ?? '--';
    const wind = data.wind_speed_10m ?? data.windspeed;
    const code = data.weather_code ?? data.weathercode;

    tempValue.textContent = Math.round(temp);
    feelsLikeValue.textContent = Math.round(feelsLike);
    humidityValue.textContent = humidity;
    windValue.textContent = wind;
    
    // Traduzir código do tempo e ícone
    const weatherInfo = weatherDataMap[code] || { desc: 'Condição desconhecida', icon: '❓' };
    descValue.textContent = weatherInfo.desc;
    mainIcon.innerHTML = weatherInfo.icon;

    weatherResult.classList.remove('hidden');
    searchBox.classList.add('hidden');
}

/**
 * Esconde elementos de resultado/erro
 */
function hideElements() {
    weatherResult.classList.add('hidden');
    errorWrapper.classList.add('hidden');
}

// Event Listeners
searchBtn.addEventListener('click', fetchWeather);

// Back buttons
const goBack = () => {
    hideElements();
    searchBox.classList.remove('hidden');
    cityInput.value = '';
};

backBtn.addEventListener('click', goBack);
errorBackBtn.addEventListener('click', goBack);

// Permitir busca ao pressionar Enter
cityInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        fetchWeather();
    }
});