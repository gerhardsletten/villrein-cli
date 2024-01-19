import { describe, expect, test } from "@jest/globals";
import { filesize } from "filesize";
import {
  type TAnimalTracking,
  collectForYear,
  groupDays,
  listyears,
} from "./parse-villrein-stats.ts";

describe("Test suite", () => {
  test("Can list years", async () => {
    const list: string[] = await listyears();
    expect(list[0]).toBeTruthy();
  });
  test("Alle items", async () => {
    const tracks: TAnimalTracking[] = await collectForYear("2010");
    const data = JSON.stringify(tracks);
    console.log("All item (filesize)", filesize(data.length));
    expect(tracks).toBeTruthy();
  });
  test("Filter by day", async () => {
    const tracks: TAnimalTracking[] = await collectForYear("2010");
    const grouped = groupDays(tracks, "day");
    const data = JSON.stringify(grouped);
    console.log("By day (filesize)", filesize(data.length));
    expect(grouped).toBeTruthy();
  });
  test("Filter by week", async () => {
    const tracks: TAnimalTracking[] = await collectForYear("2010");
    const grouped = groupDays(tracks, "week");
    const data = JSON.stringify(grouped);
    console.log("By week (filesize)", filesize(data.length));
    expect(grouped).toBeTruthy();
  });
});
