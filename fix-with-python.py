import os
import re

# Use raw string for Windows path with []
base = r'C:\Users\ADMIN\Downloads\lynvia\lynviadigital-main'
file_path = os.path.join(base, 'src', 'app', '[locale]', 'individual', 'legal-assistant', 'page.tsx')

print(f'Reading: {file_path}')

if not os.path.exists(file_path):
    print('File not found!')
    exit(1)

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Find all occurrences of "const firestoreTextSearch = async"
occurrences = []
start = 0
while True:
    idx = content.find('const firestoreTextSearch = async (', start)
    if idx == -1:
        break
    occurrences.append(idx)
    start = idx + 1

print(f'\nFound {len(occurrences)} occurrences')
for i, idx in enumerate(occurrences):
    print(f'  {i+1}. at index {idx}')

if len(occurrences) > 1:
    print('\nMultiple definitions! Keeping the LAST one and removing others...')
    
    # Keep everything before the first occurrence
    # and everything from the last occurrence onwards
    first_idx = occurrences[0]
    last_idx = occurrences[-1]
    
    # Find the start of the last function (where it begins)
    # We need to find where the FIRST function ends, so we keep content before first function
    # and content from the last function onwards
    
    # Find end of first function by matching braces
    brace_count = 0
    in_func = False
    end_first = first_idx
    
    for i in range(first_idx, len(content)):
        if content[i] == '{':
            brace_count += 1
            in_func = True
        elif content[i] == '}':
            brace_count -= 1
            if in_func and brace_count == 0:
                end_first = i + 1
                break
    
    print(f'First function: {first_idx} to {end_first}')
    print(f'Keeping from last occurrence: {last_idx}')
    
    # New content: everything before first function + everything from last function onwards
    new_content = content[:first_idx] + content[last_idx:]
    
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(new_content)
    
    print('-> Removed duplicate functions!')
    
    # Verify
    with open(file_path, 'r', encoding='utf-8') as f:
        verify_content = f.read()
        verify_lines = verify_content.split('\n')
        print(f'\nVerifying lines 695-715:')
        for i in range(694, min(716, len(verify_lines))):
            print(f'{i+1}: {verify_lines[i]}')
else:
    print('Only one occurrence - no cleanup needed')

print('\nDone!')
