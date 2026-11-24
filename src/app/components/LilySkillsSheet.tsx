import { Sheet, SheetContent, SheetTitle, SheetDescription } from "./ui/sheet";
import { Switch } from "./ui/switch";
import { LILY_SKILLS, LilySkill } from "../utils/lilyHelps";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  skills: LilySkill[];
  onChange: (skills: LilySkill[]) => void;
}

/** Lily's skills, set once. Every recipe updates from this list. */
export function LilySkillsSheet({ open, onOpenChange, skills, onChange }: Props) {
  const toggle = (id: LilySkill) =>
    onChange(skills.includes(id) ? skills.filter((s) => s !== id) : [...skills, id]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="rounded-t-3xl p-0 gap-0 max-w-xl mx-auto border-0 max-h-[85vh] overflow-y-auto z-[120]"
        style={{ paddingBottom: "max(env(safe-area-inset-bottom), 16px)" }}
      >
        <div className="px-5 pt-6 pb-3">
          <SheetTitle className="text-lg font-semibold">Lily's skills</SheetTitle>
          <SheetDescription className="text-sm">
            Turn on what she can do. Every recipe updates to match.
          </SheetDescription>
        </div>
        <div className="divide-y divide-border/60">
          {LILY_SKILLS.map((s) => (
            <label key={s.id} className="flex items-center gap-4 px-5 py-3.5 cursor-pointer">
              <div className="flex-1 min-w-0">
                <p className="text-[15px] text-foreground">{s.label}</p>
                <p className="text-xs text-muted-foreground">{s.example}</p>
              </div>
              <Switch checked={skills.includes(s.id)} onCheckedChange={() => toggle(s.id)} />
            </label>
          ))}
        </div>
        <p className="px-5 pt-4 text-xs text-muted-foreground">
          Steps with heat or a sharp knife on hard food always stay grown-up steps.
        </p>
      </SheetContent>
    </Sheet>
  );
}
