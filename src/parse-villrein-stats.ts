import fs from "node:fs/promises";
import { length, lineString, center, points } from "@turf/turf";
import { getWeek } from "date-fns";
import type {
  TTrack,
  TAnimalTracking,
  TTimeGroup,
  TDayStats,
  TAnimalTrackingFile,
} from "./types/api";
import { DATA_DIR, OUT_DIR } from "./helpers/config";

function mergePoints(list: TTrack[]): TTrack {
  const centerPoint = center(points(list.map((pos) => pos.point)));
  const centerPosition = list[Math.round((list.length - 1) / 2)];
  const dist = list.reduce((sum, item) => {
    return sum + item.dist;
  }, 0);
  return {
    ...centerPosition,
    point: [
      centerPoint.geometry.coordinates[0],
      centerPoint.geometry.coordinates[1],
    ],
    dist,
  };
}

export function groupDays(
  items: TAnimalTracking[],
  groupBy: TTimeGroup
): TAnimalTracking[] {
  return items.map((item) => {
    const days = findDateRange(item.positions, groupBy);
    return {
      ...item,
      positions: days.map((day, i) => {
        return mergePoints(day.positions);
      }),
    };
  });
}

export function optimizePositions(
  item: TAnimalTracking,
  minDistance: number
): TAnimalTracking {
  let optimized: TTrack[] = [];
  const days = findDateRange(item.positions, "day");
  days.forEach((day) => {
    let inGroup: TTrack[] = [];
    day.positions.forEach((position, i) => {
      if (position.dist < minDistance) {
        inGroup.push(position);
      } else {
        if (inGroup.length) {
          optimized.push(mergePoints(inGroup));
          inGroup = [];
        }
        optimized.push(position);
      }
    });
    if (inGroup.length) {
      optimized.push(mergePoints(inGroup));
    }
  });
  return {
    ...item,
    positions: optimized,
  };
}

export function findDateRange(
  positions: TTrack[],
  groupBy: TTimeGroup = "day"
): TDayStats[] {
  let days: TDayStats[] = [];
  positions.forEach((position) => {
    const [dayString] = position.date.split("T");
    const day = new Date(position.date);
    const weekString = getWeek(day).toString();
    const found = days.find((d) =>
      groupBy === "day"
        ? d.dayString === dayString
        : d.weekString === weekString
    );
    if (found) {
      found.positions.push(position);
    } else {
      days.push({
        day,
        dayString,
        weekString,
        distance: 0,
        positions: [position],
      });
    }
  });
  days.forEach((day) => {
    day.distance = getDistance(day.positions);
  });
  return days;
}

export function formatMeter(meter: number): string {
  return `${(meter / 1000).toFixed(2)}km`;
}

type TDayStatSummary = {
  min: number;
  avg: number;
  max: number;
};

function findStats(days: TDayStats[]): TDayStatSummary {
  const copy: TDayStats[] = [...days];
  copy.sort((a, b) => a.distance - b.distance);
  const min = copy[0];
  const max = copy[copy.length - 1];
  const total = days.reduce((sum, item) => {
    return sum + item.distance;
  }, 0);
  return {
    min: min.distance,
    avg: total / days.length,
    max: max.distance,
  };
}

function getDistance(tracks: TTrack[]): number {
  if (!tracks || tracks.length < 2) {
    return 0;
  }
  const line = lineString(tracks.map(({ point }) => point));
  return length(line, { units: "meters" });
}

export async function listyears(): Promise<string[]> {
  const files = await fs.readdir(DATA_DIR);
  const allFiles = files
    .filter((name) => name.includes(".json"))
    .map((name) => name.replace(".json", "").split("-")[0]);
  const uniq = [...new Set(allFiles)];
  return uniq;
}

export function getMetaTrack(positions: TTrack[]) {
  const dist = getDistance(positions);
  const days = findDateRange(positions);
  const dayStats = findStats(days);
  return {
    positions: positions.length,
    distance: formatMeter(dist),
    min: formatMeter(dayStats.min),
    avg: formatMeter(dayStats.avg),
    max: formatMeter(dayStats.max),
    days: days.length,
  };
}

export async function collectForYear(year: string): Promise<TAnimalTracking[]> {
  const files = await fs.readdir(DATA_DIR);
  const yearFiles = files
    .filter((name) => name.includes(".json"))
    .filter((name) => name.includes(year));
  const rawFiles: TAnimalTrackingFile[] = await Promise.all(
    yearFiles.map(async (f) => {
      const raw = await fs.readFile(`${DATA_DIR}/${f}`);
      const data = JSON.parse(raw.toString()) as TAnimalTrackingFile;
      return data;
    })
  );
  let clean: TAnimalTracking[] = [];
  rawFiles.forEach((data) => {
    data.vm.forEach(({ id, name, ageString, positions: orgPositions }) => {
      const positions: TTrack[] = orgPositions.map(
        ({ latitude, longitude, dateTime, id }, i) => {
          const prevPoint = i > 0 ? orgPositions[i - 1] : undefined;
          return {
            point: [longitude, latitude],
            date: dateTime,
            dist: prevPoint
              ? length(
                  lineString([
                    [prevPoint.longitude, prevPoint.latitude],
                    [longitude, latitude],
                  ]),
                  { units: "meters" }
                )
              : 0,
          };
        }
      );
      const found = clean.find((item) => item.id === id);
      if (found) {
        found.positions = found.positions.concat(positions);
      } else {
        ageString = ageString.trim();
        clean.push({
          id,
          name,
          ageString,
          positions,
        });
      }
    });
  });
  return clean;
}

export async function writeFiles(year: string, tracks: TAnimalTracking[]) {
  await writeData(
    `${year}-full`,
    tracks.map((item) => optimizePositions(item, 100))
  );
  await writeData(`${year}-day`, groupDays(tracks, "day"));
  await writeData(`${year}-week`, groupDays(tracks, "week"));
}

export async function writeData(
  fileName: string,
  data: any,
  where?: "out" | "data"
) {
  await fs.writeFile(
    `${where !== "data" ? OUT_DIR : DATA_DIR}/${fileName}.json`,
    JSON.stringify(data)
  );
}

export async function parseVillreinStats(
  year: string,
  quiet: boolean = false
): Promise<void> {
  const tracks: TAnimalTracking[] = await collectForYear(year);
  let stats: any[] = tracks.map(({ name, ageString, positions }) => {
    const meta = getMetaTrack(positions);
    return {
      name,
      ageString,
      ...meta,
    };
  });
  await writeFiles(year, tracks);
  if (!quiet) {
    console.table(stats);
  }
}
