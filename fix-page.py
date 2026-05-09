import re
import glob
import os

base = r'C:\Users\ADMIN\Downloads\lynvia\lynviadigital-main'
pattern = os.path.join(base, 'src', '**', 'legal-assitant', 'page.tsx')

files = glob.glob(pattern, recursive=True)
print(f'Found files: {len(files)}')

new_func = '''  const firestoreTextSearch = async (
    searchText: string,
    options: { limit?: number }
  ): Promise<Array<{ documentId: string; title: string; chunkId: string; text: string; score: number }>> => {
    if (!searchIndex) {
      return [];
    }

    const results = fastSearch(searchIndex, searchText, options);
    return results;
  };'''

for file in files:
    print(f'\nProcessing: {file}')
    with open(file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Find the firestoreTextSearch function and replace it
    # Look for the pattern
    if 'firestoreTextSearch = async' in content:
        # Find start
        start = content.find('  const firestoreTextSearch = async (')
        if start == -1:
            start = content.find('const firestoreTextSearch = async (')
        
        if start >= 0:
            # Find the end of this function (next "const " or end)
            # Find opening brace
            brace_start = content.find('{', start)
            if brace_start >= 0:
                brace_count = 1
                end = brace_start + 1
                while brace_count > 0 and end < len(content):
                    if content[end] == '{':
                        brace_count += 1
                    elif content[end] == '}':
                        brace_count -= 1
                    end += 1
                
                old_func = content[start:end]
                print(f'  Found function from {start} to {end}')
                print(f'  Old function: {old_func[:100]}...')
                
                # Replace
                content = content[:start] + new_func + content[end:]
                
                with open(file, 'w', encoding='utf-8') as f:
                    f.write(content)
                print('  -> Fixed!')
            else:
                print('  -> Could not find opening brace')
        else:
            print('  -> Could not find function start')
    else:
        print('  -> Function pattern not found')

print('\nDone!')
