import { getEndpointPathBuilders } from './endpoint.ts'

const { action } = getEndpointPathBuilders('activitypub')

export default {
  followers (params) { return action('followers', params) },
}
