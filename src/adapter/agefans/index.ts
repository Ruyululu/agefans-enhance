import { runtime } from '../../runtime/index'
import './index.scss'
import { playModule, playModuleInIframe, iframePlayer } from './play'

runtime.register({
  domains: ['age.tv', 'agefans', 'agedm'],
  opts: [
    {
      test: '*',
      run: () => {
        $('body').addClass('agefans-wrapper')
      },
    },
    { test: '/', run: iframePlayer.subscribe.renderSubscribedAnimes },
    { test: '/play', run: playModule },
    { test: '/play', run: playModuleInIframe, runInIframe: true },
  ],
  search: {
    name: 'agefans',
    search: (cn) => `https://www.age.tv/search?query=${cn}`,
    getAnimeScope: () => window.location.href.match(/\/play\/(\d+)/)![1],
  },
})
