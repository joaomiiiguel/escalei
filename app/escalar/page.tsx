import Link from "next/link";
import { Badge, BudgetBar, Button, Chip } from "@/components/ui";

const players = ["Goleiro", "Lateral esquerdo", "Zagueiro", "Zagueiro", "Lateral direito", "Meia", "Meia", "Meia", "Atacante", "Atacante", "Atacante"];
const market = [["Cássio", "CRU", "GOL", "C$ 8,40"], ["Arrascaeta", "FLA", "MEI", "C$ 15,20"], ["Vitor Roque", "PAL", "ATA", "C$ 12,80"]];

export default function Lineup() {
  return (
    <main className="lineup-page">
      <header className="lineup-header">
        <Link href="/">←</Link>
        <div>
          <Badge tone="success">RODADA 01 · ABERTA</Badge>
          <h1>Escalar time</h1>
        </div>
        <Link href="/mercado">⌕</Link>
      </header>
      <div className="lineup-formation">
        <div>
          <Chip active>4-3-3</Chip>
          <span>0/11 jogadores</span>
        </div>
        <BudgetBar value={100} />
      </div>
      <section className="pitch" aria-label="Campo de escalação">{players.map((position, index) => <button className="pitch-slot" key={`${position}-${index}`}><span>＋</span><b>{position}</b></button>)}</section><section className="market-preview"><div><h2>Mercado</h2><Link href="/mercado">Ver todos</Link></div>{market.map(([name, club, position, price]) => <Link className="market-player" href={`/jogadores/${name.toLowerCase().replaceAll(" ", "-")}`} key={name}><span className="market-player__badge">{club}</span><strong>{name}<small>{position}</small></strong><b>{price}</b><i>＋</i></Link>)}</section><Button disabled>Salvar escalação</Button></main>)
}
