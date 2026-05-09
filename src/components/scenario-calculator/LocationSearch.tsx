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
import type { LocationSearchResult } from '@/lib/scenario-calculator/types';
import { useTranslations } from 'next-intl';

interface LocationSearchProps {
  value: number | undefined;
  taxYear?: number;
  onChange: (location: LocationSearchResult | null) => void;
}

export function LocationSearch({ value, taxYear, onChange }: LocationSearchProps) {
  const t = useTranslations('ScenarioCalculator.masterCalculator.locationSearch');
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState('');
  const [locations, setLocations] = React.useState<LocationSearchResult[]>([]);
  const [selectedLocation, setSelectedLocation] = React.useState<LocationSearchResult | null>(null);

  React.useEffect(() => {
    if (search.length < 2) {
      setLocations([]);
      return;
    }

    const controller = new AbortController();

    const fetchLocations = async () => {
      try {
        const response = await fetch('/api/taxes/search-location', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: search,
            taxYear: taxYear ?? new Date().getFullYear(),
          }),
          signal: controller.signal,
        });

        if (!response.ok) {
          console.error('Search failed:', response.status);
          setLocations([]);
          return;
        }

        const data = await response.json();
        setLocations(Array.isArray(data) ? data : []);
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          console.error('Failed to fetch locations:', error);
          setLocations([]);
        }
      }
    };

    const debounce = setTimeout(fetchLocations, 300);
    return () => {
      controller.abort();
      clearTimeout(debounce);
    };
  }, [search, taxYear]);

  React.useEffect(() => {
    if (!value) {
      setSelectedLocation(null);
      return;
    }

    const existing = locations.find((location) => location.TaxLocationID === value);
    if (existing) {
      setSelectedLocation(existing);
    }
  }, [value, locations]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
        >
          {selectedLocation
            ? selectedLocation.LongName
            : value
              ? t('loading')
              : t('selectMunicipality')}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command>
          <CommandInput
            placeholder={t('searchPlaceholder')}
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            <CommandEmpty>{t('noMunicipalityFound')}</CommandEmpty>
            <CommandGroup>
              {locations.map((location) => (
                <CommandItem
                  key={location.TaxLocationID}
                  value={location.LongName}
                  onSelect={() => {
                    setSelectedLocation(location);
                    onChange(location);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      value === location.TaxLocationID ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  {location.LongName}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
