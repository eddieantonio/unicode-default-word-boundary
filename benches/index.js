/*!
 * Performance benchmarks for unicode-default-word-boundary
 */
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const Benchmark = require("benchmark");

const original = require("../lib");
let optimized;

try {
  optimized = require("../opt/lib");
} catch {
  console.error("Nothing to compare with. Will print benchmarks for default implementation only.");
}

// Test fixtures
const annaKareninaGreek = readGzippedBook("el-anna-karenina.txt.gz");

// Benchmark!
const splitSuite = new Benchmark.Suite();
splitSuite
  .add("#split() [original]", () => void original.split(annaKareninaGreek))
  .on("cycle", printTestSummary)
  .on("complete", printSuiteSummary);
if (optimized)
  splitSuite.add("#split() [optimized]", () => void optimized.split(annaKareninaGreek));
splitSuite.run();

const fbSuite = new Benchmark.Suite();
fbSuite
  .add("#findBoundaries() [original]", () => {
    Array.from(original.findBoundaries(annaKareninaGreek));
  })
  .on("cycle", printTestSummary)
  .on("complete", printSuiteSummary);
if (optimized)
  fbSuite.add("#findBoundaries() [optimized]", () => {
    Array.from(optimized.findBoundaries(annaKareninaGreek));
  });
fbSuite.run();

///////////////////////////// Utility functions //////////////////////////////

function printTestSummary(event) {
  console.log(String(event.target));
}

function printSuiteSummary() {
  if (this.length == 1) return;

  const fastest = this.filter("fastest");
  const slowest = this.filter("slowest");
  const speedup = slowest[0].stats.mean / fastest[0].stats.mean;
  const fastestName = fastest.map("name");
  console.log(`Fastest: ${fastestName} (${speedup.toFixed(2)}x speed-up)`);
}

function readGzippedBook(name) {
  const filename = path.join(__dirname, "fixtures", name);
  return zlib.gunzipSync(fs.readFileSync(filename)).toString("utf8");
}
