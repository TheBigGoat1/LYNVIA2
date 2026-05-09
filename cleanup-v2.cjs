const fs = require('fs');
const { globSync } = require('glob');

const files = globSync('**/individual/legal-assistant/page.tsx', {
  cwd: 'C:\\Users\\ADMIN\\Downloads\\lynvia\\lynviadigital-main',
  absolute: true
});

console.log('Found files:', files);

if (files.length === 0) {
  console.log('No files found!');
  process.exit(1);
}

const filePath = files[0];
console.log('\nReading:', filePath);

let content = fs.readFileSync(filePath, 'utf8');

// Find ALL occurrences of "const firestoreTextSearch = async"
const searchTerm = 'const firestoreTextSearch = async (';
let index = 0;
let occurrences = [];

while ((index = content.indexOf(searchTerm, index)) !== -1) {
  occurrences.push(index);
  index += searchTerm.length;
}

console.log('\nTotal occurrences:', occurrences.length);
occurrences.forEach((idx, i) => {
  console.log(`Occurrence ${i+1} at index ${idx}:`);
  console.log('Context:', content.substring(idx - 30, idx + 100));
  console.log('---');
});

if (occurrences.length > 1) {
  console.log('\nMultiple definitions found! Cleaning up...');
  
  // Keep only the LAST occurrence
  const keepStart = occurrences[occurrences.length - 1];
  
  // Find where the first (bad) occurrence starts
  const removeStart = occurrences[0];
  // Find the end of the first (bad) occurrence by matching braces
  let braceCount = 0;
  let inFunc = false;
  let removeEnd = removeStart;
  
  for (let i = removeStart; i < content.length; i++) {
    if (content[i] === '{') {
      braceCount++;
      inFunc = true;
    } else if (content[i] === '}') {
      braceCount--;
      if (inFunc && braceCount === 0) {
        removeEnd = i + 1;
        break;
      }
    }
  }
  
  console.log(`Removing from ${removeStart} to ${removeEnd}`);
  content = content.substring(0, removeStart) + content.substring(removeEnd);
  
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('-> Cleaned up!');
}

process.exit(0);
