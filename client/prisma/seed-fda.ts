import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { MeiliSearch } from 'meilisearch';
import pg from 'pg';

const meiliClient = new MeiliSearch({
  host: 'http://localhost:7700',
  apiKey: 'dev-master-key',
});

let prisma: PrismaClient;

async function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  const connectionString = process.env.DATABASE_URL;
  const pool = new pg.Pool({ connectionString });
  // @ts-ignore: Version mismatch in pg types between adapter and environment
  const adapter = new PrismaPg(pool);
  prisma = new PrismaClient({ adapter });
  console.log('🚀 Starting NovaPharm Elite Mega-ETL (15,000+ Goal)...');

  const medicinesMap = new Map<string, any>();
  const limit = 1000;
  
  // --- Source 1: Drugs@FDA ---
  console.log('📡 Fetching from drugsfda.json...');
  let skipFDA = 0;
  const maxFDA = 25000; 
  while (skipFDA < maxFDA) {
    try {
      console.log(`  -> fda.json: ${skipFDA}...`);
      const response = await fetch(`https://api.fda.gov/drug/drugsfda.json?limit=${limit}&skip=${skipFDA}`);
      if (!response.ok) break;
      const data = await response.json() as any;
      const results = data.results || [];
      if (results.length === 0) break;

  for (const result of results) {
        const products = result.products || [];
        for (const product of products) {
          const brandName = (product.brand_name || product.active_ingredients?.[0]?.name || 'Unknown').trim();
          const strength = product.active_ingredients?.map((ai: any) => `${ai.name} ${ai.strength}`).join(', ') || 'N/A';
          const dosageForm = product.dosage_form || 'N/A';
          
          const key = `${brandName}|${strength}|${dosageForm}`.toLowerCase();

          if (!medicinesMap.has(key)) {
            medicinesMap.set(key, {
              name: brandName,
              manufacturer: (result.sponsor_name || 'Unknown').trim(),
              dosageForm: dosageForm,
              strength: strength,
              activeIngredients: product.active_ingredients || [],
              genericName: product.active_ingredients?.[0]?.name || 'N/A',
              route: 'N/A',
              description: `FDA Application Number: ${result.application_number || 'N/A'}`,
              category: 'General Medicine'
            });
          }
        }
      }
      skipFDA += limit;
      await delay(300);
    } catch (e) { break; }
  }

  // --- Source 2: Labels (Deep Mining) ---
  console.log('📡 Fetching from label.json (Data Mining Categories/Indications)...');
  let skipLabel = 0;
  const maxLabel = 30000; 
  while (skipLabel < maxLabel) {
    try {
      console.log(`  -> label.json: ${skipLabel}... (Total Unique: ${medicinesMap.size})`);
      const response = await fetch(`https://api.fda.gov/drug/label.json?limit=${limit}&skip=${skipLabel}`);
      if (!response.ok) break;
      const data = await response.json() as any;
      const results = data.results || [];
      if (results.length === 0) break;

      for (const result of results) {
        const brands = result.openfda?.brand_name || [];
        if (brands.length === 0) continue;

        // Mining Categorization
        const pharmClass = result.openfda?.pharm_class_epc?.[0] || 
                          result.openfda?.pharm_class_moa?.[0] || 
                          'General Pharma';
        
        // Mining Clinical Description
        const indications = result.indications_and_usage?.[0] || 
                           result.description?.[0] || 
                           'No clinical description available.';

        for (const brandName of brands) {
          // Note: Labels might not have the same 1:1 mapping of strength to brand as drug-fda
          // We will enrich all existing variations of this brand if we find a match
          const activeIngredients = (result.openfda?.substance_name || []).map((name: string) => ({ name }));
          
          let matched = false;
          for (const [key, existing] of medicinesMap.entries()) {
            if (existing.name.toLowerCase() === brandName.toLowerCase()) {
              if (existing.description.startsWith('FDA Application')) {
                existing.description = indications;
              }
              if (existing.category === 'General Medicine') {
                existing.category = pharmClass;
              }
              matched = true;
            }
          }

          if (!matched) {
            const key = `${brandName}|N/A|N/A`.toLowerCase();
            medicinesMap.set(key, {
              name: brandName,
              manufacturer: result.openfda?.manufacturer_name?.[0] || 'Unknown',
              dosageForm: result.openfda?.dosage_form?.[0] || 'N/A',
              strength: 'N/A',
              activeIngredients: activeIngredients,
              genericName: result.openfda?.generic_name?.[0] || 'N/A',
              route: result.openfda?.route?.[0] || 'N/A',
              description: indications,
              category: pharmClass
            });
          }
          
          if (medicinesMap.size >= 50000) break; 
        }
      }
      skipLabel += limit;
      await delay(300);
      if (medicinesMap.size >= 50000) break;
    } catch (e) { break; }
  }

  const uniqueMedicines = Array.from(medicinesMap.values());
  console.log(`✨ Collected ${uniqueMedicines.length} unique medicines.`);

  // 2. Clean up existing data
  console.log('Sweep 🧹 Cleaning up database and index...');
  await prisma.medicine.deleteMany();
  await prisma.category.deleteMany();
  await prisma.activeIngredient.deleteMany();
  await prisma.manufacturer.deleteMany();
  
  try {
    const index = meiliClient.index('medicines');
    await index.delete();
  } catch (e) {}

  // NEW: Configure Meilisearch settings
  console.log('⚙️ Configuring Meilisearch attributes...');
  await meiliClient.index('medicines').updateSettings({
    filterableAttributes: ['category', 'genericName'],
    searchableAttributes: ['name', 'genericName', 'manufacturer', 'description', 'ingredients'],
  });

  // 3. Batch Processing and Insertion
  console.log(`🧪 Inserting ${uniqueMedicines.length} records in batches...`);
  
  const manufacturersCache = new Map<string, string>();
  const ingredientsCache = new Map<string, string>();
  const categoriesCache = new Map<string, string>();
  const batchSize = 1000;
  let totalInserted = 0;

  for (let i = 0; i < uniqueMedicines.length; i += batchSize) {
    const batch = uniqueMedicines.slice(i, i + batchSize);
    console.log(`📦 Batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(uniqueMedicines.length / batchSize)}...`);

    const medicinesToCreate: any[] = [];

    for (const medData of batch) {
      const mName = medData.name.trim();
      const mManufacturer = medData.manufacturer.trim();
      const mCategory = medData.category.trim();
      const mStrength = medData.strength.trim();
      const mDosageForm = medData.dosageForm.trim();

      // 1. Handle Manufacturer
      let manufacturerId = manufacturersCache.get(mManufacturer);
      if (!manufacturerId) {
        const manufacturer = await prisma.manufacturer.upsert({
          where: { name: mManufacturer },
          update: {},
          create: { name: mManufacturer },
        });
        manufacturerId = manufacturer.id;
        manufacturersCache.set(mManufacturer, manufacturerId);
      }

      // 2. Handle Category
      let categoryId = categoriesCache.get(mCategory);
      if (!categoryId) {
        const category = await prisma.category.upsert({
          where: { name: mCategory },
          update: {},
          create: { name: mCategory },
        });
        categoryId = category.id;
        categoriesCache.set(mCategory, categoryId);
      }

      // 3. Handle Ingredients
      const ingredientIds: string[] = [];
      const ingredientNames: string[] = [];
      for (const ing of medData.activeIngredients) {
        if (!ing.name) continue;
        const ingName = ing.name.trim();
        let ingId = ingredientsCache.get(ingName);
        if (!ingId) {
          const ingredient = await prisma.activeIngredient.upsert({
            where: { name: ingName },
            update: {},
            create: { name: ingName },
          });
          ingId = ingredient.id;
          ingredientsCache.set(ingName, ingId);
        }
        ingredientIds.push(ingId);
        ingredientNames.push(ingName);
      }

      medicinesToCreate.push({
        ...medData,
        name: mName,
        manufacturerId,
        categoryId,
        ingredientIds,
        ingredientNames,
        strength: mStrength,
        dosageForm: mDosageForm,
      });
    }

    // Concurrently insert to speed up
    console.log(`  🚀 Processing ${medicinesToCreate.length} variations...`);
    const batchResults = (await Promise.all(
      medicinesToCreate.map(async (m) => {
        try {
          return await prisma.medicine.upsert({
            where: {
              name_strength_dosageForm: {
                name: m.name,
                strength: m.strength,
                dosageForm: m.dosageForm,
              }
            },
            update: {
              description: m.description,
              indications: m.genericName,
            },
            create: {
              name: m.name,
              dosageForm: m.dosageForm,
              strength: m.strength,
              description: m.description,
              indications: m.genericName, 
              manufacturerId: m.manufacturerId,
              categoryId: m.categoryId,
              ingredients: { connect: m.ingredientIds.map((id: string) => ({ id })) },
            },
            include: { manufacturer: true, ingredients: true, category: true },
          });
        } catch (err: any) {
          console.error(`  ⚠️ Failed to insert ${m.name} (${m.strength}): ${err.message}`);
          return null;
        }
      })
    )).filter(Boolean);

    totalInserted += batchResults.length;

    // 4. Meilisearch Batch Indexing
    if (batchResults.length > 0) {
      const searchIndex = meiliClient.index('medicines');
      const documents = batchResults.map((med: any) => ({
        id: med.id,
        name: med.name,
        genericName: med.indications,
        dosageForm: med.dosageForm,
        strength: med.strength,
        category: med.category?.name,
        manufacturer: med.manufacturer?.name,
        ingredients: med.ingredients.map((ing: any) => ing.name),
        description: med.description,
      }));
      await searchIndex.addDocuments(documents);
    }
  }

  console.log('✅ Seeding Complete!');
  console.log(`📊 Total Records in DB: ${totalInserted}`);
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    if (prisma) await prisma.$disconnect();
  });
