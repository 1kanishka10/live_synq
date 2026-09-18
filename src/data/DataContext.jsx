import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient.js";
import deadlinesSeed from "./deadlines.json";
import opportunitiesSeed from "./opportunities.json";
import announcementsSeed from "./announcements.json";
import societiesSeed from "./societies.json";
import missedSeed from "./missed.json";
import statsSeed from "./stats.json";

// Fallback sample corpus — used only if Supabase fetch fails or is empty.
const SEED = {
  deadlines: deadlinesSeed,
  opportunities: opportunitiesSeed,
  announcements: announcementsSeed,
  societies: societiesSeed,
  missed: missedSeed,
  stats: statsSeed,
  source: "sample",
};

const DataContext = createContext(null);

export function DataProvider({ children }) {
  const [data, setData] = useState(SEED);
  const [loading, setLoading] = useState(true);
  const [savedIds, setSavedIds] = useState([]);

  // On first load: pull processed_items + opportunities from Supabase.
  useEffect(() => {
    async function loadFromSupabase() {
      const { data: items, error: itemsError } = await supabase
        .from("processed_items")
        .select("*");

      const { data: opportunities, error: oppsError } = await supabase
        .from("opportunities")
        .select("*");

      const { data: saved, error: savedError } = await supabase
        .from("saved_opportunities")
        .select("opportunity_id");

      if (itemsError) console.error("Error loading processed_items:", itemsError);
      if (oppsError) console.error("Error loading opportunities:", oppsError);
      if (savedError) console.error("Error loading saved_opportunities:", savedError);

      if (items && items.length > 0) {
        setData((prev) => ({ ...prev, items, source: "supabase" }));
      }
      if (opportunities && opportunities.length > 0) {
        setData((prev) => ({ ...prev, opportunities, source: "supabase" }));
      }
      if (saved) {
        setSavedIds(saved.map((s) => s.opportunity_id));
      }
      setLoading(false);
    }

    loadFromSupabase();
  }, []);

  const value = useMemo(
    () => ({
      ...data,
      loading,
      savedIds,
      // Called by ImportButton once a chat has been processed.
      replaceAll: (next) => setData({ ...next, source: "imported" }),
      resetToSample: () => setData(SEED),
      // NEW: save/unsave an opportunity, persisted in Supabase.
      saveOpportunity: async (opportunityId) => {
        const { error } = await supabase
          .from("saved_opportunities")
          .insert({ opportunity_id: opportunityId });
        if (error) {
          console.error("Error saving opportunity:", error);
          return;
        }
        setSavedIds((prev) => [...prev, opportunityId]);
      },
      unsaveOpportunity: async (opportunityId) => {
        const { error } = await supabase
          .from("saved_opportunities")
          .delete()
          .eq("opportunity_id", opportunityId);
        if (error) {
          console.error("Error unsaving opportunity:", error);
          return;
        }
        setSavedIds((prev) => prev.filter((id) => id !== opportunityId));
      },
    }),
    [data, loading, savedIds]
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData must be called inside <DataProvider>");
  return ctx;
}