import { copyFile, mkdir, readFile, readdir, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const certificatePattern = /^UC02-(\d{6})$/;

export async function migratePushpanjaliCertificateNumbers(directory) {
  const names = (await readdir(directory)).filter(name => name.endsWith(".json"));
  const records = [];
  for (const name of names) {
    const filePath = path.join(directory, name);
    const document = JSON.parse(await readFile(filePath, "utf8"));
    records.push({ name, filePath, document });
  }
  records.sort((left, right) => {
    const timeDifference = Date.parse(left.document.createdAt || 0) - Date.parse(right.document.createdAt || 0);
    return timeDifference || left.name.localeCompare(right.name);
  });

  const usedNumbers = new Set(records.flatMap(record => {
    const match = String(record.document.certificateNumber || "").match(certificatePattern);
    return match ? [Number(match[1])] : [];
  }));
  const changes = [];
  let nextNumber = 1;
  for (const record of records) {
    if (certificatePattern.test(String(record.document.certificateNumber || ""))) continue;
    while (usedNumbers.has(nextNumber)) nextNumber += 1;
    const certificateNumber = `UC02-${String(nextNumber).padStart(6, "0")}`;
    changes.push({
      ...record,
      document: {
        ...record.document,
        reference: certificateNumber,
        certificateNumber,
        offeringNumber: nextNumber,
      },
    });
    usedNumbers.add(nextNumber);
    nextNumber += 1;
  }

  let backupDirectory = null;
  if (changes.length) {
    backupDirectory = path.join(directory, `.certificate-number-backup-${Date.now()}`);
    await mkdir(backupDirectory, { recursive: false });
    for (const change of changes) {
      await copyFile(change.filePath, path.join(backupDirectory, change.name));
      const temporaryPath = `${change.filePath}.numbering-${process.pid}`;
      await writeFile(temporaryPath, JSON.stringify(change.document, null, 2), { flag: "wx" });
      await rename(temporaryPath, change.filePath);
    }
  }

  const highestNumber = usedNumbers.size ? Math.max(...usedNumbers) : 0;
  await writeFile(path.join(directory, ".certificate-counter"), String(highestNumber), "utf8");
  return { total: records.length, migrated: changes.length, counter: highestNumber, backupDirectory };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const directory = path.resolve(process.argv[2] || process.env.PUSHPANJALI_DIR || "work/pushpanjali-offerings");
  const result = await migratePushpanjaliCertificateNumbers(directory);
  console.log(JSON.stringify({ ...result, backupDirectory: result.backupDirectory ? path.basename(result.backupDirectory) : null }));
}
