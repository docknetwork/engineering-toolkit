#!/usr/bin/env node
// Renders a Bearer-CLI JSON report into a Markdown summary and the process output.
//
// Usage: node bearer-summary.mjs <report-file> <summary-file>
//          <minimum-severity> [repository] [ref] [heading]
//
// Set ANNOTATION_LEVEL to "warning" or "error" to emit GitHub annotations.

import { readFileSync, writeFileSync } from "node:fs";

const SEVERITY_ORDER = ["critical", "high", "medium", "low", "warning"];
const ANNOTATION_LEVELS = new Set(["error", "warning"]);
const MAX_GITHUB_ANNOTATIONS_PER_STEP = 10;
const NO_FINDINGS = "No findings at the selected severity threshold.";
const DEFAULT_HEADING = "Bearer-CLI Full Scan";

function fail(message) {
  console.error(message);
  process.exit(1);
}

function readArgs() {
  const args = process.argv.slice(2);

  if (args.length < 3 || args.length > 6 || args.slice(0, 3).some((value) => !value)) {
    fail(
      "Usage: node bearer-summary.mjs <report-file> <summary-file> " +
        "<minimum-severity> [repository] [ref] [heading]",
    );
  }

  return args;
}

// Keep every rendered value on one line and inside its own table cell.
function clean(value) {
  return String(value || "")
    .replaceAll("\n", " ")
    .replaceAll("\r", " ")
    .replaceAll("|", "\\|")
    .replaceAll("`", "'");
}

function escapeData(value) {
  return String(value).replaceAll("%", "%25").replaceAll("\r", "%0D").replaceAll("\n", "%0A");
}

function escapeProperty(value) {
  return escapeData(value).replaceAll(":", "%3A").replaceAll(",", "%2C");
}

const [reportFile, summaryFile, minimumSeverity, repository, ref, heading] = readArgs();
const annotationLevel = process.env.ANNOTATION_LEVEL || "";

if (annotationLevel && !ANNOTATION_LEVELS.has(annotationLevel)) {
  fail("ANNOTATION_LEVEL must be warning or error");
}

let report;
try {
  report = JSON.parse(readFileSync(reportFile, "utf8"));
} catch (error) {
  fail(`Could not read Bearer-CLI report ${reportFile}: ${error.message}`);
}

if (report === null || typeof report !== "object" || Array.isArray(report)) {
  fail("Bearer-CLI report must be a JSON object");
}

const findings = [];
const counts = {};

for (const severity of SEVERITY_ORDER) {
  const items = report[severity] || [];

  if (!Array.isArray(items)) {
    fail(`Bearer-CLI report field '${severity}' must be a list`);
  }

  counts[severity] = items.length;

  for (const item of items) {
    if (item === null || typeof item !== "object" || Array.isArray(item)) {
      fail(`Bearer-CLI report field '${severity}' must contain only objects`);
    }

    const annotationLocation = item.sink || item.source || {};
    const annotationPath = String(item.filename || item.full_filename || "").replace(/^\.\//, "");

    findings.push({
      severity,
      filename: clean(annotationPath || "unknown"),
      line: item.line_number || (item.source || {}).start || 1,
      annotationPath,
      annotationLine: Number(annotationLocation.start || item.line_number) || 1,
      sourceLine: clean((item.source || {}).start || "—"),
      sinkLine: clean((item.sink || {}).start || "—"),
      ruleId: clean(item.id || "unknown"),
      title: clean(item.title || "Bearer-CLI finding"),
      fingerprint: clean(item.fingerprint || "unavailable"),
      documentation: clean(item.documentation_url),
    });
  }
}

if (findings.length === 0) {
  console.log(NO_FINDINGS);
}

const outputFindings = annotationLevel
  ? findings.slice(0, MAX_GITHUB_ANNOTATIONS_PER_STEP)
  : findings;

for (const finding of outputFindings) {
  if (annotationLevel) {
    const properties = [];
    if (finding.annotationPath) {
      properties.push(
        `file=${escapeProperty(finding.annotationPath)}`,
        `line=${finding.annotationLine}`,
      );
    }
    properties.push(
      `title=${escapeProperty(`${finding.severity.toUpperCase()}: ${finding.ruleId}`)}`,
    );

    const message = [
      finding.title,
      `Severity: ${finding.severity.toUpperCase()}`,
      `Rule: ${finding.ruleId}`,
      `Fingerprint: ${finding.fingerprint}`,
      finding.documentation,
    ]
      .filter(Boolean)
      .join("\n");

    console.log(`::${annotationLevel} ${properties.join(",")}::${escapeData(message)}`);
    continue;
  }

  console.log(
    `- [${finding.severity.toUpperCase()}] ${finding.filename}:${finding.line}` +
      ` | ${finding.ruleId} | ${finding.title} | fingerprint=${finding.fingerprint}`,
  );
  if (finding.documentation) {
    console.log(`  ${finding.documentation}`);
  }
}

if (findings.length > outputFindings.length) {
  console.log(
    `${findings.length - outputFindings.length} additional findings are available in the job summary.`,
  );
}

const summary = [`# ${clean(heading || DEFAULT_HEADING)}\n\n`];

if (repository) {
  summary.push(`- Repository: \`${clean(repository)}\`\n`);
}
if (ref) {
  summary.push(`- Ref: \`${clean(ref)}\`\n`);
}

summary.push(
  `- Minimum severity: \`${clean(minimumSeverity)}\`\n`,
  `- Total findings: **${findings.length}**\n\n`,
  "| Critical | High | Medium | Low | Warning |\n",
  "| ---: | ---: | ---: | ---: | ---: |\n",
  `| ${counts.critical} | ${counts.high} | ${counts.medium} | ` +
    `${counts.low} | ${counts.warning} |\n\n`,
);

if (findings.length === 0) {
  summary.push(`${NO_FINDINGS}\n`);
} else {
  summary.push("## Findings\n\n");
  summary.push("| Severity | Finding | Location | Source line | Sink line | Fingerprint |\n");
  summary.push("| --- | --- | --- | ---: | ---: | --- |\n");
  for (const finding of findings) {
    summary.push(
      `| ${finding.severity.toUpperCase()} | ${finding.ruleId}: ${finding.title} |` +
        ` \`${finding.filename}:${finding.line}\` | ${finding.sourceLine} |` +
        ` ${finding.sinkLine} | \`${finding.fingerprint}\` |\n`,
    );
  }
}

writeFileSync(summaryFile, summary.join(""), "utf8");
