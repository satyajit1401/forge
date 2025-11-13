import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MealEntry {
  date: string;
  time: string;
  food: string;
  calories: number;
  protein: number;
}

interface MealCoachingRequest {
  user_id: string;
  week_entries: MealEntry[];
  targets: {
    calories: number;
    protein: number;
    maintenance: number;
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Verify user is authenticated
    const {
      data: { user },
    } = await supabaseClient.auth.getUser();

    if (!user) {
      throw new Error('Not authenticated');
    }

    const { week_entries, targets }: MealCoachingRequest = await req.json();

    // Check rate limit (using coach limit since it's AI analysis)
    const { data: rateLimitOk, error: rateLimitError } = await supabaseClient.rpc(
      'check_and_increment_coach_limit',
      { user_uuid: user.id }
    );

    if (rateLimitError || !rateLimitOk) {
      return new Response(
        JSON.stringify({
          error: 'Rate limit exceeded. Please try again tomorrow.',
        }),
        {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // PRE-CALCULATE DATA SERVER-SIDE
    // Group meals by date
    const mealsByDate: Record<string, MealEntry[]> = {};
    week_entries.forEach(entry => {
      if (!mealsByDate[entry.date]) {
        mealsByDate[entry.date] = [];
      }
      mealsByDate[entry.date].push(entry);
    });

    // Calculate daily totals and build structured data
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dailyMeals = Object.entries(mealsByDate)
      .sort((a, b) => a[0].localeCompare(b[0])) // Sort by date
      .map(([date, meals]) => {
        const dayOfWeek = new Date(date).getDay();
        const totalCalories = meals.reduce((sum, m) => sum + m.calories, 0);
        const totalProtein = meals.reduce((sum, m) => sum + m.protein, 0);

        return {
          date,
          dayName: dayNames[dayOfWeek],
          totalCalories: Math.round(totalCalories),
          totalProtein: Math.round(totalProtein),
          meals: meals.map(m => ({
            time: m.time,
            food: m.food,
            calories: m.calories,
            protein: m.protein
          }))
        };
      });

    // Calculate weekly averages
    const totalCal = dailyMeals.reduce((sum, day) => sum + day.totalCalories, 0);
    const totalPro = dailyMeals.reduce((sum, day) => sum + day.totalProtein, 0);
    const daysLogged = dailyMeals.length;
    const avgCalories = daysLogged > 0 ? Math.round(totalCal / daysLogged) : 0;
    const avgProtein = daysLogged > 0 ? Math.round(totalPro / daysLogged) : 0;

    // Calculate gaps
    const calGap = targets.calories - avgCalories;
    const proGap = targets.protein - avgProtein;

    // Determine goal
    const goal = targets.calories < targets.maintenance ? 'CUTTING' :
                 targets.calories > targets.maintenance ? 'BULKING' : 'MAINTENANCE';

    // Structure data for AI
    const structuredData = {
      coachingContext: {
        targetCalories: targets.calories,
        targetProtein: targets.protein,
        maintenanceCalories: targets.maintenance,
        goal,
        daysLogged
      },
      weekSummary: {
        avgCalories,
        avgProtein,
        gaps: {
          calories: calGap,
          protein: proGap
        }
      },
      dailyMeals
    };

    // ============================================
    // PHASE 1: Build Meal Pattern Table with PATTERN RECOGNITION approach
    // ============================================
    const prompt1 = `CONTEXT - What You're Helping With:
You are assisting a professional nutrition coach who works with clients on their eating habits.

The coach has collected a week of food logs from their client and needs YOUR help to:
1. Identify the client's TYPICAL meal patterns (when they eat, what they eat)
2. Create a simple meal structure summary the coach can discuss with their client
3. Spot where the client is consistent vs inconsistent
4. Provide a foundation for giving actionable nutrition advice

This summary is a COMMUNICATION TOOL for the coach to use in conversations with their client. It should feel natural and recognizable to the client - they should see their actual eating habits reflected, not a manufactured schedule.

IMPORTANT: This is about understanding PATTERNS and TENDENCIES, not accounting for every single calorie. Approximations are perfectly fine.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

YOUR TASK:
Analyze the client's week of eating and create a meal pattern table that shows their TYPICAL eating structure.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

HOW TO APPROACH THIS:

STEP 1 - UNDERSTAND THE CLIENT'S WEEK
Read through all the daily meals to understand their eating rhythm:
- What times do they typically eat?
- Do they have consistent patterns? (e.g., always breakfast around 8am, or skips it some days?)
- Are there snacking patterns between main meals?
- Do they eat late at night?
- Are there any irregular eating times?

Think about: "If I were this person's coach, what would I notice about when and how they eat?"

STEP 2 - IDENTIFY TYPICAL MEAL PATTERNS
Create meal categories that represent their ACTUAL eating structure:
- Use familiar meal names: "Breakfast", "Mid-Morning Snack", "Lunch", "Afternoon Snack", "Evening Snack", "Dinner", "Late Night Snack"
- Base the timing on WHEN they actually eat, not textbook meal times
  * If they eat "breakfast" at 10:30am most days, that's their breakfast time
  * If they have a consistent 4pm snack, that's an "Afternoon Snack"
- Only include meals that happen regularly (at least 2-3 times in the week)
- If they skip meals inconsistently, show that in the frequency

STEP 3 - SHOW WHAT THEY ACTUALLY EAT
For each meal pattern, list 4-6 specific foods they actually ate:
- Pick the MOST COMMON items that appeared in this meal slot
- Show variety if they rotate between different foods
- Be SPECIFIC with food names:
  ✓ "Chicken tikka pizza, Paneer paratha with curd, Oats with protein powder"
  ✗ "Pizza, Paratha, Oats" (too generic)
- Think: "If the coach says 'your typical lunch', what foods should the client recognize?"
- This helps the coach understand their client's food preferences and habits

CRITICAL: Every meal MUST have at least 4 food examples. If a meal has limited variety, list what they ate multiple times.

STEP 4 - CALCULATE AVERAGE PER MEAL OCCURRENCE

This is CRITICAL - you must show the average calories for ONE INSTANCE of each meal, not the total across all occurrences.

DETAILED ARITHMETIC EXAMPLE:
Let's say "Late Night Meal" appears 5 times across the week:
- Day 1: 400 cal, 22g protein
- Day 3: 380 cal, 20g protein
- Day 4: 420 cal, 23g protein
- Day 5: 350 cal, 19g protein
- Day 7: 374 cal, 21g protein

STEP-BY-STEP CALCULATION:
1. ADD all calories together: 400 + 380 + 420 + 350 + 374 = 1924 cal TOTAL
2. COUNT how many times it occurred: 5 times
3. DIVIDE total by count: 1924 ÷ 5 = 384.8 → round to 385 cal
4. SAME for protein: (22+20+23+19+21) ÷ 5 = 21g

RESULT IN YOUR JSON:
{
  "meal": "Late Night Meal",
  "avgCal": 385,  // ← This is the average for ONE meal, NOT 1924 total
  "avgPro": 21,   // ← Average for ONE meal
  "frequency": "Most days (5/7)"
}

COMMON MISTAKE TO AVOID:
❌ WRONG: avgCal = 1924 (this is the TOTAL across all 5 occurrences)
✓ CORRECT: avgCal = 385 (this is the average per single meal)

The coach needs to know: "When my client eats this meal, how many calories does ONE serving typically contain?"

STEP 5 - SHOW EATING CONSISTENCY
For each meal, indicate how often it occurs:
- "Daily (7/7)" - if they eat it every day
- "Most days (5/7)" - if they usually eat it
- "Sometimes (3/7)" - if it's occasional
- This helps identify habit gaps (e.g., skipping breakfast 3 days a week)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

GUIDING PRINCIPLES:

✓ PATTERNS over PRECISION - Show tendencies, not audit-level accounting
✓ REPRESENTATIVE over EXHAUSTIVE - Typical examples > complete lists
✓ RECOGNIZABLE over RIGID - Client should see their actual habits
✓ APPROXIMATE over EXACT - Within 10-15% is perfectly fine
✓ REALISTIC over MANUFACTURED - If they're inconsistent, show that

Think like a coach reviewing notes: "What are this person's typical eating patterns?"

Focus on Indian dietary patterns where relevant (roti, paratha, dal, rice, paneer, chicken, curd, chai, etc.)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CLIENT'S WEEKLY DATA:
${JSON.stringify(structuredData, null, 2)}

SUMMARY OF THE WEEK:
- Days logged: ${daysLogged}
- Daily average: ${avgCalories} calories, ${avgProtein}g protein
- Target: ${targets.calories} calories, ${targets.protein}g protein
- Goal: ${goal}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

OUTPUT FORMAT:
Return ONLY valid JSON (no markdown, no code blocks, no explanatory text):

{
  "mealTable": [
    {
      "meal": "Breakfast",
      "timing": "7:30 AM - 9:00 AM",
      "examples": ["Paneer paratha with curd", "Oats with protein powder and banana", "Egg bhurji with brown bread", "Poha with peanuts"],
      "avgCal": 380,
      "avgPro": 18,
      "frequency": "Most days (5/7)"
    }
  ],
  "totals": {
    "currentCal": ${avgCalories},
    "currentPro": ${avgProtein},
    "targetCal": ${targets.calories},
    "targetPro": ${targets.protein}
  }
}

Remember: The coach will use this to have a conversation with their client. Make it feel natural and recognizable.`;

    // ============================================
    // PHASE 1 API CALL: Build Table with o3-mini (reasoning model)
    // ============================================
    let phase1Response;
    let phase1Content = '';
    let phase1Result;

    try {
      console.log('[PHASE 1] Starting o3-mini API call...');
      const phase1StartTime = Date.now();

      phase1Response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
        },
        body: JSON.stringify({
          model: 'o3-mini-2025-01-31',
          messages: [
            {
              role: 'user',
              content: `You are an AI assistant helping a professional nutrition coach analyze their clients' weekly meal patterns.

Your job is to identify meal timing patterns and calculate averages with PERFECT accuracy.

CRITICAL CALCULATION RULES:
1. Extract EVERY meal from the dailyMeals array
2. Group meals by similar timing (e.g., all 7-9 AM meals = "Breakfast")
3. For each group, calculate average PER OCCURRENCE:
   - List all occurrences
   - Sum the calories/protein
   - Divide by number of occurrences
4. VERIFY: Σ(meal_avg × frequency_ratio) MUST equal ${avgCalories} cal and ${avgProtein}g protein
   - If it doesn't match, you made a calculation error - recalculate
5. Identify ALL meals - don't skip lunch, dinner, or snacks

CRITICAL FOOD EXAMPLES REQUIREMENT:
⚠️ EVERY meal MUST have AT LEAST 4 specific food examples (minimum 4, ideally 4-6)
⚠️ Look through ALL the actual foods eaten during this meal across all days
⚠️ Include the MOST COMMON foods that appear in this meal pattern
⚠️ Even for snacks with limited variety, provide at least 4 specific items
⚠️ This is NON-NEGOTIABLE - the coach needs to see what the client typically eats

You are doing arithmetic. Be methodical. Show your work mentally step-by-step.
Focus on Indian foods and dietary patterns common in India.

${prompt1}

IMPORTANT: Return ONLY valid JSON in this EXACT structure (no markdown, no code blocks, no extra text):
{
  "mealTable": [
    {
      "meal": "string (e.g., 'Breakfast', 'Lunch')",
      "timing": "string (e.g., '7:30 AM - 9:00 AM')",
      "examples": ["food1", "food2", "food3", "food4", "food5", "food6"],  // MINIMUM 4, ideally 4-6 examples
      "avgCal": number,
      "avgPro": number,
      "frequency": "string (e.g., 'Daily (7/7)', '5/7 days')"
    }
  ],
  "totals": {
    "currentCal": ${avgCalories},
    "currentPro": ${avgProtein},
    "targetCal": ${targets.calories},
    "targetPro": ${targets.protein}
  }
}`
            }
          ]
        }),
      });

      const phase1Duration = Date.now() - phase1StartTime;
      console.log(`[PHASE 1] API call completed in ${phase1Duration}ms, status: ${phase1Response.status}`);

      if (!phase1Response.ok) {
        const errorText = await phase1Response.text();
        console.error('[PHASE 1-API-ERROR] OpenAI returned non-OK status:', {
          status: phase1Response.status,
          statusText: phase1Response.statusText,
          errorText: errorText.substring(0, 500)
        });
        throw new Error(`[Phase1-API] Status ${phase1Response.status}: ${errorText.substring(0, 200)}`);
      }

      const phase1Data = await phase1Response.json();
      phase1Content = phase1Data.choices[0].message.content;

      console.log('[PHASE 1] Raw response length:', phase1Content.length);
      console.log('[PHASE 1] Response preview:', phase1Content.substring(0, 200));

      // Clean up any markdown code blocks
      const originalContent = phase1Content;
      phase1Content = phase1Content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

      if (originalContent !== phase1Content) {
        console.log('[PHASE 1] Cleaned markdown wrappers from response');
      }

    } catch (error) {
      console.error('[PHASE 1-API-EXCEPTION] Exception during API call:', error);
      throw new Error(`[Phase1-API] ${error.message}`);
    }

    // Parse JSON response
    try {
      console.log('[PHASE 1] Parsing JSON response...');
      phase1Result = JSON.parse(phase1Content);
      console.log('[PHASE 1] JSON parsed successfully');
    } catch (error) {
      console.error('[PHASE 1-PARSE-ERROR] Failed to parse JSON:', {
        error: error.message,
        contentPreview: phase1Content.substring(0, 500),
        contentLength: phase1Content.length
      });
      throw new Error(`[Phase1-Parse] Invalid JSON from o3-mini. Content preview: ${phase1Content.substring(0, 200)}`);
    }

    // Validate Phase 1 response structure
    try {
      console.log('[PHASE 1] Validating response structure...');

      if (!phase1Result.mealTable || !Array.isArray(phase1Result.mealTable)) {
        console.error('[PHASE 1-VALIDATE-ERROR] mealTable validation failed:', {
          hasMealTable: !!phase1Result.mealTable,
          isArray: Array.isArray(phase1Result.mealTable),
          phase1Result: JSON.stringify(phase1Result).substring(0, 300)
        });
        throw new Error('[Phase1-Validate] mealTable missing or not an array');
      }

      if (!phase1Result.totals) {
        console.error('[PHASE 1-VALIDATE-ERROR] totals validation failed:', {
          hasTotals: !!phase1Result.totals,
          phase1Result: JSON.stringify(phase1Result).substring(0, 300)
        });
        throw new Error('[Phase1-Validate] totals missing');
      }

      // Validate each meal has timing and examples
      for (let i = 0; i < phase1Result.mealTable.length; i++) {
        const meal = phase1Result.mealTable[i];

        if (!meal.timing || meal.timing.trim() === '') {
          console.error('[PHASE 1-VALIDATE-ERROR] Meal missing timing:', {
            mealIndex: i,
            meal: JSON.stringify(meal)
          });
          throw new Error(`[Phase1-Validate] Meal "${meal.meal}" (index ${i}) is missing timing field`);
        }

        if (!meal.examples || !Array.isArray(meal.examples) || meal.examples.length < 2) {
          console.error('[PHASE 1-VALIDATE-ERROR] Meal missing examples:', {
            mealIndex: i,
            meal: meal.meal,
            hasExamples: !!meal.examples,
            isArray: Array.isArray(meal.examples),
            examplesLength: meal.examples?.length || 0
          });
          throw new Error(`[Phase1-Validate] Meal "${meal.meal}" (index ${i}) needs at least 2 food examples (has ${meal.examples?.length || 0})`);
        }
      }

      console.log('[PHASE 1] Validation passed successfully');

    } catch (error) {
      console.error('[PHASE 1-VALIDATE-EXCEPTION] Validation exception:', error);
      throw error; // Re-throw with existing error message
    }

    // ============================================
    // PHASE 2: Strategic Recommendations
    // ============================================
    const prompt2 = `Perfect! Looking at the meal table you just built:

${JSON.stringify(phase1Result.mealTable, null, 2)}

TOTALS:
- Current: ${phase1Result.totals.currentCal} cal, ${phase1Result.totals.currentPro}g protein
- Target: ${phase1Result.totals.targetCal} cal, ${phase1Result.totals.targetPro}g protein
- Gap to close: ${calGap > 0 ? '+' : ''}${calGap} cal, ${proGap > 0 ? '+' : ''}${proGap}g protein

TASK: Provide strategic recommendations that will CUMULATIVELY close this gap with the MINIMUM number of changes (1-2 max).

CRITICAL REQUIREMENTS:
1. MATHEMATICAL CONSTRAINT - VERIFY YOUR MATH:
   - Gap to close: ${calGap > 0 ? '+' : ''}${calGap} cal, ${proGap > 0 ? '+' : ''}${proGap}g protein
   - Your recommendations MUST add up to close this EXACT gap
   - Example: If gap is +542cal/+52g, your changes must total ≈+542cal/+52g
   - DO THE MATH: Add up your net effects BEFORE submitting
   - If your recommendations don't add up to close the gap, you made an error

2. MINIMUM CHANGES: Maximum 1-2 recommendations
   - If gap is small (<100 cal AND <10g protein), say "Client is on track" - NO changes
   - ONLY suggest changes with real impact: 10g+ protein OR 100+ cal

3. CONTEXT-AWARE ANALYSIS:
   - Reference the table: "Looking at your meals, I can see..."
   - Identify STRENGTHS: Which meals are working well?
   - Identify WEAKNESSES: Which meal has the biggest gap?
   - Be specific about what they're currently eating vs what they should change

4. SUPER SIMPLE ACTIONABLE FORMAT:
   - ONE LINE per recommendation
   - Format: "ACTION what → Net: +Xcal, +Yg"
   - Examples:
     * "REPLACE Chicken tikka pizza with Paneer Paratha → Net: +150cal, +15g"
     * "ADD 2 boiled eggs to breakfast → Net: +140cal, +12g"
   - NO lengthy explanations - just the action and net effect
   - Be SURGICAL: Pick the ONE meal with biggest opportunity

5. PREFER INDIAN FOODS: paneer, dal, eggs, chicken, curd, protein powder, sprouts, chana, moong dal

CRITICAL: Keep recommendations SHORT and ACTIONABLE. The coach needs to be able to copy-paste this to their client.

OUTPUT FORMAT:
For each recommendation, specify:
- targetMeal: Which meal from the table
- recommendation: ONE simple actionable line with net effect`;

    // ============================================
    // PHASE 2 API CALL: Strategic Recommendations (SEPARATE GPT-4o call with full context)
    // ============================================
    let phase2Response;
    let phase2Result;

    try {
      console.log('[PHASE 2] Starting GPT-4o API call...');
      const phase2StartTime = Date.now();

      phase2Response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-2024-08-06',
          messages: [
            {
              role: 'system',
              content: `You are an expert nutrition coach providing strategic recommendations for meal coaching.

You will receive a meal pattern table that was analyzed for a client, along with their current vs target macros.

Your job is to provide surgical, high-impact recommendations that will close the gap between current and target macros.

KEY PRINCIPLES:
- Be STRATEGIC: Cumulative changes must close the gap with MINIMUM modifications (1-2 max)
- Be SURGICAL: Pick the meals with the biggest opportunity for improvement
- Be ACTIONABLE: ONE simple line per recommendation - no paragraphs
- Be MATHEMATICAL: Net changes must add up to EXACTLY close the gap
  * DO THE MATH: Add up your net effects before submitting
  * If recommendations don't close the gap, you failed the task
- Format: "ACTION what → Net: +Xcal, +Yg" (copy-paste ready for the coach)
- Focus on Indian foods and dietary patterns common in India`,
            },
            {
              role: 'user',
              content: `${prompt2}

MEAL TABLE FROM ANALYSIS:
${JSON.stringify(phase1Result, null, 2)}

CLIENT CONTEXT:
- Current daily average: ${phase1Result.totals.currentCal} cal, ${phase1Result.totals.currentPro}g protein
- Target: ${phase1Result.totals.targetCal} cal, ${phase1Result.totals.targetPro}g protein
- Gap to close: ${calGap > 0 ? '+' : ''}${calGap} cal, ${proGap > 0 ? '+' : ''}${proGap}g protein
- Goal: ${goal}
- Days logged: ${daysLogged}

Provide strategic recommendations that will CUMULATIVELY close this gap with the MINIMUM number of changes (1-2 max).`,
            },
          ],
          temperature: 0.7,
          max_tokens: 2000,
          response_format: {
            type: 'json_schema',
            json_schema: {
              name: 'strategic_recommendations',
              strict: true,
              schema: {
                type: 'object',
                properties: {
                  recommendations: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        targetMeal: { type: 'string', description: 'Which meal from the table (e.g., "Lunch", "Breakfast")' },
                        recommendation: { type: 'string', description: 'ONE simple actionable line. Format: "ACTION what → Net: +Xcal, +Yg". Example: "REPLACE Chicken tikka pizza with Paneer Paratha → Net: +150cal, +15g" or "ADD 2 boiled eggs → Net: +140cal, +12g"' }
                      },
                      required: ['targetMeal', 'recommendation'],
                      additionalProperties: false
                    }
                  }
                },
                required: ['recommendations'],
                additionalProperties: false
              }
            }
          }
        }),
      });

      const phase2Duration = Date.now() - phase2StartTime;
      console.log(`[PHASE 2] API call completed in ${phase2Duration}ms, status: ${phase2Response.status}`);

      if (!phase2Response.ok) {
        const errorText = await phase2Response.text();
        console.error('[PHASE 2-API-ERROR] OpenAI returned non-OK status:', {
          status: phase2Response.status,
          statusText: phase2Response.statusText,
          errorText: errorText.substring(0, 500)
        });
        throw new Error(`[Phase2-API] Status ${phase2Response.status}: ${errorText.substring(0, 200)}`);
      }

      const phase2Data = await phase2Response.json();
      const phase2Content = phase2Data.choices[0].message.content;

      console.log('[PHASE 2] Raw response length:', phase2Content.length);
      console.log('[PHASE 2] Response preview:', phase2Content.substring(0, 200));

      try {
        console.log('[PHASE 2] Parsing JSON response...');
        phase2Result = JSON.parse(phase2Content);
        console.log('[PHASE 2] JSON parsed successfully');
      } catch (error) {
        console.error('[PHASE 2-PARSE-ERROR] Failed to parse JSON:', {
          error: error.message,
          contentPreview: phase2Content.substring(0, 500),
          contentLength: phase2Content.length
        });
        throw new Error(`[Phase2-Parse] Invalid JSON from GPT-4o. Content preview: ${phase2Content.substring(0, 200)}`);
      }

    } catch (error) {
      console.error('[PHASE 2-EXCEPTION] Exception during Phase 2:', error);
      throw error; // Re-throw with existing error message
    }

    // ============================================
    // MERGE: Combine Table + Recommendations
    // ============================================
    // Map recommendations to their target meals
    const recommendationMap = new Map<string, string>();
    for (const rec of phase2Result.recommendations) {
      recommendationMap.set(rec.targetMeal, rec.recommendation);
    }

    // Add 'change' field to each meal in the table
    const finalMealTable = phase1Result.mealTable.map((meal: any) => ({
      ...meal,
      change: recommendationMap.get(meal.meal) || null
    }));

    const finalResult = {
      mealTable: finalMealTable,
      totals: phase1Result.totals
    };

    return new Response(JSON.stringify(finalResult), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    // Comprehensive error logging
    console.error('=== MEAL COACHING ERROR ===');
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    console.error('Error name:', error.name);

    // Return detailed error information to client
    return new Response(
      JSON.stringify({
        error: error.message,
        errorType: error.name,
        timestamp: new Date().toISOString(),
        // Include stack trace for debugging (first 500 chars)
        stack: error.stack ? error.stack.substring(0, 500) : undefined
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
