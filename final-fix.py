import os

# Build path with [locale] folder
base = r'C:\Users\ADMIN\Downloads\lynvia\lynviadigital-main'
file_path = os.path.join(base, 'src', 'app', '[locale]', 'individual', 'legal-assitant', 'page.tsx')

print(f'Reading: {file_path}')

if not os.path.exists(file_path):
    print('File not found!')
    exit(1)

with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

print(f'Total lines: {len(lines)}')

# Show lines 695-720
print('\nLines 695-720:')
for i in range(694, min(722, len(lines))):
    print(f'{i+1}: {lines[i].rstrip()}')

# Find where the problem is - look for "): Promise<Array" lines
print('\nLooking for problematic lines...')
for i in range(len(lines)):
    if '): Promise<Array' in lines[i]:
        print(f'Found at line {i+1}: {lines[i].rstrip()}')
        
        # If this is the SECOND occurrence, we need to remove the duplicate function above it
        # Find the function start "const firestoreTextSearch = async"
        for j in range(i-1, -1, -1):
            if 'const firestoreTextSearch = async' in lines[j]:
                print(f'Function starts at line {j+1}')
                
                # Remove lines from j to i (inclusive of the duplicate signature)
                print(f'Removing lines {j+1} to {i+1}...')
                del lines[j:i+1]
                
                # Write back
                with open(file_path, 'w', encoding='utf-8') as f:
                    f.writelines(lines)
                print('-> Fixed!')
                exit(0)
