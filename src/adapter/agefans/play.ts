import { template } from 'lodash-es'
import { closestSameDay } from '../../utils/date'
import { sleep } from '../../utils/sleep'
import { local } from '../../utils/storage'
import { defineIframePlayer } from '../common/defineIframePlayer'
import T from './subscribe.template.html'

function calcSortDirection() {
  const $active = getActive()
  const $prev = $active.prev()
  const $next = $active.next()

  const prevText = $prev.text().match(/\d+/)?.[0]
  const nextText = $next.text().match(/\d+/)?.[0]
  const activeText = $active.text().match(/\d+/)?.[0]

  const prev = Number(prevText)
  const current = Number(activeText)
  const next = Number(nextText)

  if (prevText) {
    if (prev < current) {
      local.setItem('sortDirection', 'asc')
    } else {
      local.setItem('sortDirection', 'desc')
    }
  } else if (nextText) {
    if (next > current) {
      local.setItem('sortDirection', 'asc')
    } else {
      local.setItem('sortDirection', 'desc')
    }
  } else {
    local.setItem('sortDirection', 'asc')
  }
  return local.getItem('sortDirection') as 'asc' | 'desc'
}

function getActiveTabIndex() {
  const pathname = window.location.pathname
  const match = pathname.match(/play\/.*\/(\d+)\/(\d+)/)
  if (match) {
    const activeTab = match[1]
    return Number(activeTab) - 1
  }
  return null
}

function getSortButon() {
  return $('button:contains("更改排序")')
}

function rememberSortDirection() {
  const $btn = getSortButon()
  $btn.on('click', () => {
    setTimeout(() => {
      calcSortDirection()
      activeScrollIntoView()
    }, 100)
  })
}

function getSortDirection() {
  return local.getItem('sortDirection', 'asc') as 'asc' | 'desc'
}

function restoreSortDirection() {
  const sortDirection = getSortDirection()

  if (sortDirection === 'desc') {
    getSortButon().trigger('click')
  }
}

function activeScrollIntoView() {
  const $active = getActive()

  function getScrollParent() {
    let parent: HTMLElement | null = $active.parent()[0]
    while (parent && parent.tagName !== 'BODY') {
      const overflowY = getComputedStyle(parent).overflowY
      if (overflowY === 'auto' || overflowY === 'scroll') {
        return parent
      }
      parent = parent.parentElement
    }
    return document.body
  }

  const scrollEl = getScrollParent()
  const scrollRect = scrollEl.getBoundingClientRect()
  const activeRect = $active[0].getBoundingClientRect()

  // scrollEl scroll to $active position
  scrollEl.scrollTop += activeRect.top - scrollRect.top - 100
}
function insertFocusBtn() {
  const html = `
  <button id="k-focus" type="button" class="btn btn-sm btn-outline-light btn-playlist-order">聚焦</button>
  `

  $(html)
    .on('click', async () => {
      const idx = getActiveTabIndex()
      if (idx != null) {
        const $activeTab = $('.playlist-source-tab button[data-bs-toggle]').eq(
          idx
        )

        if (!$activeTab.hasClass('active')) {
          $activeTab.trigger('click')
          await sleep(100)
        }
      }

      activeScrollIntoView()
    })
    .prependTo('.playlist-source-tab .float-end')
}

function getActive() {
  return $('.video_detail_episode .video_detail_spisode_playing').parent()
}
function switchPart(next: boolean) {
  const $active = getActive()
  const sortDirection = getSortDirection()

  let $nextActive: JQuery<HTMLElement>

  if (sortDirection === 'asc') $nextActive = $active[next ? 'next' : 'prev']()
  else $nextActive = $active[next ? 'prev' : 'next']()

  return $nextActive.find('a').get(0)?.href
}

export const iframePlayer = defineIframePlayer({
  iframeSelector: '.video_play_wrapper iframe',
  getActive,
  setActive: (href) => {
    $<HTMLAnchorElement>('.video_detail_episode a').each((_, el) => {
      const $el = $(el)
      if (el.href === href) {
        $('.video_detail_spisode_playing').appendTo($el.parent())
      }
    })
    $('#k-focus').trigger('click')
  },
  search: {
    getSearchName: () =>
      $('.video_detail_wrapper .cata_video_item .card-title').text(),
    getEpisode: () => getActive().text(),
  },
  getEpisodeList: () => $('.video_detail_episode a'),
  getSwitchEpisodeURL: (next) => switchPart(next),
  subscribe: {
    storageKey: 'agefans-subscribe',
    getId: () => window.location.pathname.match(/play\/(\d+)/)![1],
    async getAnimeUpdateInfo(id, sm) {
      const html = await fetch(`/detail/${id}/`).then((res) => res.text())
      const $doc = $(html)

      const buildLabelSelector = (labels: string[]) =>
        labels
          .map((label) => `.detail_imform_tag:contains('${label}')`)
          .join(',')

      const getLabelValue = ($context: JQuery, keywords: string[]) =>
        $context
          .find(buildLabelSelector(keywords))[0]
          ?.nextSibling?.textContent?.trim() ?? ''

      const createdAtText = getLabelValue($doc, ['首播时间'])
      const statusText = getLabelValue($doc, ['播放状态'])

      const $lists = $doc.find('.video_detail_episode')
      const longest = $lists.get().reduce((max, el) => {
        return max.children.length >= el.children.length ? max : el
      }, $lists[0])
      const $last = $(longest).find('li a').last()

      let updatedAt: number
      const sub = sm.getSubscription(id)
      if (sub) {
        if (sub.last.url !== $last.attr('href')!) {
          updatedAt = closestSameDay(createdAtText).getTime()
        } else {
          updatedAt = sub.updatedAt
        }
      } else {
        updatedAt = closestSameDay(createdAtText).getTime()
      }

      return {
        updatedAt,
        status: statusText,
        last: { title: $last.text(), url: $last.attr('href')! },
      }
    },
    renderSubscribedAnimes: function ($root, sm) {
      const groups = sm.getSubscriptionsSortedByDay()

      $root.html(template(T.subList)({ groups }))
      $root.insertBefore('.weekly_list')

      $root.find('.force-update').on('click', async () => {
        iframePlayer.subscribe.checkSubscriptionsUpdates(true)
      })
    },
    renderSubscribeBtn($btn, sm) {
      const id = this.getId()
      const sub = sm.getSubscription(id)
      $btn.on('click', async () => {
        $btn.text('处理中...')
        if (sub) {
          sm.deleteSubscription(id)
        } else {
          const updateInfo = await this.getAnimeUpdateInfo(id, sm)
          const $current = getActive()

          sm.createSubscription({
            id,
            title: $(
              '.video_detail_wrapper .cata_video_item .card-title'
            ).text(),
            url: $('.player-title-link').attr('href')!,
            thumbnail: $('.video_thumbs').attr('src')!,
            createdAt: Date.now(),
            checkedAt: Date.now(),
            current: {
              title: $current.text(),
              url: $current.find('a').attr('href')!,
            },
            ...updateInfo,
          })
        }
      })

      $btn.addClass('btn video_detail_meta float-end')
      $btn.insertAfter($('.video_detail_meta.feedback-popover.float-end'))
    },
  },
})

export function playModule() {
  $<HTMLAnchorElement>('.video_detail_episode a').each((_, el) => {
    if (el.href) el.href = el.href.replace('http://', 'https://')
  })
  iframePlayer.runInTop()

  rememberSortDirection()
  restoreSortDirection()
  insertFocusBtn()
  activeScrollIntoView()
}
export function playModuleInIframe() {
  iframePlayer.runInIframe()
}
