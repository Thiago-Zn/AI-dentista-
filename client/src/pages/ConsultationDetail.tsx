import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SOAPNoteViewerV2 } from "@/components/SOAPNoteViewerV2";
import { SOAPNoteEditor } from "@/components/SOAPNoteEditor";
import { TranscriptionViewerWithAudio } from "@/components/TranscriptionViewerWithAudio";
import { trpc } from "@/lib/trpc";
import { Loader2, ArrowLeft, FileText, AudioLines, Download, CheckCircle, Edit } from "lucide-react";
import { useLocation, useParams } from "wouter";
import { toast } from "sonner";
import { getLoginUrl } from "@/const";

export default function ConsultationDetail() {
  const [, setLocation] = useLocation();
  const params = useParams();
  const consultationId = params.id ? parseInt(params.id) : null;
  const [isEditing, setIsEditing] = useState(false);
  
  const { user, loading: authLoading } = useAuth();
  const { data: consultation, isLoading } = trpc.consultations.getById.useQuery(
    { id: consultationId! },
    { enabled: !!user && !!consultationId }
  );

  const utils = trpc.useUtils();
  
  // All mutations must be declared at the top level, not conditionally
  const finalizeMutation = trpc.consultations.finalize.useMutation({
    onSuccess: () => {
      toast.success("Consulta finalizada com sucesso!");
      utils.consultations.getById.invalidate({ id: consultationId! });
    },
  });

  const updateSOAPMutation = trpc.consultations.updateSOAP.useMutation({
    onSuccess: () => {
      toast.success("Nota SOAP atualizada com sucesso!");
      setIsEditing(false);
      utils.consultations.getById.invalidate({ id: consultationId! });
    },
    onError: () => {
      toast.error("Erro ao atualizar nota SOAP");
    },
  });

  const exportPDFMutation = trpc.consultations.exportPDF.useMutation({
    onSuccess: (data) => {
      // Convert base64 to blob and download
      const byteCharacters = atob(data.pdfData);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'application/pdf' });
      
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `consulta-${consultation?.patientName}-${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success("PDF exportado com sucesso!");
    },
    onError: () => {
      toast.error("Erro ao exportar PDF");
    },
  });

  // Early returns after all hooks
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

  const handleFinalize = async () => {
    if (!consultationId) return;
    
    try {
      await finalizeMutation.mutateAsync({ consultationId });
    } catch (error) {
      toast.error("Erro ao finalizar consulta");
      console.error(error);
    }
  };

  const handleExportPDF = () => {
    if (!consultationId) return;
    exportPDFMutation.mutate({ consultationId });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={() => setLocation("/")}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar
              </Button>
              <div>
                <h1 className="text-xl font-bold">{consultation.patientName}</h1>
                <p className="text-sm text-muted-foreground">
                  {new Date(consultation.createdAt).toLocaleDateString('pt-BR', {
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric',
                  })}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={handleExportPDF} disabled={exportPDFMutation.isPending}>
                {exportPDFMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Gerando PDF...
                  </>
                ) : (
                  <>
                    <Download className="mr-2 h-4 w-4" />
                    Exportar PDF
                  </>
                )}
              </Button>
              
              {consultation.status === "draft" && !isEditing && (
                <Button variant="outline" onClick={() => setIsEditing(true)}>
                  <Edit className="mr-2 h-4 w-4" />
                  Editar Nota
                </Button>
              )}
              
              {consultation.status === "draft" && !isEditing && (
                <Button onClick={handleFinalize} disabled={finalizeMutation.isPending}>
                  {finalizeMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Finalizando...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Finalizar Consulta
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container py-8 max-w-6xl">
        <Tabs defaultValue="soap" className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="soap">
              <FileText className="mr-2 h-4 w-4" />
              Nota SOAP
            </TabsTrigger>
            <TabsTrigger value="transcript">
              <AudioLines className="mr-2 h-4 w-4" />
              Transcrição
            </TabsTrigger>
          </TabsList>

          <TabsContent value="soap" className="space-y-4">
            {consultation.soapNote ? (
              isEditing ? (
                <SOAPNoteEditor
                  soapNote={consultation.soapNote}
                  onSave={(updatedNote) => {
                    updateSOAPMutation.mutate({
                      consultationId: consultationId!,
                      soapNote: updatedNote,
                    });
                  }}
                  onCancel={() => setIsEditing(false)}
                />
              ) : (
                <SOAPNoteViewerV2 soapNote={consultation.soapNote} />
              )
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    Nota clínica ainda não foi gerada para esta consulta
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
          <TabsContent value="transcript" className="space-y-4">
            {consultation.transcript ? (
              <TranscriptionViewerWithAudio
                transcript={consultation.transcript}
                transcriptSegments={consultation.transcriptSegments as any}
                audioUrl={consultation.audioUrl || undefined}
              />
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <AudioLines className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    Transcrição não disponível
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
