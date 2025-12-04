import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { AlertTriangle, Clock, Stethoscope, ClipboardList, CheckCircle2 } from "lucide-react";
import type { SOAPNote } from "../../../drizzle/schema";

interface SOAPNoteViewerV2Props {
  soapNote: SOAPNote;
}

export function SOAPNoteViewerV2({ soapNote }: SOAPNoteViewerV2Props) {
  const urgencyColors = {
    high: "destructive",
    medium: "default",
    low: "secondary",
  } as const;

  const urgencyLabels = {
    high: "Alta Urgência",
    medium: "Urgência Moderada",
    low: "Baixa Urgência",
  };

  return (
    <div className="space-y-6">
      {/* Header with Urgency */}
      {soapNote.urgency && (
        <Card className="border-l-4" style={{
          borderLeftColor: soapNote.urgency === 'high' ? 'hsl(var(--destructive))' : 
                          soapNote.urgency === 'medium' ? 'hsl(var(--primary))' : 
                          'hsl(var(--muted))'
        }}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Urgência do Tratamento</p>
                  <p className="text-xs text-muted-foreground">Classificação baseada na análise clínica</p>
                </div>
              </div>
              <Badge variant={urgencyColors[soapNote.urgency as keyof typeof urgencyColors]}>
                {urgencyLabels[soapNote.urgency as keyof typeof urgencyLabels]}
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Red Flags */}
      {soapNote.assessment?.red_flags && soapNote.assessment.red_flags.length > 0 && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Sinais de Alerta
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {soapNote.assessment.red_flags.map((flag: string, index: number) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="text-destructive mt-0.5">•</span>
                  <span className="text-sm">{flag}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* SOAP Sections */}
      <div className="grid gap-6">
        {/* Subjective */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Stethoscope className="h-5 w-5 text-primary" />
              Subjetivo (S)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {soapNote.subjective.queixa_principal && (
              <div>
                <h4 className="text-sm font-semibold text-muted-foreground mb-2">Queixa Principal</h4>
                <p className="text-sm leading-relaxed">{soapNote.subjective.queixa_principal}</p>
              </div>
            )}
            
            {soapNote.subjective.historia_doenca_atual && (
              <>
                <Separator />
                <div>
                  <h4 className="text-sm font-semibold text-muted-foreground mb-2">História da Doença Atual</h4>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">
                    {soapNote.subjective.historia_doenca_atual}
                  </p>
                </div>
              </>
            )}
            
            {soapNote.subjective.historico_medico && soapNote.subjective.historico_medico.length > 0 && (
              <>
                <Separator />
                <div>
                  <h4 className="text-sm font-semibold text-muted-foreground mb-2">Histórico Médico</h4>
                  <ul className="text-sm space-y-1">
                    {soapNote.subjective.historico_medico.map((item, i) => (
                      <li key={i}>• {item}</li>
                    ))}
                  </ul>
                </div>
              </>
            )}
            
            {soapNote.subjective.medicacoes && soapNote.subjective.medicacoes.length > 0 && (
              <>
                <Separator />
                <div>
                  <h4 className="text-sm font-semibold text-muted-foreground mb-2">Medicações em Uso</h4>
                  <ul className="text-sm space-y-2">
                    {soapNote.subjective.medicacoes.map((med, i) => (
                      <li key={i}>
                        <strong>{med.nome}</strong> - {med.dose}, {med.frequencia}
                      </li>
                    ))}
                  </ul>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Objective */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <CheckCircle2 className="h-5 w-5 text-primary" />
              Objetivo (O)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {soapNote.objective.exame_clinico_geral && (
                <div>
                  <h4 className="text-sm font-semibold text-muted-foreground mb-2">Exame Clínico Geral</h4>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">
                    {soapNote.objective.exame_clinico_geral}
                  </p>
                </div>
              )}
              
              {soapNote.objective.exame_clinico_especifico && soapNote.objective.exame_clinico_especifico.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <h4 className="text-sm font-semibold text-muted-foreground mb-2">Exame Clínico Específico</h4>
                    <ul className="text-sm space-y-1">
                      {soapNote.objective.exame_clinico_especifico.map((item, i) => (
                        <li key={i}>• {item}</li>
                      ))}
                    </ul>
                  </div>
                </>
              )}
              
              {soapNote.objective.dentes_afetados && soapNote.objective.dentes_afetados.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <h4 className="text-sm font-semibold text-muted-foreground mb-2">Dentes Afetados</h4>
                    <p className="text-sm">{soapNote.objective.dentes_afetados.join(", ")}</p>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Assessment */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <ClipboardList className="h-5 w-5 text-primary" />
              Avaliação (A)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div>
              <h4 className="text-sm font-semibold text-muted-foreground mb-2">Diagnósticos</h4>
              <ul className="text-sm space-y-1">
                {soapNote.assessment.diagnosticos.map((diag, i) => (
                  <li key={i}>• {diag}</li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Plan */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <ClipboardList className="h-5 w-5 text-primary" />
              Plano (P)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {soapNote.plan.tratamentos && soapNote.plan.tratamentos.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-muted-foreground mb-2">Tratamentos Propostos</h4>
                  <div className="space-y-2">
                    {soapNote.plan.tratamentos.map((trat, i) => (
                      <div key={i} className="flex items-start gap-2 text-sm">
                        <Badge variant={trat.urgencia === 'alta' ? 'destructive' : trat.urgencia === 'media' ? 'default' : 'secondary'} className="mt-0.5">
                          {trat.urgencia}
                        </Badge>
                        <div>
                          <p className="font-medium">{trat.procedimento}</p>
                          <p className="text-muted-foreground text-xs">Dente: {trat.dente}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {soapNote.plan.orientacoes && soapNote.plan.orientacoes.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <h4 className="text-sm font-semibold text-muted-foreground mb-2">Orientações ao Paciente</h4>
                    <ul className="text-sm space-y-1">
                      {soapNote.plan.orientacoes.map((or, i) => (
                        <li key={i}>• {or}</li>
                      ))}
                    </ul>
                  </div>
                </>
              )}
              
              {soapNote.plan.lembretes_clinicos && soapNote.plan.lembretes_clinicos.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <h4 className="text-sm font-semibold text-muted-foreground mb-2">Lembretes Clínicos</h4>
                    <ul className="text-sm space-y-1">
                      {soapNote.plan.lembretes_clinicos.map((lem, i) => (
                        <li key={i}>• {lem}</li>
                      ))}
                    </ul>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
