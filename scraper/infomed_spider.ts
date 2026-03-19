import { chromium, type Browser, type ElementHandle, type Page } from 'playwright';
import fs from 'fs-extra';
import path from 'path';

type MedicineRecord = {
  name: string;
  strength: string;
  dosageForm: string;
  activeIngredient: string;
  manufacturer: string;
  pdfLink: string;
};

const BASE_URL = 'https://extranet.infarmed.pt/CITS-pesquisamedicamento-fo/pesquisaMedicamento.jsf';
const SEARCH_LETTER = 'Paracetamol';
const MIN_RESULTS = 20; // Lowered for instability
const MAX_RESULTS = 100;
const OUTPUT_FILE = path.join(__dirname, 'infomed_data.json');

const randomDelay = async (page: Page): Promise<void> => {
  const delay = Math.random() * 5000 + 2000;
  await page.waitForTimeout(delay);
};

const compact = (value: string | null | undefined): string =>
  (value ?? '').replace(/\s+/g, ' ').trim();

const findTextFromRow = async (row: ElementHandle<HTMLElement>): Promise<string[]> => {
  const cells = await row.$$('td');
  const values: string[] = [];
  for (const cell of cells) {
    values.push(compact(await cell.innerText()));
  }
  return values.filter(Boolean);
};

const classifyRow = (texts: string[]): Omit<MedicineRecord, 'pdfLink'> => {
  // PrimeFaces Table Columns usually:
  // [0] DCI, [1] Nome, [2] Dosagem, [3] Forma, [4] Laboratório
  return {
    name: texts[1] ?? '',
    strength: texts[2] ?? '',
    dosageForm: texts[3] ?? '',
    activeIngredient: texts[0] ?? '',
    manufacturer: texts[4] ?? ''
  };
};

const findPdfLink = async (
  row: ElementHandle<HTMLElement>,
  pageUrl: string
): Promise<string> => {
  const anchors = await row.$$('a[href]');
  for (const anchor of anchors) {
    const href = await anchor.getAttribute('href');
    if (!href) continue;
    const absolute = new URL(href, pageUrl).toString();
    if (absolute.toLowerCase().includes('.pdf') || absolute.includes('documental')) {
      return absolute;
    }
  }
  return '';
};

const tryCommonSearchPatterns = async (page: Page, letter: string): Promise<void> => {
  try {
    console.log('Waiting for search input...');
    // Use ID-based locator to avoid escaping issues
    const input = page.locator('id=form:nome_input');
    await input.waitFor({ state: 'visible', timeout: 60000 });
    
    console.log('Filling search input...');
    await input.fill(letter);
    await randomDelay(page);
    
    console.log('Clicking search button...');
    await page.locator('id=form:search-button').click();
    
    console.log('Waiting for results table...');
    // Wait for either the table or an error message
    await Promise.race([
      page.waitForSelector('id=form:tabelaResultados_data', { timeout: 60000 }),
      page.waitForSelector('.ui-messages-error', { timeout: 60000 })
    ]);
    await randomDelay(page);
  } catch (e) {
    console.error('Search interaction failed:', e);
    throw e;
  }
};

const getRows = async (page: Page): Promise<ElementHandle<HTMLElement>[]> => {
  return (await page.$$('tbody#form\\:tabelaResultados_data tr.ui-widget-content')) as ElementHandle<HTMLElement>[];
};

const clickNextPage = async (page: Page): Promise<boolean> => {
  const next = page.locator('.ui-paginator-next:not(.ui-state-disabled)').first();
  if ((await next.count()) > 0) {
    await next.click();
    await page.waitForLoadState('networkidle');
    await randomDelay(page);
    return true;
  }
  return false;
};

const scrapeInfomed = async (): Promise<MedicineRecord[]> => {
  const browser: Browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const results: MedicineRecord[] = [];
  const dedupe = new Set<string>();

  try {
    console.log(`Navigating to ${BASE_URL}...`);
    // Use domcontentloaded for faster interaction on unstable site
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 90000 });
    await randomDelay(page);

    console.log(`Searching for "${SEARCH_LETTER}"...`);
    await tryCommonSearchPatterns(page, SEARCH_LETTER);

    let pageGuard = 0;
    while (results.length < MAX_RESULTS && pageGuard < 30) {
      pageGuard += 1;
      
      // Wait for table rows to be present
      console.log('Waiting for table rows...');
      try {
        await page.waitForSelector('tbody#form\\:tabelaResultados_data tr', { timeout: 45000 });
      } catch (e) {
        console.warn('Timeout waiting for rows. Checking if any were found anyway...');
      }

      const rows = await getRows(page);
      console.log(`Found ${rows.length} rows on page ${pageGuard}. Total collected: ${results.length}`);

      if (rows.length === 0) {
        console.warn('No rows found. Breaking loop.');
        break;
      }

      for (const row of rows) {
        const texts = await findTextFromRow(row);
        if (texts.length < 3) continue;

        const record = classifyRow(texts);
        const key = `${record.name}||${record.strength}||${record.manufacturer}`.toLowerCase();

        if (dedupe.has(key)) continue;

        const pdfLink = await findPdfLink(row, page.url());
        dedupe.add(key);
        results.push({ ...record, pdfLink });

        if (results.length >= MAX_RESULTS) break;
      }

      if (results.length >= MAX_RESULTS) break;

      console.log('Attempting to go to next page...');
      const moved = await clickNextPage(page);
      if (!moved) {
        console.log('No more pages or next button disabled.');
        break;
      }
    }
  } catch (error) {
    console.error('Critical failure during scraping:', error);
    // Don't throw, return what we have
  } finally {
    await browser.close();
  }

  if (results.length < MIN_RESULTS) {
    console.warn(`Extracted only ${results.length} records. Site might be unstable.`);
  }

  return results;
};

const printImplementationPlan = (): void => {
  console.log('Implementation plan for Infomed scraper:');
  console.log('1) Open Infomed base URL and wait for initial page load.');
  console.log(`2) Submit search with common letter "${SEARCH_LETTER}" using resilient input selectors.`);
  console.log('3) Iterate through result tables and pagination while collecting medicine records.');
  console.log('4) Extract name, strength, dosage form, active ingredient, manufacturer, and PDF link.');
  console.log('5) Apply random anti-ban delays between interactions.');
  console.log(`6) Save output JSON to ${OUTPUT_FILE}.`);
  console.log('7) Stop when 100–200 records are collected.');
  console.log('Awaiting your signal to run the scraper.');
};

const run = async (): Promise<void> => {
  const shouldRun = process.argv.includes('--run');

  if (!shouldRun) {
    printImplementationPlan();
    return;
  }

  const records = await scrapeInfomed();
  await fs.writeJson(OUTPUT_FILE, records, { spaces: 2 });
  console.log(`Saved ${records.length} records to ${OUTPUT_FILE}`);
};

run().catch((error: unknown) => {
  console.error('Scraper failed:', error);
  process.exitCode = 1;
});
