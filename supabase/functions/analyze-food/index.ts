/**
 * Supabase Edge Function: Analyze Food
 * Analyzes food from description and/or image using OpenAI GPT-4o
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');

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

    // Build messages for OpenAI
    const messages: any[] = [
      {
        role: 'system',
        content: `You are a nutrition expert. Analyze the food and return ONLY valid JSON with this exact structure:
{
  "name": "food name",
  "calories": number,
  "protein": number (in grams)
}

Be accurate with portion sizes. If multiple items, sum them up. Return realistic nutrition values.`,
      },
    ];

    // Build user message content
    const userContent: any[] = [];

    if (description) {
      userContent.push({
        type: 'text',
        text: description,
      });
    }

    if (image) {
      userContent.push({
        type: 'image_url',
        image_url: {
          url: image,
        },
      });
    }

    messages.push({
      role: 'user',
      content: userContent,
    });

    // Call OpenAI API
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages,
        response_format: { type: 'json_object' },
        temperature: 0.3,
      }),
    });

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text();
      console.error('OpenAI API error:', errorText);
      throw new Error(`OpenAI API error: ${openaiResponse.status}`);
    }

    const openaiData = await openaiResponse.json();
    const result = JSON.parse(openaiData.choices[0].message.content || '{}');

    // Validate response has required fields
    if (!result.name || typeof result.calories !== 'number') {
      throw new Error('Invalid response from OpenAI');
    }

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
