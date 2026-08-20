import { withoutBase, joinURL } from 'ufo'

// routeRules redirects use a literal Location header and don't get prefixed
// with app.baseURL, so the '/' -> '/search' redirect is handled here instead,
// where we can build it against the runtime baseURL (NUXT_APP_BASE_URL).
export default defineEventHandler((event) => {
  const base = useRuntimeConfig().app.baseURL
  const path = withoutBase(event.path.split('?')[0], base)

  if (path === '/') {
    return sendRedirect(event, joinURL(base, 'search'), 307)
  }
})
