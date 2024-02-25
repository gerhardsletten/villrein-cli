export type TApiIndividuals = {
  id: string;
  specieName: string;
  latitude: number;
  longitude: number;
  date: string;
  sex: "Hunn" | "Hann";
  age: string;
  ageString: string;
};
export type TApiIndividualsPayload = { vm: TApiIndividuals[] };

export type TTrackInput = {
  id: string | number;
  latitude: number;
  longitude: number;
  dateTime: string;
};

export type TAnimalTracking = {
  id: string;
  name: string;
  ageString: string;
  positions: TTrack[];
};

export type TAnimalTrackingInput = Omit<TAnimalTracking, "positions"> & {
  positions: TTrackInput[];
  ageString: string;
  id: string;
  sex: 1 | 2;
  specieName: string;
};

export type TTrack = {
  point: [number, number];
  date: string;
  dist: number;
};

export type TAnimalTrackingFile = {
  vm: TAnimalTrackingInput[];
  positionLimitExceeded: boolean;
};

export type TDayStats = {
  day: Date;
  dayString: string;
  weekString: string;
  distance: number;
  positions: TTrack[];
};

export type TTimeGroup = "day" | "week";

export type TApiParams = {
  timeInterval: "custom";
  startDate: string;
  endDate: string;
  years: "[]";
  countyId: "0";
  municipalityId: "0";
  projectIds: "[124730]";
};

export type TApiParamsPositions = TApiParams & {
  individualIds: string;
  showAllPositions: "true";
  showWithLocations: "false";
  speciesId: "3";
};
