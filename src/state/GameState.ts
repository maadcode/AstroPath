import { VocationalScores, StationData, MinigameMetrics } from '../types/vocational';
import { STATIONS_DATA } from '../data/stations';

export class GameState {
  private static instance: GameState;
  
  public stations: StationData[] = [];
  public currentStationId: string | null = null;
  public stationStartTimestamp: number = 0;
  public totalScores: VocationalScores = {
    dev: 0,
    net: 0,
    sec: 0,
    data: 0,
    biz: 0
  };
  public hasSeenWelcome: boolean = false;

  private constructor() {
    this.reset();
  }

  public static getInstance(): GameState {
    if (!GameState.instance) {
      GameState.instance = new GameState();
    }
    return GameState.instance;
  }

  public reset() {
    this.stations = JSON.parse(JSON.stringify(STATIONS_DATA));
    this.currentStationId = null;
    this.stationStartTimestamp = 0;
    this.totalScores = {
      dev: 0,
      net: 0,
      sec: 0,
      data: 0,
      biz: 0
    };
    this.hasSeenWelcome = false;
  }

  public getStation(id: string): StationData | undefined {
    return this.stations.find(s => s.id === id);
  }

  public markPassengerVisited(stationId: string, passengerId: string): boolean {
    const station = this.getStation(stationId);
    if (!station) return false;
    const passenger = station.passengers.find((p: StationData['passengers'][0]) => p.id === passengerId);
    if (passenger) {
      passenger.visited = true;
      return true;
    }
    return false;
  }

  public allPassengersVisited(stationId: string): boolean {
    const station = this.getStation(stationId);
    if (!station) return false;
    return station.passengers.every((p: StationData['passengers'][0]) => p.visited);
  }

  public startStationTimer(stationId: string) {
    this.currentStationId = stationId;
    this.stationStartTimestamp = Date.now();
  }

  public recordMinigameResult(stationId: string, metrics: MinigameMetrics) {
    const station = this.getStation(stationId);
    if (station) {
      station.minigameMetrics = metrics;
    }
  }

  public completeStation(stationId: string, chosenOptionIndex: number, enjoymentRating: number, metrics?: MinigameMetrics) {
    const station = this.getStation(stationId);
    if (!station || station.completed) return;

    station.completed = true;
    station.enjoymentRating = enjoymentRating;
    if (metrics) {
      station.minigameMetrics = metrics;
    }
    
    // Calcular tiempo invertido
    const elapsedSeconds = Math.round((Date.now() - this.stationStartTimestamp) / 1000);
    station.timeSpentSeconds = elapsedSeconds;

    // Factor de disfrute emocional (1 a 5 -> 0.8x a 1.4x)
    const enjoymentMultiplier = 0.8 + ((enjoymentRating - 1) * 0.15);

    // 1. Ponderación por opción estratégica elegida
    const option = station.resolutionOptions[chosenOptionIndex];
    if (option) {
      const keys: (keyof VocationalScores)[] = ['dev', 'net', 'sec', 'data', 'biz'];
      for (const k of keys) {
        const baseWeight = option.weights[k] || 0;
        this.totalScores[k] += Math.round(baseWeight * enjoymentMultiplier * 10) / 10;
      }
    }

    // 2. Ponderación por desempeño técnico y físico en el minijuego Matter
    const finalMetrics = station.minigameMetrics || metrics;
    if (finalMetrics) {
      const stationBranchMap: { [id: string]: keyof VocationalScores } = {
        station_dev: 'dev',
        station_net: 'net',
        station_sec: 'sec',
        station_data: 'data',
        station_biz: 'biz'
      };

      const primaryBranch = stationBranchMap[stationId];
      if (primaryBranch) {
        // Escalar 0 a 100 a un peso técnico de hasta 5.0 puntos vocacionales
        const technicalWeight = (finalMetrics.primaryScore / 100) * 5.0;
        this.totalScores[primaryBranch] += Math.round(technicalWeight * enjoymentMultiplier * 10) / 10;
      }

      if (finalMetrics.secondaryBranch && finalMetrics.secondaryScore) {
        // Escalar 0 a 100 a un peso secundario continuo de hasta 2.5 puntos vocacionales
        const secWeight = (finalMetrics.secondaryScore / 100) * 2.5;
        this.totalScores[finalMetrics.secondaryBranch] += Math.round(secWeight * enjoymentMultiplier * 10) / 10;
      }

      // 3. P_Stealth: Bonificaciones conductuales directas ("Stealth Assessment", Landers 2024)
      if (finalMetrics.behavioralBonuses) {
        const bonusKeys: (keyof VocationalScores)[] = ['dev', 'net', 'sec', 'data', 'biz'];
        for (const bk of bonusKeys) {
          const bonusVal = finalMetrics.behavioralBonuses[bk];
          if (bonusVal && bonusVal > 0) {
            this.totalScores[bk] += Math.round(bonusVal * enjoymentMultiplier * 10) / 10;
          }
        }
      }

      // 4. Criterio P2 del SDD: El tiempo como señal vocacional psicométrica
      const timeBenchmarks: { [id: string]: { fast: number; deliberate: number } } = {
        station_dev: { fast: 30, deliberate: 65 },
        station_net: { fast: 25, deliberate: 55 },
        station_sec: { fast: 28, deliberate: 60 },
        station_data: { fast: 26, deliberate: 55 },
        station_biz: { fast: 40, deliberate: 85 }
      };

      const bm = timeBenchmarks[stationId];
      if (bm) {
        if (elapsedSeconds <= bm.fast) {
          // Resolución rápida y directa: bonificación a Software / Redes
          this.totalScores.dev += Math.round(0.8 * enjoymentMultiplier * 10) / 10;
          this.totalScores.net += Math.round(0.8 * enjoymentMultiplier * 10) / 10;
        } else if (elapsedSeconds >= bm.deliberate && finalMetrics.primaryScore >= 70) {
          // Tiempo invertido calmado, reflexivo y exitoso: bonificación a Datos / Gestión
          this.totalScores.data += Math.round(0.8 * enjoymentMultiplier * 10) / 10;
          this.totalScores.biz += Math.round(0.8 * enjoymentMultiplier * 10) / 10;
        }
      }
    }
  }

  public isGameComplete(): boolean {
    return this.stations.every((s: StationData) => s.completed);
  }

  public getCompletedStationsCount(): number {
    return this.stations.filter((s: StationData) => s.completed).length;
  }

  public getPercentageScores(): VocationalScores {
    const sum = this.totalScores.dev + this.totalScores.net + this.totalScores.sec + this.totalScores.data + this.totalScores.biz;
    if (sum === 0) {
      return { dev: 20, net: 20, sec: 20, data: 20, biz: 20 };
    }

    return {
      dev: Math.round((this.totalScores.dev / sum) * 100),
      net: Math.round((this.totalScores.net / sum) * 100),
      sec: Math.round((this.totalScores.sec / sum) * 100),
      data: Math.round((this.totalScores.data / sum) * 100),
      biz: Math.round((this.totalScores.biz / sum) * 100)
    };
  }
}
