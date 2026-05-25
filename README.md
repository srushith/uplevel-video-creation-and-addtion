# Uplevel Video Creation & Addition

A Node.js browser-automation script that bulk-creates video entries on the **Uplevel** (Interview Kickstart) platform. For each row in a CSV, it opens a source page, scrapes the Vimeo URL embedded in it, and then fills out and submits Uplevel's "Create Video" form automatically using [Playwright](https://playwright.dev/). The outcome of every row (Completed / Failed) is logged to a status CSV.

> Internal package name: `ik_video_creation`

---

## Table of Contents

- [How It Works](#how-it-works)
- [Requirements](#requirements)
- [Installation](#installation)
- [Connecting to Chrome (Required)](#connecting-to-chrome-required)
- [Input File](#input-file)
- [Usage](#usage)
- [Output](#output)
- [Configuration Reference](#configuration-reference)
- [Project Structure](#project-structure)
- [Troubleshooting](#troubleshooting)
- [Notes & Caveats](#notes--caveats)

---

## How It Works

The script (`main.js`) runs as a single asynchronous routine that processes the input CSV row by row. For each row it performs the following steps:

1. **Load the CSV** — reads `input.csv` into memory using `csv-parser`.
2. **Connect to Chrome** — attaches to an *already running* Chrome instance over the Chrome DevTools Protocol (CDP) at `http://127.0.0.1:9222`, reusing its existing browser context (and therefore your existing logged-in session).
3. **Open the source page** — navigates to the row's `sourceUrl`.
4. **Extract the Vimeo URL** — reads the value from the second input field with the placeholder `Enter video url here`.
5. **Open the create page** — navigates to `https://uplevel.interviewkickstart.com/create_video/`.
6. **Fill the form** — enters the video name, pastes the extracted Vimeo URL, and selects the resource-type option `Yes, Alternative` from a dropdown.
7. **Submit** — scrolls down and clicks **SAVE**.
8. **Record status** — appends a row to `status.csv` marking the video `Completed`, or `Failed` if any step threw an error.

Because the script connects to your own Chrome session rather than launching a fresh, unauthenticated browser, it relies on you already being logged in to Uplevel.

---

## Requirements

- **Node.js** (with npm) — a current LTS release is recommended.
- **Google Chrome** — launched with remote debugging enabled (see below).
- An **authenticated Uplevel session** in that Chrome instance.

### Dependencies

| Package | Version | Purpose |
|---|---|---|
| `playwright` | ^1.59.1 | Browser automation / CDP connection |
| `csv-parser` | ^3.2.1 | Reading the input CSV |
| `csv-writer` | ^1.6.0 | Appending results to the status CSV |
| `googleapis` | ^171.4.0 | Declared dependency (not used by `main.js` in its current form) |

---

## Installation

```bash
# Clone the repository
git clone https://github.com/srushith/uplevel-video-creation-and-addtion.git
cd uplevel-video-creation-and-addtion

# Install dependencies
npm install
```

> The script connects to an external Chrome instance over CDP, so you typically do **not** need Playwright's bundled browsers. If you adapt the script to launch its own browser, run `npx playwright install chromium` as well.

---

## Connecting to Chrome (Required)

The script does **not** open its own browser. It expects a Chrome instance to already be listening for DevTools connections on port `9222`. Start Chrome with remote debugging **before** running the script, then log in to Uplevel in that window.

**macOS**
```bash
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome \
  --remote-debugging-port=9222 \
  --user-data-dir="/tmp/chrome-debug"
```

**Windows (PowerShell)**
```powershell
& "C:\Program Files\Google\Chrome\Application\chrome.exe" `
  --remote-debugging-port=9222 `
  --user-data-dir="C:\temp\chrome-debug"
```

**Linux**
```bash
google-chrome \
  --remote-debugging-port=9222 \
  --user-data-dir="/tmp/chrome-debug"
```

Using a separate `--user-data-dir` keeps this debugging session isolated from your normal profile. Once Chrome is open, sign in to Uplevel so the automation inherits your session.

---

## Input File

Create or edit `input.csv` in the project root. It must contain a header row followed by one row per video:

```csv
videoName,sourceUrl
My First Video,https://uplevel.interviewkickstart.com/some/source/page/
Another Video,https://uplevel.interviewkickstart.com/another/source/page/
```

| Column | Description |
|---|---|
| `videoName` | The name to assign to the newly created video on Uplevel. |
| `sourceUrl` | The page the script opens to scrape the existing Vimeo URL from. |

> The repository ships with an `input.csv` that contains only the header and no data rows. Add your own rows before running.

---

## Usage

With Chrome running in debug mode and `input.csv` populated:

```bash
node main.js
```

You'll see progress in the console, for example:

```
Rows Found: 2
----------------
Processing: My First Video
Vimeo URL Found
Video Created
Status Saved
```

The script opens a new browser tab per row and closes it when finished.

---

## Output

Results are appended to **`status.csv`** with two columns:

```csv
videoName,status
My First Video,Completed
Another Video,Failed
```

| Status | Meaning |
|---|---|
| `Completed` | The form was filled and SAVE was clicked without errors. |
| `Failed` | An error occurred while processing that row (details are printed to the console). |

Because the writer runs in **append** mode, results accumulate across runs. Delete or clear `status.csv` between runs if you want a clean log.

---

## Configuration Reference

These values are currently hard-coded in `main.js`. Edit the source to change them.

| Setting | Value | Location |
|---|---|---|
| Input file | `input.csv` | `readCSV()` |
| Output file | `status.csv` | `createCsvWriter({ path: ... })` |
| CDP endpoint | `http://127.0.0.1:9222` | `chromium.connectOverCDP(...)` |
| Create-video page | `https://uplevel.interviewkickstart.com/create_video/` | row loop |
| Resource type | `Yes, Alternative` | dropdown selection |
| Per-step waits | 1000–5000 ms | `page.waitForTimeout(...)` |

The script targets form fields by placeholder text — `Enter Video name` and `Enter video url here` (the **second** matching input) — and clicks elements by visible text (`Select Resource Type`, `SAVE`).

---

## Project Structure

```
uplevel-video-creation-and-addtion/
├── main.js              # The automation script (entry point)
├── input.csv            # Input: videoName, sourceUrl (header only by default)
├── status.csv           # Output: per-row Completed/Failed log (created/appended)
├── package.json         # Project metadata and dependencies
├── package-lock.json    # Locked dependency tree
└── README.md            # This file
```

---

## Troubleshooting

**`connect ECONNREFUSED 127.0.0.1:9222`**
Chrome isn't running with `--remote-debugging-port=9222`. Start it using the commands in [Connecting to Chrome](#connecting-to-chrome-required) before running the script.

**`Rows Found: 0`**
`input.csv` has only the header (the default state) or is missing data rows. Add at least one row.

**Every row is marked `Failed`**
Likely causes: you aren't logged in to Uplevel in the debug Chrome session; the page layout (placeholders, button text, or dropdown options) has changed; or the pages need longer to load than the fixed timeouts allow. Check the console output for the specific error and consider increasing the `waitForTimeout` values.

**Form fields not found / wrong field filled**
The script depends on specific placeholder text and on the Vimeo URL being the *second* input with placeholder `Enter video url here`. If Uplevel's markup changes, update the selectors in `main.js`.

---

## Notes & Caveats

- **Session-dependent:** The script reuses an existing Chrome session and assumes you are already authenticated to Uplevel.
- **Timing-based waits:** Synchronization relies on fixed `waitForTimeout` delays rather than waiting for specific elements/network events, which can be brittle on slower connections. Replacing them with explicit waits (e.g. `waitForSelector`) would make runs more reliable.
- **Selector fragility:** Targeting by placeholder text, visible labels, and input index means UI changes on Uplevel may break automation and require selector updates.
- **Append-only logging:** `status.csv` is never truncated by the script; clear it manually for a fresh log.
- **Unused dependency:** `googleapis` is listed in `package.json` but is not referenced in `main.js` as written.
- **Specific to Uplevel / Interview Kickstart:** URLs and the form workflow are tailored to `uplevel.interviewkickstart.com`.