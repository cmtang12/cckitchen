import { useState } from "react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Recipe } from "../types";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { ScrollArea } from "./ui/scroll-area";

interface CookingModeProps {
  recipe: Recipe;
  onClose: () => void;
}

export function CookingMode({ recipe, onClose }: CookingModeProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [showIngredients, setShowIngredients] = useState(false);
  const totalSteps = recipe.instructions.length;

  const goToNextStep = () => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const goToPreviousStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowRight") goToNextStep();
    if (e.key === "ArrowLeft") goToPreviousStep();
    if (e.key === "Escape") onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[100] bg-background flex flex-col"
      onKeyDown={handleKeyPress}
      tabIndex={0}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border/50 bg-card/50 backdrop-blur-sm flex-shrink-0">
        <h1 className="text-lg font-semibold text-foreground">{recipe.name}</h1>
        
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="rounded-lg hover:bg-primary/10"
        >
          <X className="w-5 h-5" />
        </Button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Instructions/Ingredients Toggle */}
        <div className="flex gap-2 px-6 py-4 border-b border-border/50 flex-shrink-0">
          <Button
            variant={!showIngredients ? "default" : "outline"}
            size="sm"
            onClick={() => setShowIngredients(false)}
            className="flex-1 rounded-lg"
          >
            Instructions
          </Button>
          <Button
            variant={showIngredients ? "default" : "outline"}
            size="sm"
            onClick={() => setShowIngredients(true)}
            className="flex-1 rounded-lg"
          >
            Ingredients
          </Button>
        </div>

        {/* Content Panel */}
        {!showIngredients ? (
          /* Instructions View */
          <div className="flex-1 flex flex-col items-center justify-start px-8 py-12 overflow-auto">
            <div className="max-w-3xl w-full space-y-8">
              {/* Step Counter Badge - Smaller */}
              <div className="flex justify-center">
                <Badge variant="secondary" className="text-sm px-3 py-1">
                  Step {currentStep + 1} of {totalSteps}
                </Badge>
              </div>

              {/* Current Instruction */}
              <div className="bg-card border-2 border-border/50 rounded-2xl p-8 lg:p-12 shadow-sm">
                <p className="text-2xl lg:text-3xl leading-relaxed text-foreground text-center">
                  {recipe.instructions[currentStep]}
                </p>
              </div>

              {/* Navigation Buttons */}
              <div className="flex items-center justify-center gap-4">
                <Button
                  variant="outline"
                  size="lg"
                  onClick={goToPreviousStep}
                  disabled={currentStep === 0}
                  className="rounded-lg min-w-[120px]"
                >
                  <ChevronLeft className="w-5 h-5 mr-2" />
                  Previous
                </Button>
                
                {currentStep === totalSteps - 1 ? (
                  <Button
                    size="lg"
                    onClick={onClose}
                    className="rounded-lg min-w-[120px] bg-primary hover:bg-primary/90 text-primary-foreground"
                  >
                    Done
                  </Button>
                ) : (
                  <Button
                    size="lg"
                    onClick={goToNextStep}
                    className="rounded-lg min-w-[120px] bg-primary hover:bg-primary/90"
                  >
                    Next
                    <ChevronRight className="w-5 h-5 ml-2" />
                  </Button>
                )}
              </div>

              {/* Progress Dots */}
              <div className="flex justify-center gap-2 pt-4">
                {recipe.instructions.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentStep(index)}
                    className={`w-2.5 h-2.5 rounded-full transition-all ${
                      index === currentStep
                        ? "bg-primary w-8"
                        : index < currentStep
                        ? "bg-primary/50"
                        : "bg-border"
                    }`}
                    aria-label={`Go to step ${index + 1}`}
                  />
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* Ingredients View */
          <div className="flex-1 overflow-hidden">
            <ScrollArea className="h-full">
              <div className="max-w-3xl mx-auto px-6 py-8 space-y-3">
                {recipe.ingredients.map((ingredient, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-3 p-4 bg-card rounded-lg border border-border/50"
                  >
                    <div className="flex-1">
                      <p className="font-medium text-foreground">
                        {ingredient.name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {ingredient.amount}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}
      </div>
    </div>
  );
}