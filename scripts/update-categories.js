require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const db = require('../server/db');

async function run() {
  await db.query(
    "UPDATE services SET category = 'integrations' WHERE id IN ('account_transfer', 'address_validation', 'azure_upload', 'azure_download')"
  );
  await db.query(
    "UPDATE services SET category = 'functionalities' WHERE id = 'solq'"
  );
  const { rows } = await db.query(
    "SELECT id, name, category FROM services WHERE id IN ('account_transfer','address_validation','azure_upload','azure_download','solq') ORDER BY category, name"
  );
  console.table(rows);
  process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });
