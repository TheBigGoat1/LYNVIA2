
'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { swissCantons } from '@/lib/constants';

interface CantonSearchProps {
  value: string | undefined;
  onChange: (value: string) => void;
}

export function CantonSearch({ value, onChange }: CantonSearchProps) {
  const [open, setOpen] = React.useState(false);
  const selectedCantonLabel = React.useMemo(() => {
    return swissCantons.find((c) => c.value === value)?.label || 'Select a canton...';
  }, [value]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
        >
          {selectedCantonLabel}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search canton..." />
          <CommandList>
            <CommandEmpty>No canton found.</CommandEmpty>
            <CommandGroup>
              {swissCantons.map((canton) => (
                <CommandItem
                  key={canton.value}
                  value={canton.label}
                  onSelect={() => {
                    onChange(canton.value);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      value === canton.value ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  {canton.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
