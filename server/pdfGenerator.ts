import PDFDocument from "pdfkit";
import { SOAPNote } from "../drizzle/schema";

interface PDFGenerationOptions {
  patientName: string;
  consultationDate: Date;
  dentistName: string;
  dentistCRO?: string;
  soapNote: SOAPNote;
}

export async function generateConsultationPDF(options: PDFGenerationOptions): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: "A4", margin: 50 });
      const chunks: Buffer[] = [];

      doc.on("data", (chunk) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      // Header
      doc.fontSize(20).fillColor("#2563eb").text("DentScribe AI", { align: "center" });
      doc.fontSize(12).fillColor("#666").text("Nota de Consulta Odontológica", { align: "center" });
      doc.moveDown(1);

      // Separator line
      doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke("#e5e7eb");
      doc.moveDown(0.5);

      // Consultation Info
      doc.fontSize(10).fillColor("#333");
      doc.text(`Paciente: ${options.patientName}`, { continued: false });
      doc.text(`Data: ${options.consultationDate.toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      })}`);
      doc.text(`Dentista: ${options.dentistName}${options.dentistCRO ? ` - CRO: ${options.dentistCRO}` : ""}`);
      doc.moveDown(1.5);

      // SOAP Note Sections
      const { soapNote } = options;

      // Subjective Section
      addSection(doc, "SUBJETIVO (S)", "#2563eb");
      addSubsection(doc, "Queixa Principal", soapNote.subjective.queixa_principal);
      addSubsection(doc, "História da Doença Atual", soapNote.subjective.historia_doenca_atual);
      
      if (soapNote.subjective.historico_medico.length > 0) {
        addSubsection(doc, "Histórico Médico");
        soapNote.subjective.historico_medico.forEach((item) => {
          doc.fontSize(9).fillColor("#555").text(`• ${item}`, { indent: 20 });
        });
        doc.moveDown(0.5);
      }

      if (soapNote.subjective.medicacoes.length > 0) {
        addSubsection(doc, "Medicações em Uso");
        soapNote.subjective.medicacoes.forEach((med) => {
          doc.fontSize(9).fillColor("#555").text(
            `• ${med.nome} - ${med.dose}, ${med.frequencia}`,
            { indent: 20 }
          );
        });
        doc.moveDown(0.5);
      }

      // Objective Section
      addSection(doc, "OBJETIVO (O)", "#2563eb");
      addSubsection(doc, "Exame Clínico Geral", soapNote.objective.exame_clinico_geral);
      
      if (soapNote.objective.exame_clinico_especifico.length > 0) {
        addSubsection(doc, "Exame Clínico Específico");
        soapNote.objective.exame_clinico_especifico.forEach((item) => {
          doc.fontSize(9).fillColor("#555").text(`• ${item}`, { indent: 20 });
        });
        doc.moveDown(0.5);
      }

      if (soapNote.objective.dentes_afetados.length > 0) {
        addSubsection(doc, "Dentes Afetados");
        doc.fontSize(9).fillColor("#555").text(
          soapNote.objective.dentes_afetados.map(d => `Dente ${d}`).join(", "),
          { indent: 20 }
        );
        doc.moveDown(0.5);
      }

      // Assessment Section
      addSection(doc, "AVALIAÇÃO (A)", "#2563eb");
      addSubsection(doc, "Diagnósticos");
      soapNote.assessment.diagnosticos.forEach((diag, index) => {
        doc.fontSize(9).fillColor("#555").text(`${index + 1}. ${diag}`, { indent: 20 });
      });
      doc.moveDown(0.5);

      if (soapNote.assessment.red_flags.length > 0) {
        addSubsection(doc, "⚠ SINAIS DE ALERTA", "#ef4444");
        soapNote.assessment.red_flags.forEach((flag) => {
          doc.fontSize(9).fillColor("#dc2626").text(`• ${flag}`, { indent: 20 });
        });
        doc.moveDown(0.5);
      }

      // Plan Section
      addSection(doc, "PLANO (P)", "#2563eb");
      addSubsection(doc, "Tratamentos Propostos");
      soapNote.plan.tratamentos.forEach((trat, index) => {
        const urgenciaColor = trat.urgencia === "alta" ? "#dc2626" : trat.urgencia === "media" ? "#f59e0b" : "#10b981";
        const urgenciaText = trat.urgencia.toUpperCase();
        
        doc.fontSize(9).fillColor("#555").text(`${index + 1}. `, { continued: true, indent: 20 });
        doc.fillColor(urgenciaColor).text(`[${urgenciaText}] `, { continued: true });
        doc.fillColor("#555").text(`${trat.procedimento} - Dente ${trat.dente}`);
      });
      doc.moveDown(0.5);

      if (soapNote.plan.orientacoes.length > 0) {
        addSubsection(doc, "Orientações ao Paciente");
        soapNote.plan.orientacoes.forEach((orient) => {
          doc.fontSize(9).fillColor("#555").text(`• ${orient}`, { indent: 20 });
        });
        doc.moveDown(0.5);
      }

      if (soapNote.plan.lembretes_clinicos.length > 0) {
        addSubsection(doc, "Lembretes Clínicos");
        soapNote.plan.lembretes_clinicos.forEach((lembrete) => {
          doc.fontSize(9).fillColor("#555").text(`• ${lembrete}`, { indent: 20 });
        });
        doc.moveDown(0.5);
      }

      // Footer
      doc.moveDown(2);
      doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke("#e5e7eb");
      doc.moveDown(0.5);
      doc.fontSize(8).fillColor("#999").text(
        `Documento gerado automaticamente por DentScribe AI em ${new Date().toLocaleDateString("pt-BR")}`,
        { align: "center" }
      );

      // Signature space
      if (doc.y < 700) {
        doc.moveDown(3);
        doc.fontSize(9).fillColor("#333");
        doc.text("_".repeat(50), { align: "center" });
        doc.text(`${options.dentistName}${options.dentistCRO ? ` - CRO: ${options.dentistCRO}` : ""}`, { align: "center" });
      }

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

function addSection(doc: PDFKit.PDFDocument, title: string, color: string = "#2563eb") {
  if (doc.y > 700) {
    doc.addPage();
  }
  
  doc.fontSize(14).fillColor(color).text(title, { underline: true });
  doc.moveDown(0.5);
}

function addSubsection(doc: PDFKit.PDFDocument, title: string, content?: string, color: string = "#333") {
  if (doc.y > 720) {
    doc.addPage();
  }
  
  doc.fontSize(10).fillColor(color).font('Helvetica-Bold').text(title);
  doc.font('Helvetica');
  
  if (content) {
    doc.fontSize(9).fillColor("#555").text(content, { indent: 20 });
  }
  
  doc.moveDown(0.3);
}
