"use client";

import { AlertPreferencesProvider } from "@/components/providers/AlertPreferencesProvider";
import { LocationsProvider } from "@/components/providers/LocationsProvider";
import { UnitsProvider } from "@/components/providers/UnitsProvider";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <UnitsProvider>
      <LocationsProvider>
        <AlertPreferencesProvider>{children}</AlertPreferencesProvider>
      </LocationsProvider>
    </UnitsProvider>
  );
}
