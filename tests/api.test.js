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
const { buscarCoordenadas, buscarClima, validarCidade } = require('../assets/js/api');

describe('Módulo de Clima - Integração Open-Meteo', () => {
  
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('1. Validação de Entrada', () => {
    test('Deve retornar erro de validação para entrada vazia', () => {
      expect(() => validarCidade("")).toThrow("O nome da cidade não pode estar vazio.");
    });

    test('Deve retornar erro de validação para entrada contendo apenas espaços', () => {
      expect(() => validarCidade("   ")).toThrow("O nome da cidade não pode estar vazio.");
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
    test('Deve retornar temperatura e dados atuais com sucesso', async () => {
      const mockWeatherResponse = {
        current: { temperature_2m: 25.5, weather_code: 3, is_day: 1 }
      };

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockWeatherResponse,
      });

      const clima = await buscarClima(-22.90, -43.17);
      expect(clima.temperature_2m).toBe(25.5);
      expect(clima.weather_code).toBe(3);
    });

    test('Deve tratar erro 429 (Limite de requisições excedido)', async () => {
      fetch.mockResolvedValueOnce({ ok: false, status: 429 });
      await expect(buscarClima(0, 0)).rejects.toThrow('Limite de requisições excedido. Tente novamente mais tarde.');
    });

    test('Deve tratar falha técnica da API (Erro 500)', async () => {
      fetch.mockResolvedValueOnce({ ok: false, status: 500 });
      await expect(buscarClima(0, 0)).rejects.toThrow('Erro no servidor da API.');
    });
  });

  describe('4. Casos Extremos (Edge Cases)', () => {
    test('Deve lidar com formato JSON inesperado ou incompleto', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ dado_aleatorio: "vazio" }),
      });
      await expect(buscarClima(0, 0)).rejects.toThrow('Formato de resposta inválido.');
    });

    test('Deve lidar com falha na conexão de rede (timeout simulado)', async () => {
      fetch.mockRejectedValueOnce(new Error('Network Timeout'));
      await expect(buscarClima(0, 0)).rejects.toThrow('Falha na conexão de rede.');
    });
  });
});