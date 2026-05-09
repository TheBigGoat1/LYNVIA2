'use client';

import {useRouter, usePathname} from '@/navigation';
import {useTransition} from 'react';
import {Languages} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';

export function LanguageToggle() {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const pathname = usePathname();

  function onSelectChange(locale: string) {
    startTransition(() => {
      router.replace(pathname, {locale});
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          disabled={isPending}
          className="h-11 w-11 min-h-[44px] min-w-[44px] shrink-0 sm:h-10 sm:w-10 sm:min-h-10 sm:min-w-10"
        >
          <Languages className="h-[1.2rem] w-[1.2rem]" />
          <span className="sr-only">Toggle language</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => onSelectChange('en')}>
          English
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onSelectChange('de')}>
          Deutsch
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onSelectChange('fr')}>
          Français
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onSelectChange('es')}>
          Español
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onSelectChange('it')}>
          Italiano
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
