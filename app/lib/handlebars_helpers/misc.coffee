{ moment } = window
{ SafeString } = Handlebars
wdPropPrefix = 'wdt:'

module.exports =
  i18n: (key, context)->
    # This function might be called before the tempates data arrived
    # returning '' early prevents to display undefined and make polyglot worry
    unless key? then return ''
    # easying the transition to a property system with prefixes
    # TODO: format i18n wikidata source files to include prefixes
    # and get rid of this hack
    if key[0..3] is wdPropPrefix then key = key.replace wdPropPrefix, ''
    # Allow to pass context through Handlebars hash object
    # ex: {{{i18n 'email_invitation_sent' email=this}}}
    if _.isObject context?.hash then context = context.hash
    return _.i18n key, context

  I18n: (args...)-> _.capitaliseFirstLetter @i18n.apply(@, args)

  capitalize: (str)-> _.capitaliseFirstLetter str

  link: (text, url, classes, title)->
    # Polymorphism: accept arguments as hash key/value pairs
    # ex: {{link i18n='see_on_website' i18nArgs='website=wikidata.org' url=wikidata.url classes='link'}}
    if _.isObject text.hash
      { i18n, i18nArgs, url, classes, title, titleAttrKey, titleAttrValue, simpleOpenedAnchor } = text.hash

      if titleAttrKey?
        titleArgs = {}
        titleArgs[titleAttrKey] = titleAttrValue
        title = _.i18n title, titleArgs

      # A flag to build a complex <a> tag but with more tags between the anchor tags
      if simpleOpenedAnchor
        text = ''
      else
        # Expect i18nArgs to be a string formatted as a querystring
        i18nArgs = _.parseQuery i18nArgs
        text = _.i18n i18n, i18nArgs

    link = @linkify text, url, classes, title

    if simpleOpenedAnchor
      # Return only the first tag to let the possibility to add a complex innerHTML
      return new SafeString link.replace('</a>', '')
    else
      return new SafeString link

  i18nLink: (text, url, context)->
    text = _.i18n text, context
    @link text, url

  limit: (text, limit)->
    return ''  unless text?
    t = text[0..limit]
    if text.length > limit then t += '[...]'
    new SafeString t

  ifvalue: (attr, value)->
    if value? then "#{attr}=#{value}"
    else return

  inlineOptions: (options)->
    str = ''
    str += "#{k}:#{v}; "  for k, v of options
    return str

  linkify: require './linkify'

  debug: ->
    _.log arguments, 'hb debug arguments'
    _.log this, 'hb debug this'
    return JSON.stringify arguments[0]

  timeFromNow: (time)-> moment(time).fromNow()

  # Tailored for arrays of YYYY-MM-DD date format and returns just the year: YYYY
  dateYear: (dateArray)-> dateArray[0]?.split('-')[0]
