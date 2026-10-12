import { VocationalScores, StationData } from '../types/vocational';
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

  public completeStation(stationId: string, chosenOptionIndex: number, enjoymentRating: number) {
    const station = this.getStation(stationId);
    if (!station || station.completed) return;

    station.completed = true;
    station.enjoymentRating = enjoymentRating;
    
    // Calcular tiempo invertido
    const elapsedSeconds = Math.round((Date.now() - this.stationStartTimestamp) / 1000);
    station.timeSpentSeconds = elapsedSeconds;

    // Ponderación de pesos por opción elegida
    const option = station.resolutionOptions[chosenOptionIndex];
    if (option) {
      // Factor de disfrute emocional (1 a 5 -> 0.8x a 1.4x)
      const enjoymentMultiplier = 0.8 + ((enjoymentRating - 1) * 0.15);

      const keys: (keyof VocationalScores)[] = ['dev', 'net', 'sec', 'data', 'biz'];
      for (const k of keys) {
        const baseWeight = option.weights[k] || 0;
        this.totalScores[k] += Math.round(baseWeight * enjoymentMultiplier * 10) / 10;
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
