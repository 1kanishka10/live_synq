import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import "dotenv/config";

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function migrate() {
  // 1) processed_items (from items.json)
 const itemsFile = JSON.parse(fs.readFileSync("./items.json", "utf-8"));
  const items = itemsFile.items.map((it) => ({
    id: it.id,
    lane: it.lane,
    rank: it.rank,
    type: it.type,
    title: it.title,
    plain: it.plain,
    action: it.action,
    deadline: it.deadline,
    deadline_text: it.deadline_text,
    confidence: it.confidence,
    uncertainty: it.uncertainty,
    issue: it.issue,
    consequence: it.consequence,
    location: it.location,
    event_date: it.event_date,
    link: it.link,
    seats_limited: it.seats_limited,
    hours_left: it.hours_left,
    urgency: it.urgency,
  }));

  const { error: itemsError } = await supabase
    .from("processed_items")
    .upsert(items);
  if (itemsError) console.error("processed_items error:", itemsError);
  else console.log(`✅ ${items.length} items inserted into processed_items`);

  // 2) opportunities (from opportunities.json)
  const oppsFile = JSON.parse(
    fs.readFileSync("./src/data/opportunities.json", "utf-8")
  );
  const opportunities = oppsFile.map((o) => ({
    id: o.id,
    category: o.category,
    title: o.title,
    eligibility: o.eligibility,
    deadline: o.deadline,
    description: o.description,
    why_here: o.whyHere,
    confidence: o.confidence,
    uncertainty: o.uncertainty,
    deadline_text: o.deadlineText,
    sources: o.sources,
    source_count: o.sourceCount,
  }));

  const { error: oppsError } = await supabase
    .from("opportunities")
    .upsert(opportunities);
  if (oppsError) console.error("opportunities error:", oppsError);
  else console.log(`✅ ${opportunities.length} opportunities inserted`);
}

migrate();