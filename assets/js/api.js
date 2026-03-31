/**
 * api.js - Lógica de consumo da API Open-Meteo
 * Desenvolvido com foco em resiliência, modularidade e UX.
 */

// --- CONFIGURAÇÃO E MAPEAMENTO ---

/**
 * Mapeamento de códigos meteorológicos da Open-Meteo para classes da biblioteca Weather Icons.
 * @see https://erikflowers.github.io/weather-icons/
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

// --- FUNÇÕES AUXILIARES ---

/**
 * Formata a data atual para o padrão: "segunda-feira, 13 de outubro de 2025"
 */
function getFormattedDate() {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    return new Intl.DateTimeFormat('pt-BR', options).format(new Date());
}

/**
 * Altera o tema visual da página baseado no estado do dia (isDay)
 * @param {number} isDay - 1 para dia, 0 para noite
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
 * Exibe feedback visual de erro
 * @param {string} message 
 */
function showError(message) {
    elements.error.textContent = message;
    elements.errorWrapper.classList.remove('hidden');
    elements.searchBox.classList.add('hidden');
    elements.selectionBox.classList.add('hidden');
    elements.loading.classList.add('hidden');
}

/**
 * Esconde elementos de resultado/erro para resetar a interface
 */
function resetUI() {
    elements.weatherResult.classList.add('hidden');
    elements.selectionBox.classList.add('hidden');
    elements.errorWrapper.classList.add('hidden');
    elements.loading.classList.add('hidden');
}

// --- LÓGICA PRINCIPAL ---

/**
 * Inicia a busca: Geocodificação para encontrar cidades
 */
async function startSearch() {
    const city = elements.cityInput.value.trim();
    
    if (!city) {
        showError('Por favor, digite o nome de uma cidade.');
        return;
    }

    resetUI();
    elements.loading.classList.remove('hidden');
    elements.searchBox.classList.add('hidden');

    try {
        // 1. Geocodificação (Nome -> Lista de Coordenadas)
        // Aumentado count para 20 para garantir que grandes cidades apareçam mesmo com variações de nome
        const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=20&language=pt&format=json`;
        const geoResponse = await fetch(geoUrl);
        
        if (!geoResponse.ok) throw new Error('Falha na conexão com o serviço de geocodificação.');
        
        const geoData = await geoResponse.json();

        if (!geoData.results || geoData.results.length === 0) {
            throw new Error('Cidade não encontrada. Verifique a ortografia.');
        }

        // 2. Filtro de Relevância Geográfica (Sintetizar Resultados)
        // Confiamos na busca da API para a correspondência de nome (que lida com traduções como Tokyo/Tóquio)
        // Mas filtramos para garantir que sejam locais habitados (Cidades/Vilais) e não pontos de interesse
        const relevantResults = geoData.results.filter(item => {
            // Códigos PPL* representam "Populated Places" (Cidades, Capitais, Vilas)
            // Isso remove automaticamente Heliportos, Aeroportos e Parques
            const isPopulatedPlace = item.feature_code && item.feature_code.startsWith('PPL');
            
            // Se for uma capital (PPLC) ou cidade grande, mantemos sempre
            // Caso contrário, verificamos se o nome retornado tem alguma relação com a busca
            // (A API já faz isso, mas validamos para evitar resultados totalmente aleatórios)
            return isPopulatedPlace;
        });

        // Fallback: Se o filtro de cidades removeu tudo (ex: busca por um aeroporto específico), 
        // usamos os resultados originais
        const candidates = relevantResults.length > 0 ? relevantResults : geoData.results;

        // 3. Ordenação por Relevância e Importância
        // Priorizamos: 1. Capitais (PPLC), 2. População maior
        const sortedResults = candidates.sort((a, b) => {
            const aIsCapital = a.feature_code === 'PPLC' ? 1 : 0;
            const bIsCapital = b.feature_code === 'PPLC' ? 1 : 0;
            
            if (aIsCapital !== bIsCapital) return bIsCapital - aIsCapital;
            return (b.population || 0) - (a.population || 0);
        });

        // 4. Filtro de Duplicatas por Coordenadas e Rótulo
        const uniqueResults = filterUniqueLocations(sortedResults);

        // Se após o filtro houver apenas um resultado, busca o clima direto
        if (uniqueResults.length === 1) {
            const cityData = uniqueResults[0];
            fetchWeather(cityData.latitude, cityData.longitude, formatLocationLabel(cityData));
            return;
        }

        // Se houver múltiplos resultados únicos, exibe a lista de seleção
        displayCitySelection(uniqueResults);

    } catch (err) {
        console.error('Erro na busca:', err);
        showError(err.message);
    } finally {
        elements.loading.classList.add('hidden');
    }
}

/**
 * Filtra localizações duplicadas baseadas em coordenadas geográficas e no rótulo visual.
 * Arredondamos para 1 casa decimal para agrupar locais muito próximos e usamos o rótulo
 * para garantir que o usuário não veja duas opções com o mesmo nome/estado/país.
 */
function filterUniqueLocations(results) {
    const seenLabels = new Set();
    const seenCoords = new Set();
    
    return results.filter(city => {
        const label = formatLocationLabel(city);
        // Normalizamos o rótulo para evitar duplicatas por acentuação ou caixa (ex: "São Paulo" vs "sao paulo")
        const normalizedLabel = label.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        
        // Chave de coordenadas com precisão de ~11km (1 casa decimal)
        const coordKey = `${city.latitude.toFixed(1)}|${city.longitude.toFixed(1)}`;
        
        if (seenLabels.has(normalizedLabel) || seenCoords.has(coordKey)) {
            return false;
        }
        
        seenLabels.add(normalizedLabel);
        seenCoords.add(coordKey);
        return true;
    });
}

/**
 * Formata o rótulo da localização (Cidade, Estado - País)
 * Implementa fallback gracioso para admin1 ausente.
 */
function formatLocationLabel(cityData) {
    const { name, admin1, country } = cityData;
    const statePart = admin1 ? `, ${admin1}` : '';
    return `${name}${statePart} - ${country}`;
}

/**
 * Exibe a lista de cidades para o usuário selecionar
 */
function displayCitySelection(results) {
    elements.cityList.innerHTML = '';
    
    results.forEach(city => {
        const button = document.createElement('button');
        button.className = 'city-item';
        
        const label = formatLocationLabel(city);
        
        button.innerHTML = `
            <span class="city-name">${city.name}</span>
            <span class="city-details">${city.admin1 ? city.admin1 + ', ' : ''}${city.country}</span>
        `;
        
        button.onclick = () => {
            fetchWeather(city.latitude, city.longitude, label);
        };
        
        elements.cityList.appendChild(button);
    });

    elements.selectionBox.classList.remove('hidden');
    elements.loading.classList.add('hidden');
}

/**
 * Busca o clima para as coordenadas selecionadas
 */
async function fetchWeather(lat, lon, label) {
    resetUI();
    elements.loading.classList.remove('hidden');
    elements.selectionBox.classList.add('hidden');

    try {
        const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,weather_code,wind_speed_10m`;
        const weatherResponse = await fetch(weatherUrl);
        
        if (!weatherResponse.ok) throw new Error('Falha na conexão com o serviço meteorológico.');
        
        const weatherData = await weatherResponse.json();

        if (!weatherData.current) {
            throw new Error('Dados meteorológicos não disponíveis para esta localização.');
        }

        renderWeather(weatherData.current, label);

    } catch (err) {
        console.error('Erro ao buscar clima:', err);
        showError(err.message);
    } finally {
        elements.loading.classList.add('hidden');
    }
}

/**
 * Renderiza os dados meteorológicos no DOM
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

    // Atualizar textos
    elements.displayName.textContent = location;
    elements.tempValue.textContent = Math.round(temp);
    elements.feelsLikeValue.textContent = Math.round(feelsLike);
    elements.humidityValue.textContent = humidity;
    elements.windValue.textContent = wind;
    elements.dateDisplay.textContent = getFormattedDate();

    // Lógica de Ícone e Descrição
    const weatherInfo = WEATHER_CONFIG[code] || { desc: 'Condição desconhecida', dayIcon: 'wi-na', nightIcon: 'wi-na' };
    const iconClass = isDay === 1 ? weatherInfo.dayIcon : weatherInfo.nightIcon;
    
    elements.descValue.textContent = weatherInfo.desc;
    elements.mainIcon.innerHTML = `<i class="wi ${iconClass}"></i>`;

    // Atualizar Tema (Dia/Noite)
    updateTheme(isDay);

    // Transição de interface
    elements.weatherResult.classList.remove('hidden');
    elements.searchBox.classList.add('hidden');
}

// --- EVENT LISTENERS ---

elements.searchBtn.addEventListener('click', startSearch);

// Atalho: Tecla Enter para buscar
elements.cityInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') startSearch();
});

// Botões de Voltar / Cancelar
const goBack = () => {
    resetUI();
    elements.searchBox.classList.remove('hidden');
    elements.cityInput.value = '';
    document.body.classList.remove('night-mode', 'day-mode');
};

elements.backBtn.addEventListener('click', goBack);
elements.errorBackBtn.addEventListener('click', goBack);
elements.cancelSelection.addEventListener('click', goBack);

// --- ELEMENTOS DO DOM (MANTENDO OS ANTERIORES PARA COMPATIBILIDADE SE NECESSÁRIO) ---
// (Nota: O objeto 'elements' acima já cobre tudo, mas mantemos a estrutura modular)