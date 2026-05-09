'use client';

import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { auth } from '@/firebase/config';

const createFirmSchema = z.object({
  firmName: z.string().min(1, 'Firm name is required.'),
  firstName: z.string().min(1, 'First name is required.'),
  lastName: z.string().min(1, 'Last name is required.'),
  email: z.string().email('Please enter a valid email address.'),
  password: z.string().min(8, 'Password must be at least 8 characters.'),
  phone: z.string().min(1, 'Phone number is required.'),
});

type CreateFirmFormValues = z.infer<typeof createFirmSchema>;

interface CreateFirmFormProps {
  onClose: () => void;
}

export function CreateFirmForm({ onClose }: CreateFirmFormProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<CreateFirmFormValues>({
    resolver: zodResolver(createFirmSchema),
    defaultValues: {
      firmName: '',
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      phone: '',
    },
  });

  const handleCreateFirm = async (values: CreateFirmFormValues) => {
    setIsLoading(true);

    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error('You must be logged in as an admin to create a firm.');
      }

      const idToken = await currentUser.getIdToken();
      const response = await fetch('/api/admin/create-company', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          type: 'accounting_firm',
          companyName: values.firmName,
          firstName: values.firstName,
          lastName: values.lastName,
          email: values.email,
          password: values.password,
          phone: values.phone,
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Failed to create accounting firm.');
      }

      toast({
        title: 'Firm Created',
        description: 'The accounting firm account has been created successfully.',
      });

      onClose();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Creation failed',
        description: error.message || 'Unable to create accounting firm account.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>Create New Accounting Firm</DialogTitle>
        <DialogDescription>Fill out the form below to create a new firm account.</DialogDescription>
      </DialogHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleCreateFirm)} className="space-y-4">
          <FormField
            control={form.control}
            name="firmName"
            render={({ field }) => (
                <FormItem>
                    <FormLabel>Firm Name</FormLabel>
                    <FormControl><Input placeholder="e.g. Acme Accounting" {...field} /></FormControl>
                    <FormMessage />
                </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="firstName"
            render={({ field }) => (
                <FormItem>
                    <FormLabel>Admin First Name</FormLabel>
                    <FormControl><Input placeholder="e.g. John" {...field} /></FormControl>
                    <FormMessage />
                </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="lastName"
            render={({ field }) => (
                <FormItem>
                    <FormLabel>Admin Last Name</FormLabel>
                    <FormControl><Input placeholder="e.g. Doe" {...field} /></FormControl>
                    <FormMessage />
                </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
                <FormItem>
                    <FormLabel>Admin Email</FormLabel>
                    <FormControl><Input type="email" placeholder="admin@acme.com" {...field} /></FormControl>
                    <FormMessage />
                </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
                <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl><Input type="password" {...field} /></FormControl>
                    <FormMessage />
                </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
                <FormItem>
                    <FormLabel>Phone Number</FormLabel>
                    <FormControl><Input placeholder="+41..." {...field} /></FormControl>
                    <FormMessage />
                </FormItem>
            )}
          />
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="ghost">Cancel</Button>
            </DialogClose>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isLoading ? 'Creating...' : 'Create Firm'}
            </Button>
          </DialogFooter>
        </form>
      </Form>
    </DialogContent>
  );
}
