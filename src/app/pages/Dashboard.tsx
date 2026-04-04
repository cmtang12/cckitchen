import { useState, useEffect } from "react";
import { Link } from "react-router";
import { recipeAPI } from "../services/api";
import { Recipe } from "../types";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import {
  Loader2,
  Flame,
  Star,
  BookOpen,
  TrendingUp,
  ChefHat,
  Calendar,
  Heart,
  Award,
  Repeat2,
} from "lucide-react";

export function Dashboard() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadRecipes();
  }, []);

  const loadRecipes = async () => {
    try {
      setIsLoading(true);
      const data = await recipeAPI.getAll();
      setRecipes(data);
    } catch (error) {
      console.error("Failed to load recipes:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-6 sm:px-8 py-16">
        <div className="flex flex-col items-center justify-center">
          <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
          <p className="text-muted-foreground text-sm">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // ── Summary metrics ──────────────────────────────────────────
  const totalRecipes = recipes.length;
  const lovedRecipes = recipes.filter((r) => r.isLoved).length;
  const ratedRecipes = recipes.filter((r) => r.rating).length;
  const averageRating =
    ratedRecipes > 0
      ? (recipes.reduce((sum, r) => sum + (r.rating || 0), 0) / ratedRecipes).toFixed(1)
      : "0";
  const totalTimesCooked = recipes.reduce(
    (sum, r) => sum + (r.timesCookedLog?.length || 0),
    0
  );
  const topCookedRecipes = [...recipes]
    .filter((r) => (r.timesCookedLog?.length || 0) > 0)
    .sort((a, b) => (b.timesCookedLog?.length || 0) - (a.timesCookedLog?.length || 0))
    .slice(0, 5);
  const topRatedRecipes = [...recipes]
    .filter((r) => r.rating && r.rating >= 4)
    .sort((a, b) => {
      if (b.rating !== a.rating) return (b.rating || 0) - (a.rating || 0);
      return (b.timesCookedLog?.length || 0) - (a.timesCookedLog?.length || 0);
    })
    .slice(0, 5);
  const cookingMethodCounts: Record<string, number> = {};
  recipes.forEach((recipe) => {
    recipe.cookingMethod?.forEach((method) => {
      cookingMethodCounts[method] = (cookingMethodCounts[method] || 0) + 1;
    });
  });
  const topCookingMethods = Object.entries(cookingMethodCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3);
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  const recipesThisWeek = recipes.filter((r) =>
    r.timesCookedLog?.some((d) => new Date(d) > oneWeekAgo)
  ).length;
  const oneMonthAgo = new Date();
  oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
  const recipesThisMonth = recipes.filter((r) =>
    r.timesCookedLog?.some((d) => new Date(d) > oneMonthAgo)
  ).length;

  // ── Trends metrics ───────────────────────────────────────────
  const triedAndTrueCount = recipes.filter((r) =>
    r.tags?.includes("tried-true")
  ).length;

  // Past 8 weeks of cook activity
  const weeklyData = Array.from({ length: 8 }, (_, i) => {
    const weekEnd = new Date();
    weekEnd.setDate(weekEnd.getDate() - i * 7);
    weekEnd.setHours(23, 59, 59, 999);
    const weekStart = new Date(weekEnd);
    weekStart.setDate(weekStart.getDate() - 6);
    weekStart.setHours(0, 0, 0, 0);
    const count = recipes.reduce(
      (sum, r) =>
        sum +
        (r.timesCookedLog?.filter((d) => {
          const date = new Date(d);
          return date >= weekStart && date <= weekEnd;
        }).length || 0),
      0
    );
    return {
      week: weekStart.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      meals: count,
    };
  }).reverse();

  const avgMealsPerWeek =
    weeklyData.reduce((sum, w) => sum + w.meals, 0) / weeklyData.length;

  // Most repeated = sorted by times cooked, show top 8
  const mostRepeated = [...recipes]
    .filter((r) => (r.timesCookedLog?.length || 0) > 1)
    .sort((a, b) => (b.timesCookedLog?.length || 0) - (a.timesCookedLog?.length || 0))
    .slice(0, 8);

  return (
    <div className="max-w-4xl mx-auto px-6 sm:px-8 py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-foreground mb-1">Dashboard</h1>
        <p className="text-muted-foreground text-sm">Your cooking journey at a glance</p>
      </div>

      <Tabs defaultValue="summary">
        <TabsList className="mb-6">
          <TabsTrigger value="summary">Summary</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
        </TabsList>

        {/* ── SUMMARY TAB ─────────────────────────────────────── */}
        <TabsContent value="summary">
          {/* Overview Stats */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Card className="border-border/50 p-6">
              <div className="flex items-center justify-between mb-2">
                <BookOpen className="w-5 h-5 text-primary" />
                <span className="text-2xl font-bold text-primary">{totalRecipes}</span>
              </div>
              <h3 className="text-sm font-medium text-foreground">Total Recipes</h3>
              <p className="text-xs text-muted-foreground mt-1">In your library</p>
            </Card>
            <Card className="border-border/50 p-6">
              <div className="flex items-center justify-between mb-2">
                <Flame className="w-5 h-5 text-primary" />
                <span className="text-2xl font-bold text-primary">{totalTimesCooked}</span>
              </div>
              <h3 className="text-sm font-medium text-foreground">Times Cooked</h3>
              <p className="text-xs text-muted-foreground mt-1">All time total</p>
            </Card>
            <Card className="border-border/50 p-6">
              <div className="flex items-center justify-between mb-2">
                <Star className="w-5 h-5 text-primary" />
                <span className="text-2xl font-bold text-primary">{averageRating}</span>
              </div>
              <h3 className="text-sm font-medium text-foreground">Average Rating</h3>
              <p className="text-xs text-muted-foreground mt-1">{ratedRecipes} recipes rated</p>
            </Card>
            <Card className="border-border/50 p-6">
              <div className="flex items-center justify-between mb-2">
                <Heart className="w-5 h-5 text-primary" />
                <span className="text-2xl font-bold text-primary">{lovedRecipes}</span>
              </div>
              <h3 className="text-sm font-medium text-foreground">Loved Recipes</h3>
              <p className="text-xs text-muted-foreground mt-1">Your favorites</p>
            </Card>
          </div>

          {/* This Week / This Month */}
          <div className="grid sm:grid-cols-2 gap-4 mb-6">
            <Card className="border-border/50 p-6">
              <div className="flex items-center gap-2 mb-3">
                <Calendar className="w-5 h-5 text-primary" />
                <h3 className="font-semibold text-foreground">This Week</h3>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Recipes cooked</span>
                <span className="text-lg font-semibold text-foreground">{recipesThisWeek}</span>
              </div>
            </Card>
            <Card className="border-border/50 p-6">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="w-5 h-5 text-primary" />
                <h3 className="font-semibold text-foreground">This Month</h3>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Recipes cooked</span>
                <span className="text-lg font-semibold text-foreground">{recipesThisMonth}</span>
              </div>
            </Card>
          </div>

          {/* Top Cooking Methods */}
          {topCookingMethods.length > 0 && (
            <Card className="border-border/50 p-6 mb-6">
              <div className="flex items-center gap-2 mb-4">
                <ChefHat className="w-5 h-5 text-primary" />
                <h3 className="font-semibold text-foreground">Top Cooking Methods</h3>
              </div>
              <div className="space-y-3">
                {topCookingMethods.map(([method, count]) => (
                  <div key={method} className="flex items-center gap-3">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-foreground capitalize">{method}</span>
                        <span className="text-sm text-muted-foreground">{count} {count === 1 ? "recipe" : "recipes"}</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div className="bg-primary h-2 rounded-full transition-all" style={{ width: `${(count / totalRecipes) * 100}%` }} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Most Cooked */}
          {topCookedRecipes.length > 0 && (
            <Card className="border-border/50 p-6 mb-6">
              <div className="flex items-center gap-2 mb-4">
                <Flame className="w-5 h-5 text-primary" />
                <h3 className="font-semibold text-foreground">Most Cooked Recipes</h3>
              </div>
              <div className="space-y-3">
                {topCookedRecipes.map((recipe, index) => (
                  <RecipeRow key={recipe.id} recipe={recipe} index={index} />
                ))}
              </div>
            </Card>
          )}

          {/* Top Rated */}
          {topRatedRecipes.length > 0 && (
            <Card className="border-border/50 p-6 mb-6">
              <div className="flex items-center gap-2 mb-4">
                <Star className="w-5 h-5 text-primary" />
                <h3 className="font-semibold text-foreground">Top Rated Recipes</h3>
              </div>
              <div className="space-y-3">
                {topRatedRecipes.map((recipe, index) => (
                  <RecipeRow key={recipe.id} recipe={recipe} index={index} />
                ))}
              </div>
            </Card>
          )}

          {topCookedRecipes.length === 0 && topRatedRecipes.length === 0 && (
            <Card className="border-border/50 p-12 text-center">
              <div className="max-w-md mx-auto">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <ChefHat className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">Start Your Cooking Journey</h3>
                <p className="text-sm text-muted-foreground mb-6">
                  Mark recipes as cooked and rate them to see your cooking stats here!
                </p>
                <Link to="/">
                  <Button className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg">Browse Recipes</Button>
                </Link>
              </div>
            </Card>
          )}
        </TabsContent>

        {/* ── TRENDS TAB ──────────────────────────────────────── */}
        <TabsContent value="trends">

          {/* Trend Metrics */}
          <div className="grid sm:grid-cols-2 gap-4 mb-6">
            <Card className="border-border/50 p-6">
              <div className="flex items-center justify-between mb-2">
                <TrendingUp className="w-5 h-5 text-primary" />
                <span className="text-2xl font-bold text-primary">
                  {avgMealsPerWeek % 1 === 0 ? avgMealsPerWeek.toFixed(0) : avgMealsPerWeek.toFixed(1)}
                </span>
              </div>
              <h3 className="text-sm font-medium text-foreground">Avg Meals / Week</h3>
              <p className="text-xs text-muted-foreground mt-1">Past 8 weeks</p>
            </Card>
            <Card className="border-border/50 p-6">
              <div className="flex items-center justify-between mb-2">
                <Award className="w-5 h-5 text-primary" />
                <span className="text-2xl font-bold text-primary">{triedAndTrueCount}</span>
              </div>
              <h3 className="text-sm font-medium text-foreground">Tried & True</h3>
              <p className="text-xs text-muted-foreground mt-1">Your reliable go-tos</p>
            </Card>
          </div>

          {/* Weekly bar chart */}
          <Card className="border-border/50 p-6 mb-6">
            <div className="flex items-center gap-2 mb-6">
              <Calendar className="w-5 h-5 text-primary" />
              <h3 className="font-semibold text-foreground">Meals Cooked Per Week</h3>
            </div>
            {totalTimesCooked === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No cooking activity logged yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={weeklyData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis
                    dataKey="week"
                    tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                    formatter={(value: number) => [value, "meals"]}
                  />
                  <Bar dataKey="meals" fill="#E07B67" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </Card>

          {/* Most Repeated Meals */}
          <Card className="border-border/50 p-6">
            <div className="flex items-center gap-2 mb-4">
              <Repeat2 className="w-5 h-5 text-primary" />
              <h3 className="font-semibold text-foreground">Most Repeated Meals</h3>
            </div>
            {mostRepeated.length === 0 ? (
              <p className="text-sm text-muted-foreground">Cook recipes more than once to see them here.</p>
            ) : (
              <div className="space-y-2">
                {mostRepeated.map((recipe, index) => (
                  <Link
                    key={recipe.id}
                    to={`/recipes/${recipe.id}`}
                    className="flex items-center gap-3 p-3 rounded-lg border border-border/50 hover:border-primary/30 hover:bg-muted/30 transition-all"
                  >
                    <span className="text-sm font-bold text-primary w-5 shrink-0 text-center">{index + 1}</span>
                    {recipe.image && (
                      <img src={recipe.image} alt={recipe.name} className="w-10 h-10 rounded-lg object-cover shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-medium text-foreground truncate">{recipe.name}</h4>
                    </div>
                    <div className="shrink-0 text-right">
                      <span className="text-lg font-bold text-primary">{recipe.timesCookedLog?.length}</span>
                      <p className="text-xs text-muted-foreground">times</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </Card>

        </TabsContent>
      </Tabs>
    </div>
  );
}

// Shared recipe row component
function RecipeRow({ recipe, index }: { recipe: Recipe; index: number }) {
  return (
    <Link
      to={`/recipes/${recipe.id}`}
      className="flex items-center gap-3 p-3 rounded-lg border border-border/50 hover:border-primary/30 hover:bg-muted/30 transition-all"
    >
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
        <span className="text-sm font-bold text-primary">{index + 1}</span>
      </div>
      {recipe.image && (
        <img src={recipe.image} alt={recipe.name} className="w-12 h-12 rounded-lg object-cover" />
      )}
      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-medium text-foreground truncate">{recipe.name}</h4>
        <div className="flex items-center gap-2 mt-1">
          <div className="flex items-center gap-0.5">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                className={`w-3 h-3 ${recipe.rating && star <= recipe.rating ? "fill-primary text-primary" : "text-muted-foreground/30"}`}
              />
            ))}
          </div>
          {(recipe.timesCookedLog?.length || 0) > 0 && (
            <span className="text-xs text-muted-foreground">
              · Cooked {recipe.timesCookedLog?.length} {recipe.timesCookedLog?.length === 1 ? "time" : "times"}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
