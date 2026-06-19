import { registerPlugin } from '@capacitor/core';

export interface HealthConnectPlugin {
  /**
   * Retrieves the availability status of the Health Connect SDK.
   */
  checkStatus(): Promise<{
    status: 'AVAILABLE' | 'PROVIDER_UPDATE_REQUIRED' | 'UNAVAILABLE';
    isAvailable: boolean;
    updateRequired: boolean;
  }>;

  /**
   * Checks if read permissions for steps and total calories are granted.
   */
  checkAndRequestPermissions(): Promise<{
    granted: boolean;
    intentAction?: string;
  }>;

  /**
   * Aggregates total steps and active calories burned corresponding specifically
   * to walking and running/jogging exercise sessions.
   * 
   * @param options optional filters, e.g., { date: "2026-06-19" } in ISO-8601 format. Uses device default local time zone.
   */
  queryWalkingJoggingMetrics(options?: {
    date?: string;
  }): Promise<{
    date: string;
    steps: number;
    calories: number;
  }>;
}

const HealthConnect = registerPlugin<HealthConnectPlugin>('HealthConnect');

export default HealthConnect;
