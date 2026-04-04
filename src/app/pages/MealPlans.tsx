import { useState } from "react";
import { Button } from "../components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "../components/ui/dialog";
import { Sparkles, Shuffle } from "lucide-react";
import { SavedPlans } from "./SavedPlans";
import { TinderStyle } from "./TinderStyle";
import { MealPlanner } from "./MealPlanner";

export function MealPlans() {
  const [showGenerateDialog, setShowGenerateDialog] = useState(false);
  const [showTinderFullscreen, setShowTinderFullscreen] = useState(false);
  const [showRouletteFullscreen, setShowRouletteFullscreen] = useState(false);

  return (
    <>
      {/* Full-screen Tinder Modal - completely covers everything including nav */}
      {showTinderFullscreen && (
        <div className="fixed inset-0 bg-background z-[100] overflow-y-auto">
          <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 py-8">
            <TinderStyle onClose={() => setShowTinderFullscreen(false)} />
          </div>
        </div>
      )}

      {/* Full-screen Roulette Modal - completely covers everything including nav */}
      {showRouletteFullscreen && (
        <div className="fixed inset-0 bg-background z-[100] overflow-y-auto">
          <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 py-8">
            <MealPlanner onClose={() => setShowRouletteFullscreen(false)} />
          </div>
        </div>
      )}

      {/* Main Content - Saved Plans by default */}
      <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 py-8">
        {/* Header with Generate Button */}
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-foreground">Meal Plans</h1>
          <Button
            onClick={() => setShowGenerateDialog(true)}
            className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            Generate Meal Plans
          </Button>
        </div>

        {/* Saved Plans Content */}
        <SavedPlans />
      </div>

      {/* Generate Dialog - Choose Style */}
      <Dialog open={showGenerateDialog} onOpenChange={setShowGenerateDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Choose Generation Style</DialogTitle>
            <DialogDescription>
              Pick how you'd like to build your meal plan
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4">
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