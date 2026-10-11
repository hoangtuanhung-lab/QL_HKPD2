import { createDataset } from "../packages/test-fixtures/a05/dataset.mjs";
process.stdout.write(`${JSON.stringify(createDataset(), null, 2)}\n`);
