import { useEffect } from "react";
import { useWorkspace } from "./store";
import { DEMO_PROSPECTS } from "./road";

/** Fills an empty demo workspace with demo prospects so the pipeline screens never look empty. */
export function useDemoSeed() {
  const { ws, set, isDemo } = useWorkspace();
  useEffect(() => {
    if (isDemo && ws.prospects.length === 0) set({ prospects: DEMO_PROSPECTS });
  }, [ws.prospects.length, isDemo]);
}
