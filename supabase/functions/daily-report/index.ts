// Supabase Edge Function - Günlük Görev Raporu
// Her gün belirli saatte çalışarak Genel Müdür'e mail gönderir

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const GM_EMAIL = Deno.env.get("GM_EMAIL") || "gm@fikretpetrol.com";

interface TaskAssignment {
  id: string;
  assigned_date: string;
  status: string;
  result: string | null;
  submitted_at: string | null;
  completed_at: string | null;
  tasks: {
    title: string;
    department: string;
  };
  staff: {
    full_name: string;
  } | null;
  supervisor: {
    full_name: string;
  } | null;
}

serve(async (req) => {
  try {
    // CORS headers
    if (req.method === "OPTIONS") {
      return new Response("ok", {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
        },
      });
    }

    // Supabase client oluştur
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Bugünün tarihini al
    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];
    
    // Dünün tarihini al (rapor için)
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split("T")[0];

    // Bugün atanan görevleri çek
    const { data: assignments, error } = await supabase
      .from("task_assignments")
      .select(`
        id,
        assigned_date,
        status,
        result,
        submitted_at,
        completed_at,
        tasks(title, department),
        staff:users!task_assignments_forwarded_to_fkey(full_name),
        supervisor:users!task_assignments_assigned_to_fkey(full_name)
      `)
      .eq("assigned_date", todayStr);

    if (error) throw error;

    // İstatistikleri hesapla
    const totalTasks = assignments?.length || 0;
    const completedTasks = assignments?.filter(
      (a: TaskAssignment) => a.status === "completed"
    ) || [];
    const pendingTasks = assignments?.filter(
      (a: TaskAssignment) => a.status !== "completed"
    ) || [];
    const sameDayCompleted = completedTasks.filter((a: TaskAssignment) => {
      if (!a.submitted_at) return false;
      const assignedDate = new Date(a.assigned_date).toDateString();
      const submittedDate = new Date(a.submitted_at).toDateString();
      return assignedDate === submittedDate;
    });
    const delayedTasks = completedTasks.filter((a: TaskAssignment) => {
      if (!a.submitted_at) return false;
      const assignedDate = new Date(a.assigned_date);
      const submittedDate = new Date(a.submitted_at);
      const delayDays = Math.floor(
        (submittedDate.getTime() - assignedDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      return delayDays > 0;
    });
    const positiveResults = completedTasks.filter(
      (a: TaskAssignment) => a.result === "olumlu"
    );
    const negativeResults = completedTasks.filter(
      (a: TaskAssignment) => a.result === "olumsuz"
    );

    // Tamamlanmayan görevlerin listesi
    const pendingTasksList = pendingTasks
      .map((a: TaskAssignment) => {
        const staffName = a.staff?.full_name || "Atanmadı";
        const department = a.tasks?.department || "Bilinmiyor";
        return `• ${a.tasks?.title} (${staffName}) - ${department}`;
      })
      .join("\n");

    // Gecikmeli görevlerin listesi
    const delayedTasksList = delayedTasks
      .map((a: TaskAssignment) => {
        const staffName = a.staff?.full_name || "Atanmadı";
        const assignedDate = new Date(a.assigned_date);
        const submittedDate = new Date(a.submitted_at!);
        const delayDays = Math.floor(
          (submittedDate.getTime() - assignedDate.getTime()) / (1000 * 60 * 60 * 24)
        );
        return `• ${a.tasks?.title} (${staffName}) - ${delayDays} gün gecikme`;
      })
      .join("\n");

    // Tarih formatı
    const formattedDate = today.toLocaleDateString("tr-TR", {
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric",
    });

    // HTML Email içeriği
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #1a1a2e; color: #eaeaea; margin: 0; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background-color: #16213e; border-radius: 12px; overflow: hidden; }
    .header { background: linear-gradient(135deg, #0f3460 0%, #1a1a2e 100%); padding: 30px; text-align: center; }
    .header img { max-height: 60px; }
    .header h1 { color: #00d4aa; margin: 15px 0 5px; font-size: 24px; }
    .header p { color: #888; margin: 0; font-size: 14px; }
    .content { padding: 30px; }
    .stats { display: flex; flex-wrap: wrap; gap: 15px; margin-bottom: 25px; }
    .stat-box { flex: 1; min-width: 120px; background: #1a1a2e; border-radius: 8px; padding: 15px; text-align: center; }
    .stat-number { font-size: 32px; font-weight: bold; }
    .stat-label { font-size: 12px; color: #888; margin-top: 5px; }
    .stat-green { color: #00d4aa; }
    .stat-orange { color: #ff9800; }
    .stat-red { color: #f44336; }
    .stat-blue { color: #2196f3; }
    .section { margin-top: 25px; }
    .section-title { font-size: 16px; font-weight: bold; color: #00d4aa; margin-bottom: 10px; border-bottom: 1px solid #333; padding-bottom: 8px; }
    .task-list { background: #1a1a2e; border-radius: 8px; padding: 15px; font-size: 14px; line-height: 1.8; }
    .task-list.empty { color: #888; text-align: center; }
    .footer { background: #0f3460; padding: 20px; text-align: center; font-size: 12px; color: #666; }
    .badge { display: inline-block; padding: 3px 8px; border-radius: 4px; font-size: 11px; font-weight: bold; }
    .badge-success { background: #00d4aa22; color: #00d4aa; }
    .badge-warning { background: #ff980022; color: #ff9800; }
    .badge-danger { background: #f4433622; color: #f44336; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📋 Günlük Görev Raporu</h1>
      <p>${formattedDate}</p>
    </div>
    
    <div class="content">
      <div class="stats">
        <div class="stat-box">
          <div class="stat-number stat-blue">${totalTasks}</div>
          <div class="stat-label">Toplam Görev</div>
        </div>
        <div class="stat-box">
          <div class="stat-number stat-green">${completedTasks.length}</div>
          <div class="stat-label">Tamamlanan</div>
        </div>
        <div class="stat-box">
          <div class="stat-number stat-orange">${pendingTasks.length}</div>
          <div class="stat-label">Bekleyen</div>
        </div>
        <div class="stat-box">
          <div class="stat-number stat-red">${delayedTasks.length}</div>
          <div class="stat-label">Gecikmeli</div>
        </div>
      </div>

      <div class="stats">
        <div class="stat-box">
          <div class="stat-number stat-green">${sameDayCompleted.length}</div>
          <div class="stat-label">Aynı Gün Yapılan</div>
        </div>
        <div class="stat-box">
          <div class="stat-number stat-green">${positiveResults.length}</div>
          <div class="stat-label">Olumlu Sonuç</div>
        </div>
        <div class="stat-box">
          <div class="stat-number stat-red">${negativeResults.length}</div>
          <div class="stat-label">Olumsuz Sonuç</div>
        </div>
      </div>

      ${
        pendingTasks.length > 0
          ? `
      <div class="section">
        <div class="section-title">⚠️ Tamamlanmayan Görevler (${pendingTasks.length})</div>
        <div class="task-list">
          ${pendingTasks
            .map(
              (a: TaskAssignment) => `
            <div style="margin-bottom: 8px;">
              <strong>${a.tasks?.title}</strong><br>
              <span style="color: #888;">👤 ${a.staff?.full_name || "Atanmadı"} • 📁 ${a.tasks?.department}</span>
            </div>
          `
            )
            .join("")}
        </div>
      </div>
      `
          : ""
      }

      ${
        delayedTasks.length > 0
          ? `
      <div class="section">
        <div class="section-title">🕐 Gecikmeli Tamamlanan Görevler (${delayedTasks.length})</div>
        <div class="task-list">
          ${delayedTasks
            .map((a: TaskAssignment) => {
              const delayDays = Math.floor(
                (new Date(a.submitted_at!).getTime() - new Date(a.assigned_date).getTime()) /
                  (1000 * 60 * 60 * 24)
              );
              return `
            <div style="margin-bottom: 8px;">
              <strong>${a.tasks?.title}</strong> <span class="badge badge-warning">${delayDays} gün gecikme</span><br>
              <span style="color: #888;">👤 ${a.staff?.full_name || "Atanmadı"}</span>
            </div>
          `;
            })
            .join("")}
        </div>
      </div>
      `
          : ""
      }

      ${
        pendingTasks.length === 0 && delayedTasks.length === 0
          ? `
      <div class="section">
        <div class="task-list empty">
          ✅ Tüm görevler zamanında tamamlandı!
        </div>
      </div>
      `
          : ""
      }
    </div>

    <div class="footer">
      Fikret Petrol Görev Takip Sistemi<br>
      Bu mail otomatik olarak gönderilmiştir.
    </div>
  </div>
</body>
</html>
    `;

    // Düz metin versiyonu
    const textContent = `
📋 GÜNLÜK GÖREV RAPORU
${formattedDate}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 ÖZET
• Toplam Görev: ${totalTasks}
• Tamamlanan: ${completedTasks.length}
• Bekleyen: ${pendingTasks.length}
• Gecikmeli: ${delayedTasks.length}
• Aynı Gün Yapılan: ${sameDayCompleted.length}
• Olumlu Sonuç: ${positiveResults.length}
• Olumsuz Sonuç: ${negativeResults.length}

${
  pendingTasks.length > 0
    ? `
⚠️ TAMAMLANMAYAN GÖREVLER (${pendingTasks.length})
${pendingTasksList}
`
    : ""
}

${
  delayedTasks.length > 0
    ? `
🕐 GECİKMELİ GÖREVLER (${delayedTasks.length})
${delayedTasksList}
`
    : ""
}

${pendingTasks.length === 0 && delayedTasks.length === 0 ? "✅ Tüm görevler zamanında tamamlandı!" : ""}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Fikret Petrol Görev Takip Sistemi
    `;

    // Resend ile mail gönder
    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Fikret Petrol <noreply@fikretpetrol.com>",
        to: [GM_EMAIL],
        subject: `📋 Günlük Görev Raporu - ${formattedDate}`,
        html: htmlContent,
        text: textContent,
      }),
    });

    const emailResult = await emailResponse.json();

    if (!emailResponse.ok) {
      throw new Error(`Email gönderilemedi: ${JSON.stringify(emailResult)}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Günlük rapor başarıyla gönderildi",
        stats: {
          total: totalTasks,
          completed: completedTasks.length,
          pending: pendingTasks.length,
          delayed: delayedTasks.length,
          sameDayCompleted: sameDayCompleted.length,
        },
        emailId: emailResult.id,
      }),
      {
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  }
});

