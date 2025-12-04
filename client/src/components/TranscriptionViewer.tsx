import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Message {
  speaker: "dentist" | "patient" | "unknown";
  text: string;
}

interface TranscriptionViewerProps {
  transcript: string;
  onSave?: (newTranscript: string) => void;
}

export function TranscriptionViewer({ transcript, onSave }: TranscriptionViewerProps) {
  const [editedTranscript, setEditedTranscript] = useState(transcript);
  const [isSaving, setIsSaving] = useState(false);

  // Parse transcript into messages
  const parseTranscript = (text: string): Message[] => {
    const lines = text.split('\n').filter(line => line.trim());
    const messages: Message[] = [];

    for (const line of lines) {
      const trimmed = line.trim();
      
      if (trimmed.toLowerCase().startsWith('dentista:')) {
        messages.push({
          speaker: 'dentist',
          text: trimmed.substring('dentista:'.length).trim()
        });
      } else if (trimmed.toLowerCase().startsWith('paciente:')) {
        messages.push({
          speaker: 'patient',
          text: trimmed.substring('paciente:'.length).trim()
        });
      } else if (messages.length > 0) {
        // Continuation of previous message
        messages[messages.length - 1].text += ' ' + trimmed;
      } else {
        // Unknown speaker
        messages.push({
          speaker: 'unknown',
          text: trimmed
        });
      }
    }

    return messages;
  };

  const messages = parseTranscript(transcript);

  const handleSave = async () => {
    if (onSave) {
      setIsSaving(true);
      try {
        await onSave(editedTranscript);
      } finally {
        setIsSaving(false);
      }
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Transcrição da Consulta</CardTitle>
        <CardDescription>Revise o diálogo abaixo antes da análise.</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="visualization" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="visualization">Visualização</TabsTrigger>
            <TabsTrigger value="edit">Editar Texto</TabsTrigger>
          </TabsList>

          <TabsContent value="visualization" className="space-y-4">
            <div className="space-y-3 max-h-[600px] overflow-y-auto p-4 bg-muted/30 rounded-lg">
              {messages.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Nenhuma transcrição disponível
                </p>
              ) : (
                messages.map((message, index) => (
                  <div
                    key={index}
                    className={`flex ${
                      message.speaker === 'patient' ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    <div
                      className={`max-w-[75%] rounded-lg px-4 py-3 ${
                        message.speaker === 'dentist'
                          ? 'bg-blue-100 text-blue-900 border border-blue-200'
                          : message.speaker === 'patient'
                          ? 'bg-green-100 text-green-900 border border-green-200'
                          : 'bg-gray-100 text-gray-900 border border-gray-200'
                      }`}
                    >
                      <div className="flex flex-col gap-1">
                        <span
                          className={`text-xs font-semibold uppercase tracking-wide ${
                            message.speaker === 'dentist'
                              ? 'text-blue-700'
                              : message.speaker === 'patient'
                              ? 'text-green-700'
                              : 'text-gray-700'
                          }`}
                        >
                          {message.speaker === 'dentist'
                            ? 'Dentista'
                            : message.speaker === 'patient'
                            ? 'Paciente'
                            : 'Não identificado'}
                        </span>
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">
                          {message.text}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="edit" className="space-y-4">
            <Textarea
              value={editedTranscript}
              onChange={(e) => setEditedTranscript(e.target.value)}
              className="min-h-[400px] font-mono text-sm"
              placeholder="Digite a transcrição aqui..."
            />
            {onSave && (
              <div className="flex justify-end">
                <Button
                  onClick={handleSave}
                  disabled={isSaving || editedTranscript === transcript}
                >
                  {isSaving ? "Salvando..." : "Salvar Alterações"}
                </Button>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
