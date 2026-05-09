const { globSync } = require('glob');
const fs = require('fs');

const files = globSync('**/individual/legal-assitant/page.tsx', {
  cwd: 'C:/Users/ADMIN/Downloads/lynvia/lynviadigital-main',
  absolute: true'
});

console.log('Found files:', files);

if (files.length === 0) {
  console.log('No files found!');
  process.exit(1);
}

const filePath = files[0];
console.log('\nReading:', filePath);

const content = fs.readFileSync(filePath, 'utf8');
const lines = content.split('\n');

console.log(`\nTotal lines: ${lines.length}`);
console.log('\nLines 695-720:');
for (let i = 694; i < Math.min(722, lines.length); i++) {
  console.log(`${i+1}: ${lines[i]}`);
}

process.exit(0);
