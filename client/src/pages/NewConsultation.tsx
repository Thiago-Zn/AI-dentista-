import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AudioRecorder } from "@/components/AudioRecorder";
import { trpc } from "@/lib/trpc";
import { Loader2, ArrowLeft, Upload, Wand2 } from "lucide-react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { getLoginUrl } from "@/const";

export default function NewConsultation() {
  const [, setLocation] = useLocation();
  const { user, loading: authLoading } = useAuth();
  const [step, setStep] = useState<"patient" | "recording" | "processing">("patient");
  const [patientMode, setPatientMode] = useState<"existing" | "new">("existing");
  const [selectedPatientId, setSelectedPatientId] = useState<string>("");
  const [patientName, setPatientName] = useState("");
  const [consultationId, setConsultationId] = useState<number | null>(null);

  const { data: patients } = trpc.patients.list.useQuery(undefined, {
    enabled: !!user,
  });

  const createConsultationMutation = trpc.consultations.create.useMutation();
  const uploadAudioMutation = trpc.consultations.uploadAudio.useMutation();
  const transcribeMutation = trpc.consultations.transcribe.useMutation();
  const analyzeMutation = trpc.consultations.analyzeAndGenerateSOAP.useMutation();

  if (authLoading) {
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

  const handleStartRecording = async () => {
    let finalPatientId = 0;
    let finalPatientName = "";

    if (patientMode === "existing") {
      if (!selectedPatientId) {
        toast.error("Por favor, selecione um paciente");
        return;
      }
      const patient = patients?.find(p => p.id === parseInt(selectedPatientId));
      if (!patient) {
        toast.error("Paciente não encontrado");
        return;
      }
      finalPatientId = patient.id;
      finalPatientName = patient.name;
    } else {
      if (!patientName.trim()) {
        toast.error("Por favor, insira o nome do paciente");
        return;
      }
      finalPatientName = patientName.trim();
    }

    try {
      const result = await createConsultationMutation.mutateAsync({
        patientId: finalPatientId,
        patientName: finalPatientName,
      });
      
      if (result.success && result.consultationId) {
        setConsultationId(result.consultationId);
        setStep("recording");
        toast.success("Consulta criada. Inicie a gravação.");
      } else {
        throw new Error("Failed to get consultation ID");
      }
    } catch (error) {
      toast.error("Erro ao criar consulta");
      console.error(error);
    }
  };

  const handleRecordingComplete = async (audioBlob: Blob, durationSeconds: number) => {
    if (!consultationId) return;

    setStep("processing");
    toast.info("Processando áudio...");

    try {
      // Convert blob to base64
      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);
      
      reader.onloadend = async () => {
        const base64Audio = (reader.result as string).split(',')[1];
        
        // Upload audio
        await uploadAudioMutation.mutateAsync({
          consultationId,
          audioData: base64Audio,
          mimeType: audioBlob.type,
          durationSeconds,
        });

        toast.success("Áudio enviado. Transcrevendo...");

        // Transcribe
        await transcribeMutation.mutateAsync({
          consultationId,
        });

        toast.success("Transcrição concluída. Analisando com IA...");

        // Analyze and generate SOAP
        await analyzeMutation.mutateAsync({
          consultationId,
        });

        toast.success("Nota clínica gerada com sucesso!");
        setLocation(`/consultation/${consultationId}`);
      };
    } catch (error) {
      toast.error("Erro ao processar consulta");
      console.error(error);
      setStep("recording");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container py-4 flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => setLocation("/")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <div>
            <h1 className="text-xl font-bold">Nova Consulta</h1>
            <p className="text-sm text-muted-foreground">
              {step === "patient" && "Informações do paciente"}
              {step === "recording" && "Gravação de consulta"}
              {step === "processing" && "Processando com IA"}
            </p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container py-8 max-w-4xl">
        {step === "patient" && (
          <Card>
            <CardHeader>
              <CardTitle>Informações do Paciente</CardTitle>
              <CardDescription>
                Selecione um paciente existente ou cadastre um novo
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Modo de Seleção</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={patientMode === "existing" ? "default" : "outline"}
                    onClick={() => setPatientMode("existing")}
                    className="flex-1"
                  >
                    Paciente Existente
                  </Button>
                  <Button
                    type="button"
                    variant={patientMode === "new" ? "default" : "outline"}
                    onClick={() => setPatientMode("new")}
                    className="flex-1"
                  >
                    Novo Paciente
                  </Button>
                </div>
              </div>

              {patientMode === "existing" ? (
                <div className="space-y-2">
                  <Label htmlFor="patientSelect">Selecionar Paciente *</Label>
                  <Select value={selectedPatientId} onValueChange={setSelectedPatientId}>
                    <SelectTrigger id="patientSelect">
                      <SelectValue placeholder="Escolha um paciente" />
                    </SelectTrigger>
                    <SelectContent>
                      {patients && patients.length > 0 ? (
                        patients.map((patient) => (
                          <SelectItem key={patient.id} value={patient.id.toString()}>
                            {patient.name}
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="none" disabled>
                          Nenhum paciente cadastrado
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="patientName">Nome do Paciente *</Label>
                  <Input
                    id="patientName"
                    placeholder="Ex: Maria Silva"
                    value={patientName}
                    onChange={(e) => setPatientName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleStartRecording();
                      }
                    }}
                  />
                </div>
              )}

              <Button
                size="lg"
                className="w-full"
                onClick={handleStartRecording}
                disabled={createConsultationMutation.isPending}
              >
                {createConsultationMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Criando consulta...
                  </>
                ) : (
                  <>
                    Continuar para Gravação
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        {step === "recording" && (
          <Card>
            <CardHeader>
              <CardTitle>Gravação de Consulta</CardTitle>
              <CardDescription>
                Paciente: <span className="font-semibold">{patientName}</span>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AudioRecorder onRecordingComplete={handleRecordingComplete} />
            </CardContent>
          </Card>
        )}

        {step === "processing" && (
          <Card>
            <CardContent className="py-12">
              <div className="text-center space-y-6">
                <div className="flex justify-center">
                  <div className="relative">
                    <Loader2 className="h-16 w-16 animate-spin text-primary" />
                    <Wand2 className="h-8 w-8 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                  </div>
                </div>
                
                <div>
                  <h3 className="text-xl font-bold mb-2">Processando Consulta</h3>
                  <p className="text-muted-foreground">
                    Estamos transcrevendo o áudio e gerando a nota clínica com IA especializada em odontologia.
                    Isso pode levar alguns minutos...
                  </p>
                </div>

                <div className="space-y-2 text-sm text-muted-foreground">
                  <div className="flex items-center justify-center gap-2">
                    {uploadAudioMutation.isSuccess ? (
                      <span className="text-green-600">✓ Áudio enviado</span>
                    ) : (
                      <>
                        <Upload className="h-4 w-4 animate-pulse" />
                        <span>Enviando áudio...</span>
                      </>
                    )}
                  </div>
                  
                  {uploadAudioMutation.isSuccess && (
                    <div className="flex items-center justify-center gap-2">
                      {transcribeMutation.isSuccess ? (
                        <span className="text-green-600">✓ Transcrição concluída</span>
                      ) : (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>Transcrevendo com Whisper AI...</span>
                        </>
                      )}
                    </div>
                  )}
                  
                  {transcribeMutation.isSuccess && (
                    <div className="flex items-center justify-center gap-2">
                      {analyzeMutation.isSuccess ? (
                        <span className="text-green-600">✓ Análise completa</span>
                      ) : (
                        <>
                          <Wand2 className="h-4 w-4 animate-pulse" />
                          <span>Gerando nota SOAP com IA odontológica...</span>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
