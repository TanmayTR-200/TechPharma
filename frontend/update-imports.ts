import { join } from 'path';
import { readFile, writeFile } from 'fs/promises';
import { readdirSync } from 'fs';

async function updateImports(filename: string): Promise<void> {
  const content = await readFile(filename, 'utf-8');
  const updated = content.replace(
    /import\s+{[^}]+}\s+from\s+['"]@\/contexts\/auth-(new|context)['"]/g,
    'import { useAuth } from "@/contexts/auth"'
  );
  await writeFile(filename, updated, 'utf-8');
  console.log(`Updated imports in ${filename}`);
}

async function main(): Promise<void> {
  try {
    const entries = readdirSync(".", { withFileTypes: true });
    const tsxFiles = entries
      .filter(entry => entry.isFile() && entry.name.endsWith('.tsx'))
      .map(entry => join(".", entry.name));

    if (tsxFiles.length === 0) {
      console.log('No .tsx files found in current directory');
      return;
    }

    console.log(`Found ${tsxFiles.length} .tsx files to process...`);
    
    await Promise.all(tsxFiles.map(updateImports));
    
    console.log('Import statements updated successfully!');
  } catch (error) {
    console.error('Error updating imports:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

main().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
