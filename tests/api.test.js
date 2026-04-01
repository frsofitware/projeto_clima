/** @jest-environment jsdom */

// 1. Criamos todos os elementos do DOM para o JSDOM não reclamar
document.body.innerHTML = `
    <input id="cityInput" />
    <button id="searchBtn">Buscar</button>
    <button id="backBtn">Voltar</button>
    <button id="errorBackBtn">Voltar Erro</button>
    <button id="cancelSelection">Cancelar</button>
    <div id="selectionBox" style="display:none"></div>
    <ul id="cityList"></ul>
    <div id="weatherResult"></div>
    <div id="errorWrapper" style="display:none"></div>
    <div id="error"></div>
    <div id="loading"></div>
    <div id="searchBox"></div>
`;

// 2. Mocking da Fetch API globalmente
global.fetch = jest.fn();

// 3. Importação das funções do seu api.js
const { buscarCoordenadas, buscarClima, validarCidade, processarPrevisao } = require('../assets/js/api');

describe('Módulo de Clima - Integração Open-Meteo', () => {
  
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('1. Validação de Entrada', () => {
    test('Deve retornar erro de validação para entrada vazia', () => {
      expect(() => validarCidade("")).toThrow("O nome da cidade não pode estar vazio.");
    });
  });

  describe('2. Geocodificação (buscarCoordenadas)', () => {
    test('Deve retornar os resultados para uma cidade válida', async () => {
      const mockGeocodingResponse = {
        results: [{ name: 'Rio de Janeiro', latitude: -22.90, longitude: -43.17, country: 'Brazil' }]
      };
      
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockGeocodingResponse,
      });

      const resultado = await buscarCoordenadas('Rio de Janeiro');
      expect(resultado).toEqual(mockGeocodingResponse.results);
      expect(fetch).toHaveBeenCalledTimes(1);
    });

    test('Deve lançar erro para cidade inexistente', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ results: [] }),
      });

      await expect(buscarCoordenadas('CidadeInexistente123')).rejects.toThrow('Cidade não encontrada.');
    });
  });

  describe('3. Busca de Clima (buscarClima)', () => {
    const mockWeatherResponse = {
      current: { temperature_2m: 25.5, weather_code: 3, is_day: 1 },
      daily: {
        time: ['2024-01-01', '2024-01-02', '2024-01-03', '2024-01-04', '2024-01-05', '2024-01-06'],
        weather_code: [3, 1, 0, 3, 45, 51],
        temperature_2m_max: [30, 28, 31, 29, 25, 24],
        temperature_2m_min: [20, 18, 21, 19, 15, 14]
      }
    };

    test('Deve retornar dados atuais e previsão com sucesso', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockWeatherResponse,
      });

      const clima = await buscarClima(-22.90, -43.17);
      expect(clima.current.temperature_2m).toBe(25.5);
      expect(clima.daily).toHaveLength(5);
      expect(clima.daily[0].date).toBe('2024-01-02');
    });

    test('Deve tratar erro 429 (Limite de requisições excedido)', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 429
      });

      await expect(buscarClima(0, 0)).rejects.toThrow('Limite de requisições excedido. Tente novamente mais tarde.');
    });

    test('Deve tratar falha técnica da API (Erro 500)', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 500
      });

      await expect(buscarClima(0, 0)).rejects.toThrow('Erro no servidor da API.');
    });
  });

  describe('4. Processamento de Previsão (processarPrevisao)', () => {
    test('Deve formatar corretamente os dados da API ignorando o primeiro dia', () => {
      const dailyData = {
        time: ['D0', 'D1', 'D2', 'D3', 'D4', 'D5'],
        weather_code: [0, 1, 2, 3, 4, 5],
        temperature_2m_max: [10, 11, 12, 13, 14, 15],
        temperature_2m_min: [0, 1, 2, 3, 4, 5]
      };

      const processado = processarPrevisao(dailyData);
      expect(processado).toHaveLength(5);
      expect(processado[0]).toEqual({ date: 'D1', code: 1, max: 11, min: 1 });
      expect(processado[4].date).toBe('D5');
    });

    test('Deve processar corretamente códigos meteorológicos recém-adicionados (ex: 96 - Granizo)', () => {
      const dailyData = {
        time: ['2024-01-01', '2024-01-02'],
        weather_code: [0, 96],
        temperature_2m_max: [20, 22],
        temperature_2m_min: [10, 12]
      };
      const processado = processarPrevisao(dailyData);
      expect(processado[0].code).toBe(96);
    });
  });

  describe('5. Casos Extremos (Edge Cases)', () => {
    test('Deve lidar com formato JSON inesperado ou incompleto', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ current: {} }), // Faltando o nó "daily"
      });

      await expect(buscarClima(0, 0)).rejects.toThrow('Formato de resposta inválido.');
    });

    test('Deve lidar com falha na conexão de rede (timeout simulado)', async () => {
      fetch.mockRejectedValueOnce(new Error('Network Timeout'));
      await expect(buscarClima(0, 0)).rejects.toThrow('Falha na conexão de rede.');
    });
  });

  describe('6. Cache de Dados Meteorológicos', () => {
    const lat = -22.90;
    const lon = -43.17;
    const mockWeatherResponse = {
      current: { temperature_2m: 25.5, weather_code: 3, is_day: 1 },
      daily: [
        { date: '2024-01-02', code: 1, max: 30, min: 20 }
      ],
      today: { max: 30, min: 20 }
    };

    // Mock da resposta da API (formato bruto)
    const rawApiResponse = {
      current: mockWeatherResponse.current,
      daily: {
        time: ['2024-01-01', '2024-01-02'],
        weather_code: [3, 1],
        temperature_2m_max: [30, 30],
        temperature_2m_min: [20, 20]
      }
    };

    beforeEach(() => {
      localStorage.clear();
      jest.spyOn(Date, 'now');
    });

    afterEach(() => {
      if (Date.now.mockRestore) Date.now.mockRestore();
      jest.restoreAllMocks();
    });

    test('Deve salvar os dados processados no cache após uma requisição bem-sucedida', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => rawApiResponse,
      });

      await buscarClima(lat, lon);
      
      const cacheKey = `weather_${lat.toFixed(2)}_${lon.toFixed(2)}`;
      const cached = JSON.parse(localStorage.getItem(cacheKey));
      
      expect(cached).toBeDefined();
      expect(cached.data.current).toEqual(mockWeatherResponse.current);
      expect(cached.data.daily).toHaveLength(1);
    });

    test('Deve retornar dados do cache se ainda forem válidos (sem nova requisição)', async () => {
      const now = 1700000000000;
      Date.now.mockReturnValue(now);

      const cacheKey = `weather_${lat.toFixed(2)}_${lon.toFixed(2)}`;
      localStorage.setItem(cacheKey, JSON.stringify({
        data: mockWeatherResponse,
        timestamp: now - 5 * 60 * 1000 // 5 minutos atrás (ainda válido)
      }));

      const clima = await buscarClima(lat, lon);
      
      expect(clima).toEqual(mockWeatherResponse);
      expect(fetch).not.toHaveBeenCalled();
    });

    test('Deve fazer nova requisição se o cache estiver expirado', async () => {
      const now = 1700000000000;
      Date.now.mockReturnValue(now);

      const cacheKey = `weather_${lat.toFixed(2)}_${lon.toFixed(2)}`;
      localStorage.setItem(cacheKey, JSON.stringify({
        data: { current: { temperature_2m: 20 }, daily: [] },
        timestamp: now - 11 * 60 * 1000 // 11 minutos atrás (expirado)
      }));

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => rawApiResponse,
      });

      const clima = await buscarClima(lat, lon);
      
      expect(clima.current).toEqual(mockWeatherResponse.current);
      expect(fetch).toHaveBeenCalledTimes(1);
    });

    test('Deve lidar com erro no localStorage e fazer a requisição normalmente', async () => {
      const spy = jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
        throw new Error('Storage disabled');
      });

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => rawApiResponse,
      });

      const clima = await buscarClima(lat, lon);
      
      expect(clima.current).toEqual(mockWeatherResponse.current);
      expect(fetch).toHaveBeenCalledTimes(1);

      spy.mockRestore();
    });
  });
});