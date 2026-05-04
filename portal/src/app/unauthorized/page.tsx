import Link from "next/link";

export default function UnauthorizedPage() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center">
      <h1 className="mb-2 text-2xl font-semibold text-foreground">
        Accesso non autorizzato
      </h1>
      <p className="mb-6 text-muted">
        Non hai i permessi per accedere a questa pagina.
      </p>
      <Link
        href="/"
        className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-hover"
      >
        Torna alla home
      </Link>
    </div>
  );
}
