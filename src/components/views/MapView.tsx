"use client";

import { Map } from "lucide-react";
import { Panel, PanelHeader, Reveal } from "@/components/ui/Card";

export function MapView() {
  return (
    <Reveal>
      <Panel>
        <PanelHeader
          title="Map view"
          icon={<Map className="h-4 w-4" />}
          subtitle="The interactive map layer is ready for a future enhancement in this build."
        />
        <div className="flex min-h-[280px] items-center justify-center rounded-[18px] border border-dashed border-line bg-white/[0.02] px-4 py-10 text-center">
          <div>
            <p className="text-lg font-semibold text-ink">Map preview coming soon</p>
            <p className="mt-2 text-sm text-ink-soft">
              This dashboard currently focuses on the overview, forecast, alerts, and air-quality data views.
            </p>
          </div>
        </div>
      </Panel>
    </Reveal>
  );
}