import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { AlertTriangle, Plus, X, Save, XCircle } from "lucide-react";
import { SOAPNote } from "../../../drizzle/schema";

interface SOAPNoteEditorProps {
  soapNote: SOAPNote;
  onSave: (updatedNote: SOAPNote) => void;
  onCancel: () => void;
}

export function SOAPNoteEditor({ soapNote, onSave, onCancel }: SOAPNoteEditorProps) {
  const [editedNote, setEditedNote] = useState<SOAPNote>(JSON.parse(JSON.stringify(soapNote)));

  const updateSubjective = (field: keyof SOAPNote["subjective"], value: any) => {
    setEditedNote({
      ...editedNote,
      subjective: { ...editedNote.subjective, [field]: value },
    });
  };

  const updateObjective = (field: keyof SOAPNote["objective"], value: any) => {
    setEditedNote({
      ...editedNote,
      objective: { ...editedNote.objective, [field]: value },
    });
  };

  const updateAssessment = (field: keyof SOAPNote["assessment"], value: any) => {
    setEditedNote({
      ...editedNote,
      assessment: { ...editedNote.assessment, [field]: value },
    });
  };

  const updatePlan = (field: keyof SOAPNote["plan"], value: any) => {
    setEditedNote({
      ...editedNote,
      plan: { ...editedNote.plan, [field]: value },
    });
  };

  const addMedicacao = () => {
    updateSubjective("medicacoes", [
      ...editedNote.subjective.medicacoes,
      { nome: "", dose: "", frequencia: "" },
    ]);
  };

  const removeMedicacao = (index: number) => {
    const newMedicacoes = editedNote.subjective.medicacoes.filter((_, i) => i !== index);
    updateSubjective("medicacoes", newMedicacoes);
  };

  const updateMedicacao = (index: number, field: string, value: string) => {
    const newMedicacoes = [...editedNote.subjective.medicacoes];
    newMedicacoes[index] = { ...newMedicacoes[index], [field]: value };
    updateSubjective("medicacoes", newMedicacoes);
  };

  const addTratamento = () => {
    updatePlan("tratamentos", [
      ...editedNote.plan.tratamentos,
      { procedimento: "", dente: "", urgencia: "baixa" as const },
    ]);
  };

  const removeTratamento = (index: number) => {
    const newTratamentos = editedNote.plan.tratamentos.filter((_, i) => i !== index);
    updatePlan("tratamentos", newTratamentos);
  };

  const updateTratamento = (index: number, field: string, value: any) => {
    const newTratamentos = [...editedNote.plan.tratamentos];
    newTratamentos[index] = { ...newTratamentos[index], [field]: value };
    updatePlan("tratamentos", newTratamentos);
  };

  const addToArray = (section: "subjective" | "objective" | "assessment" | "plan", field: string, value: string) => {
    if (!value.trim()) return;
    
    const currentArray = (editedNote[section] as any)[field] as string[];
    const newArray = [...currentArray, value.trim()];
    
    if (section === "subjective") updateSubjective(field as any, newArray);
    else if (section === "objective") updateObjective(field as any, newArray);
    else if (section === "assessment") updateAssessment(field as any, newArray);
    else if (section === "plan") updatePlan(field as any, newArray);
  };

  const removeFromArray = (section: "subjective" | "objective" | "assessment" | "plan", field: string, index: number) => {
    const currentArray = (editedNote[section] as any)[field] as string[];
    const newArray = currentArray.filter((_, i) => i !== index);
    
    if (section === "subjective") updateSubjective(field as any, newArray);
    else if (section === "objective") updateObjective(field as any, newArray);
    else if (section === "assessment") updateAssessment(field as any, newArray);
    else if (section === "plan") updatePlan(field as any, newArray);
  };

  return (
    <div className="space-y-6">
      {/* Action Buttons */}
      <div className="flex gap-2 justify-end sticky top-0 bg-background z-10 py-2">
        <Button variant="outline" onClick={onCancel}>
          <XCircle className="mr-2 h-4 w-4" />
          Cancelar
        </Button>
        <Button onClick={() => onSave(editedNote)}>
          <Save className="mr-2 h-4 w-4" />
          Salvar Alterações
        </Button>
      </div>

      {/* Subjective Section */}
      <Card>
        <CardHeader>
          <CardTitle>Subjetivo (S)</CardTitle>
          <CardDescription>Informações relatadas pelo paciente</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="queixa_principal">Queixa Principal</Label>
            <Textarea
              id="queixa_principal"
              value={editedNote.subjective.queixa_principal}
              onChange={(e) => updateSubjective("queixa_principal", e.target.value)}
              rows={2}
            />
          </div>

          <div>
            <Label htmlFor="historia_doenca_atual">História da Doença Atual</Label>
            <Textarea
              id="historia_doenca_atual"
              value={editedNote.subjective.historia_doenca_atual}
              onChange={(e) => updateSubjective("historia_doenca_atual", e.target.value)}
              rows={3}
            />
          </div>

          <div>
            <Label>Histórico Médico</Label>
            <div className="space-y-2">
              {editedNote.subjective.historico_medico.map((item, index) => (
                <div key={index} className="flex gap-2">
                  <Input value={item} onChange={(e) => {
                    const newHistorico = [...editedNote.subjective.historico_medico];
                    newHistorico[index] = e.target.value;
                    updateSubjective("historico_medico", newHistorico);
                  }} />
                  <Button variant="ghost" size="sm" onClick={() => removeFromArray("subjective", "historico_medico", index)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={() => {
                const value = prompt("Adicionar ao histórico médico:");
                if (value) addToArray("subjective", "historico_medico", value);
              }}>
                <Plus className="mr-2 h-4 w-4" />
                Adicionar Item
              </Button>
            </div>
          </div>

          <div>
            <Label>Medicações em Uso</Label>
            <div className="space-y-3">
              {editedNote.subjective.medicacoes.map((med, index) => (
                <div key={index} className="flex gap-2 items-start p-3 border rounded-lg">
                  <div className="flex-1 grid grid-cols-3 gap-2">
                    <Input placeholder="Nome" value={med.nome} onChange={(e) => updateMedicacao(index, "nome", e.target.value)} />
                    <Input placeholder="Dose" value={med.dose} onChange={(e) => updateMedicacao(index, "dose", e.target.value)} />
                    <Input placeholder="Frequência" value={med.frequencia} onChange={(e) => updateMedicacao(index, "frequencia", e.target.value)} />
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => removeMedicacao(index)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={addMedicacao}>
                <Plus className="mr-2 h-4 w-4" />
                Adicionar Medicação
              </Button>
            </div>
          </div>
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
            <Label htmlFor="exame_clinico_geral">Exame Clínico Geral</Label>
            <Textarea
              id="exame_clinico_geral"
              value={editedNote.objective.exame_clinico_geral}
              onChange={(e) => updateObjective("exame_clinico_geral", e.target.value)}
              rows={2}
            />
          </div>

          <div>
            <Label>Exame Clínico Específico</Label>
            <div className="space-y-2">
              {editedNote.objective.exame_clinico_especifico.map((item, index) => (
                <div key={index} className="flex gap-2">
                  <Input value={item} onChange={(e) => {
                    const newEspecifico = [...editedNote.objective.exame_clinico_especifico];
                    newEspecifico[index] = e.target.value;
                    updateObjective("exame_clinico_especifico", newEspecifico);
                  }} />
                  <Button variant="ghost" size="sm" onClick={() => removeFromArray("objective", "exame_clinico_especifico", index)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={() => {
                const value = prompt("Adicionar achado específico:");
                if (value) addToArray("objective", "exame_clinico_especifico", value);
              }}>
                <Plus className="mr-2 h-4 w-4" />
                Adicionar Achado
              </Button>
            </div>
          </div>

          <div>
            <Label>Dentes Afetados</Label>
            <div className="space-y-2">
              <div className="flex flex-wrap gap-2">
                {editedNote.objective.dentes_afetados.map((dente, index) => (
                  <Badge key={index} variant="outline" className="gap-1">
                    Dente {dente}
                    <button onClick={() => removeFromArray("objective", "dentes_afetados", index)} className="ml-1">
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
              <Button variant="outline" size="sm" onClick={() => {
                const value = prompt("Número do dente (ex: 16, 21):");
                if (value) addToArray("objective", "dentes_afetados", value);
              }}>
                <Plus className="mr-2 h-4 w-4" />
                Adicionar Dente
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Assessment Section */}
      <Card>
        <CardHeader>
          <CardTitle>Avaliação (A)</CardTitle>
          <CardDescription>Diagnóstico e análise clínica</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Diagnósticos</Label>
            <div className="space-y-2">
              {editedNote.assessment.diagnosticos.map((diag, index) => (
                <div key={index} className="flex gap-2">
                  <Input value={diag} onChange={(e) => {
                    const newDiagnosticos = [...editedNote.assessment.diagnosticos];
                    newDiagnosticos[index] = e.target.value;
                    updateAssessment("diagnosticos", newDiagnosticos);
                  }} />
                  <Button variant="ghost" size="sm" onClick={() => removeFromArray("assessment", "diagnosticos", index)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={() => {
                const value = prompt("Adicionar diagnóstico:");
                if (value) addToArray("assessment", "diagnosticos", value);
              }}>
                <Plus className="mr-2 h-4 w-4" />
                Adicionar Diagnóstico
              </Button>
            </div>
          </div>

          <div>
            <Label className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              Red Flags (Sinais de Alerta)
            </Label>
            <div className="space-y-2">
              {editedNote.assessment.red_flags.map((flag, index) => (
                <div key={index} className="flex gap-2">
                  <Input value={flag} onChange={(e) => {
                    const newFlags = [...editedNote.assessment.red_flags];
                    newFlags[index] = e.target.value;
                    updateAssessment("red_flags", newFlags);
                  }} className="border-destructive" />
                  <Button variant="ghost" size="sm" onClick={() => removeFromArray("assessment", "red_flags", index)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={() => {
                const value = prompt("Adicionar sinal de alerta:");
                if (value) addToArray("assessment", "red_flags", value);
              }}>
                <Plus className="mr-2 h-4 w-4" />
                Adicionar Red Flag
              </Button>
            </div>
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
            <Label>Tratamentos Propostos</Label>
            <div className="space-y-3">
              {editedNote.plan.tratamentos.map((trat, index) => (
                <div key={index} className="flex gap-2 items-start p-3 border rounded-lg">
                  <div className="flex-1 space-y-2">
                    <Input placeholder="Procedimento" value={trat.procedimento} onChange={(e) => updateTratamento(index, "procedimento", e.target.value)} />
                    <div className="grid grid-cols-2 gap-2">
                      <Input placeholder="Dente" value={trat.dente} onChange={(e) => updateTratamento(index, "dente", e.target.value)} />
                      <Select value={trat.urgencia} onValueChange={(value) => updateTratamento(index, "urgencia", value)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="baixa">Baixa</SelectItem>
                          <SelectItem value="media">Média</SelectItem>
                          <SelectItem value="alta">Alta</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => removeTratamento(index)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={addTratamento}>
                <Plus className="mr-2 h-4 w-4" />
                Adicionar Tratamento
              </Button>
            </div>
          </div>

          <div>
            <Label>Orientações ao Paciente</Label>
            <div className="space-y-2">
              {editedNote.plan.orientacoes.map((orient, index) => (
                <div key={index} className="flex gap-2">
                  <Input value={orient} onChange={(e) => {
                    const newOrientacoes = [...editedNote.plan.orientacoes];
                    newOrientacoes[index] = e.target.value;
                    updatePlan("orientacoes", newOrientacoes);
                  }} />
                  <Button variant="ghost" size="sm" onClick={() => removeFromArray("plan", "orientacoes", index)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={() => {
                const value = prompt("Adicionar orientação:");
                if (value) addToArray("plan", "orientacoes", value);
              }}>
                <Plus className="mr-2 h-4 w-4" />
                Adicionar Orientação
              </Button>
            </div>
          </div>

          <div>
            <Label>Lembretes Clínicos</Label>
            <div className="space-y-2">
              {editedNote.plan.lembretes_clinicos.map((lembrete, index) => (
                <div key={index} className="flex gap-2">
                  <Input value={lembrete} onChange={(e) => {
                    const newLembretes = [...editedNote.plan.lembretes_clinicos];
                    newLembretes[index] = e.target.value;
                    updatePlan("lembretes_clinicos", newLembretes);
                  }} />
                  <Button variant="ghost" size="sm" onClick={() => removeFromArray("plan", "lembretes_clinicos", index)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={() => {
                const value = prompt("Adicionar lembrete clínico:");
                if (value) addToArray("plan", "lembretes_clinicos", value);
              }}>
                <Plus className="mr-2 h-4 w-4" />
                Adicionar Lembrete
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
