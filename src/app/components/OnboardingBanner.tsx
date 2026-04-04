import { useState } from "react";
import { Link } from "react-router";
import { Card, CardContent } from "./ui/card";
import { Button } from "./ui/button";
import { X, Upload, Tag, Calendar, ShoppingBasket } from "lucide-react";

export function OnboardingBanner() {
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible) return null;

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-accent">
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-5">
          <div>
            <h3 className="text-lg font-medium text-foreground mb-1">
              Welcome to SmartMeal 👋
            </h3>
            <p className="text-sm text-muted-foreground">
              Build your recipe library and create intelligent meal plans
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsVisible(false)}
            className="flex-shrink-0 text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <Link to="/import">
            <div className="bg-card rounded-xl p-4 hover:shadow-sm transition-all border border-border/50 hover:border-primary/30 cursor-pointer h-full">
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                <Upload className="w-4 h-4 text-primary" />
              </div>
              <h4 className="font-medium text-sm text-foreground mb-1">Import</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Add recipes from URLs, photos, or manually
              </p>
            </div>
          </Link>

          <div className="bg-card rounded-xl p-4 border border-border/50 opacity-60">
            <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center mb-3">
              <Tag className="w-4 h-4 text-muted-foreground" />
            </div>
            <h4 className="font-medium text-sm text-foreground mb-1">Tag</h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Organize with tags like high-protein and allergy-friendly
            </p>
          </div>

          <Link to="/meal-plans">
            <div className="bg-card rounded-xl p-4 hover:shadow-sm transition-all border border-border/50 hover:border-primary/30 cursor-pointer h-full">
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                <Calendar className="w-4 h-4 text-primary" />
              </div>
              <h4 className="font-medium text-sm text-foreground mb-1">Plan</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Create optimized weekly meal plans
              </p>
            </div>
          </Link>

          <Link to="/grocery-list">
            <div className="bg-card rounded-xl p-4 hover:shadow-sm transition-all border border-border/50 hover:border-primary/30 cursor-pointer h-full">
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                <ShoppingBasket className="w-4 h-4 text-primary" />
              </div>
              <h4 className="font-medium text-sm text-foreground mb-1">Shop</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Get auto-generated, categorized lists
              </p>
            </div>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}