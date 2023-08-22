import * as curlconverter from "../src/index.js";
import { Word } from "../src/shell/Word.js";
import { parse } from "../src/parse.js";

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const fixturesDir = path.resolve(__dirname, "../../test/fixtures");

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function stringifyWords(o: any): any {
  if (o instanceof Word) {
    return o.toString();
  }
  if (Array.isArray(o)) {
    return o.map((oo) => stringifyWords(oo));
  }
  if (o && o.toString() == "[object Object]") {
    return Object.fromEntries(
      Object.entries(o).map((oo) => [
        stringifyWords(oo[0]),
        stringifyWords(oo[1]),
      ])
    );
  }
  return o;
}
// Special case that returns the parsed argument object
function toParser(curl: string | string[]): string {
  const parserOutput = parse(curl);
  const code = JSON.stringify(stringifyWords(parserOutput), null, 2);
  return code + "\n";
}

// TODO: move this (or something like this) to index.js?
const converters = {
  json: {
    name: "Json",
    extension: ".json",
    converter: curlconverter.toJsonString,
  },
  parser: {
    name: "Parser",
    extension: ".json",
    converter: toParser,
  },
} as const;
type Converter = keyof typeof converters;

// Check that we have at least one test for every generator
// https://github.com/curlconverter/curlconverter/pull/299
const testedConverters = Object.entries(converters).map(
  (c) => c[1].converter.name
);
const untestedConverters = ["toPhpRequests"];
const notConverterExports = ["Word"];

const availableConverters = Object.entries(curlconverter)
  .map((c) => c[1].name)
  .filter((n) => n !== "CCError");
const missing = availableConverters.filter(
  (c) =>
    !testedConverters.includes(c) &&
    !untestedConverters.includes(c) &&
    !notConverterExports.includes(c) &&
    !c.endsWith("Warn")
);
const extra = testedConverters.filter(
  (c) => !availableConverters.includes(c) && c !== "toParser"
);
if (missing.length) {
  console.error("these converters are not tested: " + missing.join(", "));
}
if (extra.length) {
  console.error(
    "these non-existant converters are being tested: " + extra.join(", ")
  );
}
for (const [converterName, converter] of Object.entries(converters)) {
  const testDir = path.resolve(fixturesDir, converterName);
  if (fs.existsSync(testDir)) {
    const dirContents = fs.readdirSync(testDir);
    if (!dirContents.length) {
      console.error(testDir + " doesn't contain any files");
    } else if (
      !dirContents.filter((f) => f.endsWith(converter.extension)).length
    ) {
      // TODO: early stopping
      console.error(
        testDir +
          " doesn't have any files ending with '" +
          converter.extension +
          "'"
      );
    }
  } else {
    console.error(
      converterName + " doesn't have a corresponding directory in fixtures/"
    );
  }
}

export { converters };
export type { Converter };
