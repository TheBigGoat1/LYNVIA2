
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { KeyRound, Loader2, Save, Bot, Mail, ToggleRight, Wrench, Shield } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useTranslations } from 'next-intl';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';

const stripeSettingsSchema = z.object({
  publishableKey: z.string().startsWith('pk_').min(1, 'Publishable Key is required.'),
  secretKey: z.string().startsWith('sk_').min(1, 'Secret Key is required.'),
});

const aiModelSettingsSchema = z.object({
    defaultTextModel: z.string().min(1, 'A default model is required.'),
    googleApiKey: z.string().optional(),
    openaiApiKey: z.string().optional(),
    temperature: z.number().min(0).max(1).default(0.7),
    safetySetting: z.string().default('BLOCK_MEDIUM_AND_ABOVE'),
});

const emailSettingsSchema = z.object({
    smtpHost: z.string().min(1, 'Host is required.'),
    smtpPort: z.coerce.number().min(1, 'Port is required.'),
    smtpUser: z.string().optional(),
    smtpPassword: z.string().optional(),
    defaultFromEmail: z.string().email('A valid "from" email is required.'),
    defaultFromName: z.string().min(1, 'A "from" name is required.'),
});

const featureFlagsSchema = z.object({
    enableDocumentGenerator: z.boolean().default(true),
    enableVirtualCFO: z.boolean().default(true),
    enableScenarioCalculator: z.boolean().default(true),
});

const maintenanceSchema = z.object({
    maintenanceMode: z.boolean().default(false),
    maintenanceMessage: z.string().optional(),
});

const legalSchema = z.object({
    termsOfServiceUrl: z.string().url('Must be a valid URL.'),
    privacyPolicyUrl: z.string().url('Must be a valid URL.'),
    cookieConsentMessage: z.string().min(10, 'Message is too short.'),
});


type StripeSettingsValues = z.infer<typeof stripeSettingsSchema>;
type AIModelSettingsValues = z.infer<typeof aiModelSettingsSchema>;
type EmailSettingsValues = z.infer<typeof emailSettingsSchema>;
type FeatureFlagsValues = z.infer<typeof featureFlagsSchema>;
type MaintenanceValues = z.infer<typeof maintenanceSchema>;
type LegalValues = z.infer<typeof legalSchema>;


const GenericSettingCard = ({
    title,
    description,
    children,
    footer,
}: {
    title: string;
    description: string;
    children: React.ReactNode;
    footer: React.ReactNode;
}) => (
    <Card>
        <CardHeader>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>{children}</CardContent>
        <CardFooter>{footer}</CardFooter>
    </Card>
);


export default function AdminSettingsPage() {
  const [isLoading, setIsLoading] = useState<Record<string, boolean>>({});
  const { toast } = useToast();
  const t = useTranslations('AdminSettings');

  const stripeForm = useForm<StripeSettingsValues>({
    resolver: zodResolver(stripeSettingsSchema),
    defaultValues: {
      publishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '',
      secretKey: '',
    },
  });
  
  const aiModelForm = useForm<AIModelSettingsValues>({
    resolver: zodResolver(aiModelSettingsSchema),
    defaultValues: {
        defaultTextModel: 'gemini-1.5-flash',
        googleApiKey: '',
        openaiApiKey: '',
        temperature: 0.7,
        safetySetting: 'BLOCK_MEDIUM_AND_ABOVE',
    }
  });
  
  const emailForm = useForm<EmailSettingsValues>({
    resolver: zodResolver(emailSettingsSchema),
    defaultValues: {
        smtpHost: 'smtp.mailtrap.io',
        smtpPort: 2525,
        smtpUser: '',
        smtpPassword: '',
        defaultFromEmail: 'noreply@lynviadigital.com',
        defaultFromName: 'Lynvia Digital',
    }
  });

  const featureFlagsForm = useForm<FeatureFlagsValues>({
    resolver: zodResolver(featureFlagsSchema),
    defaultValues: {
        enableDocumentGenerator: true,
        enableVirtualCFO: true,
        enableScenarioCalculator: true,
    }
  });

  const maintenanceForm = useForm<MaintenanceValues>({
    resolver: zodResolver(maintenanceSchema),
    defaultValues: {
        maintenanceMode: false,
        maintenanceMessage: "The platform is currently undergoing scheduled maintenance. We'll be back online shortly. Thank you for your patience.",
    }
  });

  const legalForm = useForm<LegalValues>({
    resolver: zodResolver(legalSchema),
    defaultValues: {
        termsOfServiceUrl: 'https://example.com/terms',
        privacyPolicyUrl: 'https://example.com/privacy',
        cookieConsentMessage: "This website uses cookies to ensure you get the best experience. By continuing to use this site, you agree to our use of cookies.",
    }
  });

  const onSubmit = async (formName: string, data: any) => {
    setIsLoading(prev => ({...prev, [formName]: true}));
    // Simulate saving settings.
    await new Promise(resolve => setTimeout(resolve, 1500));
    setIsLoading(prev => ({...prev, [formName]: false}));
    console.log(`${formName} settings saved:`, data);
    toast({
      title: t('toastSuccessTitle'),
      description: `${formName.charAt(0).toUpperCase() + formName.slice(1)} settings have been updated.`,
    });
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">{t('title')}</h1>
        <p className="text-muted-foreground">{t('subtitle')}</p>
      </div>

      <Form {...stripeForm}>
          <form onSubmit={stripeForm.handleSubmit(data => onSubmit('stripe', data))}>
              <GenericSettingCard
                  title={t('stripeCard.title')}
                  description={t('stripeCard.description')}
                  footer={
                      <Button type="submit" disabled={isLoading['stripe']}>
                          {isLoading['stripe'] ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                          {isLoading['stripe'] ? t('savingButton') : t('saveButton')}
                      </Button>
                  }
              >
                  <div className="space-y-4">
                      <FormField
                          control={stripeForm.control}
                          name="publishableKey"
                          render={({ field }) => (
                              <FormItem>
                                  <FormLabel>{t('stripeCard.publishableKeyLabel')}</FormLabel>
                                  <FormControl>
                                      <Input placeholder={t('stripeCard.publishableKeyPlaceholder')} {...field} />
                                  </FormControl>
                                  <FormMessage />
                              </FormItem>
                          )}
                      />
                      <FormField
                          control={stripeForm.control}
                          name="secretKey"
                          render={({ field }) => (
                              <FormItem>
                                  <FormLabel>{t('stripeCard.secretKeyLabel')}</FormLabel>
                                  <FormControl>
                                      <Input type="password" placeholder={t('stripeCard.secretKeyPlaceholder')} {...field} />
                                  </FormControl>
                                  <FormDescription>
                                      {t('stripeCard.secretKeyDescription')}
                                  </FormDescription>
                                  <FormMessage />
                              </FormItem>
                          )}
                      />
                  </div>
              </GenericSettingCard>
          </form>
      </Form>

       <Separator />

      <Form {...aiModelForm}>
        <form onSubmit={aiModelForm.handleSubmit(data => onSubmit('aiModel', data))}>
          <GenericSettingCard
            title={t('aiModelCard.title')}
            description={t('aiModelCard.description')}
            footer={
              <Button type="submit" disabled={isLoading['aiModel']}>
                {isLoading['aiModel'] ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                {t('saveButton')}
              </Button>
            }
          >
            <div className="space-y-6">
              <FormField
                control={aiModelForm.control}
                name="defaultTextModel"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('aiModelCard.modelLabel')}</FormLabel>
                     <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={t('aiModelCard.modelPlaceholder')} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="gemini-1.5-flash">Gemini 1.5 Flash</SelectItem>
                          <SelectItem value="gemini-1.5-pro">Gemini 1.5 Pro</SelectItem>
                          <SelectItem value="gpt-4o">OpenAI GPT-4o</SelectItem>
                          <SelectItem value="claude-3-opus">Anthropic Claude 3 Opus</SelectItem>
                        </SelectContent>
                      </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={aiModelForm.control}
                name="googleApiKey"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('aiModelCard.googleApiKeyLabel')}</FormLabel>
                    <FormControl><Input type="password" placeholder={t('aiModelCard.googleApiKeyPlaceholder')} {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={aiModelForm.control}
                name="temperature"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('aiModelCard.temperatureLabel')} - {field.value}</FormLabel>
                    <FormControl>
                      <Slider
                        min={0} max={1} step={0.1}
                        defaultValue={[field.value]}
                        onValueChange={(vals) => field.onChange(vals[0])}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
               <FormField
                control={aiModelForm.control}
                name="safetySetting"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('aiModelCard.safetySettingLabel')}</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="BLOCK_NONE">Block None</SelectItem>
                          <SelectItem value="BLOCK_ONLY_HIGH">Block Only High</SelectItem>
                          <SelectItem value="BLOCK_MEDIUM_AND_ABOVE">Block Medium & Above</SelectItem>
                          <SelectItem value="BLOCK_LOW_AND_ABOVE">Block Low & Above</SelectItem>
                        </SelectContent>
                      </Select>
                  </FormItem>
                )}
              />
            </div>
          </GenericSettingCard>
        </form>
      </Form>
      
       <Separator />

       <Form {...emailForm}>
        <form onSubmit={emailForm.handleSubmit(data => onSubmit('email', data))}>
            <GenericSettingCard
                title={t('emailCard.title')}
                description={t('emailCard.description')}
                footer={
                    <Button type="submit" disabled={isLoading['email']}>
                        {isLoading['email'] ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        {t('saveButton')}
                    </Button>
                }
            >
                <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField control={emailForm.control} name="smtpHost" render={({ field }) => (
                            <FormItem><FormLabel>{t('emailCard.hostLabel')}</FormLabel><FormControl><Input placeholder={t('emailCard.hostPlaceholder')} {...field} /></FormControl><FormMessage /></FormItem>
                        )}/>
                        <FormField control={emailForm.control} name="smtpPort" render={({ field }) => (
                            <FormItem><FormLabel>{t('emailCard.portLabel')}</FormLabel><FormControl><Input type="number" placeholder={t('emailCard.portPlaceholder')} {...field} /></FormControl><FormMessage /></FormItem>
                        )}/>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField control={emailForm.control} name="smtpUser" render={({ field }) => (
                            <FormItem><FormLabel>{t('emailCard.userLabel')}</FormLabel><FormControl><Input placeholder={t('emailCard.userPlaceholder')} {...field} /></FormControl><FormMessage /></FormItem>
                        )}/>
                        <FormField control={emailForm.control} name="smtpPassword" render={({ field }) => (
                            <FormItem><FormLabel>{t('emailCard.passwordLabel')}</FormLabel><FormControl><Input type="password" {...field} /></FormControl><FormMessage /></FormItem>
                        )}/>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField control={emailForm.control} name="defaultFromEmail" render={({ field }) => (
                            <FormItem><FormLabel>{t('emailCard.fromLabel')}</FormLabel><FormControl><Input placeholder={t('emailCard.fromPlaceholder')} {...field} /></FormControl><FormMessage /></FormItem>
                        )}/>
                        <FormField control={emailForm.control} name="defaultFromName" render={({ field }) => (
                            <FormItem><FormLabel>{t('emailCard.fromNameLabel')}</FormLabel><FormControl><Input placeholder={t('emailCard.fromNamePlaceholder')} {...field} /></FormControl><FormMessage /></FormItem>
                        )}/>
                    </div>
                </div>
            </GenericSettingCard>
        </form>
       </Form>

       <Separator />

       <Form {...featureFlagsForm}>
        <form onSubmit={featureFlagsForm.handleSubmit(data => onSubmit('featureFlags', data))}>
            <GenericSettingCard
                title={t('featureFlagsCard.title')}
                description={t('featureFlagsCard.description')}
                footer={
                    <Button type="submit" disabled={isLoading['featureFlags']}>
                        {isLoading['featureFlags'] ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        {t('saveButton')}
                    </Button>
                }
            >
                <div className="space-y-4">
                    <FormField control={featureFlagsForm.control} name="enableDocumentGenerator" render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5"><FormLabel>{t('featureFlagsCard.docGenLabel')}</FormLabel><FormDescription>{t('featureFlagsCard.docGenDescription')}</FormDescription></div>
                            <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                        </FormItem>
                    )}/>
                    <FormField control={featureFlagsForm.control} name="enableVirtualCFO" render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5"><FormLabel>{t('featureFlagsCard.cfoLabel')}</FormLabel><FormDescription>{t('featureFlagsCard.cfoDescription')}</FormDescription></div>
                            <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                        </FormItem>
                    )}/>
                    <FormField control={featureFlagsForm.control} name="enableScenarioCalculator" render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5"><FormLabel>{t('featureFlagsCard.scenarioLabel')}</FormLabel><FormDescription>{t('featureFlagsCard.scenarioDescription')}</FormDescription></div>
                            <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                        </FormItem>
                    )}/>
                </div>
            </GenericSettingCard>
        </form>
       </Form>

       <Separator />
       
       <Form {...maintenanceForm}>
        <form onSubmit={maintenanceForm.handleSubmit(data => onSubmit('maintenance', data))}>
             <GenericSettingCard
                title={t('maintenanceCard.title')}
                description={t('maintenanceCard.description')}
                footer={
                    <Button type="submit" disabled={isLoading['maintenance']} variant="destructive">
                        {isLoading['maintenance'] ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wrench className="mr-2 h-4 w-4" />}
                        {t('saveButton')}
                    </Button>
                }
            >
                <div className="space-y-4">
                    <FormField control={maintenanceForm.control} name="maintenanceMode" render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800">
                            <div className="space-y-0.5">
                                <FormLabel>{t('maintenanceCard.enableLabel')}</FormLabel>
                                <FormDescription>{t('maintenanceCard.enableDescription')}</FormDescription>
                            </div>
                            <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                        </FormItem>
                    )}/>
                    <FormField control={maintenanceForm.control} name="maintenanceMessage" render={({ field }) => (
                        <FormItem>
                            <FormLabel>{t('maintenanceCard.messageLabel')}</FormLabel>
                            <FormControl><Textarea placeholder={t('maintenanceCard.messagePlaceholder')} {...field} /></FormControl>
                            <FormMessage />
                        </FormItem>
                    )}/>
                </div>
             </GenericSettingCard>
        </form>
       </Form>

       <Separator />

       <Form {...legalForm}>
        <form onSubmit={legalForm.handleSubmit(data => onSubmit('legal', data))}>
            <GenericSettingCard
                title={t('legalCard.title')}
                description={t('legalCard.description')}
                footer={
                    <Button type="submit" disabled={isLoading['legal']}>
                        {isLoading['legal'] ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        {t('saveButton')}
                    </Button>
                }
            >
                <div className="space-y-4">
                    <FormField control={legalForm.control} name="termsOfServiceUrl" render={({ field }) => (
                        <FormItem><FormLabel>{t('legalCard.termsUrlLabel')}</FormLabel><FormControl><Input placeholder={t('legalCard.termsUrlPlaceholder')} {...field} /></FormControl><FormMessage /></FormItem>
                    )}/>
                    <FormField control={legalForm.control} name="privacyPolicyUrl" render={({ field }) => (
                        <FormItem><FormLabel>{t('legalCard.privacyUrlLabel')}</FormLabel><FormControl><Input placeholder={t('legalCard.privacyUrlPlaceholder')} {...field} /></FormControl><FormMessage /></FormItem>
                    )}/>
                    <FormField control={legalForm.control} name="cookieConsentMessage" render={({ field }) => (
                        <FormItem><FormLabel>{t('legalCard.cookieMessageLabel')}</FormLabel><FormControl><Textarea placeholder={t('legalCard.cookieMessagePlaceholder')} {...field} /></FormControl><FormMessage /></FormItem>
                    )}/>
                </div>
            </GenericSettingCard>
        </form>
       </Form>

    </div>
  );
}
