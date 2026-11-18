import { useEffect } from "react";
import { useWorkspace } from "./store";
import { DEMO_PROSPECTS } from "./road";

/** Fills an empty workspace with demo prospects so the pipeline screens never look empty. */
export function useDemoSeed() {
  const { ws, set } = useWorkspace();
  useEffect(() => {
    if (ws.prospects.length === 0) set({ prospects: DEMO_PROSPECTS });
  }, [ws.prospects.length]);
}
