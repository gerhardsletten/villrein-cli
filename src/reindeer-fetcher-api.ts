import "dotenv/config";
import got, { type Got } from "got";
import { parse } from "node-html-parser";
import { CookieJar } from "tough-cookie";
import PQueue from "p-queue";
import { format } from "date-fns";
import type {
  TAnimalTrackingFile,
  TApiIndividuals,
  TApiIndividualsPayload,
  TApiParams,
  TApiParamsPositions,
} from "./types/api";

const API_BASE_URL = process.env.API_BASE_URL;
const API_USERNAME = process.env.API_USERNAME;
const API_PASSWORD = process.env.API_PASSWORD;

export class ReindeerFetcherApi {
  _api!: Got;
  _cookieJar!: CookieJar;
  _isAuthenticated = false;
  dateFormat = "yyyy-MM-dd'T'HH:mm:ss+01:00";
  constructor() {
    this._cookieJar = new CookieJar();
    this._api = got.extend({
      cookieJar: this._cookieJar,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });
  }
  async ensureAuth(): Promise<void> {
    if (!this._isAuthenticated) {
      const authUrl = `${API_BASE_URL}/Account/Login?returnurl=%2F`;
      const initalPage = await this._api(authUrl);
      const root = parse(initalPage.body);
      const inputToken = root.querySelector(
        '[name="__RequestVerificationToken"]'
      );
      const token = inputToken.getAttribute("value");
      const form = new URLSearchParams({
        Email: API_USERNAME,
        Password: API_PASSWORD,
        __RequestVerificationToken: token,
        RememberMe: "false",
      });
      const data = await this._api.post(authUrl, {
        body: form.toString(),
        methodRewriting: false,
        followRedirect: false,
      });
      this._isAuthenticated = data.statusCode === 302;
      if (!this._isAuthenticated) {
        throw new Error("Not authenticated");
      }
    }
  }
  getYearDate(year: number) {
    const now = new Date();
    // 2004-01-01T00:00:00+01:00
    let startDate = new Date(`${year}-01-01T00:00:00`);
    let endDate = new Date(`${year + 1}-01-01T00:00:00`);
    if (endDate > now) {
      endDate = now;
    }
    if (startDate > now) {
      startDate = now;
    }
    return {
      startDate,
      endDate,
    };
  }
  getSharedParams(year: number): TApiParams {
    const { startDate, endDate } = this.getYearDate(year);
    return {
      timeInterval: "custom",
      startDate: format(startDate, this.dateFormat),
      endDate: format(endDate, this.dateFormat),
      years: "[]",
      countyId: "0",
      municipalityId: "0",
      projectIds: "[124730]",
    };
  }
  async fetchFullYear(
    year: number,
    reporter?: (value: string) => void
  ): Promise<TAnimalTrackingFile> {
    const animals = await this.getAllIndividuals(year);
    let ready: TAnimalTrackingFile = {
      positionLimitExceeded: false,
      vm: [],
    };
    const queue = new PQueue({
      concurrency: 1,
    });
    animals.forEach((animal, i) => {
      queue.add(async () => {
        const item = await this.getSingleIndividual(animal.id, year, 1);
        reporter && reporter(`${i + 1}/${animals.length}`);
        ready.vm.push(item.vm[0]);
      });
    });
    await queue.onIdle();
    return ready;
  }
  async getAllIndividuals(year: number): Promise<TApiIndividuals[]> {
    await this.ensureAuth();
    const form = new URLSearchParams(this.getSharedParams(year));
    const apiUrl = `${API_BASE_URL}/Home/Individuals`;
    const data: TApiIndividualsPayload = await this._api
      .post(apiUrl, {
        body: form.toString(),
      })
      .json();
    return data.vm.map(
      ({ id, specieName, latitude, longitude, date, sex, age, ageString }) => ({
        id,
        specieName,
        latitude,
        longitude,
        date,
        sex,
        age,
        ageString,
      })
    );
  }
  splitDateString(dates: [Date, Date][], segments: number): [Date, Date][] {
    if (segments === 1) {
      return dates;
    }
    let done: [Date, Date][] = [];
    dates.forEach(([d1, d2]) => {
      const middle = (d2.getTime() - d1.getTime()) / 2;
      const middleDate = new Date(d1.getTime() + middle);
      done.push([d1, middleDate]);
      done.push([middleDate, d2]);
    });

    return this.splitDateString(done, segments / 2);
  }
  async getSingleIndividual(
    individualIds: string,
    year: number,
    segments: number
  ): Promise<TAnimalTrackingFile> {
    await this.ensureAuth();
    const { startDate, endDate } = this.getYearDate(year);
    let data: TAnimalTrackingFile = {
      positionLimitExceeded: false,
      vm: [],
    };
    const dateSegments = this.splitDateString([[startDate, endDate]], segments);
    for await (const dateSegment of dateSegments) {
      const params: TApiParamsPositions = {
        individualIds,
        ...this.getSharedParams(year),
        startDate: format(dateSegment[0], this.dateFormat),
        endDate: format(dateSegment[1], this.dateFormat),
        showAllPositions: "true",
        showWithLocations: "false",
        speciesId: "3",
      };
      const form = new URLSearchParams({
        ...params,
      });
      const apiUrl = `${API_BASE_URL}/Home/Positions`;
      const dataItem: TAnimalTrackingFile = await this._api
        .post(apiUrl, {
          body: form.toString(),
        })
        .json();
      data.positionLimitExceeded = dataItem.positionLimitExceeded;
      data.vm = data.vm.concat(dataItem.vm);
      if (dataItem.positionLimitExceeded) {
        break;
      }
    }
    if (data.positionLimitExceeded) {
      return this.getSingleIndividual(individualIds, year, segments * 2);
    }
    return data;
  }
}
