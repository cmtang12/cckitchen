# Meal Plan Editing Improvements

## Changes Made

### 1. Enhanced Drag and Drop in Edit Meal Plan Page

**Auto-cleanup of Complete Meal Groups:**
- When ungrouping a recipe from a complete meal, if the remaining group has less than 2 recipes, the group outline is automatically removed
- When dragging recipes between groups, groups with only 1 recipe are automatically converted to ungrouped meals
- This keeps the UI clean and only shows "Complete Meal" styling when there are actually 2+ recipes grouped together

**Implementation:**
- Added cleanup logic in `handleDropRecipeOnRecipe()` function
- Added cleanup logic in `handleUngroupRecipe()` function
- Both functions now count group members after changes and remove `mealGroupId` from single-member groups

### 2. General Drag and Drop Reordering

**No bucket constraints:**
- Recipes can be freely dragged and dropped anywhere in the meal plan
- Dragging onto another recipe creates/joins a complete meal group
- Dragging away (ungrouping) separates recipes back to individual meals
- No day-of-week buckets or restrictions on placement

### 3. Simplified Meal Plan View Page

**Removed "Meal 1", "Meal 2" labels:**
- Eliminated day-based grouping in the view page
- All meals now display in a flat list with complete meal groups highlighted
- Complete meal groups show with green border and "Complete Meal" badge
- Individual recipes show as regular cards

**Before:**
```
Meal 1
├── Complete Meal (3 recipes)
└── Single Recipe

Meal 2
├── Single Recipe
```

**After:**
```
Complete Meal (3 recipes)
├── Recipe A
├── Recipe B
└── Recipe C

Recipe D
Recipe E
```

## User Experience

### Editing Meal Plans:
1. Drag any recipe onto another to create a complete meal group
2. Drag a recipe within a group to reorder
3. Click ungroup button or drag away to separate recipes
4. Groups automatically collapse when reduced to 1 recipe

### Viewing Meal Plans:
1. Clean, simple list of all recipes
2. Complete meals visually grouped with green styling
3. No confusing "Meal 1", "Meal 2" day labels
4. Easy to see what's grouped and what's individual

## Technical Details

### Files Modified:
- `/tmp/sandbox/src/app/pages/EditMealPlan.tsx`
  - Enhanced `handleDropRecipeOnRecipe()` with group cleanup
  - Enhanced `handleUngroupRecipe()` with group cleanup

- `/tmp/sandbox/src/app/pages/MealPlanDetail.tsx`
  - Removed `groupMealsByDay()` function
  - Removed `groupByMealGroup()` function
  - Added simplified `groupMeals()` function
  - Removed day-based rendering loop
  - Removed "Meal 1", "Meal 2" header labels

### Logic:
```typescript
// After any grouping/ungrouping operation:
1. Count members in each mealGroupId
2. If count < 2, remove mealGroupId from those meals
3. Save to database
4. Update UI
```

This ensures the UI always stays clean and accurate.
