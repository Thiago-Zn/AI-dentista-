import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { Loader2, ArrowLeft, User, Calendar, Phone, Mail, FileText, AlertTriangle } from "lucide-react";
import { useLocation, useParams, Link } from "wouter";
import { getLoginUrl } from "@/const";

export default function PatientDetail() {
  const [, setLocation] = useLocation();
  const params = useParams();
  const patientId = params.id ? parseInt(params.id) : null;
  
  const { user, loading: authLoading } = useAuth();
  const { data: patient, isLoading } = trpc.patients.getById.useQuery(
    { id: patientId! },
    { enabled: !!user && !!patientId }
  );

  const { data: consultations, isLoading: consultationsLoading } = trpc.consultations.list.useQuery(
    undefined,
    { enabled: !!user }
  );

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

  if (!patient) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground mb-4">Paciente não encontrado</p>
            <Button onClick={() => setLocation("/patients")}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar para Pacientes
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const patientConsultations = consultations?.filter(c => c.patientName === patient.name) || [];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => setLocation("/patients")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
            <div>
              <h1 className="text-xl font-bold">{patient.name}</h1>
              <p className="text-sm text-muted-foreground">Informações do paciente</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container py-8 max-w-6xl">
        <div className="grid gap-6 md:grid-cols-3">
          {/* Patient Info */}
          <div className="md:col-span-1 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Dados Pessoais
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {patient.birthDate && (
                  <div className="flex items-start gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">Data de Nascimento</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(patient.birthDate).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  </div>
                )}

                {patient.phone && (
                  <div className="flex items-start gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">Telefone</p>
                      <p className="text-sm text-muted-foreground">{patient.phone}</p>
                    </div>
                  </div>
                )}

                {patient.email && (
                  <div className="flex items-start gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">Email</p>
                      <p className="text-sm text-muted-foreground">{patient.email}</p>
                    </div>
                  </div>
                )}

                {patient.cpf && (
                  <div>
                    <p className="text-sm font-medium">CPF</p>
                    <p className="text-sm text-muted-foreground">{patient.cpf}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Medical Info */}
            {(patient.medicalHistory || patient.allergies || patient.medications) && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Informações Médicas
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {patient.medicalHistory && (
                    <div>
                      <p className="text-sm font-medium mb-1">Histórico Médico</p>
                      <p className="text-sm text-muted-foreground">{patient.medicalHistory}</p>
                    </div>
                  )}

                  {patient.allergies && (
                    <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="h-4 w-4 text-destructive mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-destructive">Alergias</p>
                          <p className="text-sm text-destructive/80">{patient.allergies}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {patient.medications && (
                    <div>
                      <p className="text-sm font-medium mb-1">Medicações em Uso</p>
                      <p className="text-sm text-muted-foreground">{patient.medications}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Consultation History */}
          <div className="md:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Histórico de Consultas</CardTitle>
                <CardDescription>
                  {patientConsultations.length} consulta(s) registrada(s)
                </CardDescription>
              </CardHeader>
              <CardContent>
                {consultationsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : patientConsultations.length > 0 ? (
                  <div className="space-y-3">
                    {patientConsultations.map((consultation) => (
                      <div
                        key={consultation.id}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <FileText className="h-4 w-4 text-primary" />
                            <span className="font-medium">
                              {new Date(consultation.createdAt).toLocaleDateString('pt-BR', {
                                day: '2-digit',
                                month: 'long',
                                year: 'numeric',
                              })}
                            </span>
                            {consultation.status === "draft" && <Badge variant="secondary">Rascunho</Badge>}
                            {consultation.status === "finalized" && <Badge variant="default">Finalizada</Badge>}
                          </div>
                          {consultation.templateUsed && (
                            <p className="text-sm text-muted-foreground">
                              Template: {consultation.templateUsed}
                            </p>
                          )}
                        </div>
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/consultation/${consultation.id}`}>
                            Ver Consulta
                          </Link>
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                    <p className="text-muted-foreground mb-4">
                      Nenhuma consulta registrada para este paciente
                    </p>
                    <Button asChild>
                      <Link href="/new-consultation">
                        Criar Nova Consulta
                      </Link>
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
