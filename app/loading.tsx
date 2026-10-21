export default function Loading() {
  return (
    <main className="mx-auto grid h-screen max-w-lg gap-6 px-5 pb-28 pt-8" aria-busy="true" aria-label="Carregando início">
      <div className="h-10 w-2/3 mx-auto animate-pulse rounded-xl bg-secondary/60" />
      <div className="h-16 animate-pulse rounded-xl bg-secondary/60" />
      <div className="h-36 animate-pulse rounded-2xl bg-secondary/60" />
      <div className="h-48 animate-pulse rounded-2xl bg-secondary/60" />
      <div className="h-12 animate-pulse rounded-2xl bg-secondary/60 mt-6" />
      <div className="h-12 animate-pulse rounded-2xl bg-secondary/60" />
      <div className="h-12 animate-pulse rounded-2xl bg-secondary/60" />
      <div className="h-12 animate-pulse rounded-2xl bg-secondary/60" />
      <div className="h-12 animate-pulse rounded-2xl bg-secondary/60" />
    </main>
  );
}
