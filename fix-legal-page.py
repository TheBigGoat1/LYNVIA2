import re
import os

base = r'C:\Users\ADMIN\Downloads\lynvia\lynviadigital-main'
file_path = os.path.join(base, 'src', 'app', '[locale]', 'individual', 'legal-assitant', 'page.tsx')

print(f'Reading: {file_path}')

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Find the firestoreTextSearch function
start_marker = 'const firestoreTextSearch = async ('
start_idx = content.find(start_marker)

if start_idx == -1:
    print('Function not found!')
    exit(1)

print(f'Function starts at index: {start_idx}')

# Find the end of the function (matching braces)
brace_count = 0
in_func = False
end_idx = start_idx

for i in range(start_idx, len(content)):
    if content[i] == '{':
        brace_count += 1
        in_func = True
    elif content[i] == '}':
        brace_count -= 1
        if in_func and brace_count == 0:
            end_idx = i + 1
            break

print(f'Function ends at index: {end_idx}')
print(f'Function length: {end_idx - start_idx}')

old_func = content[start_idx:end_idx]
print(f'\nOld function (first 200 chars):')
print(old_func[:200])
print('...')

# Create new clean function
new_func = '''const firestoreTextSearch = async (
    searchText: string,
    options: { limit?: number }
  ): Promise<Array<{ documentId: string; title: string; chunkId: string; text: string; score: number }>> => {
    if (!searchIndex) {
      return [];
    }

    const results = fastSearch(searchIndex, searchText, options);
    return results;
  };'''

# Replace
new_content = content[:start_idx] + new_func + content[end_idx:]

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(new_content)

print('\n-> Fixed!')

# Verify
with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()
    print(f'\nVerifying lines 695-710:')
    for i in range(694, min(712, len(lines))):
        print(f'{i+1}: {lines[i]}', end='')
