const fs = require('fs');
const path = require('path');

// Find the file using glob
const { globSync } = require('glob');
const files = globSync('src/**/individual/legal-assistant/page.tsx', {
  cwd: 'C:\\Users\\ADMIN\\Downloads\\lynvia\\lynviadigital-main',
  absolute: true
});

console.log('Found files:', files);

for (const file of files) {
  console.log('\\nProcessing:', file);
  let content = fs.readFileSync(file, 'utf8');
  
  // Find where firestoreTextSearch is defined
  const funcStart = 'const firestoreTextSearch = async (';
  const startIndex = content.indexOf(funcStart);
  
  if (startIndex === -1) {
    console.log('  -> Function not found');
    continue;
  }
  
  // Find the end of the function (the closing brace)
  let braceCount = 0;
  let endIndex = startIndex;
  let foundOpen = false;
  let inString = false;
  let stringChar = '';
  
  for (let i = startIndex; i < content.length; i++) {
    const char = content[i];
    
    if (inString) {
      if (char === stringChar && content[i-1] !== '\\') {
        inString = false;
      }
      continue;
    }
    
    if (char === '"' || char === "'" || char === '`') {
      inString = true;
      stringChar = char;
      continue;
    }
    
    if (char === '{') {
      braceCount++;
      foundOpen = true;
    } else if (char === '}') {
      braceCount--;
      if (foundOpen && braceCount === 0) {
        endIndex = i + 1;
        break;
      }
    }
  }
  
  console.log('  -> Function found from', startIndex, 'to', endIndex);
  const oldFunc = content.substring(startIndex, endIndex);
  console.log('  -> Old function length:', oldFunc.length);
  console.log('  -> Old function preview:', oldFunc.substring(0, 200));
  
  // Create the correct new function
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
  
  // Replace the old function with the new one
  content = content.replace(oldFunc, newFunc);
  fs.writeFileSync(file, content, 'utf8');
  console.log('  -> Fixed!');
}

console.log('\\nDone!');
