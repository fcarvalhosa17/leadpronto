# LeadPronto — Especificação Visual para Redesign

Ferramenta local de prospecção B2B. Roda em `localhost:3000`. Dark mode. Stack: Next.js 15 + Tailwind.

---

## Layout Global

### Header (presente em todas as páginas)
- Fundo: superfície escura com borda inferior sutil
- Esquerda: logo/nome **"LeadPronto"** — link para `/`
- Direita: navegação com 4 links em texto cinza → branco no hover
  - **Busca** → `/`
  - **CRM** → `/crm`
  - **Kanban** → `/crm/kanban`
  - **Mapa** → `/crm/mapa`
- Largura máxima: `max-w-7xl`, centralizado, padding horizontal

### Body
- Fundo: cor de fundo escura (`bg-background`)
- Conteúdo: `max-w-7xl`, centralizado, padding `px-6 py-8`

---

## Página 1 — Busca (`/`)

### Cabeçalho da página
- Título h1: **"Geração de leads"** — peso semibold
- Subtítulo: texto pequeno cinza — "Pesquise por nicho e região. O worker em background qualifica cada lead com PageSpeed Insights e Safe Browsing."

---

### Card: Formulário de Busca
- Container: borda arredondada, cor de superfície, padding interno
- Título interno: **"Nova busca"**

#### Campos (em grid responsivo — 1 col mobile, 4 col desktop)

| Campo | Tipo | Placeholder | Observação |
|-------|------|-------------|------------|
| **Nicho** | text input | "ex: academia, dentista" | obrigatório |
| **Região** | text input | "ex: Vila Mariana, Sao Paulo" | obrigatório |
| **Raio (km)** | number input | — | min 1, max 50, default 3 |
| *(botão)* | — | — | alinhado na base |

#### Labels
- Texto extra-pequeno, maiúsculas, espaçamento de letras, cor cinza claro
- Estilo: `NICHO`, `REGIÃO`, `RAIO (KM)`

#### Inputs
- Borda sutil, fundo escuro, padding pequeno, texto sm
- Focus: borda muda para cor primária (azul/destaque)

#### Botão "Buscar leads"
- Cor de fundo: primária (azul)
- Texto branco, peso médio
- Estado loading: texto muda para **"Buscando..."** + opacidade reduzida + desabilitado
- Hover: primária levemente mais escura

#### Estados
- **Erro:** texto vermelho pequeno abaixo do form — "Erro: {mensagem}"
- **Loading:** texto cinza pequeno — "Geocodificando região e raspando o Google Maps. Isso pode levar 30s a 2min."

---

### Card: Tabela de Leads (aparece após busca)

#### Header da tabela
- Linha com: título **"Leads (N)"** + indicador "atualizando..." (quando polling) — lado esquerdo
- Lado direito: controles de filtro em linha

##### Filtros da tabela
1. **Input texto** — placeholder "filtrar por nome/endereço" — busca com 300ms de debounce
2. **Select status qualificação** — opções:
   - Todos status
   - Pendente
   - Sem site
   - Analisado
   - Erro
3. **Select score mínimo** — opções:
   - Score min: qualquer
   - Score min: 50
   - Score min: 70
   - Score min: 80
4. **Botão "Exportar CSV"** — link `<a>` com borda, abre download direto; aplica mesmos filtros ativos

#### Colunas da tabela

| Coluna | Conteúdo | Alinhamento |
|--------|----------|-------------|
| **Empresa** | Nome em branco (bold) + categoria abaixo em cinza pequeno | Esquerda |
| **Site** | Link clicável (abre nova aba) mostrando só o hostname sem www; ou "sem site" em cinza | Esquerda |
| **Telefone** | Texto cinza; "-" se vazio | Esquerda |
| **Endereço** | Texto extra-pequeno cinza; "-" se vazio | Esquerda |
| **Dist (km)** | Número com 2 casas decimais; "-" se vazio | Direita |
| **Rating** | Estrela amarela ★ + nota (ex: 4.3) + contagem em cinza (ex: · 127); "-" se não coletado | Centro |
| **Score** | Badge colorido com número (ver badges abaixo) | Centro |
| **Status** | Badge de qualificação (ver badges abaixo) | Esquerda |
| **CRM** | Badge de status comercial (ver badges abaixo) | Esquerda |

#### Interação
- Click em qualquer linha → abre **LeadDrawer** lateral (ver Componente Drawer abaixo)
- Click no link do site → abre site em nova aba (não dispara drawer)

#### Estado vazio (antes de buscar)
- Área com borda tracejada, texto centralizado cinza: "Faça uma busca para ver os leads aqui."

#### Estado sem resultados (após buscar, filtro vazio)
- Linha na tabela: "Nenhum lead encontrado." — centralizado, cinza

---

## Componente: LeadDrawer (painel lateral deslizante)

Abre sobre qualquer página (Busca ou Kanban) ao clicar num lead. Desliza da direita. Clicar no backdrop ou pressionar ESC fecha.

### Estrutura
- **Backdrop:** overlay escuro semi-transparente (`bg-black/50`) cobrindo toda a tela
- **Painel:** fixo à direita, `max-w-xl` de largura, altura total, scroll interno, `bg-surface`, borda esquerda sutil, sombra profunda

### Cabeçalho (sticky no topo)
- Nome da empresa — texto lg, semibold, branco, truncado
- Categoria abaixo — xs, cinza
- Linha de badges:
  - **ScoreBadge** (número)
  - **QualBadge** (status de qualificação)
  - **CrmBadge** (status comercial)
  - Badge de rating com ⭐ + nota + contagem (amarelo translúcido) — se coletado
  - Badge "Reivindicado" (azul translúcido) — se `claimed = true`
- Botão fechar (×) no canto superior direito

### Seção: Contato
- Título da seção: "CONTATO" — xs, maiúsculas, cinza, tracking-wide
- **Telefone:** número + botões "Ligar" (link `tel:`) e "WhatsApp" (link `wa.me/55...`, verde)
- **Endereço:** texto + botão "Ver no Maps" (link Google Maps)
- **Site:** hostname + botão "Abrir site" (link externo)
- **Distância:** "Distância: X.XX km" — xs, cinza
- **Redes sociais:** botões "Instagram" (rosa) e "Facebook" (azul) se coletados
- **Horário:** "Horário: {texto}" — xs, cinza — se coletado

### Seção: Score
- Título: "SCORE" — xs, maiúsculas, cinza
- Container com fundo ligeiramente diferente e borda
- **Score total:** label + número "/100" + barra de progresso (verde se baixo = oportunidade)
  - Lógica invertida: score alto = lead ruim (já tem site bom), score baixo = oportunidade maior
  - Cores: verde < 40, amarelo < 70, vermelho ≥ 70
- **Se sem site:** aviso "Sem site - score base 75 (oportunidade alta)"
- **Se pendente:** "Qualificação ainda não iniciada"
- **Se analisado:**
  - Barra: PSI Performance (0-100, normal: verde = alto)
  - Grid 2 colunas com pills:
    - HTTPS: "Sim" (verde) / "Não" (vermelho)
    - Mobile viewport: "Sim" (verde) / "Não" (vermelho)
    - Safe Browsing: "Seguro" (verde) / "Ameaça" (vermelho)
    - LCP: valor em ms — se disponível
- **Se erro:** texto vermelho com mensagem do erro

### Seção: Status CRM
- Título: "STATUS CRM"
- **Select de status:** dropdown com 5 opções (Novo / Contatado / Reunião / Proposta / Fechado) — salva via PATCH imediato, faz rollback visual se falhar
- **Campo data:** input `type="date"` para "Próximo contato" — salva via PATCH ao mudar valor

### Seção: Notas e histórico
- Título: "NOTAS E HISTÓRICO"
- Textarea + botão "Adicionar nota" — salva nota via POST
- **Timeline** (mais recente primeiro): mistura notas manuais + atividades automáticas
  - Cada item: badge tipo (azul para "Nota", cinza para atividades como "status_crm"), timestamp, texto
  - Estado vazio: área tracejada "Sem histórico ainda."

---

## Página 2 — CRM Geral (`/crm`)

Lista consolidada de **todos os leads** já coletados em qualquer busca anterior. Diferente da página `/`, não exige uma busca recente — entra com a tabela já populada.

### Cabeçalho da página
- Título h1: **"CRM - Todos os leads"**
- Subtítulo: "Lista consolidada de todos os leads ja coletados em qualquer busca. Filtre por busca, status de qualificacao, status comercial ou score."

### Card: Tabela de Leads (modo CRM)
Reutiliza o componente `LeadsTable` com a prop `mode="crm"`. Comparado ao modo `busca`:

- **Sempre carrega** (não exige `buscaId` para mostrar dados)
- **Filtros adicionais** na barra superior, em ordem:
  1. **Select busca** — primeira opção "Todas as buscas" + lista das últimas 20 buscas (`{nicho} - {regiao}`)
  2. **Input texto** — mesmo padrão (filtra nome/categoria/endereço, debounce 300ms)
  3. **Select status qualificação** — mesmo padrão (Pendente / Sem site / Analisado / Erro)
  4. **Select status CRM** — nova: "Todos CRM" + Novo / Contatado / Reunião / Proposta / Fechado
  5. **Select score mínimo** — mesmo padrão
  6. **Botão "Exportar CSV"** — aplica todos os filtros ativos (incluindo `statusCrm` e `buscaId` selecionado)

#### Colunas e interação
- Idênticas ao modo `busca`: mesmas 9 colunas, click na linha abre o LeadDrawer, polling 5s.

#### Estado sem resultados
- Linha "Nenhum lead encontrado." centralizada — quando filtros zeram a lista. Não há estado "vazio inicial" como na página de busca: se não houver leads no banco, mostra direto a mensagem de "Nenhum lead encontrado."

---

## Página 3 — Kanban (`/crm/kanban`)

### Cabeçalho da página
- Título h1: **"Kanban"**
- Subtítulo: "Arraste os cards entre as colunas para atualizar o status comercial."

### Estado loading
- Texto: "Carregando leads..."

### Board Kanban
- Layout: flex horizontal com scroll horizontal, gap entre colunas, padding inferior para scrollbar
- 5 colunas fixas (largura 288px cada)
- Polling automático a cada 10s

#### Colunas (da esquerda para direita)

| Coluna | Status interno |
|--------|---------------|
| **Novo** | `novo` |
| **Contatado** | `contatado` |
| **Reunião** | `reuniao` |
| **Proposta** | `proposta` |
| **Fechado** | `fechado` |

#### Estrutura de cada coluna
- Container: borda arredondada, fundo superfície, padding interno
- Quando card está sendo arrastado sobre ela: borda muda para cor primária (transição suave)
- Header: título da coluna (semibold) + contador de cards (badge quadrado escuro com número cinza)
- Body: lista vertical de cards com gap; se vazia mostra placeholder com borda tracejada "Vazio"

#### Card Kanban (draggável)
- Container: borda arredondada, fundo escuro (mais escuro que a coluna), padding, sombra sutil
- Cursor: `grab` → `grabbing` durante drag
- Opacidade 40% enquanto sendo arrastado
- **Linha 1:** nome da empresa (truncado, bold, branco) + ScoreBadge alinhado à direita
- **Linha 2:** categoria (truncado, cinza extra-pequeno) — se existir
- **Linha 3:** QualBadge + telefone (se existir) — wrap, gap pequeno
- **Linha 4:** link do site (truncado, cor primária, hover underline) — se existir; clique não ativa drag

#### Interação
- **Drag & drop:** arrasta card para outra coluna → PATCH imediato + rollback se falhar
- **Click no card** (sem drag): abre LeadDrawer

---

## Página 4 — Mapa (`/crm/mapa`)

### Cabeçalho da página
- Título h1: **"Mapa de leads"**
- Subtítulo dinâmico: "X de Y leads com coordenadas." — X = mapeáveis, Y = total

### Barra de filtros
- Container com borda, fundo superfície, padding
- **Select busca:** "Todas as buscas" + lista de buscas (nicho - região)
- **Select score mínimo:** mesmo padrão das outras páginas
- **Legenda de cores** (à direita):
  - ● verde — Score ≥ 80
  - ● amarelo — 60-79
  - ● vermelho — < 60

### Mapa (Leaflet / OpenStreetMap)
- Container com borda arredondada, altura 600px
- Tiles: OpenStreetMap padrão
- Centro calculado como média das coordenadas dos leads visíveis; fallback São Paulo
- Zoom inicial: 13

#### Pins (CircleMarker)
- Raio: 9px
- Cor preenchimento + borda conforme score:
  - Verde (#22c55e) para score ≥ 80
  - Amarelo (#eab308) para score 60-79
  - Vermelho (#ef4444) para score < 60
- Fill opacity: 60%
- Leads sem coordenadas (lat/lng null) são omitidos

#### Popup (ao clicar no pin)
- Nome da empresa — semibold
- Categoria — xs, cinza
- "Score: X"
- Link do site (se existir) — azul, sublinhado
- Botão "Ver detalhes" — azul, abre LeadDrawer

### Estados
- **Carregando:** área 600px com texto centralizado "Carregando leads..."
- **Vazio:** área 600px com borda tracejada "Nenhum lead com coordenadas para exibir."

### LeadDrawer
- Mesmo componente usado nas demais páginas; abre ao clicar "Ver detalhes" no popup

---

## Sistema de Badges

### ScoreBadge (número 0–100)
| Faixa | Cor do badge |
|-------|-------------|
| 0 (sem score) | Cinza neutro |
| 1–59 | Vermelho suave |
| 60–79 | Amarelo suave |
| 80–100 | Verde suave |

Estilo: bordas arredondadas, borda colorida, fundo colorido translúcido, texto colorido, largura mínima para não estreitar

### QualBadge (status de qualificação)
| Valor | Label exibido | Cor |
|-------|--------------|-----|
| `pendente` | Qualificando | Amarelo |
| `sem_site` | Sem site | Cinza |
| `analisado` | Analisado | Verde |
| `erro` | Erro | Vermelho |

### CrmBadge (status comercial)
| Valor | Label exibido | Cor |
|-------|--------------|-----|
| `novo` | Novo | Azul |
| `contatado` | Contatado | Roxo |
| `reuniao` | Reunião | Ciano |
| `proposta` | Proposta | Laranja |
| `fechado` | Fechado | Verde |

Estilo de todos os badges: bordas arredondadas, borda com opacidade, fundo com opacidade, texto colorido, texto extra-pequeno, peso médio

### BoolPill (binário, usado no score breakdown)
| Estado | Cor |
|--------|-----|
| `true` (positivo) | Verde |
| `false` (negativo) | Vermelho |
| `null` (não coletado) | "-" cinza |

---

## Paleta de cores atual (Tailwind)

| Token | Uso |
|-------|-----|
| `bg-background` | Fundo da página |
| `bg-surface` | Cards, header, colunas kanban, drawer |
| `border-border` | Todas as bordas |
| `text-primary` / `bg-primary` | Cor de ação principal (azul) |
| `text-danger` | Erros |
| `text-gray-100` | Texto padrão (quase branco) |
| `text-gray-300–400` | Textos secundários |
| `text-gray-500–600` | Placeholders e textos terciários |

---

## Fluxo de uso

1. Usuário abre `localhost:3000` → vê formulário de busca
2. Preenche Nicho + Região + Raio → clica "Buscar leads"
3. Loading (~30s–2min enquanto Playwright raspa o Google Maps)
4. Lista aparece ordenada por score — leads sem site já têm score 75; demais ficam como "Qualificando"
5. Worker em paralelo atualiza scores; tabela faz polling 5s e atualiza badges automaticamente
6. Clica em lead → abre Drawer lateral com todos os detalhes, score breakdown, ações de contato
7. No Drawer: muda status CRM, agenda próximo contato, adiciona notas; histórico aparece na timeline
8. Acessa `/crm/kanban` para visão de pipeline — arrasta cards entre colunas
9. Acessa `/crm/mapa` para ver distribuição geográfica — pins coloridos por score; popup com ação "Ver detalhes"
10. Exporta lista filtrada via botão "Exportar CSV" na tabela (UTF-8 BOM, abre direto no Excel)

---

## Observações para o redesign

- App é 100% local/desktop — não precisa ser responsivo para mobile pequeno
- Dark mode é o único tema
- Dados chegam de forma assíncrona (polling) — badges de status mudam sem reload
- Tabela não tem paginação — com muitos leads pode ficar longa
- Kanban tem scroll horizontal para caber as 5 colunas
- Drawer aparece sobre qualquer página (z-index alto), backdrop fecha ao clicar, ESC também fecha
- Mapa usa react-leaflet (tiles OpenStreetMap, sem API key)
- CSV exportado inclui: Empresa, Categoria, Site, Telefone, Endereço, Distância, Score, Status Qual, Status CRM, Rating, Reviews, Instagram, Próximo Contato
