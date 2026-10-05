"use client";

import Link from "next/link";
import { Button } from "@/components/shadcn/button";

export default function InviteRequired() {
  return (
    <main className="mx-auto grid min-h-dvh max-w-[490px] place-items-center bg-[#0f1710] p-6 text-center text-[#f3f5f4]">
      <section className="grid max-w-[315px] gap-4">
        <p className="text-sm font-extrabold tracking-[0.4em] text-[#2fe06b]">ACESSO POR CONVITE</p>
        <h1 className="text-3xl font-extrabold leading-tight">Abra o link do seu grupo.</h1>
        <p className="text-base leading-6 text-[#a0a8af]">Cada grupo possui um link exclusivo para novos participantes.</p>
        <Link href="/entrar">
          <Button className="mt-1 h-12 w-full rounded-xl bg-[#2fe06b] text-[#06200f] hover:bg-[#49ef7c] text-lg font-bold">
            Já tenho uma conta
          </Button>
        </Link>
      </section>
    </main>
  );
}
