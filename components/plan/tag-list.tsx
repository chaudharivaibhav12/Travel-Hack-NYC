/** Read-only pills for displaying a merged preference array — no interaction, unlike ChipSelect. */
export function TagList({
  items,
  empty = "Nobody's said yet.",
}: {
  items: readonly string[];
  empty?: string;
}) {
  if (items.length === 0) {
    return <p className="text-[12.5px] leading-[18px] text-muted-foreground">{empty}</p>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <span
          key={item}
          className="rounded-full border border-border bg-accent px-3 py-1 text-[12.5px] font-medium leading-[18px] text-accent-foreground"
        >
          {item}
        </span>
      ))}
    </div>
  );
}
