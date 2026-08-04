/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    /**
     * Les photos de salles sont hébergées par Cloudinary (voir lib/storage.ts).
     * Ajouter un hôte ici dès qu'une autre source d'images distantes est
     * branchée — par exemple les avatars renvoyés par un provider OAuth.
     */
    remotePatterns: [
      { protocol: "https", hostname: "res.cloudinary.com", pathname: "/**" },
    ],
  },

  experimental: {
    serverActions: {
      /**
       * Le formulaire salle accepte jusqu'à 8 photos de 5 Mo (`PHOTO_LIMITS`).
       * La valeur par défaut de Next est 1 Mo : sans ce relèvement, l'envoi
       * échouerait avant même d'atteindre la validation.
       */
      bodySizeLimit: "45mb",
    },
  },
};

export default nextConfig;
