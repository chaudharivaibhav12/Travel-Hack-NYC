"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Plus,
  X,
  Check,
  Loader2,
  Lightbulb,
  MapPin,
  Link2,
  FileText,
  Tag,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/components/auth/auth-context";
import {
  getTrip,
  getInbox,
  addInboxItem,
  updateInboxItem,
  removeInboxItem,
  newId,
} from "@/lib/group/store";
import { cn } from "@/lib/utils";
import type { ResearchItem, GroupTrip } from "@/lib/group/types";

const CATEGORIES = ["restaurant", "bar", "museum", "activity", "hotel", "park", "attraction", "experience", "shop", "other"];
const COST_CATS = ["free", "budget", "mid-range", "premium"];
const CONFIDENCE_LABEL: Record<string, string> = { high: "High confidence", medium: "Medium confidence", low: "Low confidence" };
const CONFIDENCE_COLOR: Record<string, string> = {
  high: "text-emerald-700 bg-emerald-50",
  medium: "text-amber-700 bg-amber-50",
  low: "text-red-700 bg-red-50",
};

function extractFromContent(content: string): Partial<ResearchItem> {
  const lower = content.toLowerCase();
  const hasUrl = /https?:\/\//.test(content);
  const hasMaps = /maps\.google|goo\.gl\/maps|apple\.com\/maps/.test(lower);

  let category = "activity";
  let confidence: ResearchItem["confidence"] = "low";
  let extractedName = "";
  let neighborhood = "";
  let costCategory = "mid-range";
  const tags: string[] = [];

  if (hasMaps || lower.includes("restaurant") || lower.includes("cafe") || lower.includes("bar") || lower.includes("bistro")) {
    category = lower.includes("bar") ? "bar" : "restaurant";
    confidence = "medium";
  } else if (lower.includes("museum") || lower.includes("gallery") || lower.includes("art")) {
    category = "museum";
    tags.push("art", "culture");
    confidence = "medium";
  } else if (lower.includes("park") || lower.includes("garden") || lower.includes("nature")) {
    category = "park";
    tags.push("outdoors");
    costCategory = "free";
    confidence = "medium";
  } else if (lower.includes("hotel") || lower.includes("hostel") || lower.includes("airbnb")) {
    category = "hotel";
    confidence = "medium";
  }

  if (lower.includes("free")) { costCategory = "free"; tags.push("free"); }
  else if (lower.includes("cheap") || lower.includes("budget")) costCategory = "budget";
  else if (lower.includes("luxury") || lower.includes("premium") || lower.includes("upscale")) costCategory = "premium";

  // Try to extract a name (very naive — would be AI in production)
  const nameMatch = content.match(/^["']?([A-Z][^.!?\n]{3,50})["']?/) ??
    content.match(/(?:called|named|is)\s+"?([A-Za-z][^."!\n]{3,40})"?/i);
  if (nameMatch) {
    extractedName = nameMatch[1].trim();
    confidence = "high";
  }

  const neighborhoodMatch = content.match(/\bin\s+(the\s+)?([A-Z][a-z]+(?: [A-Z][a-z]+)?)\b/);
  if (neighborhoodMatch) neighborhood = neighborhoodMatch[2];

  return { category, confidence, extractedName, neighborhood, costCategory, tags };
}

function InboxCard({ item, onUpdate, onRemove }: {
  item: ResearchItem;
  onUpdate: (updates: Partial<ResearchItem>) => void;
  onRemove: () => void;
}) {
  const [expanded, setExpanded] = useState(!item.confirmed);

  const TypeIcon = item.type === "link" ? Link2 : item.type === "place" ? MapPin : FileText;

  return (
    <Card className="overflow-hidden p-0">
      <div className="flex items-start gap-3 p-4">
        <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px] bg-accent text-foreground">
          <TypeIcon size={15} strokeWidth={1.5} />
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start gap-2">
            <span className="font-medium text-[14px] leading-[18px] text-foreground">
              {item.extractedName || item.rawContent.slice(0, 60)}
            </span>
            <span className={cn("inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium", CONFIDENCE_COLOR[item.confidence])}>
              {CONFIDENCE_LABEL[item.confidence]}
            </span>
            {item.confirmed && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                <Check size={10} strokeWidth={2.5} />
                Confirmed
              </span>
            )}
          </div>

          <div className="mt-1 flex flex-wrap gap-2 text-[12px] text-muted-foreground">
            {item.category && <span className="capitalize">{item.category}</span>}
            {item.neighborhood && <span>· {item.neighborhood}</span>}
            {item.costCategory && <span>· {item.costCategory}</span>}
            <span>· Added by {item.addedByName}</span>
          </div>

          {item.tags.length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {item.tags.map((tag) => (
                <span key={tag} className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] text-foreground">
                  <Tag size={9} strokeWidth={1.5} />
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="rounded-full p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
            aria-label={expanded ? "Collapse" : "Expand to edit"}
          >
            {expanded ? <ChevronUp size={15} strokeWidth={1.5} /> : <ChevronDown size={15} strokeWidth={1.5} />}
          </button>
          <button
            type="button"
            onClick={onRemove}
            className="rounded-full p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
            aria-label="Remove item"
          >
            <X size={14} strokeWidth={1.5} />
          </button>
        </div>
      </div>

      {/* Editable fields (C3: Confirm extraction) */}
      {expanded && (
        <div className="border-t border-border bg-muted/30 px-4 py-4">
          <p className="mb-3 text-[12px] text-muted-foreground">
            Review and correct the extracted information before confirming.
          </p>
          <div className="flex flex-col gap-3">
            <Field label="Place name" value={item.extractedName}
              onChange={(e) => onUpdate({ extractedName: e.target.value })} />
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <label className="text-[12.5px] font-medium text-foreground">Category</label>
                <select
                  value={item.category}
                  onChange={(e) => onUpdate({ category: e.target.value })}
                  className="h-11 rounded-md border border-input bg-card px-3.5 text-[14px] text-foreground outline-none focus:ring-2 focus:ring-ring"
                >
                  {CATEGORIES.map((c) => <option key={c} value={c} className="capitalize">{c}</option>)}
                </select>
              </div>
              <Field label="Neighborhood" value={item.neighborhood}
                onChange={(e) => onUpdate({ neighborhood: e.target.value })} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[12.5px] font-medium text-foreground">Cost range</label>
              <select
                value={item.costCategory}
                onChange={(e) => onUpdate({ costCategory: e.target.value })}
                className="h-11 rounded-md border border-input bg-card px-3.5 text-[14px] text-foreground outline-none focus:ring-2 focus:ring-ring"
              >
                {COST_CATS.map((c) => <option key={c} value={c} className="capitalize">{c}</option>)}
              </select>
            </div>
            <div className="flex gap-3">
              <Button
                variant="primary"
                onClick={() => {
                  onUpdate({ confirmed: true });
                  setExpanded(false);
                }}
              >
                <Check size={14} strokeWidth={2} />
                Confirm
              </Button>
              {item.confirmed && (
                <Button variant="secondary" onClick={() => setExpanded(false)}>
                  Cancel
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}

export default function InboxPage() {
  const { tripId } = useParams<{ tripId: string }>();
  const { user } = useAuth();
  const router = useRouter();

  const [trip, setTrip] = useState<GroupTrip | null>(null);
  const [items, setItems] = useState<ResearchItem[]>([]);
  const [mounted, setMounted] = useState(false);

  const [inputType, setInputType] = useState<"text" | "link" | "place">("text");
  const [rawContent, setRawContent] = useState("");
  const [extracting, setExtracting] = useState(false);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    setMounted(true);
    const t = getTrip(tripId);
    if (!t) { router.replace("/trips/group"); return; }
    setTrip(t);
    setItems(getInbox(tripId));
  }, [tripId, router]);

  if (!mounted || !trip || !user) return null;

  const refresh = () => setItems(getInbox(tripId));

  const handleAdd = async () => {
    if (!rawContent.trim()) return;
    setExtracting(true);

    // Simulate a brief extraction delay (AI extraction in production)
    await new Promise((r) => setTimeout(r, 800));

    const extracted = extractFromContent(rawContent);

    const item: ResearchItem = {
      id: newId(),
      tripId,
      addedByEmail: user.email,
      addedByName: user.name,
      type: inputType,
      rawContent: rawContent.trim(),
      extractedName: extracted.extractedName ?? "",
      category: extracted.category ?? "activity",
      neighborhood: extracted.neighborhood ?? "",
      costCategory: extracted.costCategory ?? "mid-range",
      tags: extracted.tags ?? [],
      confidence: extracted.confidence ?? "low",
      confirmed: false,
      createdAt: new Date().toISOString(),
    };

    addInboxItem(item);
    refresh();
    setRawContent("");
    setShowForm(false);
    setExtracting(false);
  };

  const INPUT_TYPE_ICONS = { text: FileText, link: Link2, place: MapPin };

  return (
    <div>
      <div className="mb-5">
        <Link
          href={`/trips/group/${tripId}`}
          className="inline-flex items-center gap-1.5 text-[12.5px] text-muted-foreground hover:text-foreground transition-colors duration-[140ms]"
        >
          <ArrowLeft size={14} strokeWidth={1.5} />
          {trip.title}
        </Link>
      </div>

      <div className="mb-[34px] flex flex-wrap items-start justify-between gap-4">
        <PageHeader
          title="Trip Ideas Inbox"
          subtitle="Drop anything here — links, screenshots, or plain notes. The group can see and confirm each item."
        />
        <Button variant="primary" onClick={() => setShowForm(true)}>
          <Plus size={15} strokeWidth={2} />
          Add idea
        </Button>
      </div>

      {/* Add idea form */}
      {showForm && (
        <Card className="mb-6 p-6">
          <h2 className="mb-4 font-display text-[17px] font-semibold leading-[22px] text-foreground">
            Add an idea
          </h2>

          {/* Input type selector */}
          <div className="mb-4 flex gap-2">
            {(["text", "link", "place"] as const).map((t) => {
              const Icon = INPUT_TYPE_ICONS[t];
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => setInputType(t)}
                  className={cn(
                    "flex items-center gap-2 rounded-full border px-3.5 py-2 text-[13px] font-medium transition-colors duration-[140ms]",
                    inputType === t
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-card text-foreground hover:bg-accent",
                  )}
                >
                  <Icon size={13} strokeWidth={1.5} />
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              );
            })}
          </div>

          <div className="flex flex-col gap-4">
            {inputType === "text" && (
              <div className="flex flex-col gap-1.5">
                <label className="text-[12.5px] font-medium text-foreground">Note or recommendation</label>
                <textarea
                  className="min-h-[100px] w-full resize-y rounded-md border border-input bg-card px-3.5 py-2.5 text-[14px] text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-ring"
                  placeholder='e.g. "The Met is free for NY residents and amazing on rainy days."'
                  value={rawContent}
                  onChange={(e) => setRawContent(e.target.value)}
                />
              </div>
            )}
            {inputType === "link" && (
              <Field label="URL" type="url" placeholder="https://..." value={rawContent}
                onChange={(e) => setRawContent(e.target.value)} />
            )}
            {inputType === "place" && (
              <Field label="Place name or Google Maps link" placeholder="e.g. Central Park or maps.google.com/..."
                value={rawContent} onChange={(e) => setRawContent(e.target.value)} />
            )}

            <div className="flex gap-3">
              <Button variant="primary" onClick={() => void handleAdd()} disabled={extracting || !rawContent.trim()}>
                {extracting && <Loader2 size={14} strokeWidth={1.5} className="animate-spin" />}
                {extracting ? "Extracting info…" : "Add to inbox"}
              </Button>
              <Button variant="secondary" onClick={() => { setShowForm(false); setRawContent(""); }}>
                Cancel
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Items list */}
      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-border bg-card px-6 py-16 text-center shadow-page">
          <Lightbulb size={24} strokeWidth={1.5} className="text-muted-foreground" />
          <p className="mt-4 font-display text-[17px] font-semibold leading-[22px] text-foreground">
            No ideas yet
          </p>
          <p className="mt-1.5 max-w-[42ch] text-[12.5px] leading-[18px] text-muted-foreground">
            Add links, place names, or notes about things the group might want to do or see.
          </p>
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="mt-5 inline-flex items-center gap-2 rounded-full border border-border bg-card px-5 py-2.5 text-sm font-semibold leading-5 text-foreground hover:bg-accent hover:text-accent-foreground transition-colors duration-[160ms]"
          >
            <Plus size={15} strokeWidth={2} />
            Add your first idea
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <p className="text-[13px] text-muted-foreground">
              {items.filter((i) => i.confirmed).length} of {items.length} item{items.length !== 1 ? "s" : ""} confirmed
            </p>
          </div>
          {items.map((item) => (
            <InboxCard
              key={item.id}
              item={item}
              onUpdate={(updates) => {
                updateInboxItem(tripId, item.id, updates);
                refresh();
              }}
              onRemove={() => {
                removeInboxItem(tripId, item.id);
                refresh();
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
