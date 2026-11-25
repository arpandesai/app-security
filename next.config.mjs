/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  // The Framework page is a static page built from the ruleset by `npm run framework`.
  async rewrites() {
    return [{ source: "/framework", destination: "/framework.html" }];
  },
};
export default nextConfig;
