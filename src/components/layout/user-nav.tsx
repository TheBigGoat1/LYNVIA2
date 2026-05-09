'use client';

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PlaceHolderImages } from "@/lib/placeholder-images";
import { Link, useRouter } from "@/navigation";
import { useFirebase } from "@/firebase/firebase-provider";
import { auth } from "@/firebase/config";
import { signOut } from "firebase/auth";
import { useToast } from "@/hooks/use-toast";
import { useTranslations } from 'next-intl';
import { authErrorMessage } from "@/lib/toast-messages";

export function UserNav() {
  const { user, userRole } = useFirebase();
  const router = useRouter();
  const { toast } = useToast();
  const t = useTranslations('UserNav');
  const userAvatar = PlaceHolderImages.find(p => p.id === 'user-avatar');

  const profileHref =
    userRole === 'business'
      ? '/business/profile'
      : userRole === 'accounting_firm'
        ? '/accounting-firm/settings'
        : userRole === 'admin'
          ? '/admin/settings'
          : '/individual/settings';

  const handleLogout = async () => {
    try {
      await signOut(auth);
      toast({
        variant: "success",
        title: t('logoutSuccessTitle'),
        description: t('logoutSuccessDescription'),
      });
      router.push("/");
    } catch (error: unknown) {
      toast({
        variant: "destructive",
        title: t('logoutFailedTitle'),
        description: authErrorMessage(error),
      });
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-8 w-8 rounded-full">
          <Avatar className="h-9 w-9">
            {user?.photoURL ? (
              <AvatarImage src={user.photoURL} alt={t('userAvatar')} />
            ) : (
              userAvatar && <AvatarImage src={userAvatar.imageUrl} alt={t('userAvatar')} data-ai-hint={userAvatar.imageHint} />
            )}
            <AvatarFallback>{user?.email?.[0].toUpperCase() || t('avatarFallback')}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        {user ? (
          <>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">{user.displayName || t('userName')}</p>

                <p className="text-xs leading-none text-muted-foreground">
                  {user.email}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem asChild>
                <Link href={profileHref}>{t('profile')}</Link>
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout}>
              {t('logout')}
            </DropdownMenuItem>
          </>
        ) : (
          <>
            <DropdownMenuItem asChild>
              <Link href="/login">{t('login')}</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/register">{t('register')}</Link>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
