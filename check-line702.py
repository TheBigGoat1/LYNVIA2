import os

base = r'C:\Users\ADMIN\Downloads\lynvia\lynviadigital-main'
file_path = os.path.join(base, 'src', 'app', '[locale]', 'individual', 'legal-assitant', 'page.tsx')

print(f'Reading: {file_path}')

with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

print(f'\nLines 695-720:')
for i in range(694, min(721, len(lines))):
    print(f'{i+1}: {lines[i]}', end='')

# Find firestoreTextSearch function
content = ''.join(lines)
start = content.find('const firestoreTextSearch = async (')
print(f'\nFunction starts at index: {start}')

if start >= 0:
    # Find the end
    brace_count = 0
    in_func = False
    end = start
    
    for i in range(start, len(content)):
        if content[i] == '{':
            brace_count += 1
            in_func = True
        elif content[i] == '}':
            brace_count -= 1
            if in_func and brace_count == 0:
                end = i + 1
                break
    
    func = content[start:end]
    print(f'\nFunction from {start} to {end}')
    print(f'Function text (first 500 chars):')
    print(func[:500])
    print('...')
