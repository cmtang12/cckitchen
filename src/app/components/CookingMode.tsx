import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "./ui/button";
import { Switch } from "./ui/switch";
import { Recipe } from "../types";
import { X, ChevronLeft, ChevronRight, Timer, Pause, Play, Flame } from "lucide-react";
import { ScrollArea } from "./ui/scroll-area";
import { CatMark } from "./CatMark";
import { LilySkillsSheet } from "./LilySkillsSheet";
import { recipeAPI } from "../services/api";
import { toast } from "sonner";
import {
  LilySkill,
  loadLilySkills,
  saveLilySkills,
  readRecipe,
  skillLabel,
  stepMinutes,
} from "../utils/lilyHelps";

const SAGE = "#5e8f6f";

interface CookingModeProps {
  recipe: Recipe;
  onClose: () => void;
  /** Open with "With Lily" already on (e.g. from "Lily helps with 3 steps"). */
  startWithLily?: boolean;
  /** Called after a step is corrected, so the recipe page stays in sync. */
  onRecipeChange?: (recipe: Recipe) => void;
}

const sentenceCase = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

function formatClock(totalSeconds: number) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function chime() {
  try {
    const Ctx = window.AudioContext || (window as any).webkitAudioContext;
    const ctx = new Ctx();
    [0, 0.35, 0.7].forEach((t) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.frequency.value = 880;
      g.gain.setValueAtTime(0.0001, ctx.currentTime + t);
      g.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + t + 0.3);
      o.connect(g).connect(ctx.destination);
      o.start(ctx.currentTime + t);
      o.stop(ctx.currentTime + t + 0.32);
    });
  } catch {}
  try { navigator.vibrate?.([200, 100, 200]); } catch {}
}

export function CookingMode({ recipe: initialRecipe, onClose, startWithLily = false, onRecipeChange }: CookingModeProps) {
  const [recipe, setRecipe] = useState(initialRecipe);
  const [withLily, setWithLily] = useState(startWithLily);
  const [skills, setSkills] = useState<LilySkill[]>(loadLilySkills);
  const [showSkills, setShowSkills] = useState(false);
  // -1 is Lily's job list, shown before step 1 when cooking with Lily
  const [currentStep, setCurrentStep] = useState(startWithLily ? -1 : 0);
  const [showIngredients, setShowIngredients] = useState(false);

  // One kitchen timer, kept across steps
  const [timerLeft, setTimerLeft] = useState<number | null>(null);
  const [timerRunning, setTimerRunning] = useState(false);
  const tick = useRef<number | null>(null);

  const totalSteps = recipe.instructions.length;
  const help = useMemo(() => readRecipe(recipe, skills), [recipe, skills]);
  const lilyJobs = help.steps.map((s, i) => ({ ...s, index: i })).filter((s) => s.forLily);
  const showJobList = withLily && lilyJobs.length > 0;
  const firstStep = showJobList ? -1 : 0;

  useEffect(() => {
    if (!showJobList && currentStep === -1) setCurrentStep(0);
  }, [showJobList, currentStep]);

  useEffect(() => {
    if (!timerRunning) return;
    tick.current = window.setInterval(() => {
      setTimerLeft((t) => {
        if (t === null) return t;
        if (t <= 1) {
          setTimerRunning(false);
          chime();
          toast.success("Timer's done!");
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => {
      if (tick.current) window.clearInterval(tick.current);
    };
  }, [timerRunning]);

  const startTimer = (minutes: number) => {
    setTimerLeft(minutes * 60);
    setTimerRunning(true);
  };

  const updateSkills = (next: LilySkill[]) => {
    setSkills(next);
    saveLilySkills(next);
  };

  const correctStep = async (index: number, forLily: boolean) => {
    const lilySteps = { ...(recipe.lilySteps || {}), [index]: forLily };
    const next = { ...recipe, lilySteps };
    setRecipe(next);
    onRecipeChange?.(next);
    try {
      await recipeAPI.update(recipe.id, { lilySteps });
    } catch {
      toast.error("Couldn't save that change");
    }
  };

  const goNext = () => currentStep < totalSteps - 1 && setCurrentStep(currentStep + 1);
  const goPrev = () => currentStep > firstStep && setCurrentStep(currentStep - 1);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowRight") goNext();
    if (e.key === "ArrowLeft") goPrev();
    if (e.key === "Escape") onClose();
  };

  const step = currentStep >= 0 ? help.steps[currentStep] : null;
  const stepText = currentStep >= 0 ? recipe.instructions[currentStep] : "";
  const minutes = currentStep >= 0 ? stepMinutes(stepText) : undefined;

  return (
    <div
      className="fixed inset-0 z-[100] bg-background flex flex-col"
      onKeyDown={handleKeyPress}
      tabIndex={0}
      style={{ paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-3 px-4 sm:px-6 h-14 border-b border-border/60 flex-shrink-0">
        <h1 className="text-base font-semibold text-foreground truncate">{recipe.name}</h1>
        <div className="flex items-center gap-2 shrink-0">
          {timerLeft !== null && (
            <button
              onClick={() => (timerLeft === 0 ? setTimerLeft(null) : setTimerRunning(!timerRunning))}
              className={`inline-flex items-center gap-1.5 h-8 px-3 rounded-full text-sm tabular-nums ${
                timerLeft === 0 ? "bg-[#e0725c] text-white" : "bg-muted text-foreground"
              }`}
              title={timerLeft === 0 ? "Dismiss" : timerRunning ? "Pause timer" : "Resume timer"}
            >
              {timerLeft === 0 ? <Timer className="w-3.5 h-3.5" /> : timerRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              {timerLeft === 0 ? "Done" : formatClock(timerLeft)}
            </button>
          )}
          <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full" aria-label="Close">
            <X className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* With Lily */}
      <div className="flex items-center gap-3 px-4 sm:px-6 py-3 border-b border-border/60 flex-shrink-0">
        <label className="flex items-center gap-2.5 cursor-pointer">
          <Switch
            checked={withLily}
            onCheckedChange={(on) => {
              setWithLily(on);
              setCurrentStep(on && lilyJobs.length > 0 ? -1 : Math.max(0, currentStep));
            }}
          />
          <span className="text-sm font-medium text-foreground">With Lily</span>
        </label>
        {withLily && (
          <span className="text-sm text-muted-foreground truncate">
            {lilyJobs.length > 0 ? `${lilyJobs.length} ${lilyJobs.length === 1 ? "step" : "steps"} for her` : "Nothing for her yet"}
          </span>
        )}
        {withLily && (
          <button onClick={() => setShowSkills(true)} className="ml-auto text-sm text-muted-foreground underline underline-offset-4 shrink-0">
            Her skills
          </button>
        )}
      </div>

      {/* Instructions / Ingredients */}
      <div className="flex gap-1 mx-4 sm:mx-6 mt-3 p-1 rounded-full bg-muted/60 flex-shrink-0 self-center w-[min(100%,24rem)]">
        {["Steps", "Ingredients"].map((label, i) => {
          const active = i === 0 ? !showIngredients : showIngredients;
          return (
            <button
              key={label}
              onClick={() => setShowIngredients(i === 1)}
              className={`flex-1 h-9 rounded-full text-sm transition-colors ${active ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}
            >
              {label}
            </button>
          );
        })}
      </div>

      {!showIngredients ? (
        <div className="flex-1 flex flex-col items-center px-4 sm:px-8 py-6 overflow-auto">
          <div className="max-w-2xl w-full space-y-6">
            {currentStep === -1 ? (
              /* Lily's jobs, before you start */
              <div className="bg-card rounded-3xl p-6 sm:p-8 border-2" style={{ borderColor: `${SAGE}55` }}>
                <div className="flex items-center gap-3 mb-5">
                  <CatMark className="w-12 h-12 text-[#9c5434]" counter={false} />
                  <div>
                    <p className="text-lg font-semibold text-foreground">Lily's jobs</p>
                    <p className="text-sm text-muted-foreground">Her part of this recipe, so you can set her up first.</p>
                  </div>
                </div>
                <ol className="space-y-3">
                  {lilyJobs.map((job) => (
                    <li key={job.index}>
                      <button
                        onClick={() => setCurrentStep(job.index)}
                        className="w-full text-left flex gap-3 items-start"
                      >
                        <span className="shrink-0 mt-0.5 text-xs font-medium rounded-full px-2 py-0.5" style={{ background: `${SAGE}1f`, color: SAGE }}>
                          Step {job.index + 1}
                        </span>
                        <span className="text-[15px] leading-snug text-foreground">
                          <span className="font-medium">{sentenceCase(job.skills.map(skillLabel).join(", "))}</span>
                          <span className="text-muted-foreground"> · {recipe.instructions[job.index]}</span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ol>
              </div>
            ) : (
              <>
                <p className="text-center text-sm text-muted-foreground">
                  Step {currentStep + 1} of {totalSteps}
                </p>

                <div
                  className="bg-card rounded-3xl p-6 sm:p-10 shadow-sm border-2"
                  style={{ borderColor: withLily && step?.forLily ? SAGE : "transparent" }}
                >
                  {withLily && step && (step.forLily || step.grownUp) && (
                    <div className="flex flex-wrap gap-2 justify-center mb-5">
                      {step.forLily && (
                        <span className="inline-flex items-center gap-1.5 text-sm font-medium rounded-full pl-1.5 pr-3 py-1" style={{ background: `${SAGE}1f`, color: SAGE }}>
                          <CatMark className="w-5 h-5" counter={false} />
                          Lily helps · {step.skills.map(skillLabel).join(", ") || "her part"}
                        </span>
                      )}
                      {step.grownUp && (
                        <span className="inline-flex items-center gap-1.5 text-sm rounded-full px-3 py-1 bg-muted text-muted-foreground">
                          <Flame className="w-3.5 h-3.5" /> Grown-up part
                        </span>
                      )}
                    </div>
                  )}

                  <p className="text-2xl lg:text-3xl leading-relaxed text-foreground text-center">{stepText}</p>

                  {minutes !== undefined && (
                    <div className="flex justify-center mt-6">
                      <Button
                        variant="outline"
                        onClick={() => startTimer(minutes)}
                        className="rounded-full h-11 px-5"
                        style={withLily && step?.skills.includes("timer") ? { borderColor: SAGE, color: SAGE } : undefined}
                      >
                        <Timer className="w-4 h-4 mr-2" />
                        {withLily && step?.skills.includes("timer") ? `Lily, start the ${minutes} min timer` : `Start ${minutes} min timer`}
                      </Button>
                    </div>
                  )}

                  {withLily && step && (
                    <div className="mt-6 text-center">
                      <button
                        onClick={() => correctStep(currentStep, !step.forLily)}
                        className="text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
                      >
                        {step.forLily ? "Not for Lily" : "Lily can do this"}
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Navigation */}
            <div className="flex items-center justify-center gap-3">
              <Button
                variant="outline"
                size="lg"
                onClick={goPrev}
                disabled={currentStep === firstStep}
                className="rounded-full min-w-[120px]"
              >
                <ChevronLeft className="w-5 h-5 mr-1" />
                Back
              </Button>
              {currentStep === totalSteps - 1 ? (
                <Button size="lg" onClick={onClose} className="rounded-full min-w-[120px]">
                  Done
                </Button>
              ) : (
                <Button size="lg" onClick={goNext} className="rounded-full min-w-[120px]">
                  {currentStep === -1 ? "Start" : "Next"}
                  <ChevronRight className="w-5 h-5 ml-1" />
                </Button>
              )}
            </div>

            {/* Progress: Lily's steps in green */}
            <div className="flex justify-center flex-wrap gap-2 pt-2">
              {recipe.instructions.map((_, index) => {
                const lily = withLily && help.steps[index]?.forLily;
                const current = index === currentStep;
                return (
                  <button
                    key={index}
                    onClick={() => setCurrentStep(index)}
                    className={`h-2.5 rounded-full transition-all ${current ? "w-8" : "w-2.5"}`}
                    style={{
                      background: lily
                        ? current || index < currentStep ? SAGE : `${SAGE}66`
                        : current ? "var(--primary)" : index < currentStep ? "color-mix(in srgb, var(--primary) 50%, transparent)" : "var(--border)",
                    }}
                    aria-label={`Go to step ${index + 1}`}
                  />
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 divide-y divide-border/60">
              {recipe.ingredients.map((ingredient, index) => (
                <div key={index} className="flex items-baseline justify-between gap-4 py-3">
                  <p className="text-foreground">{ingredient.name}</p>
                  <p className="text-sm text-muted-foreground shrink-0">{ingredient.amount}</p>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}

      <LilySkillsSheet open={showSkills} onOpenChange={setShowSkills} skills={skills} onChange={updateSkills} />
    </div>
  );
}
