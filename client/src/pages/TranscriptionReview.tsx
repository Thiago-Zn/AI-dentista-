import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TranscriptionViewerWithAudio } from "@/components/TranscriptionViewerWithAudio";
import { trpc } from "@/lib/trpc";
import { Loader2, ArrowLeft, Wand2, AlertCircle } from "lucide-react";
import { useLocation, useParams } from "wouter";
import { toast } from "sonner";
import { getLoginUrl } from "@/const";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function TranscriptionReview() {
  const [, setLocation] = useLocation();
  const params = useParams();
  const consultationId = params.id ? parseInt(params.id) : null;
  const [editedTranscript, setEditedTranscript] = useState<string | null>(null);
  
  const { user, loading: authLoading } = useAuth();
  const { data: consultation, isLoading } = trpc.consultations.getById.useQuery(
    { id: consultationId! },
    { enabled: !!user && !!consultationId }
  );

  const utils = trpc.useUtils();

  const updateTranscriptMutation = trpc.consultations.updateTranscript.useMutation({
    onSuccess: () => {
      toast.success("Transcrição atualizada com sucesso!");
      utils.consultations.getById.invalidate({ id: consultationId! });
    },
    onError: () => {
      toast.error("Erro ao atualizar transcrição");
    },
  });

  const analyzeMutation = trpc.consultations.analyzeAndGenerateSOAP.useMutation({
    onSuccess: () => {
      toast.success("Análise concluída! Nota SOAP gerada.");
      setLocation(`/consultation/${consultationId}`);
    },
    onError: (error) => {
      toast.error("Erro ao analisar consulta: " + error.message);
    },
  });

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    window.location.href = getLoginUrl();
    return null;
  }

  if (!consultation) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground mb-4">Consulta não encontrada</p>
            <Button onClick={() => setLocation("/")}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar ao Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!consultation.transcript) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground mb-4">Transcrição não disponível</p>
            <Button onClick={() => setLocation("/")}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar ao Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleSaveTranscript = async (newTranscript: string) => {
    if (!consultationId) return;
    setEditedTranscript(newTranscript);
    await updateTranscriptMutation.mutateAsync({
      consultationId,
      transcript: newTranscript,
    });
  };

  const handleConfirmAndAnalyze = async () => {
    if (!consultationId) return;
    
    try {
      await analyzeMutation.mutateAsync({ consultationId });
    } catch (error) {
      console.error("Analysis error:", error);
    }
  };

  const currentTranscript = editedTranscript || consultation.transcript;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container py-4 max-w-6xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setLocation("/")}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-xl font-bold">Revisar Transcrição</h1>
                <p className="text-sm text-muted-foreground">
                  {consultation.patientName} • {new Date(consultation.createdAt).toLocaleDateString('pt-BR')}
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container py-8 max-w-6xl space-y-6">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Etapa Importante</AlertTitle>
          <AlertDescription>
            Revise cuidadosamente a transcrição abaixo antes de prosseguir para a análise com IA. 
            Corrija qualquer erro para garantir que a nota clínica seja gerada com precisão.
          </AlertDescription>
        </Alert>

        <TranscriptionViewerWithAudio
          transcript={currentTranscript}
          transcriptSegments={consultation.transcriptSegments as any}
          audioUrl={consultation.audioUrl || undefined}
          onTranscriptEdit={handleSaveTranscript}
        />

        <div className="flex justify-end gap-3">
          <Button
            variant="outline"
            onClick={() => setLocation("/")}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleConfirmAndAnalyze}
            disabled={analyzeMutation.isPending}
            size="lg"
          >
            {analyzeMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Analisando...
              </>
            ) : (
              <>
                <Wand2 className="mr-2 h-4 w-4" />
                Confirmar e Analisar com IA
              </>
            )}
          </Button>
        </div>
      </main>
    </div>
  );
}
