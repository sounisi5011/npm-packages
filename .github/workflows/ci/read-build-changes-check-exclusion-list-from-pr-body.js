/**
 * Parses the pull request body specified in the PR_BODY environment variable and returns a list of files that should be excluded.
 * This script will parse Markdown like this:
 *
 *     ###### ci: build changes check exclusion list
 *
 *     ```
 *     foo/bar.txt
 *     path/to/
 *     ```
 */
const pattern = /(?<=^#+ *ci: +build +changes +check +(?:exclude|exclusion) +list\s+^(`{3,})\s+)^.+(?=^\1`*\s*$)/ims;
const match = pattern.exec(process.env.PR_BODY);
if (match) {
  console.log(match[0].trim());
}
