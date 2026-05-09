#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'fs';
import { globSync } from 'glob';

// Find all legal-assistant/page.tsx files
const files = globSync('src/app/**/legal-assistant/page.tsx', {
  cwd: 'C:\\Users\\ADMIN\\Downloads\\lynvia\\lynviadigital-main',
  absolute: true
});

console.log('Found files:', files.length);

for (const file of files) {
  console.log('\\nProcessing:', file);
  let content = readFileSync(file, 'utf8');
  
  // Check if the old pattern exists
  if (content.includes('const missingKeywords = getMissingKeywords')) {
    // Replace the broken firestoreTextSearch function
    const oldPattern = /\s+const missingKeywords = getMissingKeywords[\s\S]*?return \[\];\s+\};\s*/;
    
    const newText = `\n    return results;\n  };\n`;
    
    // Find the function and fix it
    const funcStart = 'const firestoreTextSearch = async (';
    const funcEnd = '};';
    
    const startIndex = content.indexOf(funcStart);
    if (startIndex >= 0) {
      // Find the end of the function
      let braceCount = 0;
      let endIndex = startIndex;
      let foundOpen = false;
      
      for (let i = startIndex; i < content.length; i++) {
        if (content[i] === '{') {
          braceCount++;
          foundOpen = true;
        } else if (content[i] === '}') {
          braceCount--;
          if (foundOpen && braceCount === 0) {
            endIndex = i + 1;
            break;
          }
        }
      }
      
      const oldFunc = content.substring(startIndex, endIndex);
      console.log('Found function, length:', oldFunc.length);
      
      // Create new function
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
      
      content = content.replace(oldFunc, newFunc);
      writeFileSync(file, content, 'utf8');
      console.log('  -> Fixed!');
    } else {
      console.log('  -> Function start not found');
    }
  } else {
    console.log('  -> Already fixed or different pattern');
  }
}

console.log('\\nDone!');
