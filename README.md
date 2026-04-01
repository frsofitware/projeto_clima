# 🌤️ Projeto Clima - Previsão do Tempo

![Status](https://img.shields.io/badge/Status-Concluído-brightgreen)
![License](https://img.shields.io/badge/License-MIT-blue)
![Tech](https://img.shields.io/badge/Tech-Vanilla%20JS-yellow)

Uma aplicação web moderna, ultra-rápida e responsiva para consulta de condições meteorológicas em tempo real. Este projeto foi desenvolvido com foco em **performance**, **privacidade** e **conformidade legal**, utilizando a API pública do [Open-Meteo](https://open-meteo.com/).

---

## 🚀 Funcionalidades Principais

- **Previsão de 5 Dias:** Visualização detalhada das condições meteorológicas para a semana, com ícones dinâmicos e extremos de temperatura.
- **Cache Inteligente (LocalStorage):** Implementação de uma camada de cache com TTL (Time-To-Live) de 10 minutos, otimizando o consumo de banda e reduzindo a latência para o usuário.
- **Interface Bento Grid:** Layout contemporâneo e modular que se adapta perfeitamente a qualquer tamanho de tela.
- **Modo Adaptativo (Dia/Noite):** A interface ajusta automaticamente seu esquema de cores com base no horário e nas condições climáticas da cidade buscada.
- **Busca Inteligente:** Geocodificação integrada que permite encontrar cidades em qualquer lugar do mundo com sugestões de seleção.

---

## 🛠️ Tecnologias e Arquitetura

- **Core:** HTML5 Semântico e CSS3 Moderno (Custom Properties).
- **Lógica:** JavaScript Vanilla (ES6+) - Sem frameworks pesados para garantir o menor tempo de carregamento possível.
- **API de Dados:** [Open-Meteo](https://open-meteo.com/) (Sem necessidade de API Key, garantindo maior segurança no frontend).
- **Ícones:** [Weather Icons](https://erikflowers.github.io/weather-icons/) (Mapeamento customizado via código meteorológico).
- **Testes:** Suíte de testes automatizados com **Jest** e **JSDOM**, cobrindo validações de entrada, geocodificação e lógica de cache.

---

## 🛡️ Segurança, Privacidade e Conformidade

Este projeto adota o princípio de **Privacy by Design**:

### 1. Privacidade do Usuário
- **Zero GPS:** Não solicitamos acesso à geolocalização exata do navegador. A privacidade do usuário é preservada, utilizando apenas a entrada voluntária do nome da cidade.
- **Nenhum PII (Personally Identifiable Information):** Não coletamos, processamos ou armazenamos nomes, e-mails ou qualquer dado pessoal.

### 2. Segurança de Dados
- **Cache Local:** O uso do `localStorage` é estritamente técnico, armazenando apenas dados meteorológicos públicos e nomes de cidades para fins de performance.
- **HTTPS:** Todas as comunicações com a API Open-Meteo são criptografadas via TLS.

### 3. Conformidade Legal
- **Licenciamento Open Source:** O código fonte está sob a licença **MIT**.
- **Atribuição de Dados:** Em total conformidade com a licença **CC BY 4.0** da Open-Meteo.
- **Atribuição de Ativos:** Respeito às licenças **SIL OFL 1.1** e **MIT** dos ícones e fontes utilizados.

---

## 📂 Estrutura do Projeto

```text
├── css/            # Estilos (Variáveis, Bento Grid, Temas)
├── js/             # Lógica da Aplicação (API, Cache, UI)
├── tests/          # Suíte de Testes (Jest)
├── index.html      # Estrutura Principal
├── LICENSE         # Licença MIT (EN/PT)
├── NOTICE.md       # Créditos e Atribuições Legais
└── package.json    # Dependências e Scripts
```

---

## 🧪 Desenvolvimento e Testes

Para rodar o projeto localmente ou executar os testes:

1. **Instalar dependências:**
   ```bash
   npm install
   ```

2. **Executar testes:**
   ```bash
   npm test
   ```

3. **Desenvolvimento (Vite):**
   ```bash
   npm run dev
   ```

---

## 📄 Licença e Créditos

Este software é distribuído sob a licença MIT. Os dados meteorológicos são fornecidos por [Open-Meteo.com](https://open-meteo.com/). Para mais detalhes sobre créditos de terceiros, consulte o arquivo [NOTICE.md](NOTICE.md).