export default function Loading() {
  return (
    <main className="mx-auto grid min-h-screen max-w-md gap-6 px-5 pb-28 pt-8" aria-busy="true" aria-label="Carregando início">
      <div className="h-14 w-44 animate-pulse rounded-xl bg-card-foreground" />
      <div className="h-32 animate-pulse rounded-2xl bg-card" />
      <div className="h-44 animate-pulse rounded-2xl bg-card" />
      <div className="h-52 animate-pulse rounded-2xl bg-card" />
      <span className="sr-only">Carregando dados...</span>
    </main>
  );
}
