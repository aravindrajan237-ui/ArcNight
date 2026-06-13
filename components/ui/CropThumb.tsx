import { cn } from "@/lib/cn";

/**
 * Crop image with a colourful, crop-specific fallback. When a real photo exists
 * it's shown; otherwise we render a soft gradient + the crop's emoji so the app
 * stays vibrant even before farmers upload photos.
 */

const CROP_STYLE: Record<string, { emoji: string; grad: string }> = {
  tomato: { emoji: "🍅", grad: "from-rose-100 to-red-50" },
  onion: { emoji: "🧅", grad: "from-fuchsia-100 to-purple-50" },
  potato: { emoji: "🥔", grad: "from-amber-100 to-yellow-50" },
  chilli: { emoji: "🌶️", grad: "from-red-100 to-orange-50" },
  banana: { emoji: "🍌", grad: "from-yellow-100 to-lime-50" },
  mango: { emoji: "🥭", grad: "from-orange-100 to-amber-50" },
  rice: { emoji: "🌾", grad: "from-lime-100 to-green-50" },
  wheat: { emoji: "🌾", grad: "from-amber-100 to-yellow-50" },
  grape: { emoji: "🍇", grad: "from-purple-100 to-fuchsia-50" },
  apple: { emoji: "🍎", grad: "from-rose-100 to-red-50" },
  corn: { emoji: "🌽", grad: "from-yellow-100 to-amber-50" },
  carrot: { emoji: "🥕", grad: "from-orange-100 to-amber-50" },
};
const DEFAULT = { emoji: "🌱", grad: "from-primary-100 to-accent-50" };

function styleFor(crop: string) {
  const key = (crop ?? "").trim().toLowerCase();
  for (const k of Object.keys(CROP_STYLE)) if (key.includes(k)) return CROP_STYLE[k];
  return DEFAULT;
}

export function CropThumb({
  crop,
  photoUrl,
  className,
  emojiClass = "text-5xl",
}: {
  crop: string;
  photoUrl?: string | null;
  className?: string;
  emojiClass?: string;
}) {
  if (photoUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={photoUrl} alt={crop} className={cn("w-full object-cover", className)} />;
  }
  const s = styleFor(crop);
  return (
    <div className={cn("flex items-center justify-center bg-gradient-to-br", s.grad, className)}>
      {/* data-no-invert keeps the emoji's natural colours under the dark-mode invert filter */}
      <span className={emojiClass} role="img" aria-label={crop} data-no-invert>
        {s.emoji}
      </span>
    </div>
  );
}
