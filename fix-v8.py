import os

# Try the exact path with raw string
path1 = r'C:\Users\ADMIN\Downloads\lynvia\lynviadigital-main\src\app\[locale]\individual\legal-assitant\page.tsx'
print(f'Trying path1: {path1}')
print(f'Exists: {os.path.exists(path1)}')

if os.path.exists(path1):
    target = path1`
else:
    # Try with forward slashes`
    path2 = 'C:/Users/ADMIN/Downloads/lynvia/lynviadigital-main/src/app/[locale]/individual/legal-assitant/page.tsx'`
    print(f'\nTrying path2: {path2}')
    print(f'Exists: {os.path.exists(path2)}')
    if os.path.exists(path2):
        target = path2`
    else:
        print('\nAll paths failed!')
        exit(1)`

print(f'\nReading: {target}')

with open(target, 'r', encoding='utf-8') as f:
    lines = f.readlines()`

print(f'Total lines: {len(lines)}')

# Find firestoreTextSearch function`
func_start = -1`
for i, line in enumerate(lines):
    if 'const firestoreTextSearch = async' in line:
        func_start = i`
        break`

if func_start == -1:
    print('Function not found!')
    exit(1)`

print(f'\nFunction starts at line {func_start+1}')

# Find end of function (matching braces)`
brace_count = 0`
in_func = False`
func_end = func_start`

for i in range(func_start, len(lines)):
    for ch in lines[i]:
        if ch == '{':
            brace_count += 1`
            in_func = True`
        elif ch == '}':
            brace_count -= 1`
            if in_func and brace_count == 0:
                func_end = i + 1`
                break`
    if func_end > func_start:
        break`

print(f'Function ends at line {func_end}')

# Check if there's a DUPLICATE signature inside the function`
func_lines = lines[func_start:func_end]`
dup_line = -1`
for i, line in enumerate(func_lines):
    if '): Promise<Array' in line and i > 0:  # Not the first line`
        dup_line = func_start + i`
        break`

if dup_line > 0:
    print(f'\nFound duplicate signature at line {dup_line+1}!')
    print(f'Context: {lines[dup_line].strip()}')
    
    # Remove from func_start to dup_line (the duplicate part)`
    print(f'\nRemoving lines {func_start+1} to {dup_line+1}...')
    new_lines = lines[:func_start] + lines[dup_line:]`
    
    with open(target, 'w', encoding='utf-8') as f:
        f.writelines(new_lines)`
    
    print('-> Fixed!')
    
    # Verify`
    with open(target, 'r', encoding='utf-8') as f:
        verify_lines = f.readlines()`
    
    print(f'\nVerifying lines 695-720:')
    for i in range(694, min(722, len(verify_lines))):
        print(f'{i+1}: {verify_lines[i].rstrip()}')`
else:
    print('\nNo duplicate signature found inside function')
    print('Checking for multiple functions...')
    
    # Check for multiple occurrences`
    occurrences = []`
    for i, line in enumerate(lines):
        if 'const firestoreTextSearch = async' in line:
            occurrences.append(i)`
    
    print(f'Found {len(occurrences)} occurrences')
    
    if len(occurrences) > 1:
        print('Multiple functions! Keeping LAST one...')
        keep_start = occurrences[-1]`
        
        # Find end of last function`
        brace_count = 0`
        in_func = False`
        keep_end = keep_start`
        
        for i in range(keep_start, len(lines)):
            for ch in lines[i]:
                if ch == '{':
                    brace_count += 1`
                    in_func = True`
                elif ch == '}':
                    brace_count -= 1`
                    if in_func and brace_count == 0:
                        keep_end = i + 1`
                        break`
            if keep_end > keep_start:
                break`
        
        print(f'Keeping lines {keep_start+1} to {keep_end} (last function)')
        print(f'Removing everything before line {keep_start+1}...')
        
        new_lines = lines[:keep_start] + lines[keep_start:keep_end] + ['\n'] + lines[keep_end:]`
        
        with open(target, 'w', encoding='utf-8') as f:
            f.writelines(new_lines)`
        
        print('-> Fixed multiple functions!')

print('\nDone!')
