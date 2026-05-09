import os
import re

# The exact path with [locale] folder
base = r'C:\Users\ADMIN\Downloads\lynvia\lynviadigital-main'
file_path = os.path.join(base, 'src', 'app', '[locale]', 'individual', 'legal-assistant', 'page.tsx')

print(f'Reading: {file_path}')
print(f'File exists: {os.path.exists(file_path)}')

if not os.path.exists(file_path):
    print('File not found!')
    exit(1)

with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

print(f'\nTotal lines: {len(lines)}')

# Show lines 695-720
print('\nLines 695-720:')
for i in range(694, min(722, len(lines))):
    print(f'{i+1}: {lines[i].rstrip()}')

# Find the firestoreTextSearch function
# The issue is there are duplicate signatures
# Let me find all lines with "const firestoreTextSearch"
search_term = 'const firestoreTextSearch = async ('
indices = []
for i, line in enumerate(lines):
    if search_term in line:
        indices.append(i)
        
print(f'\nFound {len(indices)} occurrences of firestoreTextSearch')
for idx in indices:
    print(f'  Line {idx+1}: {lines[idx].rstrip()}')

if len(indices) > 1:
    print('\nMultiple definitions! Need to remove the first one(s).')
    
    # Keep only the LAST occurrence
    keep_start = indices[-1]
    print(f'Keeping last occurrence at line {keep_start+1}')
    
    # Find the FIRST occurrence and remove everything between first and last
    remove_start = indices[0]
    
    # Find where the first function ends (before the second begins)
    # We need to find the closing brace of the first function
    brace_count = 0
    in_func = False
    end_remove = remove_start
    
    for i in range(remove_start, len(lines)):
        for ch in lines[i]:
            if ch == '{':
                brace_count += 1
                in_func = True
            elif ch == '}':
                brace_count -= 1
                if in_func and brace_count == 0:
                    end_remove = i + 1
                    break
        if end_remove > remove_start:
            break
    
    print(f'Removing lines {remove_start+1} to {end_remove+1}')
    
    # Create new lines: everything before first func + everything from last func onwards
    new_lines = lines[:remove_start] + lines[keep_start:]
    
    with open(file_path, 'w', encoding='utf-8') as f:
        f.writelines(new_lines)
    
    print('-> Fixed!')
    
    # Verify
    with open(file_path, 'r', encoding='utf-8') as f:
        verify_lines = f.readlines()
    
    print('\nVerifying lines 695-720:')
    for i in range(694, min(722, len(verify_lines))):
        print(f'{i+1}: {verify_lines[i].rstrip()}')
    
elif len(indices) == 1:
    print('\nOnly one occurrence - checking if there is a duplicate signature...')
    
    # Check if there's a duplicate "): Promise<Array" after the function
    func_start = indices[0]
    
    # Find the end of the function
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
    
    # Check if there's a "): Promise<Array" signature after the function ends
    for i in range(func_end, min(func_end + 10, len(lines))):
        if '): Promise<Array<' in lines[i]:
            print(f'Found duplicate signature at line {i+1}: {lines[i].rstrip()}')
            print('Removing this line...')
            del lines[i]
            
            with open(file_path, 'w', encoding='utf-8') as f:
                f.writelines(lines)
            
            print('-> Fixed!')
            break
else:
    print('\nNo firestoreTextSearch found!')

print('\nDone!')
