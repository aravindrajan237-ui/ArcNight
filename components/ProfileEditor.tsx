"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, Save } from "lucide-react";
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
      router.refresh();
    } catch (e) {
      toast.error(t("pe.failed"), e instanceof Error ? e.message : undefined);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card inset className="space-y-4">
      <span className="block font-bold text-ink">{t("pe.title")}</span>

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

      <Button fullWidth onClick={save} loading={saving} leftIcon={<Save className="h-5 w-5" />}>
        {t("pe.save")}
      </Button>
    </Card>
  );
}
