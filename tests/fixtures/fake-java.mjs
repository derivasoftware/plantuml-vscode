#!/usr/bin/env node
// Stand-in for `java -jar plantuml.jar -tsvg -pipe`: echoes the piped
// source length and the received args inside an SVG, so tests assert
// both the piping and the command line. FAKE_MODE=fail exits with
// stderr and no SVG.
const chunks = [];
process.stdin.on("data", (c) => chunks.push(c));
process.stdin.on("end", () => {
  if (process.env.FAKE_MODE === "fail") {
    process.stderr.write("boom: no java for you\n");
    process.exit(3);
  }
  const source = Buffer.concat(chunks).toString("utf8");
  process.stdout.write(
    `warning-noise before the markup\n<svg data-args="${process.argv
      .slice(2)
      .join(" ")}" data-len="${source.length}"></svg>`,
  );
  process.exit(0);
});
