import os

# Use raw string for Windows path with []
base = r'C:\Users\ADMIN\Downloads\lynvia\lynviadigital-main\src\app\[locale]\individual\legal-assitant\page.tsx'

print(f'Reading: {base}')
print(f'File exists: {os.path.exists(base)}')

if not os.path.exists(base):
    print('File not found!')
    exit(1)

with open(base, 'r', encoding='utf-8') as f:
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

# Find end of function (matching braces)
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

print(f'Function ends at line {func_end}')
print(f'Function length: {func_end - func_start} lines')

# Check if there's a DUPLICATE signature inside the function
func_lines = lines[func_start:func_end]
dup_line = -1
for i, line in enumerate(func_lines):
    if '): Promise<Array' in line and i > 0:  # Not the first line
        dup_line = func_start + i
        break

if dup_line > 0:
    print(f'\nFound duplicate signature at line {dup_line+1}!')
    print(f'Context: {lines[dup_line].rstrip()}')
    
    # Remove from func_start to dup_line (the duplicate part)
    print(f'\nRemoving lines {func_start+1} to {dup_line+1}...')
    new_lines = lines[:func_start] + lines[dup_line:]
    
    with open(base, 'w', encoding='utf-8') as f:
        f.writelines(new_lines)
    
    print('-> Fixed!')
    
    # Verify
    with open(base, 'r', encoding='utf-8') as f:
        verify_lines = f.readlines()
    
    print('\nVerifying lines 695-720:')
    for i in range(694, min(722, len(verify_lines))):
        print(f'{i+1}: {verify_lines[i].rstrip()}')
else:
    print('\nNo duplicate signature found inside function')
    print('Checking for multiple function definitions...')
    
    # Check for multiple occurrences
    occurrences = []
    for i, line in enumerate(lines):
        if 'const firestoreTextSearch = async' in line:
            occurrences.append(i)
    
    print(f'Found {len(occurrences)} occurrences')
    
    if len(occurrences) > 1:
        print(f'Multiple functions! Keeping LAST one...')
        keep_start = occurrences[-1]
        
        # Find end of last function
        brace_count = 0
        in_func = False
        keep_end = keep_start
        
        for i in range(keep_start, len(lines)):
            for ch in lines[i]:
                if ch == '{':
                    brace_count += 1
                    in_func = True
                elif ch == '}':
                    brace_count -= 1
                    if in_func and brace_count == 0:
                        keep_end = i + 1
                        break
            if keep_end > keep_start:
                break
        
        print(f'Keeping lines {keep_start+1} to {keep_end} (last function)')
        print(f'Removing everything before line {keep_start+1}...')
        
        new_lines = lines[:keep_start] + lines[keep_start:keep_end] + ['\n'] + lines[keep_end:]
        
        with open(base, 'w', encoding='utf-8') as f:
            f.writelines(new_lines)
        
        print('-> Fixed multiple functions!')
        print('\nDone!')
