import { FastifyInstance } from "fastify";
import { describe, expect, test, beforeAll, afterAll } from "@jest/globals";
import { buildFastify } from "./app.ts";

describe("Webapp", () => {
  let app!: FastifyInstance;
  beforeAll(async () => {
    app = buildFastify();
  });
  afterAll(async () => {
    await app.close();
  });
  test("Can list years", async () => {
    //await app.listen();
    const response = await app.inject({
      method: "GET",
      url: "/",
    });
    expect(response.statusCode).toEqual(200);
    expect(JSON.parse(response.payload).length).toBeGreaterThan(0);
  });
  test("Can list single year", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/year/2001",
    });
    expect(response.statusCode).toEqual(200);
    expect(JSON.parse(response.payload).length).toBeGreaterThan(0);
  });
  test("Can list single animal and year", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/year/2001?num=1",
    });
    expect(response.statusCode).toEqual(200);
    expect(JSON.parse(response.payload).length).toEqual(1);
  });
});
