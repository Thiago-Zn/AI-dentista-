import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SOAPNoteViewer } from "@/components/SOAPNoteViewer";
import { trpc } from "@/lib/trpc";
import { Loader2, ArrowLeft, FileText, AudioLines, Download, CheckCircle } from "lucide-react";
import { useLocation, useParams } from "wouter";
import { toast } from "sonner";
import { getLoginUrl } from "@/const";

export default function ConsultationDetail() {
  const [, setLocation] = useLocation();
  const params = useParams();
  const consultationId = params.id ? parseInt(params.id) : null;
  
  const { user, loading: authLoading } = useAuth();
  const { data: consultation, isLoading } = trpc.consultations.getById.useQuery(
    { id: consultationId! },
    { enabled: !!user && !!consultationId }
  );

  const finalizeMutation = trpc.consultations.finalize.useMutation({
    onSuccess: () => {
      toast.success("Consulta finalizada com sucesso!");
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
    toast.info("Funcionalidade de exportação em desenvolvimento");
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
              <Button variant="outline" onClick={handleExportPDF}>
                <Download className="mr-2 h-4 w-4" />
                Exportar PDF
              </Button>
              
              {consultation.status === "draft" && (
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
              <SOAPNoteViewer soapNote={consultation.soapNote} />
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
            <Card>
              <CardHeader>
                <CardTitle>Transcrição da Consulta</CardTitle>
                <CardDescription>
                  Transcrição automática gerada por IA
                </CardDescription>
              </CardHeader>
              <CardContent>
                {consultation.transcript ? (
                  <div className="prose prose-sm max-w-none">
                    <p className="whitespace-pre-wrap text-foreground leading-relaxed">
                      {consultation.transcript}
                    </p>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <AudioLines className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">
                      Transcrição não disponível
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {consultation.audioUrl && (
              <Card>
                <CardHeader>
                  <CardTitle>Áudio da Consulta</CardTitle>
                </CardHeader>
                <CardContent>
                  <audio controls className="w-full">
                    <source src={consultation.audioUrl} type="audio/webm" />
                    Seu navegador não suporta o elemento de áudio.
                  </audio>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
