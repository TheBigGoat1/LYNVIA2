const fs = require('fs');
const { globSync } = require('glob');

const files = globSync('src/**/individual/legal-assitant/page.tsx', {
  cwd: 'C:\\Users\\ADMIN\\Downloads\\lynvia\\lynviadigital-main',
  absolute: true'
});

for (const file of files) {
  console.log('File:', file);
  let content = fs.readFileSync(file, 'utf8');
  
  // Find the firestoreTextSearch function and fix it completely
  // The issue is at line 702 where there's a syntax error
  // Let me show the problematic area
  const lines = content.split('\n');
  console.log('\nLines 695-710:');
  for (let i = 694; i < Math.min(712, lines.length); i++) {
    console.log((i+1) + ': ' + lines[i]);
  }
  
  // The error says "Expression expected" at line 702
  // Let me replace the entire firestoreTextSearch function
  const funcStart = 'const firestoreTextSearch = async (';
  const startIndex = content.indexOf(funcStart);
  
  if (startIndex === -1) {
    console.log('Function not found!');
    continue;
  }
  
  console.log('\nFunction starts at index:', startIndex);
  
  // Find the end of this function (next "const" or "function" or end of file)
  let endIndex = content.indexOf('\nconst ', startIndex + funcStart.length);
  if (endIndex === -1) {
    endIndex = content.length;
  }
  
  const oldFunc = content.substring(startIndex, endIndex);
  console.log('\nOld function:');
  console.log(oldFunc.substring(0, 300));
  
  // Create clean new function
  const newFunc = `const firestoreTextSearch = async (
    searchText: string,
    options: { limit?: number }
  ): Promise<Array<{ documentId: string; title: string; chunkId: string; text: string; score: number }>> => {
    if (!searchIndex) {
      return [];
    }

    const results = fastSearch(searchIndex, searchText, options);
    return results;
  };

`;
  
  content = content.replace(oldFunc, newFunc);
  fs.writeFileSync(file, content, 'utf8');
  console.log('\n-> Fixed firestoreTextSearch function!');
  
  // Verify
  const verifyContent = fs.readFileSync(file, 'utf8');
  const verifyLines = verifyContent.split('\n');
  console.log('\nVerifying lines 695-710:');
  for (let i = 694; i < Math.min(715, verifyLines.length); i++) {
    console.log((i+1) + ': ' + verifyLines[i]);
  }
}
