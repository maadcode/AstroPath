// Modelos de datos para el test vocacional de TI

export type CareerBranch = 'dev' | 'net' | 'sec' | 'data' | 'biz';

export interface VocationalScores {
  dev: number;   // Desarrollo de Software (Construir, programar)
  net: number;   // Redes e Infraestructura (Conectar, autopistas de datos)
  sec: number;   // Seguridad Informática (Proteger, reglas, privacidad)
  data: number;  // Ciencia de Datos e IA (Patrones, análisis, predicción)
  biz: number;   // Gestión y Análisis de Negocios (Organización, personas, prioridades)
}

export interface MinigameMetrics {
  primaryScore: number;         // 0 a 100 puntuación principal
  secondaryBranch?: CareerBranch;
  secondaryScore?: number;       // 0 a 100 puntos extra
  details: { [key: string]: number | string };
  feedbackSummary: string;
}

export interface StationData {
  id: string;
  name: string;
  subname: string;
  leaderNpcName: string;
  leaderTitle: string;
  accentColor: number;
  dilemmaText: string;
  passengers: Array<{
    id: string;
    name: string;
    role: string;
    dialogue: string;
    hint: string;
    visited: boolean;
  }>;
  resolutionOptions: Array<{
    text: string;
    weights: Partial<VocationalScores>;
  }>;
  completed: boolean;
  timeSpentSeconds: number;
  enjoymentRating?: number; // 1 to 5
  minigameMetrics?: MinigameMetrics;
}
