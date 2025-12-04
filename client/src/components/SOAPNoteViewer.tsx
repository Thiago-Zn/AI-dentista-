import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import { AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import { SOAPNote } from "../../../drizzle/schema";

interface SOAPNoteViewerProps {
  soapNote: SOAPNote;
}

export function SOAPNoteViewer({ soapNote }: SOAPNoteViewerProps) {
  const getUrgencyColor = (urgency: "alta" | "media" | "baixa") => {
    switch (urgency) {
      case "alta":
        return "destructive";
      case "media":
        return "default";
      case "baixa":
        return "secondary";
    }
  };

  const getUrgencyIcon = (urgency: "alta" | "media" | "baixa") => {
    switch (urgency) {
      case "alta":
        return <AlertTriangle className="h-4 w-4" />;
      case "media":
        return <Clock className="h-4 w-4" />;
      case "baixa":
        return <CheckCircle2 className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Red Flags Alert */}
      {soapNote.assessment.red_flags.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-5 w-5" />
          <AlertTitle className="text-lg font-bold">Atenção - Sinais de Alerta</AlertTitle>
          <AlertDescription>
            <ul className="mt-2 space-y-1">
              {soapNote.assessment.red_flags.map((flag, index) => (
                <li key={index} className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>{flag}</span>
                </li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Subjective Section */}
      <Card>
        <CardHeader>
          <CardTitle>Subjetivo (S)</CardTitle>
          <CardDescription>Informações relatadas pelo paciente</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-semibold text-sm text-muted-foreground mb-1">Queixa Principal</h4>
            <p className="text-foreground">{soapNote.subjective.queixa_principal}</p>
          </div>

          <div>
            <h4 className="font-semibold text-sm text-muted-foreground mb-1">História da Doença Atual</h4>
            <p className="text-foreground">{soapNote.subjective.historia_doenca_atual}</p>
          </div>

          {soapNote.subjective.historico_medico.length > 0 && (
            <div>
              <h4 className="font-semibold text-sm text-muted-foreground mb-1">Histórico Médico</h4>
              <ul className="list-disc list-inside space-y-1">
                {soapNote.subjective.historico_medico.map((item, index) => (
                  <li key={index} className="text-foreground">{item}</li>
                ))}
              </ul>
            </div>
          )}

          {soapNote.subjective.medicacoes.length > 0 && (
            <div>
              <h4 className="font-semibold text-sm text-muted-foreground mb-1">Medicações em Uso</h4>
              <ul className="space-y-2">
                {soapNote.subjective.medicacoes.map((med, index) => (
                  <li key={index} className="text-foreground">
                    <span className="font-medium">{med.nome}</span> - {med.dose}, {med.frequencia}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Objective Section */}
      <Card>
        <CardHeader>
          <CardTitle>Objetivo (O)</CardTitle>
          <CardDescription>Achados clínicos observados</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-semibold text-sm text-muted-foreground mb-1">Exame Clínico Geral</h4>
            <p className="text-foreground">{soapNote.objective.exame_clinico_geral}</p>
          </div>

          {soapNote.objective.exame_clinico_especifico.length > 0 && (
            <div>
              <h4 className="font-semibold text-sm text-muted-foreground mb-1">Exame Clínico Específico</h4>
              <ul className="list-disc list-inside space-y-1">
                {soapNote.objective.exame_clinico_especifico.map((item, index) => (
                  <li key={index} className="text-foreground">{item}</li>
                ))}
              </ul>
            </div>
          )}

          {soapNote.objective.dentes_afetados.length > 0 && (
            <div>
              <h4 className="font-semibold text-sm text-muted-foreground mb-1">Dentes Afetados</h4>
              <div className="flex flex-wrap gap-2">
                {soapNote.objective.dentes_afetados.map((dente, index) => (
                  <Badge key={index} variant="outline">Dente {dente}</Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Assessment Section */}
      <Card>
        <CardHeader>
          <CardTitle>Avaliação (A)</CardTitle>
          <CardDescription>Diagnóstico e análise clínica</CardDescription>
        </CardHeader>
        <CardContent>
          <div>
            <h4 className="font-semibold text-sm text-muted-foreground mb-2">Diagnósticos</h4>
            <ul className="space-y-2">
              {soapNote.assessment.diagnosticos.map((diag, index) => (
                <li key={index} className="flex items-start">
                  <span className="mr-2 text-primary font-bold">{index + 1}.</span>
                  <span className="text-foreground">{diag}</span>
                </li>
              ))}
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Plan Section */}
      <Card>
        <CardHeader>
          <CardTitle>Plano (P)</CardTitle>
          <CardDescription>Tratamento proposto e orientações</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-semibold text-sm text-muted-foreground mb-3">Tratamentos Propostos</h4>
            <div className="space-y-3">
              {soapNote.plan.tratamentos.map((trat, index) => (
                <div key={index} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                  <Badge variant={getUrgencyColor(trat.urgencia)} className="mt-0.5">
                    <span className="flex items-center gap-1">
                      {getUrgencyIcon(trat.urgencia)}
                      {trat.urgencia.toUpperCase()}
                    </span>
                  </Badge>
                  <div className="flex-1">
                    <p className="text-foreground font-medium">{trat.procedimento}</p>
                    <p className="text-sm text-muted-foreground">Dente {trat.dente}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {soapNote.plan.orientacoes.length > 0 && (
            <div>
              <h4 className="font-semibold text-sm text-muted-foreground mb-2">Orientações ao Paciente</h4>
              <ul className="list-disc list-inside space-y-1">
                {soapNote.plan.orientacoes.map((orient, index) => (
                  <li key={index} className="text-foreground">{orient}</li>
                ))}
              </ul>
            </div>
          )}

          {soapNote.plan.lembretes_clinicos.length > 0 && (
            <div>
              <h4 className="font-semibold text-sm text-muted-foreground mb-2">Lembretes Clínicos</h4>
              <div className="space-y-2">
                {soapNote.plan.lembretes_clinicos.map((lembrete, index) => (
                  <Alert key={index}>
                    <AlertDescription className="text-sm">{lembrete}</AlertDescription>
                  </Alert>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
