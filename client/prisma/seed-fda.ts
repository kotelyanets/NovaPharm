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

async function main() {
  const connectionString = process.env.DATABASE_URL;
  const pool = new pg.Pool({ connectionString });
  // @ts-ignore: Version mismatch in pg types between adapter and environment
  const adapter = new PrismaPg(pool);
  prisma = new PrismaClient({ adapter });
  console.log('🚀 Starting OpenFDA Seeding...');

  // 1. Fetch data from OpenFDA
  console.log('📡 Fetching 2,000 records from OpenFDA...');
  const [res1, res2] = await Promise.all([
    fetch('https://api.fda.gov/drug/drugsfda.json?limit=1000'),
    fetch('https://api.fda.gov/drug/drugsfda.json?limit=1000&skip=1000')
  ]);
  
  const [data1, data2] = await Promise.all([res1.json(), res2.json()]) as [any, any];
  const results = [...(data1.results || []), ...(data2.results || [])];

  if (!results || results.length === 0) {
    throw new Error('Failed to fetch valid data from OpenFDA');
  }

  // 2. Clean up existing data
  console.log('🧹 Cleaning up database and index...');
  await prisma.medicine.deleteMany();
  await prisma.activeIngredient.deleteMany();
  await prisma.manufacturer.deleteMany();
  
  try {
    const index = meiliClient.index('medicines');
    await index.delete();
    console.log('🗑️ Meilisearch index cleared.');
  } catch (e) {
    // Index might not exist
  }

  // 3. Process and map data
  console.log(`🧪 Mapping and inserting ${results.length} records...`);

  const manufacturersMap = new Map<string, string>(); // name -> id
  const ingredientsMap = new Map<string, string>(); // name -> id
  const medicinesToInsert = [];

  for (const result of results) {
    // Manufacturer (sponsor_name)
    const sponsorName = (result.sponsor_name || 'Unknown Manufacturer').trim();
    let manufacturerId = manufacturersMap.get(sponsorName);
    
    if (!manufacturerId) {
      const manufacturer = await prisma.manufacturer.create({
        data: { name: sponsorName },
      });
      manufacturerId = manufacturer.id;
      manufacturersMap.set(sponsorName, manufacturerId);
    }

    // Products (usually one or more) - We take the first one as per instructions
    const product = result.products?.[0];
    if (!product) continue;

    const brandName = (product.brand_name || product.active_ingredients?.[0]?.name || 'Unknown Medicine').trim();
    const dosageForm = product.dosage_form || 'N/A';
    
    // Active Ingredients
    const activeIngredients = product.active_ingredients || [];
    const ingredientIds: string[] = [];
    const ingredientNames: string[] = [];
    const strengths: string[] = [];

    for (const ingredient of activeIngredients) {
      if (!ingredient.name) continue;
      
      const ingName = ingredient.name.trim();
      let ingId = ingredientsMap.get(ingName);
      
      if (!ingId) {
        try {
          const newIngredient = await prisma.activeIngredient.upsert({
            where: { name: ingName },
            update: {},
            create: { name: ingName },
          });
          ingId = newIngredient.id;
          ingredientsMap.set(ingName, ingId);
        } catch (error) {
          // Fallback if upsert fails due to race conditions or other issues
          const existing = await prisma.activeIngredient.findUnique({ where: { name: ingName } });
          ingId = existing?.id;
        }
      }
      
      if (ingId) {
        ingredientIds.push(ingId);
        ingredientNames.push(ingName);
      }
      if (ingredient.strength) {
        strengths.push(ingredient.strength);
      }
    }

    // Create Medicine
    try {
      const medicine = await prisma.medicine.create({
        data: {
          name: brandName,
          dosageForm: dosageForm,
          strength: strengths.join(', ') || 'N/A',
          manufacturerId: manufacturerId,
          ingredients: {
            connect: ingredientIds.map(id => ({ id })),
          },
        },
        include: {
          manufacturer: true,
          ingredients: true,
        },
      });
      medicinesToInsert.push(medicine);
    } catch (e) {
       // Likely a duplicate name error, OpenFDA data can have duplicates
       console.warn(`⚠️ Skipping duplicate medicine: ${brandName}`);
    }
  }

  // 4. Index in Meilisearch
  if (medicinesToInsert.length > 0) {
    console.log(`🔍 Indexing ${medicinesToInsert.length} documents in Meilisearch...`);
    const searchIndex = meiliClient.index('medicines');
    
    const documents = medicinesToInsert.map((med) => ({
      id: med.id,
      name: med.name,
      strength: med.strength,
      dosageForm: med.dosageForm,
      manufacturer: med.manufacturer?.name,
      ingredients: med.ingredients.map((ing) => ing.name),
    }));

    await searchIndex.addDocuments(documents);
  }
  
  console.log('✅ Seeding Complete!');
  console.log(`📊 PostgreSQL: ${medicinesToInsert.length} medicines.`);
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
