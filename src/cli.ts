#!/usr/bin/env node

import { Command } from "@commander-js/extra-typings";
import figlet from "figlet";
import ora from "ora";
import {
  TAnimalTracking,
  collectForYear,
  listyears,
  parseVillreinStats,
  writeData,
  writeFiles,
} from "./parse-villrein-stats.ts";

const program = new Command();
program.name("Villrein").description("CLI to parse files").version("0.2.0");

program
  .command("stats")
  .argument("[year]", "Hvilke år vil du se stats fra", "2001")
  //.argument('[animal]', 'Velg enkeltdyr')
  .option("-q, --quiet", "Lydløs", false)
  .action(async (year, { quiet }) => {
    if (!quiet) {
      console.log(figlet.textSync("Villrein"));
    }
    await parseVillreinStats(year, quiet);
  });

program
  .command("build")
  .option("-q, --quiet", "Lydløs", false)
  .action(async ({ quiet }) => {
    let spinner = ora({
      isSilent: quiet,
    });
    spinner.start("Fetching all years");
    const years = await listyears();
    for await (const year of years) {
      spinner.text = `Generating ${year}`;
      const tracks: TAnimalTracking[] = await collectForYear(year);
      await writeFiles(year, tracks);
    }
    await writeData("years", years);
    spinner.succeed(`${years.length} years generated`);
  });

program.parse(process.argv);
