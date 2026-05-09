const fs = require('fs');
const path = require('path');

// Try different path variations
const paths = [
  'C:\\Users\\ADMIN\\Downloads\\lynvia\\lynviadigital-main\\src\\app\\[locale]\\individual\\legal-assitant\\page.tsx',
  path.join('C:', 'Users', 'ADMIN', 'Downloads', 'lynvia', 'lynviadigital-main', 'src', 'app', '[locale]', 'individual', 'legal-assitant', 'page.tsx'),
  'C:/Users/ADMIN/Downloads/lynvia/lynviadigital-main/src/app/[locale]/individual/legal-assitant/page.tsx'
];

paths.forEach((p, i) => {
  console.log(`\nTrying path ${i+1}: ${p}`);
  if (fs.existsSync(p)) {
    console.log('  -> EXISTS!');
    const content = fs.readFileSync(p, 'utf8');
    const lines = content.split('\n');
    console.log(`  -> Total lines: ${lines.length}`);
    console.log('\n  Lines 695-720:');
    for (let j = 694; j < Math.min(722, lines.length); j++) {
      console.log(`  ${(j+1)}: ${lines[j]}`);
    }
    process.exit(0);
  } else {
    console.log('  -> NOT FOUND');
  }
});

console.log('\nAll paths failed!');
process.exit(1);
