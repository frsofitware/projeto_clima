# 🌤️ Projeto Clima (Weather App)

Uma aplicação web robusta, desenvolvida em JavaScript Vanilla, que fornece previsões meteorológicas em tempo real baseadas na localização pesquisada. Este projeto foi construído com foco em resiliência, boas práticas de engenharia de software e excelente Experiência do Usuário (UX).

## ✨ Funcionalidades

- **Busca Precisa:** Geocodificação integrada para diferenciar cidades homônimas (ex: Rio de Janeiro, Brasil vs Rio de Janeiro, México).
- **Clima em Tempo Real:** Retorna temperatura atual, sensação térmica, umidade, velocidade do vento e condição meteorológica detalhada.
- **UI Responsiva e Dinâmica:** A interface altera seu tema visual automaticamente (claro/escuro) dependendo do estado do dia (dia ou noite) na cidade pesquisada.
- **Tratamento de Exceções Avançado:** Feedback claro e amigável para o usuário em casos de cidades não encontradas, falhas de conexão de rede ou limites de requisição da API.
- **Código Coberto por Testes:** Lógica de consumo de API blindada contra regressões através de testes unitários automatizados.

## 🛠️ Tecnologias Utilizadas

- **Frontend:** HTML5, CSS3, JavaScript (Vanilla ES6+).
- **APIs de Dados:** [Open-Meteo API](https://open-meteo.com/) (Geocoding & Forecast).
- **Testes Unitários:** Jest e JSDOM.
- **Ícones:** Biblioteca [Weather Icons](https://erikflowers.github.io/weather-icons/).
- **Documentação de Código:** JSDoc (Padrão de documentação de mercado).

## 🚀 Como Executar o Projeto Localmente

### Pré-requisitos
Para visualizar a aplicação no navegador, não é necessário nenhum software adicional. No entanto, para executar a suíte de testes automatizados, você precisará ter o [Node.js](https://nodejs.org/) instalado em sua máquina.

### Passo a passo (Aplicação)
1. Clone este repositório:
   ```bash
   git clone https://github.com/frsofitware/projeto_clima.git
   ```
2. Navegue até a pasta do projeto:
   ```bash
   cd projeto_clima
   ```
3. Abra o arquivo `index.html` em seu navegador de preferência, ou utilize a extensão **Live Server** do VS Code para uma melhor experiência.

### Passo a passo (Testes Automatizados)
1. Certifique-se de estar na raiz do projeto via terminal.
2. Instale as dependências de desenvolvimento:
   ```bash
   npm install
   ```
3. Execute a suíte de testes com o Jest:
   ```bash
   npm test
   ```

## 🧠 Arquitetura e Decisões Técnicas

O arquivo `api.js` foi estruturado utilizando o princípio de **Separação de Responsabilidades (Separation of Concerns)**. As funções fundamentais que realizam as requisições HTTP (`fetch`) e as validações de dados são independentes da manipulação direta do DOM. 

Esta decisão de design permite que o "motor" da aplicação seja inteiramente testado em um ambiente Node.js isolado (via Jest) sem a necessidade de um navegador real. Utilizamos *Mocks* para simular respostas da API, permitindo validar o comportamento do software em cenários extremos, como timeouts de rede ou formatos de dados inesperados, garantindo a estabilidade do sistema.

## 📄 Licença

Distribuído sob a licença MIT. Consulte o arquivo `LICENSE` para mais informações.