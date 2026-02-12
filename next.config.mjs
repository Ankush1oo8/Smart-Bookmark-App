/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: [
      "lh3.googleusercontent.com", // Google profile pictures
      "avatars.githubusercontent.com" // GitHub profile pictures
      // Add other domains here if you use other image hosts for profile pictures
    ]
  }
};

export default nextConfig;
