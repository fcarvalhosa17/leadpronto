import type { Busca, Lead } from "@prisma/client";

export type { Busca, Lead };

export type StatusQual = "pendente" | "sem_site" | "analisado" | "erro";
export type StatusCrm =
  | "novo"
  | "contatado"
  | "reuniao"
  | "proposta"
  | "fechado";

export const STATUS_CRM_ORDER: StatusCrm[] = [
  "novo",
  "contatado",
  "reuniao",
  "proposta",
  "fechado",
];

export const STATUS_CRM_LABEL: Record<StatusCrm, string> = {
  novo: "Novo",
  contatado: "Contatado",
  reuniao: "Reuniao",
  proposta: "Proposta",
  fechado: "Fechado",
};

export const STATUS_QUAL_LABEL: Record<StatusQual, string> = {
  pendente: "Pendente",
  sem_site: "Sem site",
  analisado: "Analisado",
  erro: "Erro",
};

// Coordenada geografica simples
export interface LatLng {
  lat: number;
  lng: number;
}

// Resultado bruto do scraper
export interface ScrapedPlace {
  placeId: string;
  nome: string;
  categoria?: string;
  endereco?: string;
  telefone?: string;
  site?: string;
  lat?: number;
  lng?: number;
}

// Payload da API de busca
export interface CriarBuscaPayload {
  nicho: string;
  regiao: string;
  raioKm: number;
}
