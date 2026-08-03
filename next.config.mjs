/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    /**
     * Les photos de salles sont saisies par les propriétaires : l'hôte n'est
     * pas connu à l'avance. À restreindre au domaine du stockage définitif
     * (S3, Cloudinary…) dès que l'upload sera en place.
     */
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
};

export default nextConfig;
