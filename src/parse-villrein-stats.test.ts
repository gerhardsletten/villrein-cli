import { describe, expect, test } from "@jest/globals";
import {
  collectForYear,
  groupDays,
  listyears,
  optimizePositions,
} from "./parse-villrein-stats.ts";
import type { TAnimalTracking } from "./types/api.ts";

const uniqList = (list: string[]) => [...new Set(list)];

describe("Test suite", () => {
  test("Can list years", async () => {
    const list: string[] = await listyears();
    expect(list[0]).toBeTruthy();
  });
  test("All items", async () => {
    const tracks: TAnimalTracking[] = await collectForYear("2010");
    const data = JSON.stringify(tracks);
    expect(tracks).toBeTruthy();
  });
  test.only("Filter by parse", async () => {
    const tracks: TAnimalTracking[] = await collectForYear("2023");
    console.time("Filter by parse");
    const total = tracks.reduce((sum, item) => sum + item.positions.length, 0);
    let found = 0;
    const filtered: TAnimalTracking[] = tracks.map((track) => {
      const positions = track.positions.filter((position) => {
        const date = new Date(position.date);
        return [0, 1, 3].includes(date.getMonth());
      });
      found += positions.length;
      return {
        ...track,
        positions,
      };
    });
    console.timeEnd("Filter by parse");
    expect(found > 0).toBeTruthy();
    console.log("filtered", {
      total,
      found,
    });
  });
  test("Optimize all items", async () => {
    const tracks: TAnimalTracking[] = await collectForYear("2008");
    const [track] = tracks;
    const optimizied = optimizePositions(track, 1000);
    const lenghtOriginal = Math.round(
      track.positions.reduce((sum, item) => sum + item.dist, 0)
    );
    const lenghtFullOptimized = Math.round(
      optimizied.positions.reduce((sum, item) => sum + item.dist, 0)
    );
    expect(lenghtOriginal).toEqual(lenghtFullOptimized);
  });
  test("Optimize all by day", async () => {
    const tracks: TAnimalTracking[] = await collectForYear("2008");
    const grouped = groupDays(tracks, "day");
    const [track] = grouped;
    const optimizied = optimizePositions(track, 500);
    const lenghtOriginal = Math.round(
      track.positions.reduce((sum, item) => sum + item.dist, 0)
    );
    const lenghtFullOptimized = Math.round(
      optimizied.positions.reduce((sum, item) => sum + item.dist, 0)
    );
    expect(lenghtOriginal).toEqual(lenghtFullOptimized);
  });
  test("Optimize all by week", async () => {
    const tracks: TAnimalTracking[] = await collectForYear("2008");
    const grouped = groupDays(tracks, "week");
    const [track] = grouped;
    const optimizied = optimizePositions(track, 500);
    const lenghtOriginal = Math.round(
      track.positions.reduce((sum, item) => sum + item.dist, 0)
    );
    const lenghtFullOptimized = Math.round(
      optimizied.positions.reduce((sum, item) => sum + item.dist, 0)
    );
    expect(lenghtOriginal).toEqual(lenghtFullOptimized);
  });
  test("Compare days", async () => {
    const [track]: TAnimalTracking[] = await collectForYear("2017");
    const [trackByDay] = groupDays([track], "day");
    const trackOptimized = optimizePositions(track, 1000);
    const daysAll = uniqList(
      track.positions.map((item) => item.date.split("T")[0])
    );
    const daysByDay = uniqList(
      trackByDay.positions.map((item) => item.date.split("T")[0])
    );
    const daysByOptimized = uniqList(
      trackOptimized.positions.map((item) => item.date.split("T")[0])
    );
    expect(daysAll.length).toEqual(daysByDay.length);
    expect(daysByOptimized.length).toEqual(daysByDay.length);
  });
  test("Filter by day", async () => {
    const tracks: TAnimalTracking[] = await collectForYear("2010");
    const grouped = groupDays(tracks, "day");
    const data = JSON.stringify(grouped);
    expect(grouped).toBeTruthy();
  });
  test("Filter by week", async () => {
    const tracks: TAnimalTracking[] = await collectForYear("2010");
    const grouped = groupDays(tracks, "week");
    const data = JSON.stringify(grouped);
    expect(grouped).toBeTruthy();
  });
});
