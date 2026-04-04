// Simple test to verify extraction logic
function extractInstructionsFromText(text) {
  const normalizedText = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = normalizedText.split('\n');
  const instructions = [];
  
  let inInstructionsSection = false;
  let foundInstructionsHeader = false;
  
  console.log("=== INSTRUCTIONS EXTRACTION DEBUG ===");
  console.log(`Total lines to process: ${lines.length}`);
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    
    console.log(`Line ${i}: "${trimmed}"`);
    
    // Skip empty lines
    if (!trimmed) {
      if (inInstructionsSection) {
        console.log(`  -> empty line in instructions section`);
      }
      continue;
    }
    
    // Check for instructions section header
    if (/^(?:instructions?|directions?|steps?|method|preparation|how to make):?$/i.test(trimmed)) {
      console.log(`  -> ✓ INSTRUCTIONS HEADER FOUND!`);
      inInstructionsSection = true;
      foundInstructionsHeader = true;
      continue;
    }
    
    // If we hit another major section, stop
    if (inInstructionsSection && /^(?:ingredients?|notes?|tips?|nutrition|serves?|servings?):?$/i.test(trimmed)) {
      console.log(`  -> ✗ Other section found, stopping`);
      break;
    }
    
    // Capture each instruction line as a separate instruction
    if (inInstructionsSection && trimmed) {
      // Clean up bullets, numbers, etc.
      let cleaned = trimmed
        .replace(/^[-•*▪️▫️◦‣⁃⦾⦿✓✔️☑️🔸🔹]+\s*/, '')
        .replace(/^[\d]+[.)]\s*/, '')
        .replace(/^step\s+\d+:?\s*/i, '')
        .trim();
      
      // Make sure it's substantial and not a header
      const isHeader = /^(?:instructions?|directions?|steps?|method):?$/i.test(cleaned);
      
      if (!isHeader && cleaned.length > 5) {
        console.log(`  -> ✓ ADDING INSTRUCTION: "${cleaned}"`);
        instructions.push(cleaned);
      } else {
        console.log(`  -> ✗ Skipping (header or too short): "${cleaned}"`);
      }
    } else if (!inInstructionsSection) {
      console.log(`  -> Not in instructions section yet`);
    }
  }
  
  console.log(`=== TOTAL INSTRUCTIONS FOUND: ${instructions.length} ===`);
  console.log("Final instructions:", instructions);
  return instructions;
}

// TEST 1: Simple recipe with clear headers
const testRecipe1 = `Creamy Garlic Parmesan Chicken

Ingredients:
- 4 chicken breasts
- 2 tbsp olive oil
- 4 cloves garlic, minced
- 1 cup heavy cream
- 1/2 cup parmesan cheese
- Salt and pepper to taste

Instructions:
1. Season chicken with salt and pepper
2. Heat olive oil in a large skillet
3. Cook chicken for 6-7 minutes per side
4. Remove chicken and set aside
5. Add garlic and cook for 1 minute
6. Add heavy cream and parmesan

Serves: 4`;

console.log("\n\n========== TEST 1 ==========");
const result1 = extractInstructionsFromText(testRecipe1);
console.log("\nFINAL RESULT:");
console.log("Instructions array length:", result1.length);
console.log("Instructions:", JSON.stringify(result1, null, 2));

// TEST 2: Recipe with different formatting
const testRecipe2 = `Amazing Pasta

Ingredients:
• 1 lb pasta
• 2 cups sauce

Instructions:
- Boil water
- Cook pasta for 10 minutes
- Drain and serve

Serves 4`;

console.log("\n\n========== TEST 2 ==========");
const result2 = extractInstructionsFromText(testRecipe2);
console.log("\nFINAL RESULT:");
console.log("Instructions array length:", result2.length);
console.log("Instructions:", JSON.stringify(result2, null, 2));
