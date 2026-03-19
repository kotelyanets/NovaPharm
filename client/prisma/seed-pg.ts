import { Client } from 'pg';
import { faker } from '@faker-js/faker';
import { MeiliSearch } from 'meilisearch';
import 'dotenv/config';

async function seed() {
  const pgClient = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  const meiliClient = new MeiliSearch({
    host: 'http://localhost:7700',
    apiKey: 'dev-master-key',
  });

  try {
    await pgClient.connect();
    console.log('Connected to PostgreSQL');

    // Truncate existing data
    await pgClient.query('TRUNCATE "Medicine", "ActiveIngredient", "Manufacturer", "_ActiveIngredientToMedicine" CASCADE');
    console.log('Tables truncated');

    const manufacturers = [];
    for (let i = 0; i < 50; i++) {
      const id = faker.string.alphanumeric(21);
      const name = `${faker.company.name()} ${i + 1}`;
      await pgClient.query(
        'INSERT INTO "Manufacturer" (id, name, country) VALUES ($1, $2, $3)',
        [id, name, faker.location.country()]
      );
      manufacturers.push(id);
    }
    console.log('Generated 50 manufacturers');

    const ingredients = [];
    for (let i = 0; i < 100; i++) {
      const id = faker.string.alphanumeric(21);
      const name = `${faker.science.chemicalElement().name} ${faker.string.alphanumeric(5)} Hydrochloride`;
      await pgClient.query(
        'INSERT INTO "ActiveIngredient" (id, name) VALUES ($1, $2)',
        [id, name]
      );
      ingredients.push(id);
    }
    console.log('Generated 100 active ingredients');

    const medicines = [];
    for (let i = 0; i < 1000; i++) {
      const name = faker.helpers.arrayElement(['Zylto', 'Maxi', 'Cure', 'Bio', 'Nova', 'Ultra']) + 
                   faker.helpers.arrayElement(['med', 'pharm', 'gen', 'vax', 'dex', 'tin']) + ' ' + (i + 1);
      const strength = faker.helpers.arrayElement(['10mg', '25mg', '100mg', '500mg', '1g', '5ml', '10ml']);
      
      const manufacturerId = faker.helpers.arrayElement(manufacturers);
      const id = faker.string.alphanumeric(21);

      await pgClient.query(
        'INSERT INTO "Medicine" (id, name, strength, "manufacturerId", "updatedAt") VALUES ($1, $2, $3, $4, NOW())',
        [id, name, strength, manufacturerId]
      );
      
      const selectedIngredients = faker.helpers.arrayElements(ingredients, { min: 1, max: 3 });
      for (const ingredientId of selectedIngredients) {
        await pgClient.query(
          'INSERT INTO "_ActiveIngredientToMedicine" ("A", "B") VALUES ($1, $2)',
          [ingredientId, id]
        );
      }

      medicines.push({
        id,
        name,
        strength,
        manufacturerId,
        ingredientIds: selectedIngredients
      });
      
      if ((i + 1) % 100 === 0) console.log(`Generated ${i + 1} medicines...`);
    }

    console.log('Indexing in Meilisearch...');
    const index = meiliClient.index('medicines');
    // EXPLICITLY SET PRIMARY KEY
    const task = await index.addDocuments(medicines, { primaryKey: 'id' });
    console.log(`Add documents task submitted: ${task.taskUid}`);
    
    console.log('Waiting for Meilisearch task completion...');
    const finishedTask = await meiliClient.waitForTask(task.taskUid);
    
    if (finishedTask.status === 'failed') {
      console.error('Meilisearch indexing FAILED:', JSON.stringify(finishedTask.error, null, 2));
    } else {
      console.log('Meilisearch indexing COMPLETED successfully');
    }
    
    console.log('Syncing search settings...');
    await index.updateSearchableAttributes(['name', 'strength']);
    await index.updateFilterableAttributes(['manufacturerId', 'ingredientIds']);

    console.log('Seeding completed successfully!');
    
    const stats = await index.getStats();
    console.log('Meilisearch Index Stats:', JSON.stringify(stats, null, 2));

  } catch (error) {
    console.error('Seeding failed:', error);
  } finally {
    await pgClient.end();
  }
}

seed();
