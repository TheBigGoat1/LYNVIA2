const fs = require('fs');
const { globSync } = require('glob');

const files = globSync('src/**/individual/legal-assistant/page.tsx', {
  cwd: 'C:\\Users\\ADMIN\\Downloads\\lynvia\\lynviadigital-main',
  absolute: true
});

for (const file of files) {
  console.log('File:', file);
  let content = fs.readFileSync(file, 'utf8');
  
  // Show lines around 695-715
  const lines = content.split('\n');
  console.log('\nLines 695-715:');
  for (let i = 694; i < Math.min(716, lines.length); i++) {
    console.log((i+1) + ': ' + lines[i]);
  }
}
