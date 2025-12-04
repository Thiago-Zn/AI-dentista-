import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Mic, Square, Pause, Play, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface AudioRecorderV2Props {
  onRecordingComplete: (audioBlob: Blob, durationSeconds: number) => void;
}

export function AudioRecorderV2({ onRecordingComplete }: AudioRecorderV2Props) {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [duration, setDuration] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);
  const pausedTimeRef = useRef<number>(0);

  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  const updateAudioLevel = () => {
    if (!analyserRef.current) return;

    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(dataArray);
    
    const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
    setAudioLevel(Math.min(100, (average / 255) * 200));

    animationFrameRef.current = requestAnimationFrame(updateAudioLevel);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Setup audio context for visualization
      const audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      
      audioContextRef.current = audioContext;
      analyserRef.current = analyser;

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        setAudioBlob(blob);
        stream.getTracks().forEach((track) => track.stop());
        
        if (audioContextRef.current) {
          audioContextRef.current.close();
        }
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
        if (timerRef.current) {
          clearInterval(timerRef.current);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
      setIsPaused(false);
      startTimeRef.current = Date.now();
      pausedTimeRef.current = 0;

      // Start timer
      timerRef.current = setInterval(() => {
        const elapsed = (Date.now() - startTimeRef.current - pausedTimeRef.current) / 1000;
        setDuration(elapsed);
      }, 100);

      // Start audio level visualization
      updateAudioLevel();
    } catch (error) {
      console.error("Error accessing microphone:", error);
      alert("Erro ao acessar microfone. Verifique as permissões.");
    }
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      if (isPaused) {
        mediaRecorderRef.current.resume();
        const pauseDuration = Date.now() - (startTimeRef.current + pausedTimeRef.current + duration * 1000);
        pausedTimeRef.current += pauseDuration;
        setIsPaused(false);
      } else {
        mediaRecorderRef.current.pause();
        setIsPaused(true);
      }
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsPaused(false);
      setAudioLevel(0);
    }
  };

  const discardRecording = () => {
    setAudioBlob(null);
    setDuration(0);
  };

  const handleComplete = () => {
    if (audioBlob) {
      onRecordingComplete(audioBlob, Math.floor(duration));
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <Card className="border-2">
      <CardContent className="p-8">
        <div className="flex flex-col items-center gap-6">
          {/* Waveform Visualization */}
          <div className="relative w-full h-32 bg-muted/30 rounded-lg overflow-hidden flex items-center justify-center">
            {isRecording && !isPaused ? (
              <div className="flex items-center gap-1 h-full">
                {Array.from({ length: 40 }).map((_, i) => (
                  <div
                    key={i}
                    className="w-2 bg-primary rounded-full transition-all duration-150"
                    style={{
                      height: `${Math.max(10, audioLevel * (0.5 + Math.random() * 0.5))}%`,
                      opacity: 0.3 + (audioLevel / 100) * 0.7,
                    }}
                  />
                ))}
              </div>
            ) : (
              <div className="text-muted-foreground text-sm">
                {audioBlob ? "Gravação concluída" : "Pronto para gravar"}
              </div>
            )}
          </div>

          {/* Timer */}
          <div className="text-4xl font-mono font-bold tabular-nums">
            {formatTime(duration)}
          </div>

          {/* Controls */}
          <div className="flex items-center gap-4">
            {!isRecording && !audioBlob && (
              <Button
                size="lg"
                onClick={startRecording}
                className="h-16 w-16 rounded-full"
              >
                <Mic className="h-6 w-6" />
              </Button>
            )}

            {isRecording && (
              <>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={pauseRecording}
                  className="h-14 w-14 rounded-full"
                >
                  {isPaused ? (
                    <Play className="h-5 w-5" />
                  ) : (
                    <Pause className="h-5 w-5" />
                  )}
                </Button>

                <Button
                  size="lg"
                  variant="destructive"
                  onClick={stopRecording}
                  className={cn(
                    "h-16 w-16 rounded-full transition-all",
                    !isPaused && "animate-pulse"
                  )}
                >
                  <Square className="h-6 w-6" />
                </Button>
              </>
            )}

            {audioBlob && (
              <>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={discardRecording}
                  className="h-14 w-14 rounded-full"
                >
                  <Trash2 className="h-5 w-5" />
                </Button>

                <Button
                  size="lg"
                  onClick={handleComplete}
                  className="px-8"
                >
                  Continuar
                </Button>
              </>
            )}
          </div>

          {/* Status Text */}
          <p className="text-sm text-muted-foreground">
            {isRecording && !isPaused && "Gravando..."}
            {isRecording && isPaused && "Pausado"}
            {audioBlob && "Gravação pronta para envio"}
            {!isRecording && !audioBlob && "Clique no botão para iniciar"}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
