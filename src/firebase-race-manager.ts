import { initializeApp, getApp, getApps, FirebaseApp } from "firebase/app";
import { getFirestore, Firestore, collection, onSnapshot, query, orderBy, limit } from "firebase/firestore";
import raceConfig from "./race-manager-config.json";

let raceApp: FirebaseApp | null = null;
let raceDb: Firestore | null = null;

// Only initialize if a valid configuration is provided
if (raceConfig && raceConfig.apiKey && raceConfig.projectId) {
  try {
    const existingApps = getApps();
    const appName = "raceManager";
    
    const existingApp = existingApps.find(app => app.name === appName);
    if (existingApp) {
      raceApp = existingApp;
    } else {
      raceApp = initializeApp(raceConfig, appName);
    }
    
    if (raceApp) {
      // Initialize Firestore for the secondary app
      raceDb = getFirestore(raceApp, raceConfig.firestoreDatabaseId || undefined);
    }
  } catch (error) {
    console.error("Failed to initialize secondary Firebase app for Race Manager:", error);
  }
}

export { raceApp, raceDb };

/**
 * Checks if the secondary race manager integration has been configured.
 */
export function isRaceManagerConfigured(): boolean {
  return !!(raceConfig && raceConfig.apiKey && raceConfig.projectId);
}
