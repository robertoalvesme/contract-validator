import { Agent, setGlobalDispatcher } from 'undici'

export default defineNitroPlugin(() => {
  // Avaya portal uses certificates that may not be in Node.js default trust store.
  // Disable SSL verification for all outbound requests from this server.
  setGlobalDispatcher(
    new Agent({ connect: { rejectUnauthorized: false } }),
  )
})
