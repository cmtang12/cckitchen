import { useState } from "react";
import { recipeAPI } from "../services/api";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { toast } from "sonner";

export function TestRecipeSave() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string>("");

  const testSave = async () => {
    setLoading(true);
    setResult("");

    try {
      console.log("🧪 [TEST] Starting recipe save test...");

      const testRecipe = {
        name: "Test Recipe " + Date.now(),
        servings: 4,
        cookingTime: 30,
        cookingMethod: ["stovetop" as const],
        ingredients: [
          {
            id: "test-1",
            name: "Test Ingredient",
            amount: "1 cup",
            category: "other" as const,
          },
        ],
        instructions: ["Test instruction 1", "Test instruction 2"],
        tags: [],
      };

      console.log("🧪 [TEST] Test recipe data:", testRecipe);

      const savedRecipe = await recipeAPI.create(testRecipe);

      console.log("🧪 [TEST] ✅ Recipe saved successfully:", savedRecipe);

      setResult(
        `✅ SUCCESS!\n\nRecipe ID: ${savedRecipe.id}\nName: ${savedRecipe.name}\nDate Added: ${savedRecipe.dateAdded}`
      );
      toast.success("Test recipe saved successfully!");
    } catch (error: any) {
      console.error("🧪 [TEST] ❌ Failed to save:", error);
      setResult(`❌ FAILED\n\nError: ${error.message}\n\nStack: ${error.stack}`);
      toast.error("Test failed: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-6 py-12">
      <Card>
        <CardHeader>
          <CardTitle>Recipe Save Test</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            This page tests the recipe saving functionality. Click the button below to
            create a test recipe and verify it saves correctly.
          </p>

          <Button onClick={testSave} disabled={loading} className="w-full">
            {loading ? "Testing..." : "Test Recipe Save"}
          </Button>

          {result && (
            <pre className="bg-muted p-4 rounded text-xs overflow-auto whitespace-pre-wrap">
              {result}
            </pre>
          )}

          <div className="text-xs text-muted-foreground space-y-2">
            <p>
              <strong>What this test does:</strong>
            </p>
            <ul className="list-disc list-inside space-y-1">
              <li>Creates a minimal test recipe</li>
              <li>Sends it to the API</li>
              <li>Logs all steps to browser console</li>
              <li>Shows success or error message</li>
            </ul>
            <p className="mt-4">
              <strong>Check browser console (F12)</strong> for detailed logs prefixed
              with 🧪 [TEST]
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
