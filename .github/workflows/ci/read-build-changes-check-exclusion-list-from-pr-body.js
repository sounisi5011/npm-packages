const pattern = /(?<=^#+ *ci: +build +changes +check +(?:exclude|exclusion) +list\s+^(`{3,})\s+)^.+(?=^\1`*\s*$)/ims;
const match = pattern.exec(process.env.PR_BODY);
if (match) {
  console.log(match[0].trim());
}
