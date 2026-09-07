import { useState } from "react";
import { useNavigate } from "react-router";
import { Button } from "../components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "../components/ui/dialog";
import { Plus, Sparkles, Shuffle, PenLine } from "lucide-react";
import { toast } from "sonner";
import { mealPlanAPI } from "../services/api";
import { SavedPlans } from "./SavedPlans";
import { TinderStyle } from "./TinderStyle";
import { MealPlanner } from "./MealPlanner";

export function MealPlans() {
  const navigate = useNavigate();
  const [showGenerateDialog, setShowGenerateDialog] = useState(false);
  const [showTinderFullscreen, setShowTinderFullscreen] = useState(false);
  const [showRouletteFullscreen, setShowRouletteFullscreen] = useState(false);
  const [isCreatingManualPlan, setIsCreatingManualPlan] = useState(false);

  const handleCreateManualPlan = async () => {
    try {
      setIsCreatingManualPlan(true);
      const dateStr = new Date().toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });

      const newPlan = await mealPlanAPI.create({
        name: `Meal Plan - ${dateStr}`,
        rules: {
          allergyFriendlyOnly: false,
          highProtein: false,
          preferredCookingMethods: [],
          mealsPerWeek: 0,
          requiredTags: [],
          excludedTags: [],
        },
        meals: [],
      });

      setShowGenerateDialog(false);
      navigate(`/edit-meal-plan/${newPlan.id}`);
    } catch (error) {
      console.error("Failed to create meal plan:", error);
      toast.error("Failed to create meal plan");
    } finally {
      setIsCreatingManualPlan(false);
    }
  };

  return (
    <>
      {/* Full-screen Tinder Modal - completely covers everything including nav */}
      {showTinderFullscreen && (
        <div className="fixed inset-0 bg-background z-[100] overflow-y-auto">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <TinderStyle onClose={() => setShowTinderFullscreen(false)} />
          </div>
        </div>
      )}

      {/* Full-screen Roulette Modal - completely covers everything including nav */}
      {showRouletteFullscreen && (
        <div className="fixed inset-0 bg-background z-[100] overflow-y-auto">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <MealPlanner onClose={() => setShowRouletteFullscreen(false)} />
          </div>
        </div>
      )}

      {/* Main Content - Saved Plans by default */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header with Generate Button */}
        <div className="mb-8 flex items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold text-foreground">Meal Plans</h1>
          <Button
            onClick={() => setShowGenerateDialog(true)}
            className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg shrink-0"
          >
            <Plus className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">Add Meal Plan</span>
            <span className="sm:hidden">Add</span>
          </Button>
        </div>

        {/* Saved Plans Content */}
        <SavedPlans />
      </div>

      {/* Add Meal Plan Dialog - Choose How */}
      <Dialog open={showGenerateDialog} onOpenChange={setShowGenerateDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Meal Plan</DialogTitle>
            <DialogDescription>
              Pick how you'd like to build your meal plan
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4">
            {/* Manual */}
            <button
              onClick={handleCreateManualPlan}
              disabled={isCreatingManualPlan}
              className="group relative overflow-hidden rounded-xl border-2 border-border/50 hover:border-primary/40 bg-card hover:bg-primary/5 p-6 text-left transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <PenLine className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-foreground mb-1 group-hover:text-primary transition-colors">
                    Manually Create
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Start with a blank meal plan and add recipes yourself.
                  </p>
                </div>
              </div>
            </button>

            {/* Tinder Style */}
            <button
              onClick={() => {
                setShowGenerateDialog(false);
                setShowTinderFullscreen(true);
              }}
              className="group relative overflow-hidden rounded-xl border-2 border-border/50 hover:border-primary/40 bg-card hover:bg-primary/5 p-6 text-left transition-all"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-foreground mb-1 group-hover:text-primary transition-colors">
                    Tinder Style
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Swipe through recipes one by one. Like what you want, skip what you don't.
                  </p>
                </div>
              </div>
            </button>

            {/* Roulette Style */}
            <button
              onClick={() => {
                setShowGenerateDialog(false);
                setShowRouletteFullscreen(true);
              }}
              className="group relative overflow-hidden rounded-xl border-2 border-border/50 hover:border-primary/40 bg-card hover:bg-primary/5 p-6 text-left transition-all"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Shuffle className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-foreground mb-1 group-hover:text-primary transition-colors">
                    Roulette Style
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Set your preferences and let AI generate a complete meal plan for you.
                  </p>
                </div>
              </div>
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}