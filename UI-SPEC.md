# LeadPronto — Especificação Visual para Redesign

Ferramenta local de prospecção B2B. Roda em `localhost:3000`. Dark mode. Stack: Next.js 15 + Tailwind.

---

## Layout Global

### Header (presente em todas as páginas)
- Fundo: superfície escura com borda inferior sutil
- Esquerda: logo/nome **"LeadPronto"** — link para `/`
- Direita: navegação com 2 links em texto cinza → branco no hover
  - **Busca** → `/`
  - **Kanban** → `/crm/kanban`
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
- Lado direito: 3 controles de filtro em linha

##### Filtros da tabela
1. **Input texto** — placeholder "filtrar por nome/endereço" — busca por empresa/endereço
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

#### Colunas da tabela

| Coluna | Conteúdo | Alinhamento |
|--------|----------|-------------|
| **Empresa** | Nome em branco (bold) + categoria abaixo em cinza pequeno | Esquerda |
| **Site** | Link clicável (abre nova aba) mostrando só o hostname sem www; ou "sem site" em cinza | Esquerda |
| **Telefone** | Texto cinza; "-" se vazio | Esquerda |
| **Endereço** | Texto extra-pequeno cinza; "-" se vazio | Esquerda |
| **Dist (km)** | Número com 2 casas decimais; "-" se vazio | Direita |
| **Score** | Badge colorido com número (ver badges abaixo) | Centro |
| **Status** | Badge de qualificação (ver badges abaixo) | Esquerda |
| **CRM** | Badge de status comercial (ver badges abaixo) | Esquerda |

#### Estado vazio (antes de buscar)
- Área com borda tracejada, texto centralizado cinza: "Faça uma busca para ver os leads aqui."

#### Estado sem resultados (após buscar, filtro vazio)
- Linha na tabela: "Nenhum lead encontrado." — centralizado, cinza

---

## Página 2 — Kanban (`/crm/kanban`)

### Cabeçalho da página
- Título h1: **"Kanban"**
- Subtítulo: "Arraste os cards entre as colunas para atualizar o status comercial."

### Estado loading
- Texto: "Carregando leads..."

### Board Kanban
- Layout: flex horizontal com scroll horizontal, gap entre colunas, padding inferior para scrollbar
- 5 colunas fixas (largura 288px cada)

#### Colunas (da esquerda para direita)

| Coluna | Cor de borda no hover de drop |
|--------|-------------------------------|
| **Novo** | primária |
| **Contatado** | primária |
| **Reunião** | primária |
| **Proposta** | primária |
| **Fechado** | primária |

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

---

## Paleta de cores atual (Tailwind)

| Token | Uso |
|-------|-----|
| `bg-background` | Fundo da página |
| `bg-surface` | Cards, header, colunas kanban |
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
3. Loading (~30s–2min enquanto Playwright raspa o Maps)
4. Lista aparece ordenada por score — leads sem site já têm score 75; demais ficam como "Qualificando"
5. Worker rodando em paralelo atualiza scores a cada ciclo; tabela faz polling 5s e atualiza os badges automaticamente
6. Usuário filtra/ordena a tabela conforme necessário
7. Vai para `/crm/kanban` para gerenciar pipeline — arrasta cards entre colunas
8. Kanban também faz polling 10s

---

## Observações para o redesign

- App é 100% local/desktop — não precisa ser responsivo para mobile pequeno
- Dark mode é o único tema
- Dados chegam de forma assíncrona (polling) — badges de status mudam sem reload
- Tabela não tem paginação atualmente — com muitos leads pode ficar longa
- Kanban tem scroll horizontal para caber as 5 colunas
