const { globSync } = require('glob');
const fs = require('fs');

const files = globSync('**/individual/legal-assitant/page.tsx', {
  cwd: 'C:/Users/ADMIN/Downloads/lynvia/lynviadigital-main',
  absolute: true'
});

console.log('Found:', files[0]);

let content = fs.readFileSync(files[0], 'utf8');

// Find the problematic area and fix it
// The issue is the duplicate function signature
// Let me find "): Promise<Array" and remove duplicates

const lines = content.split('\n');
console.log('\nTotal lines:', lines.length);

// Find lines with "): Promise<Array"
let promiseLines = [];
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('): Promise<Array<')) {
    promiseLines.push(i);
  }
}

console.log('\nLines with "): Promise<Array<":', promiseLines.map(i => i+1));

if (promiseLines.length > 2) {
  console.log('\nToo many! Cleaning up...');
  
  // Keep only the LAST two (one for firestoreTextSearch, one for handleSend)
  // Remove everything between the first and the last
  const keepStart = promiseLines[promiseLines.length - 2];
  const removeStart = promiseLines[0];
  
  console.log(`Keeping from line ${keepStart+1}, removing lines ${removeStart+1} to ${keepStart}`);
  
  const newLines = lines.slice(0, removeStart).concat(lines.slice(keepStart));
  const newContent = newLines.join('\n');
  
  fs.writeFileSync(files[0], newContent, 'utf8');
  console.log('-> Cleaned up!');
  
  // Verify
  const verify = fs.readFileSync(files[0], 'utf8').split('\n');
  console.log('\nVerifying lines 695-720:');
  for (let i = 694; i < Math.min(722, verify.length); i++) {
    console.log(`${i+1}: ${verify[i]}`);
  }
}
