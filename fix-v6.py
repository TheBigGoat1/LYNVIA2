import os

base = r'C:\Users\ADMIN\Downloads\lynvia\lynviadigital-main'

# Walk the directory to find page.tsx in legal-assitant folder
target_file = None
for root, dirs, files in os.walk(base):
    for file in files:
        if file == 'page.tsx' and 'legal-assitant' in root:
            target_file = os.path.join(root, file)
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

# Find the firestoreTextSearch function
# The issue is duplicate signatures
search_term = 'const firestoreTextSearch = async ('
occurrences = []
for i, line in enumerate(lines):
    if search_term in line:
        occurrences.append(i)

print(f'\nFound {len(occurrences)} occurrences of firestoreTextSearch')

if len(occurrences) > 1:
    print('\nMultiple definitions! Keeping the LAST one and removing others...')
    
    # Keep everything before the first occurrence
    # And everything from the last occurrence onwards
    first_idx = occurrences[0]
    last_idx = occurrences[-1]
    
    # Find where the first function ends (its closing brace)
    brace_count = 0
    in_func = False
    end_first = first_idx
    
    for i in range(first_idx, len(lines)):
        for ch in lines[i]:
            if ch == '{':
                brace_count += 1
                in_func = True
            elif ch == '}':
                brace_count -= 1
                if in_func and brace_count == 0:
                    end_first = i + 1
                    break
        if end_first > first_idx:
            break
    
    print(f'First function: lines {first_idx+1} to {end_first+1}')
    print(f'Keeping from last occurrence at line {last_idx+1}')
    
    # New lines: everything before first function + everything from last function onwards
    new_lines = lines[:first_idx] + lines[last_idx:]
    
    with open(target_file, 'w', encoding='utf-8') as f:
        f.writelines(new_lines)
    
    print('-> Fixed!')
    
    # Verify
    with open(target_file, 'r', encoding='utf-8') as f:
        verify_lines = f.readlines()
    
    print('\nVerifying lines 695-720:')
    for i in range(694, min(722, len(verify_lines))):
        print(f'{i+1}: {verify_lines[i].rstrip()}')
        
elif len(occurrences) == 1:
    print('\nOnly one occurrence. Checking for duplicate signature...')
    
    # Check if there's a duplicate "): Promise<Array" after the function
    func_start = occurrences[0]
    
    # Find end of function
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
    
    # Check for duplicate signature after function end
    for i in range(func_end, min(func_end + 10, len(lines))):
        if '): Promise<Array<' in lines[i]:
            print(f'Found duplicate signature at line {i+1}: {lines[i].rstrip()}')
            print('Removing this and any broken lines...')
            
            # Remove from func_end to i (the duplicate signature and anything in between)
            new_lines = lines[:func_end] + lines[i+1:]
            
            with open(target_file, 'w', encoding='utf-8') as f:
                f.writelines(new_lines)
            
            print('-> Fixed!')
            break
else:
    print('\nNo firestoreTextSearch found!')

print('\nDone!')
