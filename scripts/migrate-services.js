require('dotenv').config();
const db = require('../server/db');

async function migrate() {
  // 1. Remove Azure
  await db.query("DELETE FROM services WHERE id = 'azure'");
  console.log('Removed Azure');

  // 2. Move Birth Registry to Business Functions (functionalities)
  await db.query("UPDATE services SET category = 'functionalities' WHERE id = 'birth_registry'");
  console.log('Moved Birth Registry -> functionalities');

  // 3. Move IBM MQ to Application Layer
  await db.query("UPDATE services SET category = 'application' WHERE id = 'ibm_mq'");
  console.log('Moved IBM MQ -> application');

  // 4. Move IBM Content Navigator to Application Layer
  await db.query("UPDATE services SET category = 'application' WHERE id = 'ibm_content_nav'");
  console.log('Moved IBM Content Navigator -> application');

  // 5. Split IBM FileNet into 02 and 03
  const { rows } = await db.query("SELECT status, response_time, problem_statement FROM services WHERE id = 'ibm_filenet'");
  if (rows.length > 0) {
    const r = rows[0];
    await db.query("DELETE FROM services WHERE id = 'ibm_filenet'");
    await db.query(
      'INSERT INTO services (id, name, icon, status, response_time, problem_statement, last_updated, category) VALUES ($1,$2,$3,$4,$5,$6,NOW(),$7)',
      ['ibm_filenet_02', 'IBM FileNet 02', 'folder', r.status, r.response_time, r.problem_statement, 'integrations']
    );
    await db.query(
      'INSERT INTO services (id, name, icon, status, response_time, problem_statement, last_updated, category) VALUES ($1,$2,$3,$4,$5,$6,NOW(),$7)',
      ['ibm_filenet_03', 'IBM FileNet 03', 'folder', r.status, r.response_time, r.problem_statement, 'integrations']
    );
    console.log('Split IBM FileNet -> ibm_filenet_02 + ibm_filenet_03');
  } else {
    console.log('ibm_filenet not found in DB, skipping split');
  }

  console.log('\nMigration complete!');
  process.exit(0);
}

migrate().catch(e => { console.error('Migration failed:', e.message); process.exit(1); });
