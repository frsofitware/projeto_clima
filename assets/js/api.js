/**
 * @fileoverview api.js - Lógica de consumo da API Open-Meteo
 * Desenvolvido com foco em resiliência, modularidade e UX.
 */

// --- CONFIGURAÇÃO E MAPEAMENTO ---

/**
 * Mapeamento de códigos meteorológicos da Open-Meteo para classes da biblioteca Weather Icons.
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

/**
 * Valida a entrada do usuário para o nome da cidade.
 * * @param {string} cidade - O nome da cidade digitada no input.
 * @returns {string} O nome da cidade sem espaços desnecessários nas bordas.
 * @throws {Error} Se o nome da cidade for vazio ou contiver apenas espaços.
 * @example
 * const nome = validarCidade("  São Paulo  "); // Retorna "São Paulo"
 */
function validarCidade(cidade) {
    if (!cidade || cidade.trim() === '') {
        throw new Error("O nome da cidade não pode estar vazio.");
    }
    return cidade.trim();
}

/**
 * Busca as coordenadas geográficas (latitude e longitude) de uma cidade.
 * * @async
 * @param {string} cidade - O nome da cidade para buscar.
 * @returns {Promise<Array>} Um array de objetos contendo os resultados geográficos.
 * @throws {Error} Se houver falha na rede ou a cidade não for encontrada.
 * @example
 * const coords = await buscarCoordenadas("Rio de Janeiro");
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
 * Busca os dados meteorológicos atuais com base nas coordenadas.
 * * @async
 * @param {number} lat - Latitude da localização.
 * @param {number} lon - Longitude da localização.
 * @returns {Promise<Object>} Objeto contendo os dados climáticos atuais (temperatura, vento, etc).
 * @throws {Error} Se houver erro de rede, limite de requisições ou resposta inválida.
 * @example
 * const clima = await buscarClima(-22.90, -43.17);
 */
async function buscarClima(lat, lon) {
    const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,weather_code,wind_speed_10m`;
    
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
    if (!data.current) throw new Error('Formato de resposta inválido.');
    
    return data.current;
}

// --- FUNÇÕES AUXILIARES E DE INTERFACE ---

/**
 * Gera a data atual formatada de forma legível em português.
 * * @returns {string} Data no formato "dia da semana, dia de mês de ano".
 * @example
 * const data = getFormattedDate(); // "segunda-feira, 13 de outubro de 2025"
 */
function getFormattedDate() {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    return new Intl.DateTimeFormat('pt-BR', options).format(new Date());
}

/**
 * Atualiza o tema da interface para claro (dia) ou escuro (noite).
 * * @param {number} isDay - 1 para dia, 0 para noite.
 */
function updateTheme(isDay) {
    if (isDay === 1) {
        document.body.classList.add('day-mode');
        document.body.classList.remove('night-mode');
    } else {
        document.body.classList.add('night-mode');
        document.body.classList.remove('day-mode');
    }
}

/**
 * Exibe uma mensagem de erro na interface do usuário.
 * * @param {string} message - A mensagem de erro a ser exibida.
 */
function showError(message) {
    if(elements.error) elements.error.textContent = message;
    elements.errorWrapper?.classList.remove('hidden');
    elements.searchBox?.classList.add('hidden');
    elements.selectionBox?.classList.add('hidden');
    elements.loading?.classList.add('hidden');
}

/**
 * Reseta o estado da interface, escondendo os modais e carregamentos.
 */
function resetUI() {
    elements.weatherResult?.classList.add('hidden');
    elements.selectionBox?.classList.add('hidden');
    elements.errorWrapper?.classList.add('hidden');
    elements.loading?.classList.add('hidden');
}

// --- LÓGICA PRINCIPAL ---

/**
 * Função principal que orquestra a busca, geocodificação e tratamento de resultados.
 * Acionada pelo botão de busca ou tecla Enter.
 * * @async
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
 * Remove localizações duplicadas do resultado da API com base em aproximação geográfica.
 * * @param {Array} results - Lista bruta de resultados da API.
 * @returns {Array} Lista filtrada sem resultados geograficamente ou nominalmente idênticos.
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
 * Formata um objeto de cidade em uma string legível.
 * * @param {Object} cityData - Objeto contendo os dados da cidade.
 * @returns {string} Rótulo formatado (ex: "São Paulo, São Paulo - Brazil").
 */
function formatLocationLabel(cityData) {
    const { name, admin1, country } = cityData;
    const statePart = admin1 ? `, ${admin1}` : '';
    return `${name}${statePart} - ${country}`;
}

/**
 * Renderiza uma lista de botões para o usuário desempatar cidades com nomes iguais.
 * * @param {Array} results - Lista de cidades únicas filtradas.
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
 * Busca o clima final da cidade selecionada e aciona a renderização na tela.
 * * @async
 * @param {number} lat - Latitude exata.
 * @param {number} lon - Longitude exata.
 * @param {string} label - Nome amigável formatado da cidade.
 */
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

/**
 * Preenche os elementos do HTML com os dados meteorológicos recuperados.
 * * @param {Object} data - Objeto de dados climáticos retornados pela API.
 * @param {string} location - Nome da cidade formatado.
 */
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

// --- EVENT LISTENERS ---
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