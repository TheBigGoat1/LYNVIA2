const fs = require('fs');
const { globSync } = require('glob');

// Find all page.tsx files that need "use client"
const files = globSync('src/**/document-generator/success/page.tsx', {
  cwd: 'C:\\Users\\ADMIN\\Downloads\\lynvia\\lynviadigital-main',
  absolute: true
});

console.log('Found files:', files);

for (const file of files) {
  console.log('\nProcessing:', file);
  let content = fs.readFileSync(file, 'utf8');
  
  // Check if "use client" is at the top
  if (!content.startsWith("'use client'") && !content.startsWith('"use client"')) {
    content = "'use client';\n\n" + content;
    fs.writeFileSync(file, content, 'utf8');
    console.log('  -> Added "use client" directive');
  } else {
    console.log('  -> Already has "use client"');
  }
}

console.log('\nDone!');
