/**
 * Supabase Edge Function: Ask Coach
 * Uses OpenAI Chat Completions API for nutrition coaching
 * SECURITY: Requires authentication + server-side rate limiting
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    });
  }

  try {
    // ============================================
    // SECURITY: Verify Authentication
    // ============================================
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Missing auth token' }),
        {
          status: 401,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }

    // Create Supabase client with user's auth token
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Invalid auth token' }),
        {
          status: 401,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }

    // ============================================
    // SECURITY: Check Rate Limit SERVER-SIDE
    // ============================================
    const { data: canProceed, error: rateLimitError } = await supabase.rpc(
      'check_and_increment_coach_limit',
      { user_uuid: user.id }
    );

    if (rateLimitError || !canProceed) {
      return new Response(
        JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }

    const { message, context, conversationHistory = [] } = await req.json();

    if (!message) {
      return new Response(
        JSON.stringify({ error: 'Message is required' }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }

    // Format context message
    const contextMessage = formatContext(context);

    // Build messages for OpenAI Chat Completions API (with conversation threading)
    const SYSTEM_PROMPT = `You are a trusted 1:1 nutrition coach and mentor for Indian clients. Your role is to be nurturing yet powerful—someone they can truly depend on for real transformation.

Your Communication Style:
- Be warm and supportive, but direct and action-oriented
- No generic advice or platitudes—every response must be practical and immediately applicable
- Get straight to the point with honesty and clarity, without sugarcoating
- Make clients feel seen, understood, and capable of change

Your Approach:
- Dig deeper when needed: If a situation isn't clear, ask specific questions about their current habits, routine, family dynamics, food preferences, budget, and real-life constraints
- Meet them where they are: Understand their current eating patterns before suggesting changes
- Think sustainable, not extreme: Focus on gradual, realistic improvements over drastic overhauls
- Cultural sensitivity: Respect Indian dietary patterns—recommend wholesome desi foods, vegetarian/plant-forward options, and avoid suggesting extreme diets or red meat

Your Strategy for Change:
Instead of overwhelming meal plans, focus on:
- The Bottom 20% Swap: Identify their least nutritious habits and replace them with better alternatives (e.g., swapping biscuits with roasted makhana, or sugary chai with less sugar gradually)
- Small additions: Add nutrition before removing foods (e.g., adding a fruit before breakfast, including dal in lunch)
- Practical tweaks: Modify existing meals rather than reinventing their diet (e.g., switching white rice to brown rice slowly, adding vegetables to their regular sabzi)
- Habit stacking: Attach new habits to existing routines

Critical Communication Rules:
- Write like you're texting a friend who trusts you - conversational, not academic
- NO bullet points, formal headers like "Observations:" or "Action Steps:", or structured formats
- Start responses by acknowledging their situation (e.g., "I see you're eating out a lot...")
- Focus on ONE key issue at a time, not everything at once
- Use Indian food examples: sabzi not "vegetables", dal not "lentils", roti not "bread", dahi not "yogurt"
- Be conversational but concise - aim for 3-5 short paragraphs max

Response Structure (keep it natural):
1. Acknowledge what you see in their logs
2. Identify the BIGGEST opportunity for improvement (not everything)
3. Suggest 1-2 specific, actionable swaps or additions
4. OPTIONAL: Only ask a follow-up question if you genuinely lack critical information needed to give good advice

IMPORTANT: You have 14 days of food logs - that's usually PLENTY of context. Default to giving direct, actionable advice based on what you can already see. Only ask questions when absolutely necessary (e.g., they asked something specific that needs clarification, or their logs are empty/incomplete). Most responses should end with advice, not questions.

Remember: You're their accountability partner and trusted guide, not their doctor or nutritionist writing a report. Be direct, supportive, and real.`;

    // Build messages array with conversation threading from local memory
    const messages: any[] = [
      {
        role: 'system',
        content: SYSTEM_PROMPT + '\n\n' + contextMessage,
      },
    ];

    // Add conversation history from frontend (local memory threading)
    // This maintains context without storing messages in database
    if (conversationHistory && conversationHistory.length > 0) {
      for (const msg of conversationHistory) {
        messages.push({
          role: msg.role, // 'user' or 'assistant'
          content: msg.content,
        });
      }
    }

    // Add current user message
    messages.push({
      role: 'user',
      content: message,
    });

    // Call OpenAI Chat Completions API
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages,
        temperature: 0.7,
        max_tokens: 1000,
      }),
    });

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text();
      console.error('OpenAI API error:', errorText);
      throw new Error(`OpenAI API error: ${openaiResponse.status}`);
    }

    const openaiData = await openaiResponse.json();
    const responseText = openaiData.choices[0].message.content;

    // ============================================
    // LOG API USAGE FOR ANALYTICS
    // ============================================
    // Use service role client to log usage (users don't have INSERT permission)
    const supabaseAdmin = createClient(SUPABASE_URL, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    await supabaseAdmin.rpc('log_api_usage', {
      user_uuid: user.id,
      action: 'coach_conversation',
      was_success: true,
      error_msg: null,
    });

    return new Response(
      JSON.stringify({
        response: responseText,
      }),
      {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  } catch (error) {
    console.error('Coach error:', error);

    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Failed to get coach response',
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }
});

/**
 * Format context for the coach
 */
function formatContext(context: any): string {
  const { recentLogs, targetCalories, targetProtein, maintenanceCalories } = context;

  // Get current date for temporal context
  const today = new Date();
  const dateOptions: Intl.DateTimeFormatOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  const formattedDate = today.toLocaleDateString('en-US', dateOptions);

  let contextMsg = `**Current Date:** ${formattedDate}\n\n`;
  contextMsg += `**User Context (Last 14 Days):**\n\n`;

  // Add targets
  contextMsg += `**Nutrition Targets:**\n`;
  contextMsg += `- Target Calories: ${targetCalories} cal/day\n`;
  contextMsg += `- Maintenance Calories: ${maintenanceCalories} cal/day\n`;
  contextMsg += `- Target Protein: ${targetProtein}g/day\n\n`;

  // Add recent food logs
  if (recentLogs && Object.keys(recentLogs).length > 0) {
    contextMsg += `**Recent Food Logs:**\n`;

    const sortedDates = Object.keys(recentLogs).sort().reverse();

    for (const date of sortedDates) {
      const entries = recentLogs[date];
      if (entries && entries.length > 0) {
        const totalCals = entries.reduce((sum: number, e: any) => sum + (e.calories || 0), 0);
        const totalProtein = entries.reduce((sum: number, e: any) => sum + (e.protein || 0), 0);

        contextMsg += `\n${date}: ${totalCals} cal, ${totalProtein}g protein\n`;
        for (const entry of entries) {
          let entryLine = `  - ${entry.name}: ${entry.calories} cal, ${entry.protein}g pro`;

          // Add full description if it exists and is different from name
          if (entry.description && entry.description !== entry.name) {
            entryLine += ` (${entry.description})`;
          }

          // Indicate if image was provided
          if (entry.image_data) {
            entryLine += ` 📷`;
          }

          contextMsg += entryLine + '\n';
        }
      }
    }
  } else {
    contextMsg += `No recent food logs available.\n`;
  }

  return contextMsg;
}
