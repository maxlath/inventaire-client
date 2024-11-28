import { getEndpointPathBuilders } from './endpoint.ts'

const { action } = getEndpointPathBuilders('activitypub')

export default {
  followers (name) { return action('followers', { name }) },
}
