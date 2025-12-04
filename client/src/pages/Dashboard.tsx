import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { Loader2, Mic, FileText, Calendar, User } from "lucide-react";
import { Link } from "wouter";
import { getLoginUrl } from "@/const";

export default function Dashboard() {
  const { user, loading: authLoading } = useAuth();
  const { data: consultations, isLoading } = trpc.consultations.list.useQuery(undefined, {
    enabled: !!user,
  });

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-white">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-bold text-primary">DentScribe AI</CardTitle>
            <CardDescription className="text-lg">
              Assistente de IA para consultas odontológicas
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-center text-muted-foreground">
              Grave consultas, transcreva automaticamente e gere notas clínicas estruturadas com IA especializada em odontologia.
            </p>
            <Button className="w-full" size="lg" asChild>
              <a href={getLoginUrl()}>Entrar com Manus</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "draft":
        return <Badge variant="secondary">Rascunho</Badge>;
      case "finalized":
        return <Badge variant="default">Finalizada</Badge>;
      case "exported":
        return <Badge variant="outline">Exportada</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-primary">DentScribe AI</h1>
            <p className="text-sm text-muted-foreground">Assistente de IA para Odontologia</p>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="outline" asChild>
              <Link href="/patients">
                <User className="mr-2 h-4 w-4" />
                Pacientes
              </Link>
            </Button>
            <div className="text-right">
              <p className="text-sm font-medium">{user.name}</p>
              <p className="text-xs text-muted-foreground">{user.email}</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container py-8">
        {/* New Consultation Card */}
        <Card className="mb-8 border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold mb-2">Nova Consulta</h2>
                <p className="text-muted-foreground">
                  Inicie uma nova gravação e análise de consulta odontológica
                </p>
              </div>
              <Button size="lg" className="gap-2" asChild>
                <Link href="/new-consultation">
                  <Mic className="h-5 w-5" />
                  Iniciar Gravação
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Recent Consultations */}
        <div>
          <h2 className="text-xl font-bold mb-4">Consultas Recentes</h2>
          
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : consultations && consultations.length > 0 ? (
            <div className="grid gap-4">
              {consultations.map((consultation) => (
                <Card key={consultation.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <FileText className="h-5 w-5 text-primary" />
                          <h3 className="font-semibold text-lg">{consultation.patientName}</h3>
                          {getStatusBadge(consultation.status)}
                        </div>
                        
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            {new Date(consultation.createdAt).toLocaleDateString('pt-BR', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                            })}
                          </span>
                          {consultation.audioDurationSeconds && (
                            <span>
                              Duração: {Math.floor(consultation.audioDurationSeconds / 60)}:{(consultation.audioDurationSeconds % 60).toString().padStart(2, '0')}
                            </span>
                          )}
                        </div>

                        {consultation.templateUsed && (
                          <p className="text-sm text-muted-foreground mt-2">
                            Template: {consultation.templateUsed}
                          </p>
                        )}
                      </div>

                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/consultation/${consultation.id}`}>
                            Ver Detalhes
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground mb-4">
                  Nenhuma consulta registrada ainda
                </p>
                <Button asChild>
                  <Link href="/new-consultation">
                    <Mic className="mr-2 h-4 w-4" />
                    Criar Primeira Consulta
                  </Link>
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
