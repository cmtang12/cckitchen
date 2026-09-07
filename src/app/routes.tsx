import React, { lazy, Suspense } from "react";
import { createBrowserRouter, redirect } from "react-router";
import { RootLayout } from "./components/RootLayout";
import { Login } from "./pages/Login";
import { ResetPassword } from "./pages/ResetPassword";
import { getSession } from "./utils/auth";

const RecipesLibrary = lazy(() => import("./pages/RecipesLibrary").then(m => ({ default: m.RecipesLibrary })));
const RecipeDetail = lazy(() => import("./pages/RecipeDetail").then(m => ({ default: m.RecipeDetail })));
const ImportRecipe = lazy(() => import("./pages/ImportRecipe").then(m => ({ default: m.ImportRecipe })));
const MealPlans = lazy(() => import("./pages/MealPlans").then(m => ({ default: m.MealPlans })));
const MealPlanDetail = lazy(() => import("./pages/MealPlanDetail").then(m => ({ default: m.MealPlanDetail })));
const EditMealPlan = lazy(() => import("./pages/EditMealPlan").then(m => ({ default: m.EditMealPlan })));
const GroceryList = lazy(() => import("./pages/GroceryList").then(m => ({ default: m.GroceryList })));
// Dashboard pulls in recharts, which is otherwise dead weight on every other page.
const Dashboard = lazy(() => import("./pages/Dashboard").then(m => ({ default: m.Dashboard })));
const TestPage = lazy(() => import("./pages/TestPage").then(m => ({ default: m.TestPage })));
const TestRecipeSave = lazy(() => import("./pages/TestRecipeSave").then(m => ({ default: m.TestRecipeSave })));

const LoadingFallback = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="text-center">
      <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
      <p className="text-muted-foreground">Loading...</p>
    </div>
  </div>
);

async function requireAuth() {
  const session = await getSession();
  if (!session) return redirect("/login");
  return null;
}

export const router = createBrowserRouter([
  {
    path: "/login",
    element: <Login />,
  },
  {
    path: "/reset-password",
    element: <ResetPassword />,
  },
  {
    path: "/",
    loader: requireAuth,
    element: <RootLayout />,
    children: [
      { 
        index: true, 
        element: (
          <Suspense fallback={<LoadingFallback />}>
            <RecipesLibrary />
          </Suspense>
        )
      },
      { 
        path: "recipes/:id", 
        element: (
          <Suspense fallback={<LoadingFallback />}>
            <RecipeDetail />
          </Suspense>
        )
      },
      {
        // Redirect old /recipe/:id URLs to /recipes/:id
        path: "recipe/:id",
        loader: ({ params }) => {
          return redirect(`/recipes/${params.id}`);
        }
      },
      { 
        path: "import", 
        element: (
          <Suspense fallback={<LoadingFallback />}>
            <ImportRecipe />
          </Suspense>
        )
      },
      {
        path: "meal-plans",
        element: (
          <Suspense fallback={<LoadingFallback />}>
            <MealPlans />
          </Suspense>
        )
      },
      { 
        path: "meal-plans/:id", 
        element: (
          <Suspense fallback={<LoadingFallback />}>
            <MealPlanDetail />
          </Suspense>
        )
      },
      { 
        path: "edit-meal-plan/:id", 
        element: (
          <Suspense fallback={<LoadingFallback />}>
            <EditMealPlan />
          </Suspense>
        )
      },
      { 
        path: "grocery-list", 
        element: (
          <Suspense fallback={<LoadingFallback />}>
            <GroceryList />
          </Suspense>
        )
      },
      {
        path: "dashboard",
        element: (
          <Suspense fallback={<LoadingFallback />}>
            <Dashboard />
          </Suspense>
        )
      },
      {
        path: "test",
        element: (
          <Suspense fallback={<LoadingFallback />}>
            <TestPage />
          </Suspense>
        )
      },
      {
        path: "test-save",
        element: (
          <Suspense fallback={<LoadingFallback />}>
            <TestRecipeSave />
          </Suspense>
        )
      },
    ],
  },
]);