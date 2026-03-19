require('dotenv').config();
const PrismaModule = require('@prisma/client');
console.log('PrismaModule keys:', Object.keys(PrismaModule));
const { PrismaClient } = PrismaModule;
const { faker } = require('@faker-js/faker');
const { MeiliSearch } = require('meilisearch');

const prisma = new PrismaClient();
const meiliClient = new MeiliSearch({
  host: 'http://localhost:7700',
  apiKey: 'dev-master-key',
});

const DRUG_PREFIXES = ['Corta', 'Amoxi', 'Lipo', 'Neuro', 'Cardio', 'Dermo', 'Gastro', 'Pan', 'Vita', 'Oxy'];
const DRUG_SUFFIXES = ['plex', 'dol', 'cin', 'stat', 'pril', 'zole', 'phine', 'mab', 'tin', 'one'];

async function main() {
  console.log('🚀 Starting Seeding...');

  // 1. Clean up existing data
  console.log('🧹 Cleaning up database and index...');
  await prisma.medicine.deleteMany();
  await prisma.activeIngredient.deleteMany();
  await prisma.manufacturer.deleteMany();
  
  try {
    await meiliClient.index('medicines').delete();
  } catch (e) {
    // Index might not exist
  }

  // 2. Create Manufacturers
  console.log('🏭 Generating 50 Manufacturers...');
  const manufacturers = [];
  for (let i = 0; i < 50; i++) {
    const pharma = await prisma.manufacturer.create({
      data: {
        name: `${faker.company.name()} Pharmaceuticals`,
        country: faker.location.country(),
      },
    });
    manufacturers.push(pharma);
  }

  // 3. Create Active Ingredients
  console.log('🧪 Generating 100 Active Ingredients...');
  const ingredients = [];
  for (let i = 0; i < 100; i++) {
    const ingredient = await prisma.activeIngredient.create({
      data: {
        name: faker.science.chemicalElement().name + faker.helpers.arrayElement([' Hydrochloride', ' Phosphate', ' Sulfate', ' Sodium', '']),
      },
    });
    ingredients.push(ingredient);
  }

  // 4. Create Medicines
  console.log('💊 Generating 1,000 Medicines...');
  const medicines = [];
  for (let i = 0; i < 1000; i++) {
    const prefix = faker.helpers.arrayElement(DRUG_PREFIXES);
    const suffix = faker.helpers.arrayElement(DRUG_SUFFIXES);
    const name = `${prefix}${suffix}-${faker.string.alphanumeric(3).toUpperCase()}`;
    
    const randomManufacturer = faker.helpers.arrayElement(manufacturers);
    const randomIngredients = faker.helpers.arrayElements(ingredients, { min: 1, max: 3 });

    const medicine = await prisma.medicine.create({
      data: {
        name,
        description: faker.lorem.paragraph(),
        strength: faker.helpers.arrayElement(['100mg', '250mg', '500mg', '1g', '5ml', '10ml', '50ml']),
        dosageForm: faker.helpers.arrayElement(['Tablet', 'Capsule', 'Syrup', 'Injection', 'Cream', 'Inhaler']),
        indications: faker.lorem.sentence(),
        contraindications: faker.lorem.sentence(),
        manufacturerId: randomManufacturer.id,
        ingredients: {
          connect: randomIngredients.map((ing) => ({ id: ing.id })),
        },
      },
      include: {
        manufacturer: true,
        ingredients: true,
      },
    });
    medicines.push(medicine);
  }

  // 5. Transform and push to Meilisearch
  console.log('🔍 Indexing 1,000 documents in Meilisearch...');
  const searchIndex = meiliClient.index('medicines');
  
  const documents = medicines.map((med) => ({
    id: med.id,
    name: med.name,
    description: med.description,
    strength: med.strength,
    dosageForm: med.dosageForm,
    manufacturer: med.manufacturer ? med.manufacturer.name : null,
    ingredients: med.ingredients.map((ing) => ing.name),
  }));

  await searchIndex.addDocuments(documents);
  
  console.log('✅ Seeding Complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
