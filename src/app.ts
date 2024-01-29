import Fastify from "fastify";
import {
  type TAnimalTracking,
  collectForYear,
  groupDays,
  listyears,
} from "./parse-villrein-stats.ts";

export function buildFastify() {
  const app = Fastify();
  app.get<{
    Querystring: {
      details?: "full" | "week" | "day";
      num?: string;
    };
    Params: {
      year: string;
    };
    Reply: TAnimalTracking[];
  }>("/year/:year", async (req, reply) => {
    const details = req.query.details || "day";
    const year = req.params.year;
    const parsed = parseInt(req.query.num);
    const predicate: (item: TAnimalTracking, i) => boolean = !isNaN(parsed)
      ? (item, i) => i === parsed
      : () => true;
    const tracks: TAnimalTracking[] = await collectForYear(year);
    if (details === "full") {
      return tracks.filter(predicate);
    }
    return groupDays(tracks, details).filter(predicate);
  });

  app.get<{
    Reply: string[];
  }>("/", async (req, reply) => {
    const data: string[] = await listyears();
    return data;
  });

  return app;
}
