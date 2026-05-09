const fs = require('fs');
const path = require('path');

const filePath = path.join('C:', 'Users', 'ADMIN', 'Downloads', 'lynvia', 'lynviadigital-main', 'src', 'app', '[locale]', 'individual', 'legal-assitant', 'page.tsx');

console.log('Reading:', filePath);

if (!fs.existsSync(filePath)) {
  console.log('File not found!');
  process.exit(1);
}

let content = fs.readFileSync(filePath, 'utf8');

// Find ALL occurrences of "const firestoreTextSearch = async"
let searchTerm = 'const firestoreTextSearch = async (';
let index = 0;
let count = 0;

while ((index = content.indexOf(searchTerm, index)) !== -1) {
  count++;
  console.log(`Found occurrence ${count} at index ${index}`);
  console.log('Context:', content.substring(index - 20, index + 100));
  index += searchTerm.length;
}

console.log(`\nTotal occurrences: ${count}`);

if (count > 1) {
  console.log('\nMultiple definitions found! Need to clean up...');
  
  // Keep only the LAST occurrence (the correct one)
  let lastIndex = content.lastIndexOf(searchTerm);
  console.log('Keeping last occurrence at index:', lastIndex);
  
  // Find where the problematic area starts (around line 700)
  // We need to remove the duplicate function signatures
  // Let's find the area between the last two occurrences
  
  let prevIndex = content.lastIndexOf(searchTerm, lastIndex - 1);
  if (prevIndex >= 0) {
    console.log('Previous occurrence at:', prevIndex);
    
    // Find the end of the previous function (its closing brace)
    let braceCount = 0;
    let endPrev = prevIndex;
    for (let i = prevIndex; i < content.length; i++) {
      if (content[i] === '{') braceCount++;
      if (content[i] === '}') {
        braceCount--;
        if (braceCount === 0) {
          endPrev = i + 1;
          break;
        }
      }
    }
    
    console.log('Removing from', prevIndex, 'to', lastIndex);
    content = content.substring(0, prevIndex) + content.substring(lastIndex);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('-> Removed duplicate function!');
  }
} else {
  console.log('Only one occurrence - no cleanup needed');
}

process.exit(0);
