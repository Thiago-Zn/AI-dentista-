import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Play, Pause, Volume2, Clock } from "lucide-react";

interface TranscriptSegment {
  id: number;
  start: number;
  end: number;
  text: string;
}

interface Message {
  speaker: "dentist" | "patient" | "unknown";
  text: string;
  timestamp?: number;
}

interface TranscriptionViewerWithAudioProps {
  transcript: string;
  transcriptSegments?: TranscriptSegment[];
  audioUrl?: string;
  onTranscriptEdit?: (newTranscript: string) => void;
}

export function TranscriptionViewerWithAudio({
  transcript,
  transcriptSegments,
  audioUrl,
  onTranscriptEdit,
}: TranscriptionViewerWithAudioProps) {
  const [viewMode, setViewMode] = useState<"visual" | "text">("visual");
  const [editedTranscript, setEditedTranscript] = useState(transcript);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [activeSegmentId, setActiveSegmentId] = useState<number | null>(null);
  
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => setDuration(audio.duration);
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleEnded = () => setIsPlaying(false);

    audio.addEventListener("timeupdate", updateTime);
    audio.addEventListener("loadedmetadata", updateDuration);
    audio.addEventListener("play", handlePlay);
    audio.addEventListener("pause", handlePause);
    audio.addEventListener("ended", handleEnded);

    return () => {
      audio.removeEventListener("timeupdate", updateTime);
      audio.removeEventListener("loadedmetadata", updateDuration);
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("pause", handlePause);
      audio.removeEventListener("ended", handleEnded);
    };
  }, []);

  // Update active segment based on current playback time
  useEffect(() => {
    if (!transcriptSegments) return;
    
    const active = transcriptSegments.find(
      seg => currentTime >= seg.start && currentTime <= seg.end
    );
    
    setActiveSegmentId(active?.id ?? null);
  }, [currentTime, transcriptSegments]);

  const parseTranscript = (): Message[] => {
    const lines = transcript.split("\n").filter(line => line.trim());
    const messages: Message[] = [];
    
    let segmentIndex = 0;

    for (const line of lines) {
      const dentistMatch = line.match(/^Dentista:\s*(.+)/i);
      const patientMatch = line.match(/^Paciente:\s*(.+)/i);

      if (dentistMatch) {
        const segment = transcriptSegments?.[segmentIndex];
        messages.push({
          speaker: "dentist",
          text: dentistMatch[1].trim(),
          timestamp: segment?.start,
        });
        segmentIndex++;
      } else if (patientMatch) {
        const segment = transcriptSegments?.[segmentIndex];
        messages.push({
          speaker: "patient",
          text: patientMatch[1].trim(),
          timestamp: segment?.start,
        });
        segmentIndex++;
      } else if (line.trim()) {
        const segment = transcriptSegments?.[segmentIndex];
        messages.push({
          speaker: "unknown",
          text: line.trim(),
          timestamp: segment?.start,
        });
        segmentIndex++;
      }
    }

    return messages;
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleSeek = (time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      if (!isPlaying) {
        audioRef.current.play();
      }
    }
  };

  const togglePlayPause = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
    }
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    const newTime = percentage * duration;
    
    audioRef.current.currentTime = newTime;
  };

  const messages = viewMode === "visual" ? parseTranscript() : [];

  return (
    <div className="space-y-4">
      {/* Audio Player */}
      {audioUrl && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Volume2 className="h-4 w-4" />
              Áudio da Consulta
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <audio ref={audioRef} src={audioUrl} preload="metadata" className="hidden" />
            
            {/* Play/Pause Button */}
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="icon"
                onClick={togglePlayPause}
                className="h-10 w-10 rounded-full"
              >
                {isPlaying ? (
                  <Pause className="h-4 w-4" />
                ) : (
                  <Play className="h-4 w-4 ml-0.5" />
                )}
              </Button>
              
              {/* Time Display */}
              <div className="flex-1">
                <div className="text-sm font-medium mb-1">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </div>
                
                {/* Progress Bar */}
                <div
                  className="h-2 bg-secondary rounded-full cursor-pointer relative"
                  onClick={handleProgressClick}
                >
                  <div
                    className="h-full bg-primary rounded-full transition-all"
                    style={{ width: `${(currentTime / duration) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Transcription Viewer */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Transcrição da Consulta</CardTitle>
            <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as "visual" | "text")}>
              <TabsList>
                <TabsTrigger value="visual">Visualização</TabsTrigger>
                <TabsTrigger value="text">Editar Texto</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          <p className="text-sm text-muted-foreground">
            {viewMode === "visual" 
              ? "Clique nos timestamps para pular para aquele momento no áudio"
              : "Revise o diálogo abaixo antes da análise"}
          </p>
        </CardHeader>
        <CardContent>
          {viewMode === "visual" ? (
            <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex ${
                    message.speaker === "patient" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-[80%] ${
                      message.speaker === "patient"
                        ? "bg-green-50 border-green-200"
                        : message.speaker === "dentist"
                        ? "bg-blue-50 border-blue-200"
                        : "bg-gray-50 border-gray-200"
                    } border rounded-2xl px-4 py-3 space-y-2`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Badge
                        variant={message.speaker === "patient" ? "default" : "secondary"}
                        className={`text-xs ${
                          message.speaker === "patient"
                            ? "bg-green-600"
                            : message.speaker === "dentist"
                            ? "bg-blue-600"
                            : "bg-gray-600"
                        }`}
                      >
                        {message.speaker === "patient"
                          ? "PACIENTE"
                          : message.speaker === "dentist"
                          ? "DENTISTA"
                          : "DESCONHECIDO"}
                      </Badge>
                      
                      {message.timestamp !== undefined && audioUrl && (
                        <button
                          onClick={() => handleSeek(message.timestamp!)}
                          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors cursor-pointer"
                          title="Pular para este momento"
                        >
                          <Clock className="h-3 w-3" />
                          {formatTime(message.timestamp)}
                        </button>
                      )}
                    </div>
                    <p className="text-sm leading-relaxed">{message.text}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              <Textarea
                value={editedTranscript}
                onChange={(e) => setEditedTranscript(e.target.value)}
                className="min-h-[400px] font-mono text-sm"
                placeholder="Edite a transcrição aqui..."
              />
              {onTranscriptEdit && editedTranscript !== transcript && (
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setEditedTranscript(transcript)}
                  >
                    Cancelar
                  </Button>
                  <Button onClick={() => onTranscriptEdit(editedTranscript)}>
                    Salvar Alterações
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
