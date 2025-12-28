const fs = require("fs/promises");
const path = require("path");
const { getContainer } = require("./cosmosClient");

const useLocal =
  process.env.USE_LOCAL_DB === "true" || Boolean(process.env.LOCAL_DATA_PATH);

const localFile = process.env.LOCAL_DATA_PATH
  ? path.resolve(process.env.LOCAL_DATA_PATH)
  : path.resolve(__dirname, "..", ".data", "items.json");

async function ensureLocalDir() {
  const dir = path.dirname(localFile);
  await fs.mkdir(dir, { recursive: true });
}

async function readLocal() {
  try {
    const raw = await fs.readFile(localFile, "utf8");
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

async function writeLocal(items) {
  await ensureLocalDir();
  await fs.writeFile(localFile, JSON.stringify(items, null, 2), "utf8");
}

async function create(doc) {
  if (useLocal) {
    const items = await readLocal();
    items.push(doc);
    await writeLocal(items);
    return doc;
  }
  const container = getContainer();
  await container.items.create(doc);
  return doc;
}

async function read(id) {
  if (useLocal) {
    const items = await readLocal();
    return items.find((item) => item.id === id) || null;
  }
  try {
    const container = getContainer();
    const { resource } = await container.item(id, id).read();
    return resource || null;
  } catch (err) {
    if (err.code === 404) return null;
    throw err;
  }
}

async function replace(doc) {
  if (useLocal) {
    const items = await readLocal();
    const idx = items.findIndex((item) => item.id === doc.id);
    if (idx === -1) {
      items.push(doc);
    } else {
      items[idx] = doc;
    }
    await writeLocal(items);
    return doc;
  }
  const container = getContainer();
  await container.item(doc.id, doc.id).replace(doc);
  return doc;
}

module.exports = { create, read, replace, useLocal, localFile };
