const fs = require('fs');
const path = require('path');

// Build the path to the legal-assistant page
const basePath = 'C:\\Users\\ADMIN\\Downloads\\lynvia\\lynviadigital-main';
const filePath = path.join(basePath, 'src', 'app', '[locale]', 'individual', 'legal-assistant', 'page.tsx');

console.log('Reading:', filePath);

if (!fs.existsSync(filePath)) {
  console.log('File not found!');
  process.exit(1);
}

let content = fs.readFileSync(filePath, 'utf8');

// Find the firestoreTextSearch function and replace it completely
// Let's look for the function definition
const funcStart = 'const firestoreTextSearch = async (';
const startIndex = content.indexOf(funcStart);

if (startIndex === -1) {
  console.log('Function not found!');
  process.exit(1);
}

console.log('Function starts at index:', startIndex);
console.log('Context around start:');
console.log(content.substring(startIndex - 50, startIndex + 200));

// Find the end of this function by matching braces
let braceCount = 0;
let inFunc = false;
let endIndex = startIndex;

for (let i = startIndex; i < content.length; i++) {
  if (content[i] === '{') {
    braceCount++;
    inFunc = true;
  } else if (content[i] === '}') {
    braceCount--;
    if (inFunc && braceCount === 0) {
      endIndex = i + 1;
      break;
    }
  }
}

console.log('\nFunction ends at index:', endIndex);
const oldFunc = content.substring(startIndex, endIndex);
console.log('\nOld function (first 300 chars):');
console.log(oldFunc.substring(0, 300));

// Create new clean function
const newFunc = `const firestoreTextSearch = async (
  searchText: string,
  options: { limit?: number }
): Promise<Array<{ documentId: string; title: string; chunkId: string; text: string; score: number }>> => {
  if (!searchIndex) {
    return [];
  }

  const results = fastSearch(searchIndex, searchText, options);
  return results;
};`;

// Replace
const newContent = content.substring(0, startIndex) + newFunc + content.substring(endIndex);
fs.writeFileSync(filePath, newContent, 'utf8');

console.log('\n-> Fixed!');

// Verify
const verify = fs.readFileSync(filePath, 'utf8');
const lines = verify.split('\n');
console.log('\nVerifying lines 695-715:');
for (let i = 694; i < Math.min(716, lines.length); i++) {
  console.log((i+1) + ': ' + lines[i]);
}
