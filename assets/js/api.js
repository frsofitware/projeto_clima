/**
 * api.js - Lógica de consumo da API Open-Meteo
 * Desenvolvido com foco em resiliência, modularidade e UX.
 */

// --- CONFIGURAÇÃO E MAPEAMENTO ---
const WEATHER_CONFIG = {
    0: { desc: 'Céu limpo', dayIcon: 'wi-day-sunny', nightIcon: 'wi-night-clear' },
    1: { desc: 'Principalmente limpo', dayIcon: 'wi-day-cloudy', nightIcon: 'wi-night-alt-cloudy' },
    2: { desc: 'Parcialmente nublado', dayIcon: 'wi-day-cloudy', nightIcon: 'wi-night-alt-cloudy' },
    3: { desc: 'Encoberto', dayIcon: 'wi-cloudy', nightIcon: 'wi-cloudy' },
    45: { desc: 'Nevoeiro', dayIcon: 'wi-fog', nightIcon: 'wi-fog' },
    48: { desc: 'Nevoeiro com geada', dayIcon: 'wi-fog', nightIcon: 'wi-fog' },
    51: { desc: 'Chuvisco leve', dayIcon: 'wi-day-showers', nightIcon: 'wi-night-alt-showers' },
    53: { desc: 'Chuvisco moderado', dayIcon: 'wi-day-showers', nightIcon: 'wi-night-alt-showers' },
    55: { desc: 'Chuvisco denso', dayIcon: 'wi-day-showers', nightIcon: 'wi-night-alt-showers' },
    61: { desc: 'Chuva leve', dayIcon: 'wi-day-rain', nightIcon: 'wi-night-alt-rain' },
    63: { desc: 'Chuva moderada', dayIcon: 'wi-day-rain', nightIcon: 'wi-night-alt-rain' },
    65: { desc: 'Chuva forte', dayIcon: 'wi-rain', nightIcon: 'wi-rain' },
    71: { desc: 'Neve leve', dayIcon: 'wi-day-snow', nightIcon: 'wi-night-alt-snow' },
    73: { desc: 'Neve moderada', dayIcon: 'wi-day-snow', nightIcon: 'wi-night-alt-snow' },
    75: { desc: 'Neve forte', dayIcon: 'wi-snow', nightIcon: 'wi-snow' },
    80: { desc: 'Pancadas de chuva leves', dayIcon: 'wi-day-showers', nightIcon: 'wi-night-alt-showers' },
    95: { desc: 'Trovoada', dayIcon: 'wi-day-thunderstorm', nightIcon: 'wi-night-alt-thunderstorm' }
};

// --- ELEMENTOS DO DOM ---
const elements = {
    cityInput: document.getElementById('cityInput'),
    searchBtn: document.getElementById('searchBtn'),
    selectionBox: document.getElementById('selectionBox'),
    cityList: document.getElementById('cityList'),
    cancelSelection: document.getElementById('cancelSelection'),
    weatherResult: document.getElementById('weatherResult'),
    displayName: document.getElementById('displayName'),
    mainIcon: document.getElementById('mainIcon'),
    tempValue: document.getElementById('tempValue'),
    feelsLikeValue: document.getElementById('feelsLikeValue'),
    humidityValue: document.getElementById('humidityValue'),
    windValue: document.getElementById('windValue'),
    descValue: document.getElementById('descValue'),
    dateDisplay: document.getElementById('dateDisplay'),
    loading: document.getElementById('loading'),
    error: document.getElementById('error'),
    errorWrapper: document.getElementById('errorWrapper'),
    searchBox: document.getElementById('searchBox'),
    backBtn: document.getElementById('backBtn'),
    errorBackBtn: document.getElementById('errorBackBtn')
};

// --- FUNÇÕES DE DADOS / API (Testáveis) ---

function validarCidade(cidade) {
    if (!cidade || cidade.trim() === '') {
        throw new Error("O nome da cidade não pode estar vazio.");
    }
    return cidade.trim();
}

async function buscarCoordenadas(cidade) {
    const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cidade)}&count=20&language=pt&format=json`;
    const response = await fetch(geoUrl);
    
    if (!response.ok) throw new Error('Falha na conexão com o serviço de geocodificação.');
    
    const data = await response.json();
    if (!data.results || data.results.length === 0) {
        throw new Error('Cidade não encontrada.');
    }
    return data.results;
}

async function buscarClima(lat, lon) {
    const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,weather_code,wind_speed_10m`;
    
    let response;
    
    // Intercepta erros físicos da rede (timeout, sem internet)
    try {
        response = await fetch(weatherUrl);
    } catch (error) {
        throw new Error('Falha na conexão de rede.');
    }
    
    // Intercepta erros lógicos da API
    if (!response.ok) {
        if (response.status === 429) throw new Error('Limite de requisições excedido. Tente novamente mais tarde.');
        if (response.status >= 500) throw new Error('Erro no servidor da API.');
        throw new Error('Falha na conexão com o serviço meteorológico.');
    }
    
    const data = await response.json();
    if (!data.current) throw new Error('Formato de resposta inválido.');
    
    return data.current;
}

// --- FUNÇÕES AUXILIARES E DE INTERFACE ---

function getFormattedDate() {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    return new Intl.DateTimeFormat('pt-BR', options).format(new Date());
}

function updateTheme(isDay) {
    if (isDay === 1) {
        document.body.classList.add('day-mode');
        document.body.classList.remove('night-mode');
    } else {
        document.body.classList.add('night-mode');
        document.body.classList.remove('day-mode');
    }
}

function showError(message) {
    if(elements.error) elements.error.textContent = message;
    elements.errorWrapper?.classList.remove('hidden');
    elements.searchBox?.classList.add('hidden');
    elements.selectionBox?.classList.add('hidden');
    elements.loading?.classList.add('hidden');
}

function resetUI() {
    elements.weatherResult?.classList.add('hidden');
    elements.selectionBox?.classList.add('hidden');
    elements.errorWrapper?.classList.add('hidden');
    elements.loading?.classList.add('hidden');
}

// --- LÓGICA PRINCIPAL ---

async function startSearch() {
    try {
        const city = validarCidade(elements.cityInput?.value);
        
        resetUI();
        elements.loading?.classList.remove('hidden');
        elements.searchBox?.classList.add('hidden');

        const results = await buscarCoordenadas(city);

        const relevantResults = results.filter(item => {
            return item.feature_code && item.feature_code.startsWith('PPL');
        });

        const candidates = relevantResults.length > 0 ? relevantResults : results;

        const sortedResults = candidates.sort((a, b) => {
            const aIsCapital = a.feature_code === 'PPLC' ? 1 : 0;
            const bIsCapital = b.feature_code === 'PPLC' ? 1 : 0;
            if (aIsCapital !== bIsCapital) return bIsCapital - aIsCapital;
            return (b.population || 0) - (a.population || 0);
        });

        const uniqueResults = filterUniqueLocations(sortedResults);

        if (uniqueResults.length === 1) {
            const cityData = uniqueResults[0];
            fetchWeather(cityData.latitude, cityData.longitude, formatLocationLabel(cityData));
            return;
        }

        displayCitySelection(uniqueResults);

    } catch (err) {
        console.error('Erro na busca:', err);
        showError(err.message);
    } finally {
        elements.loading?.classList.add('hidden');
    }
}

function filterUniqueLocations(results) {
    const seenLabels = new Set();
    const seenCoords = new Set();
    
    return results.filter(city => {
        const label = formatLocationLabel(city);
        const normalizedLabel = label.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        const coordKey = `${city.latitude.toFixed(1)}|${city.longitude.toFixed(1)}`;
        
        if (seenLabels.has(normalizedLabel) || seenCoords.has(coordKey)) return false;
        
        seenLabels.add(normalizedLabel);
        seenCoords.add(coordKey);
        return true;
    });
}

function formatLocationLabel(cityData) {
    const { name, admin1, country } = cityData;
    const statePart = admin1 ? `, ${admin1}` : '';
    return `${name}${statePart} - ${country}`;
}

function displayCitySelection(results) {
    if(!elements.cityList) return;
    elements.cityList.innerHTML = '';
    
    results.forEach(city => {
        const button = document.createElement('button');
        button.className = 'city-item';
        const label = formatLocationLabel(city);
        
        button.innerHTML = `
            <span class="city-name">${city.name}</span>
            <span class="city-details">${city.admin1 ? city.admin1 + ', ' : ''}${city.country}</span>
        `;
        
        button.onclick = () => fetchWeather(city.latitude, city.longitude, label);
        elements.cityList.appendChild(button);
    });

    elements.selectionBox?.classList.remove('hidden');
    elements.loading?.classList.add('hidden');
}

async function fetchWeather(lat, lon, label) {
    resetUI();
    elements.loading?.classList.remove('hidden');
    elements.selectionBox?.classList.add('hidden');

    try {
        const currentData = await buscarClima(lat, lon);
        renderWeather(currentData, label);
    } catch (err) {
        console.error('Erro ao buscar clima:', err);
        showError(err.message);
    } finally {
        elements.loading?.classList.add('hidden');
    }
}

function renderWeather(data, location) {
    const { 
        temperature_2m: temp, 
        apparent_temperature: feelsLike, 
        relative_humidity_2m: humidity, 
        wind_speed_10m: wind, 
        weather_code: code,
        is_day: isDay 
    } = data;

    if(elements.displayName) elements.displayName.textContent = location;
    if(elements.tempValue) elements.tempValue.textContent = Math.round(temp);
    if(elements.feelsLikeValue) elements.feelsLikeValue.textContent = Math.round(feelsLike);
    if(elements.humidityValue) elements.humidityValue.textContent = humidity;
    if(elements.windValue) elements.windValue.textContent = wind;
    if(elements.dateDisplay) elements.dateDisplay.textContent = getFormattedDate();

    const weatherInfo = WEATHER_CONFIG[code] || { desc: 'Condição desconhecida', dayIcon: 'wi-na', nightIcon: 'wi-na' };
    const iconClass = isDay === 1 ? weatherInfo.dayIcon : weatherInfo.nightIcon;
    
    if(elements.descValue) elements.descValue.textContent = weatherInfo.desc;
    if(elements.mainIcon) elements.mainIcon.innerHTML = `<i class="wi ${iconClass}"></i>`;

    updateTheme(isDay);

    elements.weatherResult?.classList.remove('hidden');
    elements.searchBox?.classList.add('hidden');
}

// --- EVENT LISTENERS (Com Optional Chaining para evitar erros no Jest) ---
elements.searchBtn?.addEventListener('click', startSearch);
elements.cityInput?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') startSearch();
});

const goBack = () => {
    resetUI();
    elements.searchBox?.classList.remove('hidden');
    if(elements.cityInput) elements.cityInput.value = '';
    document.body.classList.remove('night-mode', 'day-mode');
};

elements.backBtn?.addEventListener('click', goBack);
elements.errorBackBtn?.addEventListener('click', goBack);
elements.cancelSelection?.addEventListener('click', goBack);

// --- EXPORTAÇÃO PARA O JEST ---
if (typeof module !== 'undefined') {
  module.exports = { buscarCoordenadas, buscarClima, validarCidade };
}