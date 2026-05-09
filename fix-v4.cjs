const { globSync } = require('glob');
const fs = require('fs');

// Find the file
const files = globSync('**/individual/legal-assitant/page.tsx', {
  cwd: 'C:/Users/ADMIN/Downloads/lynvia/lynviadigital-main',
  absolute: true'
});

console.log('Found:', files[0]);

let content = fs.readFileSync(files[0], 'utf8');

// Find the SECOND occurrence of "): Promise<Array<" and remove everything between first and second
const searchPattern = '): Promise<Array<';
let firstIdx = content.indexOf(searchPattern);
let secondIdx = content.indexOf(searchPattern, firstIdx + 1);

console.log('First occurrence at:', firstIdx);
console.log('Second occurrence at:', secondIdx);

if (secondIdx > 0) {
  // Find the start of the function (const firestoreTextSearch)
  let funcStart = content.lastIndexOf('const firestoreTextSearch = async (', secondIdx);
  console.log('Function start:', funcStart);
  
  if (funcStart >= 0) {
    // Remove from funcStart to secondIdx
    console.log(`Removing from ${funcStart} to ${secondIdx}...`);
    content = content.substring(0, funcStart) + content.substring(secondIdx);
    
    fs.writeFileSync(files[0], content, 'utf8');
    console.log('-> Fixed!');
    
    // Verify
    const verify = fs.readFileSync(files[0], 'utf8').split('\n');
    console.log('\nVerifying lines 695-720:');
    for (let i = 694; i < Math.min(722, verify.length); i++) {
      console.log(`${i+1}: ${verify[i]}`);
    }
  }
}
