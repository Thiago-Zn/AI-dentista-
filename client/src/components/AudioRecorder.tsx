import { useState, useRef, useEffect } from "react";
import { Button } from "./ui/button";
import { Mic, Square, Pause, Play } from "lucide-react";
import { toast } from "sonner";

interface AudioRecorderProps {
  onRecordingComplete: (audioBlob: Blob, durationSeconds: number) => void;
}

export function AudioRecorder({ onRecordingComplete }: AudioRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [duration, setDuration] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | undefined>(undefined);
  const startTimeRef = useRef<number>(0);
  const pausedTimeRef = useRef<number>(0);

  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout | undefined;
    if (isRecording && !isPaused) {
      interval = setInterval(() => {
        const elapsed = Date.now() - startTimeRef.current - pausedTimeRef.current;
        setDuration(Math.floor(elapsed / 1000));
      }, 100);
    }
    return () => { if (interval) clearInterval(interval); };
  }, [isRecording, isPaused]);

  const visualizeAudio = (stream: MediaStream) => {
    audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    analyserRef.current = audioContextRef.current.createAnalyser();
    const source = audioContextRef.current.createMediaStreamSource(stream);
    source.connect(analyserRef.current);
    analyserRef.current.fftSize = 256;
    
    const bufferLength = analyserRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const updateLevel = () => {
      if (!analyserRef.current) return;
      
      analyserRef.current.getByteFrequencyData(dataArray);
      const average = dataArray.reduce((a, b) => a + b) / bufferLength;
      setAudioLevel(average / 255);
      
      animationFrameRef.current = requestAnimationFrame(updateLevel);
    };

    updateLevel();
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        onRecordingComplete(audioBlob, duration);
        
        stream.getTracks().forEach(track => track.stop());
        if (audioContextRef.current) {
          audioContextRef.current.close();
        }
      };

      mediaRecorder.start();
      startTimeRef.current = Date.now();
      pausedTimeRef.current = 0;
      setIsRecording(true);
      setIsPaused(false);
      visualizeAudio(stream);
      
      toast.success("Gravação iniciada");
    } catch (error) {
      console.error("Error starting recording:", error);
      toast.error("Erro ao acessar o microfone. Verifique as permissões.");
    }
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.pause();
      setIsPaused(true);
      pausedTimeRef.current = Date.now() - startTimeRef.current - pausedTimeRef.current;
      toast.info("Gravação pausada");
    }
  };

  const resumeRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "paused") {
      mediaRecorderRef.current.resume();
      setIsPaused(false);
      startTimeRef.current = Date.now() - pausedTimeRef.current;
      toast.info("Gravação retomada");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsPaused(false);
      setDuration(0);
      setAudioLevel(0);
      toast.success("Gravação finalizada");
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col items-center justify-center space-y-6 py-8">
      {/* Recording Button */}
      <div className="relative">
        <Button
          size="lg"
          variant={isRecording ? "destructive" : "default"}
          className="h-32 w-32 rounded-full text-2xl shadow-lg"
          onClick={isRecording ? stopRecording : startRecording}
        >
          {isRecording ? <Square className="h-12 w-12" /> : <Mic className="h-12 w-12" />}
        </Button>
        
        {/* Pulse animation when recording */}
        {isRecording && !isPaused && (
          <div className="absolute inset-0 rounded-full bg-destructive animate-ping opacity-20" />
        )}
      </div>

      {/* Timer */}
      <div className="text-4xl font-mono font-bold text-foreground">
        {formatTime(duration)}
      </div>

      {/* Audio Level Visualization */}
      {isRecording && (
        <div className="w-full max-w-md">
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-100"
              style={{ width: `${audioLevel * 100}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground text-center mt-2">
            Nível de áudio
          </p>
        </div>
      )}

      {/* Control Buttons */}
      {isRecording && (
        <div className="flex gap-4">
          <Button
            variant="outline"
            size="lg"
            onClick={isPaused ? resumeRecording : pauseRecording}
          >
            {isPaused ? (
              <>
                <Play className="mr-2 h-5 w-5" />
                Retomar
              </>
            ) : (
              <>
                <Pause className="mr-2 h-5 w-5" />
                Pausar
              </>
            )}
          </Button>
        </div>
      )}

      {!isRecording && (
        <p className="text-sm text-muted-foreground text-center max-w-md">
          Clique no botão do microfone para iniciar a gravação da consulta
        </p>
      )}
    </div>
  );
}
