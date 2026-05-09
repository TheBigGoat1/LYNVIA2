import os
import re

# Walk directory to find the file
base = r'C:\Users\ADMIN\Downloads\lynvia\lynviadigital-main\src\app'

target_file = None
for root, dirs, files in os.walk(base):
    if 'legal-assitant' in root and 'page.tsx' in files:
        for f in files:
            if f == 'page.tsx':
                target_file = os.path.join(root, f)
                break
    if target_file:
        break

if not target_file:
    print('File not found!')
    exit(1)

print(f'Found: {target_file}')

with open(target_file, 'r', encoding='utf-8') as f:
    lines = f.readlines()

print(f'\nTotal lines: {len(lines)}')

# Show lines 695-720
print('\nLines 695-720:')
for i in range(694, min(722, len(lines))):
    print(f'{i+1}: {lines[i].rstrip()}')

# Find firestoreTextSearch function
func_start = -1
for i, line in enumerate(lines):
    if 'const firestoreTextSearch = async' in line:
        func_start = i
        break

if func_start == -1:
    print('\nFunction not found!')
    exit(1)

print(f'\nFunction starts at line {func_start+1}')

# Find the end of this function (matching braces)
brace_count = 0
in_func = False
func_end = func_start

for i in range(func_start, len(lines)):
    for ch in lines[i]:
        if ch == '{':
            brace_count += 1
            in_func = True
        elif ch == '}':
            brace_count -= 1
            if in_func and brace_count == 0:
                func_end = i + 1
                break
    if func_end > func_start:
        break

print(f'Function ends at line {func_end+1}')
print(f'Function length: {func_end - func_start} lines')

# Check if there's a DUPLICATE signature inside the function
func_lines = lines[func_start:func_end]
dup_sig = -1
for i, line in enumerate(func_lines):
    if '): Promise<Array<' in line and i > 0:  # Not the first line
        dup_sig = func_start + i
        break

if dup_sig > 0:
    print(f'\nFound duplicate signature at line {dup_sig+1}!')
    print(f'Context: {lines[dup_sig].rstrip()}')
    
    # Remove from func_start to dup_sig (the duplicate part)
    print(f'\nRemoving lines {func_start+1} to {dup_sig+1}...')
    new_lines = lines[:func_start] + lines[dup_sig:]
    
    with open(target_file, 'w', encoding='utf-8') as f:
        f.writelines(new_lines)
    
    print('-> Fixed!')
    
    # Verify
    with open(target_file, 'r', encoding='utf-8') as f:
        verify_lines = f.readlines()
    
    print('\nVerifying lines 695-720:')
    for i in range(694, min(722, len(verify_lines))):
        print(f'{i+1}: {verify_lines[i].rstrip()}')
else:
    print('\nNo duplicate signature found inside function')

print('\nDone!')
