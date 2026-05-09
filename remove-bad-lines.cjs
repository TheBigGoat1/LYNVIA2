const fs = require('fs');
const { globSync } = require('glob');

const files = globSync('**/individual/legal-assitant/page.tsx', {
  cwd: 'C:/Users/ADMIN/Downloads/lynvia/lynviadigital-main',
  absolute: true
});

console.log('Found:', files[0]);

let content = fs.readFileSync(files[0], 'utf8');

// Find the problem area - there should be only ONE function
// Let me find all lines that match "): Promise<Array"
const lines = content.split('\n');
let promiseLines = [];
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('): Promise<Array<')) {
    promiseLines.push(i);
  }
}

console.log('\nLines with "): Promise<Array<":', promiseLines);

// The second one (at line 705) is the problem - it's a duplicate
// Let me show context around line 705 (0-indexed: 704)
if (promiseLines.length > 1) {
  const badLine = promiseLines[1]; // Second occurrence
  console.log(`\nBad line at ${badLine+1}:`, lines[badLine]);
  
  // Find the function start (const firestoreTextSearch)
  let funcStart = -1;
  for (let i = badLine; i >= 0; i--) {
    if (lines[i].includes('const firestoreTextSearch')) {
      funcStart = i;
      break;
    }
  }
  
  console.log(`Function starts at line ${funcStart+1}:`, lines[funcStart]);
  
  // Remove lines from funcStart to badLine (inclusive)
  console.log(`\nRemoving lines ${funcStart+1} to ${badLine+1}...`);
  const newLines = lines.slice(0, funcStart).concat(lines.slice(badLine + 1));
  const newContent = newLines.join('\n');
  
  fs.writeFileSync(files[0], newContent, 'utf8');
  console.log('-> Fixed!');
  
  // Verify
  const verify = fs.readFileSync(files[0], 'utf8').split('\n');
  console.log('\nVerifying lines 695-720:');
  for (let i = 694; i < Math.min(722, verify.length); i++) {
    console.log(`${i+1}: ${verify[i]}`);
  }
} else {
  console.log('Only one occurrence - checking for other syntax errors...');
}
