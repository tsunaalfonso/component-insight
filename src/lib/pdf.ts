import { jsPDF } from "jspdf";
import QRCode from "qrcode";

export interface DiagnosisRecord {
  id: string;
  component_name: string | null;
  package_type: string | null;
  manufacturer: string | null;
  visible_damage: string[] | null;
  severity: string | null;
  possible_cause: string | null;
  confidence: number | null;
  summary: string | null;
  recommendation: string | null;
  repairability: string | null;
  status: string;
  created_at: string;
}

export async function generateDiagnosisPdf(d: DiagnosisRecord, opts: { technician: string; imageDataUrl?: string; verifyUrl: string }): Promise<Blob> {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const M = 40;
  let y = M;

  // Header band
  doc.setFillColor(30, 99, 214);
  doc.rect(0, 0, W, 60, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("SMART MULTI-TESTER · AI IC DIAGNOSIS", M, 38);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(`Report ID: ${d.id}`, W - M, 38, { align: "right" });

  y = 90;
  doc.setTextColor(20, 24, 40);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Diagnosis Report", M, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  y += 14;
  doc.text(`Date: ${new Date(d.created_at).toLocaleString()}`, M, y);
  y += 12;
  doc.text(`Technician: ${opts.technician}`, M, y);
  y += 12;
  doc.text(`Status: ${(d.status || "").toUpperCase()}   ·   Confidence: ${d.confidence ?? "?"}%`, M, y);
  y += 18;

  if (opts.imageDataUrl) {
    try {
      doc.addImage(opts.imageDataUrl, "JPEG", M, y, 220, 165);
    } catch { /* ignore image errors */ }
  }

  const rightX = M + 240;
  let ry = y;
  const lineRight = (label: string, value: string) => {
    doc.setFont("helvetica", "bold"); doc.text(label, rightX, ry);
    doc.setFont("helvetica", "normal");
    const split = doc.splitTextToSize(value || "—", W - rightX - M);
    doc.text(split, rightX + 90, ry);
    ry += 12 * Math.max(1, split.length);
  };
  lineRight("Component:", d.component_name || "Unknown");
  lineRight("Package:", d.package_type || "—");
  lineRight("Manufacturer:", d.manufacturer || "—");
  lineRight("Severity:", d.severity || "—");
  lineRight("Repairability:", d.repairability || "—");

  y = Math.max(y + 175, ry + 8);

  const section = (title: string, body: string) => {
    doc.setFont("helvetica", "bold"); doc.setFontSize(10);
    doc.text(title, M, y); y += 12;
    doc.setFont("helvetica", "normal"); doc.setFontSize(9);
    const wrapped = doc.splitTextToSize(body || "—", W - 2 * M);
    doc.text(wrapped, M, y);
    y += wrapped.length * 11 + 8;
  };

  section("Summary", d.summary || "—");
  section("Visible Damage", (d.visible_damage || []).join(", ") || "None detected");
  section("Possible Cause", d.possible_cause || "—");
  section("Recommendation", d.recommendation || "—");

  // QR code
  try {
    const qrDataUrl = await QRCode.toDataURL(opts.verifyUrl, { margin: 0, width: 120 });
    doc.addImage(qrDataUrl, "PNG", W - M - 80, doc.internal.pageSize.getHeight() - 120, 80, 80);
    doc.setFontSize(8);
    doc.text("Scan to verify", W - M - 80, doc.internal.pageSize.getHeight() - 30);
  } catch { /* skip */ }

  return doc.output("blob");
}
