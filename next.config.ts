import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // A lista de espera saiu de /beta para a Home. Links antigos (bio, posts) continuam funcionando;
  // o redirecionamento mantém a query, então o utm_source chega ao formulário.
  async redirects() {
    return [{ source: "/beta", destination: "/", permanent: false }];
  },
};

export default nextConfig;
