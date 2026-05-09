#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

// Find the file
const basePath = 'C:\\Users\\ADMIN\\Downloads\\lynvia\\lynviadigital-main';
const filePath = path.join(basePath, 'src', 'app', '[locale]', 'individual', 'legal-assistant', 'page.tsx');

console.log('Reading:', filePath);

if (!fs.existsSync(filePath)) {
  console.log('File not found!');
  process.exit(1);
}

let content = fs.readFileSync(filePath, 'utf8');

// Check what's around line 700
const lines = content.split('\n');
console.log('Lines 695-715:');
for (let i = 694; i < Math.min(716, lines.length); i++) {
  console.log(`${i+1}: ${lines[i]}`);
}

process.exit(0);
