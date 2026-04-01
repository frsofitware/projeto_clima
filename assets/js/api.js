/**
 * api.js - Lógica de consumo da API Open-Meteo
 * Desenvolvido com foco em resiliência, modularidade e UX.
 */

// --- CONFIGURAÇÃO E MAPEAMENTO ---

/**
 * Tempo de expiração do cache em milissegundos (10 minutos).
 * @constant {number}
 */
const CACHE_EXPIRATION_MS = 10 * 60 * 1000;

/**
 * Mapeamento de códigos meteorológicos da Open-Meteo para classes da biblioteca Weather Icons.
 * Abrange condições de céu limpo, chuva, neve, tempestades e fenômenos raros.
 * @constant {Object}
 */
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
    56: { desc: 'Chuvisco gelado leve', dayIcon: 'wi-day-sleet', nightIcon: 'wi-night-alt-sleet' },
    57: { desc: 'Chuvisco gelado denso', dayIcon: 'wi-day-sleet', nightIcon: 'wi-night-alt-sleet' },
    61: { desc: 'Chuva leve', dayIcon: 'wi-day-rain', nightIcon: 'wi-night-alt-rain' },
    63: { desc: 'Chuva moderada', dayIcon: 'wi-day-rain', nightIcon: 'wi-night-alt-rain' },
    65: { desc: 'Chuva forte', dayIcon: 'wi-rain', nightIcon: 'wi-rain' },
    66: { desc: 'Chuva gelada leve', dayIcon: 'wi-day-sleet', nightIcon: 'wi-night-alt-sleet' },
    67: { desc: 'Chuva gelada forte', dayIcon: 'wi-sleet', nightIcon: 'wi-sleet' },
    71: { desc: 'Neve leve', dayIcon: 'wi-day-snow', nightIcon: 'wi-night-alt-snow' },
    73: { desc: 'Neve moderada', dayIcon: 'wi-day-snow', nightIcon: 'wi-night-alt-snow' },
    75: { desc: 'Neve forte', dayIcon: 'wi-snow', nightIcon: 'wi-snow' },
    77: { desc: 'Grãos de neve', dayIcon: 'wi-day-snow', nightIcon: 'wi-night-alt-snow' },
    80: { desc: 'Pancadas de chuva leves', dayIcon: 'wi-day-showers', nightIcon: 'wi-night-alt-showers' },
    81: { desc: 'Pancadas de chuva moderadas', dayIcon: 'wi-day-showers', nightIcon: 'wi-night-alt-showers' },
    82: { desc: 'Pancadas de chuva violentas', dayIcon: 'wi-showers', nightIcon: 'wi-showers' },
    85: { desc: 'Pancadas de neve leves', dayIcon: 'wi-day-snow', nightIcon: 'wi-night-alt-snow' },
    86: { desc: 'Pancadas de neve fortes', dayIcon: 'wi-snow', nightIcon: 'wi-snow' },
    95: { desc: 'Trovoada', dayIcon: 'wi-day-thunderstorm', nightIcon: 'wi-night-alt-thunderstorm' },
    96: { desc: 'Trovoada com granizo leve', dayIcon: 'wi-day-storm-showers', nightIcon: 'wi-night-alt-storm-showers' },
    99: { desc: 'Trovoada com granizo forte', dayIcon: 'wi-storm-showers', nightIcon: 'wi-storm-showers' }
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
    todayMax: document.getElementById('todayMax'),
    todayMin: document.getElementById('todayMin'),
    loading: document.getElementById('loading'),
    error: document.getElementById('error'),
    errorWrapper: document.getElementById('errorWrapper'),
    searchBox: document.getElementById('searchBox'),
    backBtn: document.getElementById('backBtn'),
    errorBackBtn: document.getElementById('errorBackBtn'),
    forecastContainer: document.getElementById('forecastContainer')
};

// --- FUNÇÕES DE DADOS / API (Testáveis) ---

/**
 * Valida se o nome da cidade é uma string não vazia.
 * @param {string} cidade - Nome da cidade a ser validado.
 * @returns {string} Nome da cidade limpo (trimmed).
 * @throws {Error} Se a cidade for inválida.
 */
function validarCidade(cidade) {
    if (!cidade || cidade.trim() === '') {
        throw new Error("O nome da cidade não pode estar vazio.");
    }
    return cidade.trim();
}

/**
 * Busca coordenadas geográficas (latitude/longitude) a partir do nome de uma cidade.
 * @async
 * @param {string} cidade - Nome da cidade.
 * @returns {Promise<Array<Object>>} Lista de resultados da geocodificação.
 * @throws {Error} Se houver erro na rede ou cidade não for encontrada.
 */
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

/**
 * Busca os dados meteorológicos atuais e a previsão de 5 dias.
 * Implementa validação de cache antes da requisição.
 * @async
 * @param {number} lat - Latitude da localização.
 * @param {number} lon - Longitude da localização.
 * @returns {Promise<Object>} Objeto contendo os dados climáticos atuais e a previsão.
 * @throws {Error} Se houver erro de rede, limite de requisições ou resposta inválida.
 */
async function buscarClima(lat, lon) {
    // 1. Tenta recuperar do cache primeiro
    const cachedData = getCache(lat, lon);
    if (cachedData && cachedData.today) {
        return cachedData;
    }

    const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto`;
    
    let response;
    
    try {
        response = await fetch(weatherUrl);
    } catch (error) {
        throw new Error('Falha na conexão de rede.');
    }
    
    if (!response.ok) {
        if (response.status === 429) throw new Error('Limite de requisições excedido. Tente novamente mais tarde.');
        if (response.status >= 500) throw new Error('Erro no servidor da API.');
        throw new Error('Falha na conexão com o serviço meteorológico.');
    }
    
    const data = await response.json();
    if (!data.current || !data.daily) throw new Error('Formato de resposta inválido.');
    
    const processedData = {
        current: data.current,
        daily: processarPrevisao(data.daily),
        today: {
            max: Math.round(data.daily.temperature_2m_max[0]),
            min: Math.round(data.daily.temperature_2m_min[0])
        }
    };

    // 2. Salva no cache antes de retornar
    setCache(lat, lon, processedData);
    
    return processedData;
}

/**
 * Processa os arrays da API de previsão diária em um formato de objetos legível.
 * @param {Object} dailyData - O nó "daily" retornado pela API Open-Meteo.
 * @returns {Array<Object>} Lista formatada com data, código, min e max.
 */
function processarPrevisao(dailyData) {
    const { time, weather_code, temperature_2m_max, temperature_2m_min } = dailyData;
    
    // Pulamos o índice 0 (hoje) para mostrar os próximos 5 dias
    return time.slice(1, 6).map((date, index) => {
        const i = index + 1; // Ajuste do índice devido ao slice
        return {
            date: date,
            code: weather_code[i],
            max: Math.round(temperature_2m_max[i]),
            min: Math.round(temperature_2m_min[i])
        };
    });
}

/**
 * Recupera dados do clima do localStorage se ainda forem válidos.
 * @param {number} lat - Latitude da localização.
 * @param {number} lon - Longitude da localização.
 * @returns {Object|null} Os dados cacheados ou null se expirado/inexistente.
 */
function getCache(lat, lon) {
    try {
        const cacheKey = `weather_${lat.toFixed(2)}_${lon.toFixed(2)}`;
        const cached = localStorage.getItem(cacheKey);
        if (!cached) return null;

        const { data, timestamp } = JSON.parse(cached);
        const isExpired = Date.now() - timestamp > CACHE_EXPIRATION_MS;

        if (isExpired) {
            localStorage.removeItem(cacheKey);
            return null;
        }

        return data;
    } catch (error) {
        console.error('Erro ao ler do localStorage:', error);
        return null;
    }
}

/**
 * Salva os dados do clima no localStorage com um timestamp.
 * @param {number} lat - Latitude da localização.
 * @param {number} lon - Longitude da localização.
 * @param {Object} data - Os dados climáticos a serem salvos.
 */
function setCache(lat, lon, data) {
    try {
        const cacheKey = `weather_${lat.toFixed(2)}_${lon.toFixed(2)}`;
        const cacheData = {
            data,
            timestamp: Date.now()
        };
        localStorage.setItem(cacheKey, JSON.stringify(cacheData));
    } catch (error) {
        // Lida com casos onde o localStorage está cheio ou desabilitado
        console.error('Erro ao salvar no localStorage:', error);
    }
}

// --- FUNÇÕES AUXILIARES E DE INTERFACE ---

function getFormattedDate() {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    return new Intl.DateTimeFormat('pt-BR', options).format(new Date());
}

/**
 * Formata uma string de data ISO para um objeto com dia da semana e data numérica.
 * @param {string} dateStr - Data no formato YYYY-MM-DD.
 * @returns {Object} { weekday, datePart }
 */
function formatDayName(dateStr) {
    const date = new Date(dateStr + 'T00:00:00');
    const day = date.getDate().toString().padStart(2, '0');
    const weekday = new Intl.DateTimeFormat('pt-BR', { weekday: 'long' }).format(date);
    const month = new Intl.DateTimeFormat('pt-BR', { month: 'long' }).format(date);
    
    return {
        weekday: weekday,
        datePart: `${day} de ${month}`
    };
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

/**
 * Inicia o processo de busca de cidade, lidando com múltiplos resultados e erros.
 * @async
 */
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

/**
 * Filtra resultados duplicados ou muito próximos geograficamente para evitar confusão na seleção.
 * @param {Array<Object>} results - Lista bruta de resultados da geocodificação.
 * @returns {Array<Object>} Lista filtrada de locais únicos.
 */
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

/**
 * Formata o rótulo de exibição de uma localização (Cidade, Estado - País).
 * @param {Object} cityData - Dados individuais de uma cidade.
 * @returns {string} Rótulo formatado.
 */
function formatLocationLabel(cityData) {
    const { name, admin1, country } = cityData;
    const statePart = admin1 ? `, ${admin1}` : '';
    return `${name}${statePart} - ${country}`;
}

/**
 * Renderiza a lista de cidades candidatas para que o usuário selecione a correta.
 * @param {Array<Object>} results - Lista de cidades únicas encontradas.
 */
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

/**
 * Busca o clima para uma coordenada específica e renderiza o resultado.
 * @async
 * @param {number} lat - Latitude.
 * @param {number} lon - Longitude.
 * @param {string} label - Rótulo da localização.
 */
async function fetchWeather(lat, lon, label) {
    resetUI();
    elements.loading?.classList.remove('hidden');
    elements.selectionBox?.classList.add('hidden');

    try {
        const weatherData = await buscarClima(lat, lon);
        renderWeather(weatherData, label);
    } catch (err) {
        console.error('Erro ao buscar clima:', err);
        showError(err.message);
    } finally {
        elements.loading?.classList.add('hidden');
    }
}

/**
 * Renderiza os cards de previsão de 5 dias.
 * @param {Array<Object>} dailyData - Lista processada de previsão.
 */
function renderForecast(dailyData) {
    if (!elements.forecastContainer) return;
    elements.forecastContainer.innerHTML = '';

    dailyData.forEach(day => {
        const weatherInfo = WEATHER_CONFIG[day.code] || { desc: '---', dayIcon: 'wi-na' };
        const dateInfo = formatDayName(day.date);
        const card = document.createElement('div');
        card.className = 'forecast-card';
        card.innerHTML = `
            <div class="forecast-header">
                <div class="forecast-date-group">
                    <span class="forecast-weekday">${dateInfo.weekday}</span>
                    <span class="forecast-date-num">${dateInfo.datePart}</span>
                </div>
            </div>
            <div class="forecast-status">
                <i class="wi ${weatherInfo.dayIcon} forecast-icon"></i>
                <span class="forecast-desc">${weatherInfo.desc}</span>
            </div>
            <div class="forecast-temps">
                <div class="temp-item max">
                    <span class="temp-label">Máx</span>
                    <span class="temp-value">${day.max}°</span>
                </div>
                <div class="temp-item min">
                    <span class="temp-label">Mín</span>
                    <span class="temp-value">${day.min}°</span>
                </div>
            </div>
        `;
        elements.forecastContainer.appendChild(card);
    });
}

/**
 * Preenche os elementos do HTML com os dados meteorológicos recuperados.
 * @param {Object} data - Objeto contendo current e daily.
 * @param {string} location - Nome da cidade formatado.
 */
function renderWeather(data, location) {
    const { current, daily, today } = data;
    
    // Fallback para 'today' caso venha de um cache antigo
    const todayInfo = today || (daily && daily.length > 0 ? { max: daily[0].max, min: daily[0].min } : { max: '--', min: '--' });
    
    const { 
        temperature_2m: temp, 
        apparent_temperature: feelsLike, 
        relative_humidity_2m: humidity, 
        wind_speed_10m: wind, 
        weather_code: code,
        is_day: isDay 
    } = current;

    if(elements.displayName) elements.displayName.textContent = location;
    if(elements.tempValue) elements.tempValue.textContent = Math.round(temp);
    if(elements.todayMax) elements.todayMax.textContent = todayInfo.max;
    if(elements.todayMin) elements.todayMin.textContent = todayInfo.min;
    if(elements.feelsLikeValue) elements.feelsLikeValue.textContent = Math.round(feelsLike);
    if(elements.humidityValue) elements.humidityValue.textContent = humidity;
    if(elements.windValue) elements.windValue.textContent = wind;
    if(elements.dateDisplay) elements.dateDisplay.textContent = getFormattedDate();

    const weatherInfo = WEATHER_CONFIG[code] || { desc: 'Condição desconhecida', dayIcon: 'wi-na', nightIcon: 'wi-na' };
    const iconClass = isDay === 1 ? weatherInfo.dayIcon : weatherInfo.nightIcon;
    
    if(elements.descValue) elements.descValue.textContent = weatherInfo.desc;
    if(elements.mainIcon) elements.mainIcon.innerHTML = `<i class="wi ${iconClass}"></i>`;

    updateTheme(isDay);
    renderForecast(daily);

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
  module.exports = { buscarCoordenadas, buscarClima, validarCidade, processarPrevisao };
}