// Own PostCSS config so builds inside a parent repo (e.g. a monorepo with Tailwind) don't inherit
// the parent's config. The site uses plain CSS, so no plugins are needed.
const config = { plugins: [] };

export default config;
