import endpoint from './endpoint'
const { action } = endpoint('tasks')
const byEntitiesUris = name => uris => {
  uris = _.forceArray(uris).join('|')
  return action(`by-${name}-uris`, { uris })
}

export default {
  byIds (ids) { return action('by-ids', { ids }) },
  byScore (limit, offset) { return action('by-score', { limit, offset }) },
  bySuspectUris: byEntitiesUris('suspect'),
  bySuggestionUris: byEntitiesUris('suggestion'),
  update: action('update')
}
