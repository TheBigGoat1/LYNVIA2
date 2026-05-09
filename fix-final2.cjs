const { globSync } = require('glob');
const fs = require('fs');

const files = globSync('**/individual/legal-assitant/page.tsx', {
  cwd: 'C:/Users/ADMIN/Downloads/lynvia/lynviadigital-main',
  absolute: true'
});

console.log('Found:', files[0]);

if (!files.length) {
  console.log('No file found!');
  process.exit(1);
}

const filePath = files[0];
let content = fs.readFileSync(filePath, 'utf8');

// Find the LAST occurrence of "const firestoreTextSearch = async ("
const searchTerm = 'const firestoreTextSearch = async (';
let lastIndex = content.lastIndexOf(searchTerm);

console.log('Last occurrence at index:', lastIndex);

if (lastIndex === -1) {
  console.log('Function not found!');
  process.exit(1);
}

// Find the end of this function (matching braces)
let braceCount = 0;
let inFunc = false;
let endIndex = lastIndex;

for (let i = lastIndex; i < content.length; i++) {
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

console.log('Function ends at index:', endIndex);

// Keep ONLY this function - remove everything before it that's related to firestoreTextSearch
// Find the FIRST occurrence
let firstIndex = content.indexOf(searchTerm);

if (firstIndex !== lastIndex) {
  console.log('Multiple occurrences found! Removing first one...');
  // Remove from firstIndex to lastIndex (keep only the last function)
  const before = content.substring(0, firstIndex);
  const funcOnly = content.substring(lastIndex, endIndex);
  
  // But we also need to keep anything AFTER the function
  const after = content.substring(endIndex);
  
  // Rebuild: before + funcOnly + after
  content = before + funcOnly + after;
  
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('-> Removed duplicate functions!');
} else {
  console.log('Only one occurrence - no cleanup needed');
}

// Verify
const verify = fs.readFileSync(filePath, 'utf8');
const lines = verify.split('\n');
console.log('\nVerifying lines 695-720:');
for (let i = 694; i < Math.min(722, lines.length); i++) {
  console.log(`${i+1}: ${lines[i]}`);
}
