const { chromium } = require('playwright');
const fs = require('fs');
const csv = require('csv-parser');

const createCsvWriter = require('csv-writer')
  .createObjectCsvWriter;

// =========================
// CSV WRITER
// =========================

const csvWriter = createCsvWriter({
  path: 'status.csv',
  header: [
    { id: 'videoName', title: 'videoName' },
    { id: 'status', title: 'status' }
  ],
  append: true
});

// =========================
// READ CSV
// =========================

function readCSV() {

  return new Promise((resolve) => {

    const results = [];

    fs.createReadStream('input.csv')
      .pipe(csv())
      .on('data', (data) => results.push(data))
      .on('end', () => resolve(results));

  });

}

(async () => {

  // =========================
  // LOAD CSV DATA
  // =========================

  const rows = await readCSV();

  console.log('Rows Found:', rows.length);

  // =========================
  // CONNECT TO CHROME
  // =========================

  const browser = await chromium.connectOverCDP(
    'http://127.0.0.1:9222'
  );

  const context = browser.contexts()[0];


  // =========================
  // LOOP ROWS
  // =========================

  for (const row of rows) {
    const page = await context.newPage();

    try {

      const videoName = row.videoName;
      const sourceUrl = row.sourceUrl;

      console.log('----------------');
      console.log('Processing:', videoName);

      // =========================
      // OPEN SOURCE VIDEO
      // =========================

      await page.goto(sourceUrl);

      await page.waitForTimeout(3000);

      // =========================
      // EXTRACT VIMEO URL
      // =========================

      const urlInputs = page.locator(
        'input[placeholder="Enter video url here"]'
      );

      const vimeoUrl =
        await urlInputs.nth(1).inputValue();

      console.log('Vimeo URL Found');

      // =========================
      // OPEN CREATE PAGE
      // =========================

      await page.goto(
        'https://uplevel.interviewkickstart.com/create_video/'
      );

      await page.waitForTimeout(3000);

      // =========================
      // FILL VIDEO NAME
      // =========================

      await page.fill(
        'input[placeholder="Enter Video name"]',
        videoName
      );

      // =========================
      // FILL VIMEO URL
      // =========================

      const createInputs = page.locator(
        'input[placeholder="Enter video url here"]'
      );

      await createInputs.nth(1).fill(vimeoUrl);

      // =========================
      // SELECT DROPDOWN
      // =========================

      await page.click('text=Select Resource Type');

      await page.waitForTimeout(1000);

      await page.keyboard.type('Yes, Alternative');

      await page.waitForTimeout(1000);

      await page.keyboard.press('Enter');

      // =========================
      // SCROLL
      // =========================

      await page.mouse.wheel(0, 1000);

      await page.waitForTimeout(1000);

      // =========================
      // SAVE
      // =========================

      await page.click('text=SAVE');

      console.log('Video Created');

      // =========================
      // WRITE STATUS
      // =========================

      await csvWriter.writeRecords([
        {
          videoName,
          status: 'Completed'
        }
      ]);

      console.log('Status Saved');

      await page.waitForTimeout(5000);
      await page.close();
      
    } catch (error) {

      console.log('Error:', error);

      await csvWriter.writeRecords([
        {
          videoName: row.videoName,
          status: 'Failed'
        }
      ]);

    }

  }

})();