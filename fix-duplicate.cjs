const fs = require('fs');
const { globSync } = require('glob');

// Find the file
const files = globSync('**/individual/legal-assistant/page.tsx', {
  cwd: 'C:/Users/ADMIN/Downloads/lynvia/lynviadigital-main',
  absolute: true
});

console.log('Found:', files);

if (files.length === 0) {
  console.log('No file found!');
  process.exit(1);
}

const filePath = files[0];
console.log('Working on:', filePath);

let content = fs.readFileSync(filePath, 'utf8');

// Find the SECOND occurrence of "const firestoreTextSearch = async"
const firstIdx = content.indexOf("const firestoreTextSearch = async (");
const secondIdx = content.indexOf("const firestoreTextSearch = async (", firstIdx + 1);

console.log('First occurrence at:', firstIdx);
console.log('Second occurrence at:', secondIdx);

if (secondIdx > 0) {
  console.log('Found duplicate! Removing first one...');
  
  // Find the end of the first function
  let braceCount = 0;
  let endFirst = firstIdx;
  let inFunc = false;
  
  for (let i = firstIdx; i < content.length; i++) {
    if (content[i] === '{') {
      braceCount++;
      inFunc = true;
    } else if (content[i] === '}') {
      braceCount--;
      if (inFunc && braceCount === 0) {
        endFirst = i + 1;
        break;
      }
    }
  }
  
  console.log('First function ends at:', endFirst);
  
  // Remove from firstIdx to secondIdx (keep second occurrence)
  const before = content.substring(0, firstIdx);
  const fromSecond = content.substring(secondIdx);
  
  content = before + fromSecond;
  
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('-> Removed duplicate function!');
  
  // Verify
  const verify = fs.readFileSync(filePath, 'utf8');
  const lines = verify.split('\n');
  console.log('\nVerifying lines 695-715:');
  for (let i = 694; i < Math.min(716, lines.length); i++) {
    console.log((i+1) + ': ' + lines[i]);
  }
} else {
  console.log('No duplicate found');
}

process.exit(0);
