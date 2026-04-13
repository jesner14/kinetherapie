import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: corsHeaders });
  }

  try {
    const { booking_request_id } = await req.json();
    if (!booking_request_id) {
      return new Response(JSON.stringify({ error: "booking_request_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Service-role client to read booking + update email_sent
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Fetch the booking
    const { data: booking, error: fetchErr } = await supabase
      .from("booking_requests")
      .select("*")
      .eq("id", booking_request_id)
      .single();

    if (fetchErr || !booking) {
      return new Response(JSON.stringify({ error: "Booking not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Format assigned date for email
    let appointmentLine = "Votre rendez-vous sera confirmé prochainement.";
    if (booking.assigned_date) {
      const date = new Date(booking.assigned_date + "T00:00:00");
      const dateFR = date.toLocaleDateString("fr-FR", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      });
      const time = booking.assigned_time ? booking.assigned_time.slice(0, 5) : "";
      appointmentLine = `Votre rendez-vous est fixé le <strong>${dateFR}${time ? ` à ${time}` : ""}</strong>.`;
    }

    const patientName = `${booking.first_name} ${booking.last_name}`;

    // Send email via Resend
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      return new Response(JSON.stringify({ error: "RESEND_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const emailHtml = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #1f2937;">
        <div style="background: linear-gradient(135deg, #0d9488, #0891b2); padding: 32px 24px; border-radius: 12px 12px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 24px;">Réservation confirmée ✅</h1>
        </div>
        <div style="background: #f9fafb; padding: 32px 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
          <p style="font-size: 16px;">Bonjour <strong>${patientName}</strong>,</p>
          <p style="font-size: 15px; color: #374151;">Votre demande de réservation pour <strong>${booking.service_name}</strong> a été <strong style="color: #059669;">validée</strong>.</p>

          <div style="background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 10px; padding: 16px 20px; margin: 20px 0;">
            <p style="margin: 0; font-size: 15px; color: #065f46;">${appointmentLine}</p>
          </div>

          ${booking.service_price != null ? `
          <p style="font-size: 14px; color: #6b7280;">
            Prestation : ${booking.service_name}<br/>
            Montant payé : <strong>${Number(booking.service_price).toLocaleString("fr-FR")} FCFA</strong>
          </p>` : ""}

          <p style="font-size: 14px; color: #6b7280; margin-top: 24px;">
            En cas de question, n'hésitez pas à nous contacter.<br/>
            Merci de votre confiance.
          </p>
        </div>
      </div>
    `;

    const emailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: Deno.env.get("EMAIL_FROM") ?? "noreply@kine-excellence.fr",
        to: [booking.email],
        subject: `✅ Réservation confirmée — ${booking.service_name}`,
        html: emailHtml,
      }),
    });

    if (!emailRes.ok) {
      const errBody = await emailRes.text();
      console.error("Resend error:", errBody);
      return new Response(JSON.stringify({ error: "Email send failed", detail: errBody }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Mark email_sent = true in DB
    await supabase
      .from("booking_requests")
      .update({ email_sent: true })
      .eq("id", booking_request_id);

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
