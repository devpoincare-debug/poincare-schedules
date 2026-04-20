import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // On autorise l'adresse IP de votre réseau local (votre téléphone)
  allowedDevOrigins: ['192.168.100.117'],
};

export default nextConfig;