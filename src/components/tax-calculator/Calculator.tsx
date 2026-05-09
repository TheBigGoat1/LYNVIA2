
'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { taxInputData } from '@/lib/taxes/constants';
import {
  TaxInput,
  TaxRelationship,
  TaxResult,
  TaxInputPerson,
  ValueLabelItem,
  TaxLocation
} from '@/lib/taxes/typesClient';
import { childrenOptions } from '@/lib/components/listOptions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
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
import { Loader2, Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import TaxResultDisplay from './TaxResultDisplay';
import TaxDetailsDisplay from './TaxDetailsDisplay';
import { Skeleton } from '../ui/skeleton';

const defaultPerson: TaxInputPerson = {
  age: 30,
  confession: 'roman',
  income: 100000,
  incomeType: 'gross',
  deductions: {}
};

const defaultInput: Partial<TaxInput> = {
  calculationType: 'incomeAndWealth',
  children: 0,
  fortune: 250000,
  locationId: 66,
  relationship: 's',
  year: 2022,
  persons: [{ ...defaultPerson }]
};

const getOptionsEn = (list: readonly ValueLabelItem<string>[]) => {
  return list.map((item) => ({ value: item.value, label: item.label.en }));
};

const Calculator: React.FC = () => {
  const [formData, setFormData] = useState<Partial<TaxInput>>(defaultInput);
  const [taxes, setTaxes] = useState<TaxResult | null>(null);
  const [taxLocations, setTaxLocations] = useState<TaxLocation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [locationOpen, setLocationOpen] = useState(false);

  // Fetch locations on mount
  useEffect(() => {
    const fetchLocations = async () => {
      try {
        const response = await fetch(`/api/locations/${formData.year ?? 2022}`);
        if (!response.ok) {
          const err = await response.json().catch(() => ({error: 'Failed to fetch tax locations'}));
          throw new Error(err.error || 'Failed to fetch tax locations');
        }
        const data = await response.json();
        if (Array.isArray(data)) {
          setTaxLocations(data);
        } else {
          console.error("Location data is not an array: ", data);
          setTaxLocations([]);
        }
      } catch (err: any) {
        console.error('Failed to fetch locations:', err);
        setError(err.message);
        setTaxLocations([]);
      }
    };
    fetchLocations();
  }, [formData.year]);

  const locationOptions = useMemo(
    () =>
      taxLocations.map((item) => ({
        value: item.BfsID,
        label: `${item.BfsName} (${item.Canton})`
      })),
    [taxLocations]
  );

  const selectedLocation = useMemo(
    () => locationOptions.find((loc) => loc.value === formData.locationId),
    [locationOptions, formData.locationId]
  );

  const showSecondPerson = useMemo(
    () => formData.relationship === 'm' || formData.relationship === 'rp',
    [formData.relationship]
  );

  const personItems = useMemo(
    () => (showSecondPerson ? [0, 1] : [0]),
    [showSecondPerson]
  );

  // Update persons array when second person is added/removed
  useEffect(() => {
    const persons = formData.persons || [];
    if (showSecondPerson && persons.length < 2) {
      setFormData((prev) => ({
        ...prev,
        persons: [...persons, { ...defaultPerson }]
      }));
    } else if (!showSecondPerson && persons.length > 1) {
      setFormData((prev) => ({
        ...prev,
        persons: [persons[0]]
      }));
    }
  }, [showSecondPerson, formData.persons]);

  const updateFormField = useCallback(<K extends keyof TaxInput>(field: K, value: TaxInput[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }, []);

  const updatePerson = useCallback(
    (index: number, field: keyof TaxInputPerson, value: any) => {
      setFormData((prev) => {
        const persons = [...(prev.persons || [])];
        persons[index] = { ...persons[index], [field]: value };
        return { ...prev, persons };
      });
    },
    []
  );

  const updatePersonDeduction = useCallback(
    (index: number, deductionName: string, value: number | undefined) => {
      setFormData((prev) => {
        const persons = [...(prev.persons || [])];
        const deductions: Record<string, number | undefined> = { ...(persons[index]?.deductions || {}) };
        if (value === undefined) {
          delete deductions[deductionName];
        } else {
          deductions[deductionName] = value;
        }
        persons[index] = { ...persons[index], deductions: deductions as any };
        return { ...prev, persons };
      });
    },
    []
  );

  const updateGeneralDeduction = useCallback(
    (deductionName: string, value: number | undefined) => {
      setFormData((prev) => {
        const deductions: Record<string, number | undefined> = { ...(prev.deductions || {}) };
        if (value === undefined) {
          delete deductions[deductionName];
        } else {
          deductions[deductionName] = value;
        }
        return { ...prev, deductions: deductions as any };
      });
    },
    []
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setTaxes(null);

    const locationData = taxLocations.find((x) => x.BfsID === formData.locationId);
    if (!locationData) {
        setError('Selected municipality data not found. Please re-select a location.');
        setIsLoading(false);
        return;
    }

    const taxInput: Partial<TaxInput> = {
      ...formData,
      cantonId: locationData.CantonID,
    };

    try {
      const response = await fetch('/api/taxes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(taxInput)
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({error: 'An unknown error occurred during calculation.'}));
        throw new Error(err.error || 'Failed to calculate taxes');
      }

      const result = await response.json();
      setTaxes(result);
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
      setTaxes(null);
    } finally {
      setIsLoading(false);
    }
  };

  const deductionsPerson = taxInputData.deductionsPerson;
  const deductionsGeneral = taxInputData.deductionsGeneral;

  return (
    <div className="w-full">
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Form Card */}
        <Card>
          <CardHeader>
            <CardTitle>Tax Calculator</CardTitle>
            <CardDescription>
              Calculate your Swiss taxes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Calculation Type */}
              <div className="space-y-2">
                <Label>Tax Type</Label>
                <RadioGroup
                  value={formData.calculationType}
                  onValueChange={(value) => updateFormField('calculationType', value as 'incomeAndWealth' | 'capital')}
                  className="flex flex-wrap gap-2"
                >
                  {getOptionsEn(taxInputData.calculationTypes).map((option) => (
                    <div key={option.value} className="flex items-center">
                      <RadioGroupItem value={option.value} id={`calc-${option.value}`} className="peer sr-only" />
                      <Label
                        htmlFor={`calc-${option.value}`}
                        className="flex items-center justify-center rounded-md border-2 border-muted bg-popover px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary cursor-pointer"
                      >
                        {option.label}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>

              {/* Year */}
              <div className="space-y-2">
                <Label htmlFor="year">Tax Year</Label>
                <Select
                  value={String(formData.year)}
                  onValueChange={(value) => updateFormField('year', Number(value))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select year" />
                  </SelectTrigger>
                  <SelectContent>
                    {taxInputData.years.map((year) => (
                      <SelectItem key={year} value={String(year)}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Location Combobox */}
              <div className="space-y-2">
                <Label>Tax Municipality</Label>
                <Popover open={locationOpen} onOpenChange={setLocationOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={locationOpen}
                      className="w-full justify-between"
                    >
                      {selectedLocation?.label || "Select municipality..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Search municipality..." />
                      <CommandList>
                        <CommandEmpty>No municipality found.</CommandEmpty>
                        <CommandGroup className="max-h-64 overflow-auto">
                          {locationOptions.map((loc) => (
                            <CommandItem
                              key={loc.value}
                              value={loc.label}
                              onSelect={() => {
                                updateFormField('locationId', loc.value);
                                setLocationOpen(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  formData.locationId === loc.value ? "opacity-100" : "opacity-0"
                                )}
                              />
                              {loc.label}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              {/* Relationship */}
              <div className="space-y-2">
                <Label>Marital Status</Label>
                <RadioGroup
                  value={formData.relationship}
                  onValueChange={(value) => updateFormField('relationship', value as TaxRelationship)}
                  className="flex flex-wrap gap-2"
                >
                  {getOptionsEn(taxInputData.relationships).map((option) => (
                    <div key={option.value} className="flex items-center">
                      <RadioGroupItem value={option.value} id={`rel-${option.value}`} className="peer sr-only" />
                      <Label
                        htmlFor={`rel-${option.value}`}
                        className="flex items-center justify-center rounded-md border-2 border-muted bg-popover px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary cursor-pointer"
                      >
                        {option.label}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>

              {/* Children */}
              <div className="space-y-2">
                <Label htmlFor="children">Number of Children</Label>
                <Select
                  value={String(formData.children)}
                  onValueChange={(value) => updateFormField('children', Number(value))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Children" />
                  </SelectTrigger>
                  <SelectContent>
                    {childrenOptions.map((opt) => (
                      <SelectItem key={opt.value} value={String(opt.value)}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Person Details */}
              {personItems.map((personIndex) => (
                <Card key={personIndex} className="p-4">
                  <h4 className="font-medium mb-4">
                    {showSecondPerson ? `Person ${personIndex + 1}` : 'Personal Information'}
                  </h4>
                  <div className="space-y-4">
                    {/* Age */}
                    <div className="space-y-2">
                      <Label>Age</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min={18}
                          max={150}
                          value={formData.persons?.[personIndex]?.age || ''}
                          onChange={(e) => updatePerson(personIndex, 'age', Number(e.target.value))}
                        />
                        <span className="text-sm text-muted-foreground">years</span>
                      </div>
                    </div>

                    {/* Confession */}
                    <div className="space-y-2">
                      <Label>Confession</Label>
                      <RadioGroup
                        value={formData.persons?.[personIndex]?.confession}
                        onValueChange={(value) => updatePerson(personIndex, 'confession', value)}
                        className="flex flex-wrap gap-2"
                      >
                        {getOptionsEn(taxInputData.confessions).map((option) => (
                          <div key={option.value} className="flex items-center">
                            <RadioGroupItem value={option.value} id={`conf-${personIndex}-${option.value}`} className="peer sr-only" />
                            <Label
                              htmlFor={`conf-${personIndex}-${option.value}`}
                              className="flex items-center justify-center rounded-md border-2 border-muted bg-popover px-3 py-2 text-xs hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary cursor-pointer"
                            >
                              {option.label}
                            </Label>
                          </div>
                        ))}
                      </RadioGroup>
                    </div>

                    {/* Income */}
                    <div className="space-y-2">
                      <Label>Gross Income</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min={0}
                          value={formData.persons?.[personIndex]?.income || ''}
                          onChange={(e) => updatePerson(personIndex, 'income', Number(e.target.value))}
                        />
                        <span className="text-sm text-muted-foreground">CHF</span>
                      </div>
                    </div>

                    {/* Person Deductions */}
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Deductions</Label>
                      {Object.keys(deductionsPerson).map((key) => {
                        const deduction = deductionsPerson[key as keyof typeof deductionsPerson];
                        if (deduction.withChildrenOnly && (formData.children ?? 0) === 0) return null;
                        return (
                          <div key={key} className="flex items-center gap-2">
                            <Label className="flex-1 text-sm">{deduction.label.en}</Label>
                            <Input
                              type="number"
                              min={0}
                              className="w-32"
                              placeholder={deduction.defaultFlatRate ? 'flat rate' : String(deduction.default ?? 0)}
                              value={(formData.persons?.[personIndex]?.deductions as Record<string, number | undefined>)?.[key] ?? ''}
                              onChange={(e) => updatePersonDeduction(personIndex, key, e.target.value ? Number(e.target.value) : undefined)}
                            />
                            <span className="text-xs text-muted-foreground w-10">CHF</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </Card>
              ))}

              {/* General Deductions */}
              <Card className="p-4">
                <h4 className="font-medium mb-4">Other Deductions</h4>
                <div className="space-y-2">
                  {Object.keys(deductionsGeneral).map((key) => {
                    const deduction = deductionsGeneral[key as keyof typeof deductionsGeneral];
                    if (deduction.withChildrenOnly && (formData.children ?? 0) === 0) return null;
                    return (
                      <div key={key} className="flex items-center gap-2">
                        <Label className="flex-1 text-sm">{deduction.label.en}</Label>
                        <Input
                          type="number"
                          min={0}
                          className="w-32"
                          placeholder={deduction.defaultFlatRate ? 'flat rate' : String(deduction.default ?? 0)}
                          value={(formData.deductions as Record<string, number | undefined>)?.[key] ?? ''}
                          onChange={(e) => updateGeneralDeduction(key, e.target.value ? Number(e.target.value) : undefined)}
                        />
                        <span className="text-xs text-muted-foreground w-10">CHF</span>
                      </div>
                    );
                  })}
                </div>
              </Card>

              {/* Fortune */}
              <div className="space-y-2">
                <Label>Net Wealth</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={0}
                    value={formData.fortune || ''}
                    onChange={(e) => updateFormField('fortune', Number(e.target.value) || 0)}
                  />
                  <span className="text-sm text-muted-foreground">CHF</span>
                </div>
              </div>

              {/* Submit */}
              <Button type="submit" disabled={isLoading} className="w-full">
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isLoading ? 'Calculating...' : 'Calculate Taxes'}
              </Button>

            </form>
          </CardContent>
        </Card>

        {/* Results */}
        <div className="space-y-6">
          {isLoading && (
            <Card>
              <CardHeader>
                <Skeleton className="h-7 w-1/2" />
              </CardHeader>
              <CardContent className="space-y-4">
                 <Skeleton className="h-32 w-full" />
                 <Skeleton className="h-64 w-full" />
              </CardContent>
            </Card>
          )}
          {error && (
             <Card className="border-destructive">
                <CardHeader>
                    <CardTitle className="text-destructive">Calculation Error</CardTitle>
                    <CardDescription className="text-destructive">
                       {error}
                    </CardDescription>
                </CardHeader>
             </Card>
          )}
          {taxes && !isLoading && !error && (
            <>
              <TaxResultDisplay taxes={taxes} />
              <TaxDetailsDisplay taxes={taxes} showSecondPerson={showSecondPerson} />
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Calculator;
