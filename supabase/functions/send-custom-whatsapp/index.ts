import "jsr:@supabase/functions-js/edge-runtime.d.ts"

import { createClient } from "@supabase/supabase-js"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { studentId, parentPhone, messageText } = await req.json()

    if (!parentPhone || !messageText) {
      return new Response(JSON.stringify({ error: 'parentPhone and messageText are required' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    const whatsappToken = Deno.env.get('WHATSAPP_TOKEN') || ''
    const whatsappPhoneId = Deno.env.get('WHATSAPP_PHONE_ID') || ''

    if (whatsappToken && whatsappPhoneId) {
      const waResponse = await fetch(`https://graph.facebook.com/v18.0/${whatsappPhoneId}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${whatsappToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: parentPhone,
          type: 'text',
          text: { body: messageText }
        })
      })

      const waData = await waResponse.json()
      if (!waResponse.ok) {
        return new Response(JSON.stringify({ error: waData.error?.message || 'Failed to send WhatsApp custom message' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        })
      }

      return new Response(JSON.stringify({ success: true, provider_message_id: waData.messages?.[0]?.id }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    } else {
      // Mock fallback response for development
      return new Response(JSON.stringify({
        success: true,
        provider_message_id: `MOCK_CUSTOM_${Date.now()}`,
        message: 'Message processed (WhatsApp API unconfigured; mock mode active)'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
