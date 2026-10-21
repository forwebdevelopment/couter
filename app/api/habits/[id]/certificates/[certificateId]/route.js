
import pool from "../../../../../lib/db";
import PDFDocument from "pdfkit";

const certificateThemes = {
  Bronze: {
    primary: "#92551D",
    secondary: "#C58B52",
    background: "#FFF8EF",
    panel: "#F5E5D1",
    label: "BRONZE ACHIEVEMENT",
  },
  Silver: {
    primary: "#596675",
    secondary: "#B8C1CB",
    background: "#F7F9FC",
    panel: "#E7ECF1",
    label: "SILVER ACHIEVEMENT",
  },
  Gold: {
    primary: "#946900",
    secondary: "#E2B83F",
    background: "#FFFBEB",
    panel: "#F8EDC8",
    label: "GOLD ACHIEVEMENT",
  },
  Platinum: {
    primary: "#174777",
    secondary: "#83B7EB",
    background: "#F2F8FF",
    panel: "#DCEBFA",
    label: "PLATINUM ACHIEVEMENT",
  },
};

export async function GET(request, { params }) {
  try {
    const { id, certificateId } = await params;

    const result = await pool.query(
      `SELECT
         hc.id AS certificate_id,
         hc.milestone_percent,
         hc.certificate_level,
         hc.best_streak_at_award,
         hc.earned_at,
         h.id AS habit_id,
         h.name AS habit_name,
         h.total_task_goal
       FROM habit_maker.habit_certificates hc
       INNER JOIN habit_maker.habits h
         ON h.id = hc.habit_id
       WHERE hc.id = $1
         AND hc.habit_id = $2`,
      [certificateId, id]
    );

    if (result.rows.length === 0) {
      return Response.json(
        { error: "Certificate not found for this habit." },
        { status: 404 }
      );
    }

    const certificate = result.rows[0];

    const level =
      certificate.certificate_level?.toLowerCase();

    const normalizedLevel = {
      bronze: "Bronze",
      silver: "Silver",
      gold: "Gold",
      platinum: "Platinum",
    }[level];

    if (!normalizedLevel) {
      return Response.json(
        { error: "Invalid certificate level." },
        { status: 400 }
      );
    }

    const theme = certificateThemes[normalizedLevel];

    const pdfBuffer = await new Promise((resolve, reject) => {
      const doc = new PDFDocument({
        size: "A4",
        layout: "landscape",
        margin: 45,
      });

      const chunks = [];

      doc.on("data", (chunk) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      const width = doc.page.width;
      const height = doc.page.height;
      const centerX = width / 2;

      // Background
      doc.rect(0, 0, width, height).fill(theme.background);

      // Outer and inner borders
      doc
        .lineWidth(8)
        .strokeColor(theme.primary)
        .rect(19, 19, width - 38, height - 38)
        .stroke();

      doc
        .lineWidth(2)
        .strokeColor(theme.secondary)
        .rect(31, 31, width - 62, height - 62)
        .stroke();

      // Decorative corner ornaments
      const corners = [
        [47, 47, 1, 1],
        [width - 47, 47, -1, 1],
        [47, height - 47, 1, -1],
        [width - 47, height - 47, -1, -1],
      ];

      for (const [x, y, dx, dy] of corners) {
        doc
          .lineWidth(2)
          .strokeColor(theme.secondary)
          .moveTo(x, y + dy * 22)
          .lineTo(x, y)
          .lineTo(x + dx * 22, y)
          .stroke();
      }

      // Brand
      doc
        .fillColor(theme.primary)
        .font("Helvetica-Bold")
        .fontSize(14)
        .text("H A B I T   M A K E R", 50, 52, {
          align: "center",
          width: width - 100,
        });

      // Medal emblem
      doc
        .circle(centerX, 105, 23)
        .fill(theme.panel);

      doc
        .circle(centerX, 105, 19)
        .lineWidth(2)
        .strokeColor(theme.primary)
        .stroke();

      doc
        .fillColor(theme.primary)
        .font("Helvetica-Bold")
        .fontSize(19)
        .text(
          normalizedLevel === "Platinum"
            ? "P"
            : normalizedLevel === "Gold"
              ? "G"
              : normalizedLevel === "Silver"
                ? "S"
                : "B",
          centerX - 12,
          94,
          { width: 24, align: "center" }
        );

      // Certificate title
      doc
        .fillColor(theme.primary)
        .font("Helvetica-Bold")
        .fontSize(28)
        .text("CERTIFICATE OF ACHIEVEMENT", 55, 137, {
          align: "center",
          width: width - 110,
        });

      doc
        .fillColor(theme.secondary)
        .font("Helvetica-Bold")
        .fontSize(12)
        .text(theme.label, 55, 174, {
          align: "center",
          width: width - 110,
          characterSpacing: 2,
        });

      doc
        .fillColor("#374151")
        .font("Helvetica")
        .fontSize(13)
        .text(
          "This certificate is proudly awarded for dedication to",
          60,
          207,
          { align: "center", width: width - 120 }
        );

      // Habit name panel
      doc
        .roundedRect(95, 235, width - 190, 55, 8)
        .fill(theme.panel);

      doc
        .fillColor(theme.primary)
        .font("Helvetica-Bold")
        .fontSize(certificate.habit_name?.length > 35 ? 19 : 24)
        .text(certificate.habit_name || "Habit Achievement", 110, 251, {
          align: "center",
          width: width - 220,
          height: 30,
          ellipsis: true,
        });

      // Milestone
      doc
        .fillColor(theme.primary)
        .font("Helvetica-Bold")
        .fontSize(20)
        .text(
          `${certificate.milestone_percent}% MILESTONE`,
          60,
          310,
          { align: "center", width: width - 120 }
        );

      // Details
      doc
        .fillColor("#374151")
        .font("Helvetica")
        .fontSize(12)
        .text(
          `Achievement level: ${normalizedLevel}`,
          60,
          341,
          { align: "center", width: width - 120 }
        );

      doc.text(
        `Best streak at award: ${certificate.best_streak_at_award} scheduled days`,
        60,
        361,
        { align: "center", width: width - 120 }
      );

      if (certificate.total_task_goal != null) {
        doc.text(
          `Habit goal: ${certificate.total_task_goal} days`,
          60,
          381,
          { align: "center", width: width - 120 }
        );
      }

      const earnedDate = new Intl.DateTimeFormat("en-IN", {
        day: "2-digit",
        month: "long",
        year: "numeric",
        timeZone: "Asia/Kolkata",
      }).format(new Date(certificate.earned_at));

      doc
        .fillColor(theme.primary)
        .font("Helvetica-Bold")
        .fontSize(11)
        .text(`AWARDED ON  ${earnedDate}`, 60, 405, {
          align: "center",
          width: width - 120,
        });

      // Footer divider
      doc
        .moveTo(width * 0.35, 433)
        .lineTo(width * 0.65, 433)
        .lineWidth(1.5)
        .strokeColor(theme.secondary)
        .stroke();

      doc
        .fillColor(theme.primary)
        .font("Helvetica-Bold")
        .fontSize(12)
        .text("KEEP BUILDING GREAT HABITS!", 60, 444, {
          align: "center",
          width: width - 120,
        });

      doc.end();
    });

    return new Response(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition":
          `attachment; filename="habit-certificate-${normalizedLevel.toLowerCase()}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Certificate PDF error:", error);

    return Response.json(
      { error: "Unable to generate certificate PDF." },
      { status: 500 }
    );
  }
}
