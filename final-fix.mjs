const fs = require('fs');
const { globSync } = require('glob');

// Find all legal-assistant/page.tsx files
const files = globSync('src/**/legal-assistant/page.tsx', {
  cwd: 'C:\\Users\\ADMIN\\Downloads\\lynvia\\lynviadigital-main',
  absolute: true
});

console.log('Found files:', files.length);

for (const file of files) {
  console.log('\nProcessing:', file);
  let content = fs.readFileSync(file, 'utf8');
  
  // Find the firestoreTextSearch function and rewrite it completely
  const funcRegex = /const firestoreTextSearch = async \([\s\S]*?\);[\s\S]*?\n\};/;
  
  const newFunc = `  const firestoreTextSearch = async (
    searchText: string,
    options: { limit?: number }
  ): Promise<Array<{ documentId: string; title: string; chunkId: string; text: string; score: number }>> => {
    if (!searchIndex) {
      return [];
    }

    const results = fastSearch(searchIndex, searchText, options);
    return results;
  };

  // Replace
  const newContent = content.replace(funcRegex, newFunc);
  
  if (newContent !== content) {
    fs.writeFileSync(file, newContent, 'utf8');
    console.log('  -> Fixed!');
  } else {
    console.log('  -> Pattern not matched, trying alternative...');
    
    // Alternative: find the function by looking for "const firestoreTextSearch"
    const lines = content.split('\n');
    let inFunc = false;
    let braceCount = 0;
    let funcStart = -1;
    let funcEnd = -1;
    
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes('const firestoreTextSearch')) {
        funcStart = i;
        inFunc = true;
        braceCount = 0;
      }
      
      if (inFunc) {
        for (const ch of lines[i]) {
          if (ch === '{') braceCount++;
          if (ch === '}') {
            braceCount--;
            if (braceCount === 0) {
              funcEnd = i;
              break;
            }
          }
        }
        if (funcEnd >= 0) break;
      }
    }
    
    if (funcStart >= 0 && funcEnd >= 0) {
      console.log('  -> Found function at lines', funcStart+1, 'to', funcEnd+1);
      console.log('  -> Replacing with clean function...');
      
      const before = lines.slice(0, funcStart).join('\n');
      const after = lines.slice(funcEnd + 1).join('\n');
      const newContent = before + '\n' + newFunc + '\n' + after;
      
      fs.writeFileSync(file, newContent, 'utf8');
      console.log('  -> Fixed with alternative method!');
    } else {
      console.log('  -> Could not find function boundaries');
    }
  }
}

console.log('\nDone!');
