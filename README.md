# LeadPronto

Ferramenta local de geracao de leads B2B com qualificacao automatica.

Pesquise por nicho e regiao (ex.: "academia, Vila Mariana, Sao Paulo, 3km") e
o LeadPronto:

1. Geocodifica a regiao (Nominatim / OpenStreetMap).
2. Raspa empresas no Google Maps (Playwright + Chromium).
3. Filtra por raio (Haversine).
4. Em background, qualifica cada empresa com site:
   - PageSpeed Insights (mobile) — score, LCP, INP, CLS
   - Detecta HTTPS e meta viewport
   - Google Safe Browsing (malware/phishing)
5. Calcula um score de oportunidade (quanto pior o site, mais alto).
6. CRM Kanban para mover leads pelo funil comercial.

## Stack

- Next.js 15 (App Router) + React 19 + TypeScript + Tailwind
- Prisma + SQLite (banco local, zero setup externo)
- Playwright (Chromium) para o scraping do Google Maps
- @dnd-kit para o Kanban
- Worker em processo separado (`tsx worker/index.ts`)

## Setup

```bash
# 1. instalar dependencias
npm install

# 2. instalar o Chromium do Playwright (uma vez)
npx playwright install chromium

# 3. aplicar o schema no SQLite
npm run db:push
```

Variaveis de ambiente — copie `.env.example` para `.env.local` e preencha:

```env
GOOGLE_PSI_API_KEY=...           # https://developers.google.com/speed/docs/insights/v5/get-started
GOOGLE_SAFE_BROWSING_API_KEY=... # https://developers.google.com/safe-browsing/v4/get-started
NOMINATIM_USER_AGENT=leadpronto-local (seu-email@exemplo.com)
```

`.env` ja contem `DATABASE_URL=file:./leadpronto.db` (necessario para o
Prisma CLI).

## Rodando

Em **dois terminais**:

```bash
# terminal 1: app web
npm run dev
# abre http://localhost:3000
```

```bash
# terminal 2: worker de qualificacao
npm run worker
```

A UI ja atualiza sozinha (polling de 5s na lista, 10s no Kanban) conforme o
worker for processando os leads pendentes.

## Comandos uteis

| Comando             | O que faz                                              |
| ------------------- | ------------------------------------------------------ |
| `npm run dev`       | Inicia o Next.js em modo desenvolvimento               |
| `npm run worker`    | Loop de qualificacao (PSI + Safe Browsing + Score)     |
| `npm run db:push`   | Aplica `prisma/schema.prisma` no SQLite                |
| `npm run db:studio` | Abre o Prisma Studio para inspecionar o banco          |
| `npm run test:units`| Roda smoke tests das funcoes puras (haversine, score)  |
| `npm run test:scraper` | Roda o scraper isolado (debug). `HEADFUL=1` abre janela |
| `npm run build`     | Build de producao Next.js                              |

## Estrutura

```
app/
  api/
    busca/route.ts     POST cria busca, GET lista buscas
    leads/route.ts     GET lista leads com filtros
    lead/[id]/route.ts GET, PATCH (statusCrm)
  crm/kanban/page.tsx  Kanban com drag and drop
  page.tsx             Tela principal de busca + lista
components/            BuscaForm, LeadsTable, KanbanCard, KanbanColumn, badges
lib/
  db.ts                PrismaClient singleton
  types.ts             Tipos compartilhados (StatusQual, StatusCrm)
  geocode.ts           Nominatim
  haversine.ts         Distancia entre coordenadas
  scraper/maps.ts      Playwright -> Google Maps
  psi.ts               PageSpeed Insights v5
  safebrowsing.ts      Safe Browsing v4 + probeSite (https/viewport)
  scoring.ts           computeScore + SCORING_WEIGHTS
worker/index.ts        Loop infinito de qualificacao
prisma/schema.prisma   Models Busca, Lead
scripts/               Smoke tests (test-units, test-scraper)
```

## Modelo de dados

- **Busca** (id, nicho, regiao, raioKm, lat, lng, totalLeads, createdAt)
- **Lead**
  - identificacao: placeId (unico), nome, categoria, endereco, telefone, site
  - localizacao: lat, lng, distanciaKm
  - qualificacao: psiScore, psiLcpMs, psiInpMs, psiClsScore, hasHttps,
    hasMobileVp, safeMalware
  - status: statusQual (`pendente` | `sem_site` | `analisado` | `erro`),
    statusCrm (`novo` | `contatado` | `reuniao` | `proposta` | `fechado`)
  - score (0-100), ultimoErro, createdAt, updatedAt, qualifiedAt

## Regras de scoring

Score mais alto = oportunidade comercial maior (site pior). Coeficientes em
`lib/scoring.ts → SCORING_WEIGHTS`:

| Sinal                     | Peso |
| ------------------------- | ---: |
| PSI baixo (0-50, invertido) |  50 |
| Sem HTTPS                 |   15 |
| Sem meta viewport mobile  |   15 |
| Marcado pelo Safe Browsing|   20 |
| Erro de analise (baseline)|   50 |

Leads **sem site** sao marcados imediatamente como `sem_site` com score 75
(oportunidade clara, sem necessidade de analise).

## Notas

- O scraper depende do HTML do Google Maps. Se o markup mudar, ajustar os
  seletores em `lib/scraper/maps.ts`.
- Respeita Nominatim enviando `User-Agent` identificavel e limita Brasil
  (`countrycodes=br`).
- PSI faz retry com backoff em 429/5xx; Safe Browsing tem timeout de 20s.
- Nunca commite `.env.local` nem o arquivo `prisma/*.db` (ja no `.gitignore`).
