const fs = require('fs');
const path = require('path');

const localePath = 'C:\\Users\\ADMIN\\Downloads\\lynvia\\lynviadigital-main\\src\\app\\[locale]';
console.log('Listing:', localePath);

try {
  const items = fs.readdirSync(localePath, { withFileTypes: true });
  items.forEach(item => {
    console.log(item.isDirectory() ? '[D]' : '[F]', item.name);
  });
} catch (e) {
  console.log('Error:', e.message);
}

// Also check if legal-assitant exists
const legalPath = path.join(localePath, 'individual', 'legal-assitant');
console.log('\nChecking:', legalPath);
try {
  if (fs.existsSync(legalPath)) {
    console.log('Exists! Contents:');
    const files = fs.readdirSync(legalPath);
    files.forEach(f => console.log(' ', f));
  } else {
    console.log('Does NOT exist');
  }
} catch (e) {
  console.log('Error:', e.message);
}
