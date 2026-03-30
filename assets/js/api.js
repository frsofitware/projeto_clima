/**
 * api.js - Lógica de consumo da API Open-Meteo
 * Desenvolvido para o projeto_clima
 */

// Mapeamento de ícones SVG e descrições
const weatherDataMap = {
    0: { desc: 'Céu limpo', icon: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="5"/><path d="M12 1v2m0 18v2M4.22 4.22l1.42 1.42m12.72 12.72l1.42 1.42M1 12h2m18 0h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>' },
    1: { desc: 'Principalmente limpo', icon: '<svg viewBox="0 0 24 24"><path d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32l1.41 1.41M2 12h2m16 0h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/><circle cx="12" cy="12" r="5"/></svg>' },
    2: { desc: 'Parcialmente nublado', icon: '<svg viewBox="0 0 24 24"><path d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32l1.41 1.41M2 12h2m16 0h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/><path d="M17.5 19a4.5 4.5 0 0 0 .5-9 5 5 0 1 0-9.5-2 4.5 4.5 0 1 0-3 8.5h12z"/></svg>' },
    3: { desc: 'Encoberto', icon: '<svg viewBox="0 0 24 24"><path d="M17.5 19a4.5 4.5 0 0 0 .5-9 5 5 0 1 0-9.5-2 4.5 4.5 0 1 0-3 8.5h12z"/></svg>' },
    45: { desc: 'Nevoeiro', icon: '<svg viewBox="0 0 24 24"><path d="M5 10h14M5 14h14M5 18h14"/></svg>' },
    48: { desc: 'Nevoeiro com geada', icon: '<svg viewBox="0 0 24 24"><path d="M5 10h14M5 14h14M5 18h14M12 6v4"/></svg>' },
    51: { desc: 'Chuvisco leve', icon: '<svg viewBox="0 0 24 24"><path d="M17.5 19a4.5 4.5 0 0 0 .5-9 5 5 0 1 0-9.5-2 4.5 4.5 0 1 0-3 8.5h12z"/><path d="M8 13v2m4-2v2m4-2v2"/></svg>' },
    61: { desc: 'Chuva leve', icon: '<svg viewBox="0 0 24 24"><path d="M17.5 19a4.5 4.5 0 0 0 .5-9 5 5 0 1 0-9.5-2 4.5 4.5 0 1 0-3 8.5h12z"/><path d="M8 13l-2 3m6-3l-2 3m6-3l-2 3"/></svg>' },
    63: { desc: 'Chuva moderada', icon: '<svg viewBox="0 0 24 24"><path d="M17.5 19a4.5 4.5 0 0 0 .5-9 5 5 0 1 0-9.5-2 4.5 4.5 0 1 0-3 8.5h12z"/><path d="M8 13l-2 3m6-3l-2 3m6-3l-2 3"/></svg>' },
    95: { desc: 'Trovoada', icon: '<svg viewBox="0 0 24 24"><path d="M17.5 19a4.5 4.5 0 0 0 .5-9 5 5 0 1 0-9.5-2 4.5 4.5 0 1 0-3 8.5h12z"/><path d="M13 11l-2 3h3l-2 3"/></svg>' }
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
const welcomeSection = document.getElementById('welcomeSection');
const quickBtns = document.querySelectorAll('.quick-btn');

/**
 * Função principal para buscar o clima
 */
async function fetchWeather() {
    const city = cityInput.value.trim();
    
    if (!city) {
        error.textContent = 'Por favor, digite o nome de uma cidade.';
        error.classList.remove('hidden');
        return;
    }

    // Resetar interface
    hideElements();
    loading.classList.remove('hidden');

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
        error.classList.remove('hidden');
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
}

/**
 * Esconde elementos de resultado/erro
 */
function hideElements() {
    weatherResult.classList.add('hidden');
    error.classList.add('hidden');
    welcomeSection.classList.add('hidden');
}

// Event Listeners
searchBtn.addEventListener('click', fetchWeather);

// Quick Search buttons
quickBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        cityInput.value = btn.getAttribute('data-city');
        fetchWeather();
    });
});

// Permitir busca ao pressionar Enter
cityInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        fetchWeather();
    }
});