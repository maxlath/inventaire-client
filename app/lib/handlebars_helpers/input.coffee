behavior = (name)-> require "modules/general/views/behaviors/templates/#{name}"
check = behavior 'success_check'
input = behavior 'input'

module.exports =
  input: (data, options)->
    unless data?
      _.log arguments, 'input arguments @err'
      throw new Error 'no data'

    # default data, overridden by arguments
    field =
      type: 'text'
    button =
      classes: 'success postfix'

    name = data.nameBase
    if name?
      field.id = name + 'Field'
      field.placeholder = _.i18n(name)
      button.id = name + 'Button'
      button.text = name

    if data.button?.icon?
      data.button.text = "<i class='fa fa-#{data.button.icon}'></i>"

    # data overriding happens here
    data =
      id: "#{name}Group"
      field: _.extend field, data.field
      button: _.extend button, data.button

    if data.special
      data.special = 'autocorrect="off" autocapitalize="off" autocomplete="off"'

    i = new Handlebars.SafeString input(data)

    if options is 'check' then new Handlebars.SafeString check(i)
    else i