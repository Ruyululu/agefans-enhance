import 'plyr/dist/plyr.css'
import './global.scss'
import './adapter'
import { runtime } from './runtime'

import { templateSettings } from 'lodash-es'
templateSettings.interpolate = /{{([^#-][\s\S]+?)}}/g
templateSettings.escape = /{{-([\s\S]+?)}}/g
templateSettings.evaluate = /{{#([\s\S]+?)}}/g

runtime.run()
