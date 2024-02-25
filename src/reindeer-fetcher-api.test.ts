import fs from "node:fs/promises";
import { describe, expect, test, beforeAll } from "@jest/globals";
import { ReindeerFetcherApi } from "./reindeer-fetcher-api";
import { filesize } from "filesize";

describe("ReindeerFetcherApi", () => {
  let api!: ReindeerFetcherApi;
  beforeAll(async () => {
    api = new ReindeerFetcherApi();
  });
  test.skip("getAllIndividuals", async () => {
    const payload = await api.getAllIndividuals(2010);
    expect(payload).toBeTruthy();
  }, 20000);
  test("Can get year range", async () => {
    const payload = api.getSharedParams(2023);
    expect(payload).toMatchInlineSnapshot(`
{
  "countyId": "0",
  "endDate": "2024-01-01T00:00:00+01:00",
  "municipalityId": "0",
  "projectIds": "[124730]",
  "startDate": "2023-01-01T00:00:00+01:00",
  "timeInterval": "custom",
  "years": "[]",
}
`);
  });
  test("splitDateString 1", async () => {
    const { startDate, endDate } = api.getYearDate(2023);
    const payload = api.splitDateString([[startDate, endDate]], 1);
    expect(payload).toMatchInlineSnapshot(`
[
  [
    2022-12-31T23:00:00.000Z,
    2023-12-31T23:00:00.000Z,
  ],
]
`);
  });
  test("splitDateString 2", async () => {
    const { startDate, endDate } = api.getYearDate(2023);
    const payload = api.splitDateString([[startDate, endDate]], 2);
    expect(payload).toMatchInlineSnapshot(`
[
  [
    2022-12-31T23:00:00.000Z,
    2023-07-02T11:00:00.000Z,
  ],
  [
    2023-07-02T11:00:00.000Z,
    2023-12-31T23:00:00.000Z,
  ],
]
`);
  });
  test("splitDateString 4", async () => {
    const { startDate, endDate } = api.getYearDate(2023);
    const payload = api.splitDateString([[startDate, endDate]], 4);
    expect(payload).toMatchInlineSnapshot(`
[
  [
    2022-12-31T23:00:00.000Z,
    2023-04-02T05:00:00.000Z,
  ],
  [
    2023-04-02T05:00:00.000Z,
    2023-07-02T11:00:00.000Z,
  ],
  [
    2023-07-02T11:00:00.000Z,
    2023-10-01T17:00:00.000Z,
  ],
  [
    2023-10-01T17:00:00.000Z,
    2023-12-31T23:00:00.000Z,
  ],
]
`);
  });
  test.skip("Can download a whole year", async () => {
    const year = 2001;
    const payload = await api.fetchFullYear(year);
    const size = filesize(JSON.stringify(payload).length);
    console.log("Filesize", size);
    expect(payload).toBeTruthy();
  }, 40000);
});
