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

const BASE_URL = 'https://www.infarmed.pt/web/infarmed/servicos-on-line/pesquisa-do-medicamento';
const SEARCH_LETTER = 'A';
const MIN_RESULTS = 100;
const MAX_RESULTS = 200;
const OUTPUT_FILE = path.join(__dirname, 'infomed_data.json');

const randomDelay = async (page: Page): Promise<void> => {
  const delay = Math.random() * 3000 + 2000;
  await page.waitForTimeout(delay);
};

const compact = (value: string | null | undefined): string =>
  (value ?? '').replace(/\s+/g, ' ').trim();

const findTextFromRow = async (row: ElementHandle<HTMLElement>): Promise<string[]> => {
  const cells = await row.$$('td, th');
  const values: string[] = [];
  for (const cell of cells) {
    values.push(compact(await cell.innerText()));
  }
  return values.filter(Boolean);
};

const classifyRow = (texts: string[]): Omit<MedicineRecord, 'pdfLink'> => {
  const fallback = {
    name: texts[0] ?? '',
    strength: texts[1] ?? '',
    dosageForm: texts[2] ?? '',
    activeIngredient: texts[3] ?? '',
    manufacturer: texts[4] ?? ''
  };

  const lower = texts.map((text) => text.toLowerCase());
  const pick = (matcher: (text: string) => boolean): string =>
    texts.find((t) => matcher(t.toLowerCase())) ?? '';

  const strength =
    pick((t) => /(mg|mcg|g|ml|iu|%)(\b|\/)/.test(t)) ||
    fallback.strength;

  const dosageForm =
    pick((t) =>
      /(comprimido|capsula|cápsula|xarope|solução|suspensão|pomada|gel|inje[cç][aã]o|spray|creme|granulado|gotas)/.test(
        t
      )
    ) || fallback.dosageForm;

  const manufacturer =
    pick((t) =>
      /(laborat[oó]rios|lda|s\.a\.|sa\b|pharma|farmac[êe]utica|generis|bial|tecnime[dé]ica|company)/.test(t)
    ) || fallback.manufacturer;

  const activeIngredient =
    texts.find(
      (t) =>
        t !== fallback.name &&
        t !== strength &&
        t !== dosageForm &&
        t !== manufacturer &&
        t.length > 2
    ) ?? fallback.activeIngredient;

  return {
    name: fallback.name,
    strength,
    dosageForm,
    activeIngredient,
    manufacturer
  };
};

const findPdfLink = async (
  row: ElementHandle<HTMLElement>,
  pageUrl: string
): Promise<string> => {
  const anchors = await row.$$('a[href]');
  for (const anchor of anchors) {
    const href = await anchor.getAttribute('href');
    if (!href) {
      continue;
    }

    const absolute = new URL(href, pageUrl).toString();
    const label = compact((await anchor.innerText()).toLowerCase());
    if (
      absolute.toLowerCase().includes('.pdf') ||
      /folheto|informativo|rcm/.test(label) ||
      /folheto|informativo|rcm/.test(absolute.toLowerCase())
    ) {
      return absolute;
    }
  }
  return '';
};

const tryCommonSearchPatterns = async (page: Page, letter: string): Promise<void> => {
  const candidateSearchSelectors = [
    'input[type="search"]',
    'input[name*="pesq" i]',
    'input[name*="search" i]',
    'input[id*="pesq" i]',
    'input[id*="search" i]',
    'input[type="text"]'
  ];

  for (const selector of candidateSearchSelectors) {
    const input = page.locator(selector).first();
    if ((await input.count()) === 0) {
      continue;
    }

    try {
      await input.fill('');
      await randomDelay(page);
      await input.fill(letter);

      const submitButton = page
        .locator(
          'button:has-text("Pesquisar"), button:has-text("Search"), input[type="submit"], button[type="submit"]'
        )
        .first();

      if ((await submitButton.count()) > 0) {
        await randomDelay(page);
        await submitButton.click();
      } else {
        await input.press('Enter');
      }

      await page.waitForLoadState('domcontentloaded');
      await randomDelay(page);
      return;
    } catch {
      continue;
    }
  }
};

const getRows = async (page: Page): Promise<ElementHandle<HTMLElement>[]> => {
  const tableCandidates = [
    'table tbody tr',
    'table tr',
    '[role="row"]',
    '.results tr',
    '.grid tr',
    '.rgRow, .rgAltRow'
  ];

  for (const selector of tableCandidates) {
    const rows = await page.$$(selector);
    if (rows.length > 0) {
      return rows as ElementHandle<HTMLElement>[];
    }
  }

  return [];
};

const clickNextPage = async (page: Page): Promise<boolean> => {
  const nextCandidates = [
    'a:has-text("Seguinte")',
    'a:has-text("Próxima")',
    'a:has-text("Next")',
    'button:has-text("Seguinte")',
    'button:has-text("Próxima")',
    'button:has-text("Next")',
    'a[aria-label*="next" i]',
    'button[aria-label*="next" i]'
  ];

  for (const selector of nextCandidates) {
    const next = page.locator(selector).first();
    if ((await next.count()) === 0) {
      continue;
    }

    const disabled = await next.getAttribute('disabled');
    const className = (await next.getAttribute('class')) ?? '';
    if (disabled !== null || /disabled/i.test(className)) {
      continue;
    }

    await randomDelay(page);
    await next.click();
    await page.waitForLoadState('domcontentloaded');
    await randomDelay(page);
    return true;
  }

  return false;
};

const scrapeInfomed = async (): Promise<MedicineRecord[]> => {
  const browser: Browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    locale: 'pt-PT',
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
  });
  const page = await context.newPage();

  const results: MedicineRecord[] = [];
  const dedupe = new Set<string>();

  try {
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 120000 });
    await randomDelay(page);

    await tryCommonSearchPatterns(page, SEARCH_LETTER);

    let pageGuard = 0;
    while (results.length < MAX_RESULTS && pageGuard < 100) {
      pageGuard += 1;
      const rows = await getRows(page);

      for (const row of rows) {
        const texts = await findTextFromRow(row);
        if (texts.length < 2) {
          continue;
        }

        const normalized = classifyRow(texts);
        if (!normalized.name || /^nome|designação|medicamento$/i.test(normalized.name)) {
          continue;
        }

        const key = [
          normalized.name,
          normalized.strength,
          normalized.dosageForm,
          normalized.activeIngredient,
          normalized.manufacturer
        ]
          .map((value) => value.toLowerCase())
          .join('||');

        if (dedupe.has(key)) {
          continue;
        }

        const pdfLink = await findPdfLink(row, page.url());
        dedupe.add(key);
        results.push({ ...normalized, pdfLink });

        if (results.length >= MAX_RESULTS) {
          break;
        }
      }

      if (results.length >= MAX_RESULTS) {
        break;
      }

      const moved = await clickNextPage(page);
      if (!moved) {
        break;
      }
    }
  } finally {
    await browser.close();
  }

  if (results.length < MIN_RESULTS) {
    throw new Error(
      `Extracted ${results.length} medicines, which is below the expected minimum of ${MIN_RESULTS}. ` +
        'Adjust selectors or pagination strategy for the current Infomed UI.'
    );
  }

  return results.slice(0, MAX_RESULTS);
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
