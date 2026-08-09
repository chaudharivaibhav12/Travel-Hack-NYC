/**
 * The h1 + subtitle pair every non-dashboard screen opens with.
 * Fraunces 26/500 per the §3 type scale, subtitle in muted-foreground 12.5px.
 */
export function PageHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  return (
    <header className="mb-[34px] flex flex-col gap-1.5">
      <h1 className="font-display text-[26px] font-medium leading-8 tracking-[-0.2px] text-foreground">
        {title}
      </h1>
      <p className="text-[12.5px] leading-[18px] text-muted-foreground">
        {subtitle}
      </p>
    </header>
  );
}
