"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, Save, Pencil, ChevronDown } from "lucide-react";
import { Card, Button, Input, Avatar, useToast } from "@/components/ui";
import { useT } from "@/lib/i18n/client";

/** Edit profile: change your display name and upload a profile picture. */
export function ProfileEditor({
  initialName,
  initialPhoto,
}: {
  initialName: string;
  initialPhoto: string | null;
}) {
  const router = useRouter();
  const toast = useToast();
  const t = useT();
  const fileRef = useRef<HTMLInputElement>(null);

  const [open, setOpen] = useState(false);
  const [name, setName] = useState(initialName);
  const [preview, setPreview] = useState<string | null>(initialPhoto);
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  function pickPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
  }

  async function save() {
    if (name.trim().length < 2) {
      toast.error(t("pe.nameErr"));
      return;
    }
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("full_name", name.trim());
      if (file) fd.append("image", file);
      const res = await fetch("/api/profile", { method: "POST", body: fd });
      if (!res.ok) throw new Error((await res.json()).error ?? "Save failed");
      toast.success(t("pe.saved"));
      setOpen(false); // collapse back to the clean view; header reflects changes
      router.refresh();
    } catch (e) {
      toast.error(t("pe.failed"), e instanceof Error ? e.message : undefined);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card inset className={open ? "space-y-4" : "p-0"}>
      {/* Header doubles as the toggle: tap to open/close the editor. */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 p-4 text-left"
        aria-expanded={open}
      >
        <span className="flex items-center gap-2 font-bold text-ink">
          <Pencil className="h-4 w-4 text-primary" />
          {t("pe.title")}
        </span>
        <ChevronDown
          className={`h-5 w-5 text-slate transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="space-y-4 px-4 pb-4">
          <div className="flex flex-col items-center gap-2">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="relative"
              aria-label={t("pe.photoHint")}
            >
              <Avatar name={name} src={preview} size="xl" />
              <span className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-white ring-2 ring-white">
                <Camera className="h-4 w-4" />
              </span>
            </button>
            <span className="text-xs text-slate">{t("pe.photoHint")}</span>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={pickPhoto} />
          </div>

          <Input
            label={t("pe.name")}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          <div className="flex gap-3">
            <Button
              variant="ghost"
              onClick={() => {
                setName(initialName);
                setPreview(initialPhoto);
                setFile(null);
                setOpen(false);
              }}
            >
              {t("pe.cancel")}
            </Button>
            <Button fullWidth onClick={save} loading={saving} leftIcon={<Save className="h-5 w-5" />}>
              {t("pe.save")}
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
