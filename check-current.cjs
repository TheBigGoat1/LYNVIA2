const fs = require('fs');
const { globSync } = require('glob');

// Use glob to find the file
const files = globSync('**/individual/legal-assistant/page.tsx', {
  cwd: 'C:/Users/ADMIN/Downloads/lynvia/lynviadigital-main',
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

// Count occurrences of firestoreTextSearch
const matches = content.match(/const firestoreTextSearch = async/g);
console.log('\nOccurrences of firestoreTextSearch:', matches ? matches.length : 0);

// Show lines around 695-715
const lines = content.split('\n');
console.log('\nLines 693-720:');
for (let i = 692; i < Math.min(721, lines.length); i++) {
  console.log((i+1) + ': ' + lines[i]);
}

process.exit(0);
