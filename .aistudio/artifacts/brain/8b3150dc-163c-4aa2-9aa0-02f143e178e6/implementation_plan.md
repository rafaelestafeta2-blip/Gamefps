# KINETIC Mobile Native — Motor 3D de Alta Performance & Pipeline APK Android

Transformação do simulador FPS tático **KINETIC** em um jogo mobile nativo Android com compilação automatizada de APK via GitHub Actions, motor gráfico 3D otimizado com Escala Dinâmica de Resolução (DRS) para zero travamentos na GPU do celular, e integração nativa de Giroscópio, Vibração Tátil (*Haptics*) e Tela Cheia Horizontal.

### User Review & Critical Decisions

> [!IMPORTANT]
> As decisões abaixo foram alinhadas e confirmadas para garantir máxima performance de hardware no celular e geração direta do instalador `.apk`:

- **Empacotamento Nativo Android (Confirmado)**: Uso do **Capacitor Android + Gradle** com pipeline completo de **GitHub Actions**, gerando automaticamente o arquivo `.apk` nativo acelerado por hardware (WebGL2/GPU) pronto para baixar na aba *Actions / Releases* do seu repositório GitHub.
- **Motor Gráfico Anti-Travamento (Confirmado)**: Implementação de **Escala Dinâmica de Resolução (DRS)** em tempo real combinada com **Presets de Qualidade Gráfica** (*Competitivo 120 FPS*, *Equilibrado 60 FPS* e *Ultra PBR*), ajustando automaticamente a densidade de pixels, sombras e reflexos conforme a carga da GPU do smartphone.
- **Recursos Nativos de Jogos Mobile (Confirmado)**: Adição de **Mira por Giroscópio** (com sensibilidade ajustável e opção de ativar apenas durante a Mira ADS ou sempre), **Vibração Tátil (*Haptics*)** sincronizada com o recuo do disparo, troca de carregador e batimento cardíaco, além de **Modo Tela Cheia Imersivo com Trava Horizontal (*Landscape*)**.

---

### 1. Overview & Core Concept

- **O Que Faz**: Entrega uma experiência FPS tática em primeira pessoa que roda como aplicativo nativo Android (`.apk`) com acesso direto à aceleração de hardware da GPU mobile, sensores giroscópicos para micro-ajustes de mira de precisão, resposta tátil física no motor de vibração do aparelho e taxa de quadros estável (60 a 120 FPS) sem engasgos de navegador.
- **Público-Alvo & Contexto**: Jogadores mobile que buscam mecânicas táticas realistas (inspiradas em *Arena Breakout*, *Standoff 2* e *Call of Duty Mobile*), incluindo recarga em múltiplos estágios com retenção de carregadores no colete, balística 5.56x45mm e incursão CQB em *Killhouse*.
- **Valor Principal**: Elimina gargalos de execução em navegador móvel através de gerenciamento dinâmico de resolução na GPU, empacotamento nativo Android automatizado na nuvem (sem precisar instalar Android Studio localmente) e controles híbridos Touch + Giroscópio.

---

### 2. User Experience & Visual Design

- **Fluxos Principais do Jogador Mobile**:
  1. **Entrada & Modo Imersivo Horizontal**: Na tela inicial ou na barra tática, um botão **Tela Cheia Horizontal** ativa o modo *Fullscreen* e solicita o bloqueio de orientação em paisagem (*Landscape*), ocultando barras do sistema.
  2. **Controle Híbrido Touch + Giroscópio**: O jogador movimenta o operador com o **Joystick Analógico 360°** no polegar esquerdo, faz a mira rápida no **Touch-Pad Direito** (ou arrastando o próprio botão `ATIRAR`) e realiza o ajuste fino de precisão inclinando o celular com o **Giroscópio** (especialmente útil ao mirar com a luneta LPVO 1-4x).
  3. **Feedback Físico Tátil (*Haptics*)**: Cada disparo 5.56mm produz um pulso curto e seco de vibração; o travamento do ferrolho aberto, a inserção do carregador PMAG e o *slap* do ferrolho emitem padrões táteis distintos nas mãos do jogador.
  4. **Painel de Performance GPU & Exportação APK**: Um modal dedicado de **Performance & APK Nativo** permite alternar o preset gráfico (*120 FPS Competitivo*, *Alto*, *Ultra*), calibrar a sensibilidade do Giroscópio, monitorar o FPS/Resolução Dinâmica em tempo real e visualizar o passo a passo de 1 clique para baixar o `.apk` compilado pelo GitHub Actions.

- **Identidade Visual & Ergonomia Mobile**:
  - *Direção Estética*: HUD tático militar de baixa oclusão (>85% da área central livre), desenhado especificamente para telas mobile em modo paisagem.
  - *Paleta de Cores & Contraste*: Fundo escuro profundo (`#090b0e`) nos painéis com bordas técnicas sutis (`border-white/15`), indicadores balísticos em âmbar tático (`#f59e0b`), confirmação de câmara/laser em verde esmeralda (`#10b981`) e alertas críticos em vermelho (`#ef4444`). Zero uso de `backdrop-filter` sobre o canvas WebGL para preservar 100% da banda de memória da GPU mobile.
  - *Tipografia & Hierarquia*: Títulos em `Chakra Petch`, rótulos de interface em `Plus Jakarta Sans` e telemetria balística/FPS em `IBM Plex Mono` com numerais tabulares (`tabular-nums`).
  - *Zonas de Polegar (Thumb Zones)*: Todos os botões interativos possuem área mínima de toque de `44x44px` a `80x80px`, posicionados nos arcos inferiores esquerdo e direito para alcance natural dos polegares, mantendo a telemetria e contagem de munições na faixa superior.

---

### 3. Key Product Decisions & Trade-Offs

- **Decisão 1: Compilação de APK via Capacitor Android + GitHub Actions na Nuvem**
  - *Abordagem Escolhida*: Configurar o projeto com Capacitor Android (`capacitor.config.json` + scripts de sincronização e manifesto de orientação paisagem/hardware acceleration) e um workflow completo do GitHub Actions que provisiona JDK 21 + Android SDK na nuvem da GitHub, executa o build de produção do Vite, gera a pasta nativa `android` e compila o `.apk` via Gradle automaticamente a cada *push*.
  - *Por Quê*: Permite gerar um APK Android nativo real sem exigir que você configure gigabytes de Android Studio ou SDK localmente, além de ativar flags nativas de aceleração de GPU e tela cheia.
  - *Alternativas Consideradas*: Apenas PWA no navegador (descartado como solução única pois o navegador mantém processos em segundo plano e barras de sistema que reduzem a imersão).

- **Decisão 2: Escala Dinâmica de Resolução (DRS) + Presets Gráficos no Motor Three.js**
  - *Abordagem Escolhida*: Integrar um monitor de tempo de quadro (*Frame Pacer / DRS Governor*) diretamente no loop de renderização do motor 3D. Se o tempo de quadro ultrapassar `18ms` (queda abaixo de 55 FPS), o motor reduz suavemente a escala interna de renderização (`pixelRatio` entre `0.65` e `1.5`) sem alterar o tamanho ou a nitidez do HUD em HTML/SVG. Além disso, o preset **Competitivo (120 FPS)** desativa sombras dinâmicas pesadas mantendo a iluminação IBL metálica da arma intacta.
  - *Por Quê*: Em jogos mobile como *Call of Duty Mobile* e *PUBG Mobile*, o segredo para nunca travar é manter o HUD na resolução nativa da tela enquanto a resolução 3D se adapta instantaneamente durante tiroteios intensos.

- **Decisão 3: Fusão de Sensores para Mira por Giroscópio + Haptics**
  - *Abordagem Escolhida*: Combinar os eventos `deviceorientation` / `devicemotion` com filtro passa-baixa (suavização exponencial para eliminar tremores involuntários das mãos) somados ao vetor do Touch-Pad, além de um motor de vibração tátil (`HapticsEngine`) compatível tanto com a API nativa do Android quanto com `navigator.vibrate`.
  - *Por Quê*: Permite que o jogador faça giros rápidos de 180° com o polegar e micro-ajustes de *headshot* apenas inclinando levemente o celular.

---

### 4. Technical Architecture & Data Strategy

#### Diagrama de Arquitetura e Componentes

```
┌────────────────────────────────────────────────────────────────────────────┐
│                   CAMADA NATIVA ANDROID & EMPACOTAMENTO                    │
│  ┌──────────────────────────────────┐  ┌────────────────────────────────┐  │
│  │ Capacitor Android Runtime        │  │ GitHub Actions APK Pipeline    │  │
│  │ • WebGL2 Hardware Acceleration   │  │ • Build Vite + Cap Add/Sync    │  │
│  │ • Immersive Fullscreen Landscape │  │ • Gradle assembleDebug / APK   │  │
│  └───────────────┬──────────────────┘  └───────────────┬────────────────┘  │
└──────────────────┼─────────────────────────────────────┼───────────────────┘
                   ▼                                     ▼
┌────────────────────────────────────────────────────────────────────────────┐
│                CAMADA DE SENSORES MOBILE & GOVERNADOR DE GPU               │
│  ┌─────────────────────────┐  ┌────────────────────┐  ┌─────────────────┐  │
│  │ Gyroscope Aim Controller│  │ Haptic Tactile Eng │  │ Dynamic Res Gov │  │
│  │ • DeviceOrientation API │  │ • Tiro / Recuo     │  │ • Frame Time ms │  │
│  │ • Filtro Anti-Jitter    │  │ • Estágios Recarga │  │ • Auto Scale    │  │
│  │ • Modo: Sempre / Só ADS │  │ • Pulso Cardíaco   │  │ • Presets GPU   │  │
│  └───────────┬─────────────┘  └─────────┬──────────┘  └────────┬────────┘  │
└──────────────┼──────────────────────────┼──────────────────────┼───────────┘
               ▼                          ▼                      ▼
┌────────────────────────────────────────────────────────────────────────────┐
│                     MOTOR DE SIMULAÇÃO 3D (TacticalFPSEngine)              │
│  • Cinemática 60/120 FPS · Carabina 3D PBR · Recarga em 3 Estágios         │
│  • Pool Zero-GC (Cápsulas 5.56mm, Faíscas, Decais, Carregadores no Chão)   │
└──────────────────────────────┬─────────────────────────────────────────────┘
                               ▼
┌────────────────────────────────────────────────────────────────────────────┐
│                     INTERFACE TÁTICA MOBILE (HUD & MODAIS)                 │
│  ┌─────────────────────────┐  ┌────────────────────┐  ┌─────────────────┐  │
│  │ MobileTouchControls     │  │ TacticalHudOverlay │  │ Native & Perf   │  │
│  │ • Joystick 360° + Sprint│  │ • Telemetria Topo  │  │ Settings Modal  │  │
│  │ • Touch-Pad + Drag Fire │  │ • Contador 30+1    │  │ • Qualidade GPU │  │
│  │ • Botões ADS / Recarga  │  │ • Monitor FPS/DRS  │  │ • Giroscópio    │  │
│  │ • Inclinação Q/E        │  │ • Botão Tela Cheia │  │ • Guia APK      │  │
│  └─────────────────────────┘  └────────────────────┘  └─────────────────┘  │
└────────────────────────────────────────────────────────────────────────────┘
```

#### Modelo de Dados & Estado de Performance Mobile

- **Configurações Gráficas & Mobile (`MobilePerformanceConfig`)**:
  - `qualityPreset`: `'COMPETITIVE_120'` (foco total em fluidez, sem sombras dinâmicas, escala ágil), `'BALANCED_60'` (equilíbrio ideal com sombras suaves e DRS ativo) ou `'ULTRA_PBR'` (resolução máxima nativa e reflexos completos).
  - `dynamicResolutionEnabled`: Booleano que ativa o ajuste automático da resolução 3D (`currentRenderScale` de `0.65` a `1.35`) baseado no FPS medido a cada 500ms.
  - `gyroMode`: `'OFF'` | `'ADS_ONLY'` (ativo apenas ao abrir a mira de precisão) | `'ALWAYS'` (sempre ativo).
  - `gyroSensitivity`: Multiplicador de sensibilidade do giroscópio (`0.2x` a `3.0x`).
  - `hapticsEnabled`: Ativa/desativa vibração física do celular em disparos, recargas e dano.
  - `isFullscreenLandscape`: Estado atual do modo tela cheia e orientação horizontal.
  - `liveFps` e `renderScalePercent`: Telemetria em tempo real da saúde da GPU para o jogador.

#### Mapeamento Interativo de Componentes & Estado

- **Governador de Resolução Dinâmica (DRS)**: Monitora uma janela móvel de 30 quadros dentro do motor 3D. Se o FPS cair abaixo de 52, reduz `renderScale` em passos de `0.1` instantaneamente via `renderer.setPixelRatio()`; se o FPS se mantiver estável em 60+, restaura gradualmente a nitidez até o teto do preset escolhido.
- **Controlador de Giroscópio (`GyroAimManager`)**: Solicita permissão de sensores em dispositivos iOS/Android quando ativado, lê as taxas de rotação dos eixos do aparelho em modo paisagem, aplica amortecimento exponencial para filtrar ruído e injeta o delta diretamente em `applyTouchLookDelta(dx, dy)`.
- **Sintetizador Tátil (`HapticsManager`)**: Dispara padrões milimétricos de vibração (`[18]` ms para tiro 5.56mm, `[12, 40, 28]` ms para encaixe do carregador PMAG, `[35]` ms para liberação do ferrolho e `[45, 90, 45]` ms para pulso cardíaco ou dano sofrido).
- **Pipeline Automatizado de APK Android**: Configura o arquivo `capacitor.config.json`, scripts de empacotamento no `package.json` e o workflow de integração contínua do GitHub Actions que gera o arquivo `kinetic-tactical-fps-debug.apk` pronto para instalar no Android a cada atualização do código.
