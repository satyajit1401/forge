/**
 * Supabase Edge Function: Analyze Food
 * Analyzes food from description and/or image using OpenAI GPT-4o with WEEKLY THREAD MEMORY
 * SECURITY: Requires authentication + server-side rate limiting
 * MEMORY: Maintains weekly conversation threads for consistent nutrition tracking
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
const OPENAI_FOOD_ASSISTANT_ID = Deno.env.get('OPENAI_FOOD_ASSISTANT_ID');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const SYSTEM_PROMPT = `You are an expert nutrition analyst specializing in Indian and South Asian cuisine. Analyze food from descriptions and/or images and return accurate calorie and protein estimates.

CRITICAL RULES FOR MULTIPLE ITEMS:
- When you see multiple items on a plate or in the description, IDENTIFY EACH ONE SEPARATELY first
- Estimate portion size for EACH item individually
- Calculate calories and protein for EACH item
- Sum everything up for the final totals
- List all items in the name field (e.g., "2 rotis, dal makhani, rice, raita")

PORTION SIZE ESTIMATION (from images):
- Use visual references: Compare to hand size, plate size, spoon size
- Standard portions: 1 roti ≈ 30g, 1 cup dal ≈ 200g, 1 cup rice ≈ 150g cooked
- If uncertain between sizes, choose the LARGER estimate (people underestimate)
- Account for visible oil/ghee pools - add 1 tbsp (120 cal) per visible pool

INDIAN FOOD SPECIFICS:
- Account for cooking methods: Tandoor items have less oil, curries have more
- Hidden calories: Estimate ghee/oil used in cooking (typically 1-2 tbsp per serving for curries)
- Paneer dishes: Include high fat content (paneer is ~20% fat)
- Fried items: Add 30-50% calories for oil absorption (pakoras, samosas, bhajis)
- Restaurant food: Add 20% more calories than home-cooked (more oil/ghee/sugar)

COMPOSITE DISHES - Break them down:
- Biryani = rice + protein + oil/ghee + garnishes
- Dal makhani = lentils + cream + butter + oil
- Sabzi = vegetables + oil/ghee + spices
- Chole = chickpeas + oil + masala

ACCURACY PRINCIPLES:
- When in doubt, estimate HIGHER (people consistently underestimate calories)
- Don't be conservative with portions - match what you actually see
- Include everything visible: garnishes, sides, accompaniments
- Round to realistic numbers (avoid 347 cal, use 350 cal)

MEMORY & CONSISTENCY:
- Remember specific products/brands mentioned by the user in this week's logs
- Use consistent calorie estimates for items the user logs repeatedly
- If user mentioned exact calories for a custom item, use those values going forward

Return ONLY valid JSON with this structure:
{
  "name": "descriptive name listing all items identified",
  "calories": number (total for everything),
  "protein": number (total in grams)
}`;

// Helper: Get start of current week (Monday)
function getWeekStart(date: Date = new Date()): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust to Monday
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d.toISOString().split('T')[0];
}

// Helper: Create or get assistant
async function getOrCreateAssistant(): Promise<string> {
  // If assistant ID is in env, use it
  if (OPENAI_FOOD_ASSISTANT_ID) {
    return OPENAI_FOOD_ASSISTANT_ID;
  }

  // Otherwise create a new assistant
  const response = await fetch('https://api.openai.com/v1/assistants', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
      'OpenAI-Beta': 'assistants=v2',
    },
    body: JSON.stringify({
      name: 'Food Nutrition Analyzer',
      instructions: SYSTEM_PROMPT,
      model: 'gpt-4o',
      response_format: { type: 'json_object' },
      temperature: 0.3,
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to create assistant');
  }

  const data = await response.json();
  console.log('Created new assistant:', data.id);
  return data.id;
}

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

    // Create service role client for thread updates
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

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
      'check_and_increment_rate_limit',
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

    // Parse request body
    const { description, image } = await req.json();

    if (!description && !image) {
      return new Response(
        JSON.stringify({ error: 'Either description or image is required' }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }

    // ============================================
    // THREAD MANAGEMENT: Get or Create Weekly Thread
    // ============================================
    const currentWeekStart = getWeekStart();

    // Get user's current thread info
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('food_thread_id, food_thread_week_start')
      .eq('user_id', user.id)
      .single();

    let threadId = userProfile?.food_thread_id;
    const threadWeekStart = userProfile?.food_thread_week_start;

    // Check if we need a new thread (new week or no thread)
    if (!threadId || threadWeekStart !== currentWeekStart) {
      console.log('Creating new thread for week:', currentWeekStart);

      // Create new thread
      const threadResponse = await fetch('https://api.openai.com/v1/threads', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
          'OpenAI-Beta': 'assistants=v2',
        },
        body: JSON.stringify({}),
      });

      if (!threadResponse.ok) {
        throw new Error('Failed to create thread');
      }

      const threadData = await threadResponse.json();
      threadId = threadData.id;

      // Update user profile with new thread info
      await supabaseAdmin
        .from('user_profiles')
        .update({
          food_thread_id: threadId,
          food_thread_week_start: currentWeekStart,
        })
        .eq('user_id', user.id);

      console.log('New thread created:', threadId);
    } else {
      console.log('Using existing thread:', threadId);
    }

    // ============================================
    // ADD MESSAGE TO THREAD
    // ============================================
    const messageContent: any[] = [];

    if (description) {
      messageContent.push({
        type: 'text',
        text: description,
      });
    }

    if (image) {
      messageContent.push({
        type: 'image_url',
        image_url: {
          url: image,
        },
      });
    }

    const messageResponse = await fetch(`https://api.openai.com/v1/threads/${threadId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
        'OpenAI-Beta': 'assistants=v2',
      },
      body: JSON.stringify({
        role: 'user',
        content: messageContent,
      }),
    });

    if (!messageResponse.ok) {
      throw new Error('Failed to add message to thread');
    }

    // ============================================
    // RUN ASSISTANT
    // ============================================
    const assistantId = await getOrCreateAssistant();

    const runResponse = await fetch(`https://api.openai.com/v1/threads/${threadId}/runs`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
        'OpenAI-Beta': 'assistants=v2',
      },
      body: JSON.stringify({
        assistant_id: assistantId,
      }),
    });

    if (!runResponse.ok) {
      throw new Error('Failed to run assistant');
    }

    const runData = await runResponse.json();
    const runId = runData.id;

    // Poll for completion
    let runStatus = 'queued';
    let attempts = 0;
    const maxAttempts = 30; // 30 seconds max

    while (runStatus !== 'completed' && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second

      const statusResponse = await fetch(`https://api.openai.com/v1/threads/${threadId}/runs/${runId}`, {
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'OpenAI-Beta': 'assistants=v2',
        },
      });

      const statusData = await statusResponse.json();
      runStatus = statusData.status;

      if (runStatus === 'failed' || runStatus === 'cancelled' || runStatus === 'expired') {
        throw new Error(`Run failed with status: ${runStatus}`);
      }

      attempts++;
    }

    if (runStatus !== 'completed') {
      throw new Error('Run timed out');
    }

    // ============================================
    // GET RESPONSE
    // ============================================
    const messagesResponse = await fetch(`https://api.openai.com/v1/threads/${threadId}/messages?limit=1&order=desc`, {
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'OpenAI-Beta': 'assistants=v2',
      },
    });

    if (!messagesResponse.ok) {
      throw new Error('Failed to get messages');
    }

    const messagesData = await messagesResponse.json();
    const lastMessage = messagesData.data[0];

    // Extract text content
    const textContent = lastMessage.content.find((c: any) => c.type === 'text');
    if (!textContent) {
      throw new Error('No text response from assistant');
    }

    const result = JSON.parse(textContent.text.value);

    // Validate response has required fields
    if (!result.name || typeof result.calories !== 'number') {
      throw new Error('Invalid response from OpenAI');
    }

    // ============================================
    // LOG API USAGE FOR ANALYTICS
    // ============================================
    await supabaseAdmin.rpc('log_api_usage', {
      user_uuid: user.id,
      action: 'food_analysis',
      was_success: true,
      error_msg: null,
    });

    return new Response(
      JSON.stringify({
        name: result.name,
        calories: result.calories,
        protein: result.protein || 0,
      }),
      {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  } catch (error) {
    console.error('Food analysis error:', error);

    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Failed to analyze food',
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
