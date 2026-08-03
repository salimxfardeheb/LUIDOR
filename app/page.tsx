import { Logo } from "@/components/ui/Logo";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-10 p-8">
      <Logo size="lg" />
      <div className="flex flex-col items-center gap-4">
        <Badge variant="info">Plateforme de réservation premium</Badge>
        <div className="flex gap-3">
          <Button size="lg">Explorer les salles</Button>
          <Button size="lg" variant="outline">
            Connexion
          </Button>
        </div>
      </div>
    </main>
  );
}