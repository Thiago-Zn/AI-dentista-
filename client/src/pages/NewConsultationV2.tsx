import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AudioRecorderV2 } from "@/components/AudioRecorderV2";
import { trpc } from "@/lib/trpc";
import { Loader2, ArrowLeft, Mic, FileAudio, FileText, Upload } from "lucide-react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { getLoginUrl } from "@/const";

type InputMethod = "recording" | "upload" | "text";
type ProcessingStep = "idle" | "uploading" | "transcribing" | "complete";

export default function NewConsultationV2() {
  const [, setLocation] = useLocation();
  const { user, loading: authLoading } = useAuth();
  
  const [inputMethod, setInputMethod] = useState<InputMethod>("recording");
  const [selectedPatientId, setSelectedPatientId] = useState<string>("");
  const [selectedPatientName, setSelectedPatientName] = useState<string>("");
  const [textInput, setTextInput] = useState("");
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [processingStep, setProcessingStep] = useState<ProcessingStep>("idle");
  const [consultationId, setConsultationId] = useState<number | null>(null);

  const { data: patients } = trpc.patients.list.useQuery(undefined, {
    enabled: !!user,
  });

  const createConsultationMutation = trpc.consultations.create.useMutation();
  const uploadAudioMutation = trpc.consultations.uploadAudio.useMutation();
  const transcribeMutation = trpc.consultations.transcribe.useMutation();
  const updateTranscriptMutation = trpc.consultations.updateTranscript.useMutation();

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

  const handlePatientSelect = (value: string) => {
    setSelectedPatientId(value);
    const patient = patients?.find((p) => p.id.toString() === value);
    if (patient) {
      setSelectedPatientName(patient.name);
    }
  };

  const uploadAudioFile = async (consultationId: number, audioBlob: Blob, durationSeconds: number) => {
    // Upload via multipart endpoint (bypasses JSON body parser)
    const formData = new FormData();
    formData.append("audio", audioBlob);
    formData.append("consultationId", consultationId.toString());

    const response = await fetch("/api/upload/audio", {
      method: "POST",
      body: formData,
      credentials: "include", // Include session cookie
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Erro ao fazer upload do áudio");
    }

    const { fileKey, audioUrl, mimeType, sizeBytes } = await response.json();

    // Save metadata to database via tRPC
    await uploadAudioMutation.mutateAsync({
      consultationId,
      fileKey,
      audioUrl,
      mimeType,
      durationSeconds,
      sizeBytes,
    });
  };

  const handleRecordingComplete = async (audioBlob: Blob, durationSeconds: number) => {
    if (!selectedPatientId || !selectedPatientName) {
      toast.error("Selecione um paciente");
      return;
    }

    setProcessingStep("uploading");

    try {
      // Create consultation
      const { consultationId: newId } = await createConsultationMutation.mutateAsync({
        patientId: parseInt(selectedPatientId),
        patientName: selectedPatientName,
      });
      setConsultationId(newId);

      // Upload audio via multipart endpoint
      await uploadAudioFile(newId, audioBlob, durationSeconds);

      setProcessingStep("transcribing");
      toast.success("Áudio enviado. Transcrevendo...");

      // Transcribe
      await transcribeMutation.mutateAsync({
        consultationId: newId,
      });

      setProcessingStep("complete");
      toast.success("Transcrição concluída! Revise antes de continuar.");

      // Redirect to review page
      setLocation(`/consultation/${newId}/review`);
    } catch (error: any) {
      toast.error(error.message || "Erro ao processar consulta");
      console.error(error);
      setProcessingStep("idle");
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Check file size (16MB limit)
    if (file.size > 16 * 1024 * 1024) {
      toast.error("Arquivo muito grande. Máximo 16MB.");
      return;
    }

    // Check file type
    const validTypes = ['audio/mpeg', 'audio/wav', 'audio/webm', 'audio/mp4', 'audio/m4a'];
    if (!validTypes.includes(file.type) && !file.name.match(/\.(mp3|wav|webm|m4a|mp4)$/i)) {
      toast.error("Formato não suportado. Use MP3, WAV, M4A ou WEBM.");
      return;
    }

    setAudioFile(file);
  };

  const handleAudioFileSubmit = async () => {
    if (!selectedPatientId || !selectedPatientName || !audioFile) {
      toast.error("Selecione um paciente e um arquivo de áudio");
      return;
    }

    setProcessingStep("uploading");

    try {
      // Create consultation
      const { consultationId: newId } = await createConsultationMutation.mutateAsync({
        patientId: parseInt(selectedPatientId),
        patientName: selectedPatientName,
      });
      setConsultationId(newId);

      // Upload audio via multipart endpoint
      await uploadAudioFile(newId, audioFile, 0); // Duration unknown for uploaded files

      setProcessingStep("transcribing");
      toast.success("Áudio enviado. Transcrevendo...");

      // Transcribe
      await transcribeMutation.mutateAsync({
        consultationId: newId,
      });

      setProcessingStep("complete");
      toast.success("Transcrição concluída! Revise antes de continuar.");

      // Redirect to review page
      setLocation(`/consultation/${newId}/review`);
    } catch (error: any) {
      toast.error(error.message || "Erro ao processar arquivo");
      console.error(error);
      setProcessingStep("idle");
    }
  };

  const handleTextSubmit = async () => {
    if (!selectedPatientId || !selectedPatientName || !textInput.trim()) {
      toast.error("Selecione um paciente e digite o texto da consulta");
      return;
    }

    setProcessingStep("uploading");

    try {
      // Create consultation
      const { consultationId: newId } = await createConsultationMutation.mutateAsync({
        patientId: parseInt(selectedPatientId),
        patientName: selectedPatientName,
      });
      setConsultationId(newId);

      // Save text directly as transcript
      await updateTranscriptMutation.mutateAsync({
        consultationId: newId,
        transcript: textInput,
      });

      setProcessingStep("complete");
      toast.success("Texto salvo! Revise antes de continuar.");
      
      // Redirect to review page
      setLocation(`/consultation/${newId}/review`);
    } catch (error) {
      toast.error("Erro ao salvar texto");
      console.error(error);
      setProcessingStep("idle");
    }
  };

  const isProcessing = processingStep !== "idle";

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card sticky top-0 z-10">
        <div className="container py-4 flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => setLocation("/")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <div>
            <h1 className="text-xl font-bold">Nova Consulta</h1>
            <p className="text-sm text-muted-foreground">
              Escolha o método de entrada e selecione o paciente
            </p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container py-8 max-w-4xl">
        <div className="space-y-6">
          {/* Patient Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Selecionar Paciente</CardTitle>
              <CardDescription>
                Escolha o paciente para esta consulta
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Select
                value={selectedPatientId}
                onValueChange={handlePatientSelect}
                disabled={isProcessing}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um paciente" />
                </SelectTrigger>
                <SelectContent>
                  {patients?.map((patient) => (
                    <SelectItem key={patient.id} value={patient.id.toString()}>
                      {patient.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Input Method Tabs */}
          <Card>
            <CardHeader>
              <CardTitle>Método de Entrada</CardTitle>
              <CardDescription>
                Escolha como deseja registrar a consulta
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs value={inputMethod} onValueChange={(v) => setInputMethod(v as InputMethod)}>
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="recording" disabled={isProcessing}>
                    <Mic className="h-4 w-4 mr-2" />
                    Gravar Áudio
                  </TabsTrigger>
                  <TabsTrigger value="upload" disabled={isProcessing}>
                    <FileAudio className="h-4 w-4 mr-2" />
                    Upload de Áudio
                  </TabsTrigger>
                  <TabsTrigger value="text" disabled={isProcessing}>
                    <FileText className="h-4 w-4 mr-2" />
                    Texto Digitado
                  </TabsTrigger>
                </TabsList>

                <div className="mt-6">
                  <TabsContent value="recording" className="mt-0">
                    {!isProcessing ? (
                      <AudioRecorderV2 onRecordingComplete={handleRecordingComplete} />
                    ) : (
                      <ProcessingIndicator step={processingStep} />
                    )}
                  </TabsContent>

                  <TabsContent value="upload" className="mt-0">
                    {!isProcessing ? (
                      <div className="space-y-4">
                        <div className="border-2 border-dashed rounded-lg p-12 text-center hover:border-primary transition-colors">
                          <input
                            type="file"
                            accept="audio/*,.mp3,.wav,.m4a,.webm"
                            onChange={handleFileUpload}
                            className="hidden"
                            id="audio-upload"
                          />
                          <label htmlFor="audio-upload" className="cursor-pointer">
                            <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                            <p className="text-sm font-medium mb-1">
                              {audioFile ? audioFile.name : "Clique para selecionar arquivo"}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              MP3, WAV, M4A ou WEBM (máx. 16MB)
                            </p>
                          </label>
                        </div>
                        {audioFile && (
                          <Button onClick={handleAudioFileSubmit} className="w-full" size="lg">
                            Processar Áudio
                          </Button>
                        )}
                      </div>
                    ) : (
                      <ProcessingIndicator step={processingStep} />
                    )}
                  </TabsContent>

                  <TabsContent value="text" className="mt-0">
                    {!isProcessing ? (
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="text-input">Texto da Consulta</Label>
                          <Textarea
                            id="text-input"
                            placeholder="Digite ou cole o texto da consulta aqui. Você pode incluir as falas do dentista e paciente usando 'Dentista:' e 'Paciente:' para identificar os falantes."
                            className="min-h-[300px] mt-2"
                            value={textInput}
                            onChange={(e) => setTextInput(e.target.value)}
                          />
                        </div>
                        <Button
                          onClick={handleTextSubmit}
                          className="w-full"
                          size="lg"
                          disabled={!textInput.trim()}
                        >
                          Continuar
                        </Button>
                      </div>
                    ) : (
                      <ProcessingIndicator step={processingStep} />
                    )}
                  </TabsContent>
                </div>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}

function ProcessingIndicator({ step }: { step: ProcessingStep }) {
  return (
    <Card className="border-2">
      <CardContent className="p-12">
        <div className="flex flex-col items-center gap-6">
          <div className="relative">
            <Loader2 className="h-16 w-16 animate-spin text-primary" />
          </div>
          <div className="text-center">
            <p className="text-lg font-semibold mb-2">
              {step === "uploading" && "Enviando áudio..."}
              {step === "transcribing" && "Transcrevendo com IA..."}
              {step === "complete" && "Concluído!"}
            </p>
            <p className="text-sm text-muted-foreground">
              {step === "uploading" && "Fazendo upload do arquivo"}
              {step === "transcribing" && "Isso pode levar alguns segundos"}
              {step === "complete" && "Redirecionando..."}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
