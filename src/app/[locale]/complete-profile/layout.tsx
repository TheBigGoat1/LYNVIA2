export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--swiss-mineral-cream)] p-4 dark:bg-background">
      {children}
    </div>
  );
}
