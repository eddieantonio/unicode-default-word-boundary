import test, { ExecutionContext } from "ava";
const start = process.hrtime();
console.log("PERFORMANCE TEST: split words time");
console.log("Importing split function (which imports WordBreakProperty.ts)");
import { split } from "../lib";
const end = process.hrtime(start);
console.log(`Importing time: ${end[0]}s ${end[1] / 1000000}ms`);
import { readFileSync } from "fs";

console.log("Importing book");

let book = readFileSync("./test/book-example.txt", "utf-8");

test("performance", wordBoundaryRuleTime, book);

console.log("Book imported");

function wordBoundaryRuleTime(
  t: ExecutionContext,
  input: string,
) {
  const iterations = 10;
  // measure time
  let totalTime = 0;
  for (let i = 0; i < iterations; i++) {
    const start = process.hrtime();
    split(input);
    const end = process.hrtime(start);
    console.log(`Execution time ${i}: ${end[0]}s ${end[1] / 1000000}ms`);
    totalTime += end[0] * 1000 + end[1] / 1000000;
  }
  const averageTime = totalTime / iterations;
  const averageSeconds = Math.floor(averageTime / 1000);
  const averageMilliseconds = averageTime % 1000;
  console.log(
    `Average execution time: ${averageSeconds}s ${averageMilliseconds}ms`
  );
  t.deepEqual(1, 1);
}
