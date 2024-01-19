import fs from "node:fs/promises";
import { length, lineString, center, points } from "@turf/turf";
import { type Feature, type FeatureCollection } from "geojson";
import { getWeek } from "date-fns";

const DATA_DIR = "./data";
const OUT_DIR = "./out";

// Point = X, Y
// lng = X
// lat = y

export interface TTrackInput {
  id: string | number;
  latitude: number;
  longitude: number;
  dateTime: string;
}

export interface TAnimalTrackingInput {
  id: string;
  name: string;
  ageString: string;
  positions: TTrackInput[];
  meta: TAnimalTrackingMeta;
}

export interface TTrack {
  id: string | number;
  point: [number, number];
  date: string;
}

export interface TAnimalTrackingMeta {
  positions: number;
  distance: string;
  min: string;
  avg: string;
  max: string;
  days: number;
}

export interface TAnimalTracking {
  id: string;
  name: string;
  ageString: string;
  positions: TTrack[];
  meta: TAnimalTrackingMeta;
}

export interface TAnimalTrackingFile {
  vm: TAnimalTrackingInput[];
}

export interface TDayStats {
  day: Date;
  dayString: string;
  weekString: string;
  distance: number;
  positions: TTrack[];
}

type TTimeGroup = "day" | "week";

export function groupDays(
  items: TAnimalTracking[],
  groupBy: TTimeGroup
): TAnimalTracking[] {
  return items.map((item) => {
    const days = findDateRange(item.positions, groupBy);
    return {
      ...item,
      positions: days.map((day, i) => {
        const centerPoint = center(
          points(day.positions.map((pos) => pos.point))
        );
        let centerPosition =
          day.positions[Math.round((day.positions.length - 1) / 2)];
        return {
          ...centerPosition,
          point: [
            centerPoint.geometry.coordinates[0],
            centerPoint.geometry.coordinates[1],
          ],
        };
      }),
    };
  });
}

export function findDateRange(
  positions: TTrack[],
  groupBy: TTimeGroup = "day"
): TDayStats[] {
  let days: TDayStats[] = [];
  let lastDayPosition: TTrack | undefined;
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
        positions: lastDayPosition ? [lastDayPosition, position] : [position],
      });
    }
    lastDayPosition = position;
  });
  days.forEach((day) => {
    day.distance = getDistance(day.positions);
  });
  return days;
}

function formatMeter(meter: number): string {
  return `${(meter / 1000).toFixed(2)}km`;
}

interface TDayStatSummary {
  min: number;
  avg: number;
  max: number;
}

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

function getGeoFeatureMain(item: TAnimalTracking, index: number): Feature {
  const { positions, ...properties } = item;
  const mainFeature: Feature = {
    type: "Feature",
    geometry: {
      type: "LineString",
      coordinates: positions.map((p) => p.point),
    },
    properties: {
      ...properties,
      index,
    },
  };
  return mainFeature;
}

function getGeoFeature(item: TAnimalTracking): FeatureCollection {
  const { positions, ...properties } = item;
  const days = findDateRange(positions);
  const dayFeatures: Feature[] = days.map(({ positions, day, distance }) => {
    const [position] = positions;
    return {
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: position.point,
      },
      properties: {
        day,
        distance: formatMeter(distance),
      },
    };
  });
  const collection: FeatureCollection = {
    type: "FeatureCollection",
    features: [getGeoFeatureMain(item, 0), ...dayFeatures],
  };
  return collection;
}

export async function listyears(): Promise<string[]> {
  const files = await fs.readdir(DATA_DIR);
  const allFiles = files
    .filter((name) => name.includes(".json"))
    .map((name) => name.replace(".json", "").split("-")[0]);

  const uniq = [...new Set(allFiles)];
  return uniq;
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
        ({ latitude, longitude, dateTime, id }) => ({
          point: [longitude, latitude],
          date: dateTime,
          id: `${id}`,
        })
      );
      const found = clean.find((item) => item.id === id);
      if (found) {
        found.positions = found.positions.concat(positions);
      } else {
        ageString = ageString.trim();
        const dist = getDistance(positions);
        const days = findDateRange(positions);
        const dayStats = findStats(days);
        clean.push({
          id,
          name,
          ageString,
          positions,
          meta: {
            positions: positions.length,
            distance: formatMeter(dist),
            min: formatMeter(dayStats.min),
            avg: formatMeter(dayStats.avg),
            max: formatMeter(dayStats.max),
            days: days.length,
          },
        });
      }
    });
  });
  return clean;
}

export async function writeFiles(year: string, tracks: TAnimalTracking[]) {
  await writeData(`${year}-full`, tracks);
  await writeData(`${year}-day`, groupDays(tracks, "day"));
  await writeData(`${year}-week`, groupDays(tracks, "week"));
}

export async function writeData(fileName: string, data: any) {
  await fs.writeFile(`${OUT_DIR}/${fileName}.json`, JSON.stringify(data));
}

export async function parseVillreinStats(
  year: string,
  quiet: boolean = false
): Promise<void> {
  const tracks: TAnimalTracking[] = await collectForYear(year);
  let stats: any[] = tracks.map(({ name, ageString, meta }) => {
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
