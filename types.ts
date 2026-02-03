
export type ReadingTime = 'morning' | 'evening';

export interface DailyReading {
  date: Date;
  morningReading: string;
  eveningReading: string;
  morningHizbNum?: number;
  eveningHizbNum?: number;
}

export interface AppState {
  startDate: string; // ISO String
  startHizb: number;
}
