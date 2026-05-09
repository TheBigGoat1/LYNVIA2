const { globSync } = require('glob');
const fs = require('fs');

const files = globSync('**/individual/legal-assitant/page.tsx', {
  cwd: 'C:/Users/ADMIN/Downloads/lynvia/lynviadigital-main',
  absolute: true'
});

console.log('Found:', files[0]);

let content = fs.readFileSync(files[0], 'utf8');

// Find the problematic "): Promise<Array<" lines
const lines = content.split('\n');
let badLines = [];
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('): Promise<Array<')) {
    badLines.push(i);
  }
}

console.log('\nLines with "): Promise<Array<":', badLines.map(i => i+1));

if (badLines.length > 2) {
  console.log('\nToo many! The second one (line', badLines[1]+1, ') is the problem.');
  console.log('Context:');
  for (let i = badLines[0]-5; i < Math.min(badLines[1]+5, lines.length); i++) {
    console.log((i+1) + ': ' + lines[i]);
  }
  
  // Remove from the FIRST "const firestoreTextSearch" before the bad line, to the bad line
  let removeStart = -1;
  for (let i = badLines[1]; i >= 0; i--) {
    if (lines[i].includes('const firestoreTextSearch')) {
      removeStart = i;
      break;
    }
  }
  
  if (removeStart >= 0) {
    console.log('\nRemoving lines', removeStart+1, 'to', badLines[1]+1);
    lines.splice(removeStart, badLines[1] - removeStart);
    
    const newContent = lines.join('\n');
    fs.writeFileSync(files[0], newContent, 'utf8');
    console.log('-> Fixed!');
  }
}
