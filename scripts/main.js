/**
 * CoC7 Conteneurs : un objet CoC7 (type « item ») ou Investigateurs de l'Ombre (type « equipement ») devient un conteneur.
 * Données : flags.coc7-conteneurs.isContainer (booléen) et flags.coc7-conteneurs.contents
 * (liste de { entryId, data } où data est la copie de l'objet rangé). Rien n'est modifié dans CoC7 :
 * si le module est désactivé, le conteneur reste un objet ordinaire.
 */
const ID = 'coc7-conteneurs'
/* Deux systèmes : CoC7 et Investigateurs de l'Ombre (types d'objets en français). */
const IO = () => game.system.id === 'investigateurs-ombre'
const TYPE_SAC = () => (IO() ? 'equipement' : 'item')
const ACCEPTED_COC7 = ['item', 'book', 'weapon', 'spell', 'armor']
const ACCEPTED_IO = ['equipement', 'tome', 'arme', 'sort']
const COC7_VERS_IO = { item: 'equipement', book: 'tome', weapon: 'arme', spell: 'sort', armor: 'equipement' }
const accepte = (type) => (IO() ? ACCEPTED_IO : ACCEPTED_COC7).includes(type)
/** Une copie rangée sous CoC7 ressort avec un type valable dans Investigateurs de l'Ombre. */
const typeSortie = (data) => { if (IO() && COC7_VERS_IO[data.type]) data.type = COC7_VERS_IO[data.type]; return data }
const OPEN = new Map()

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
const isContainer = (item) => item?.type === TYPE_SAC() && item.getFlag(ID, 'isContainer') === true
const getContents = (item) => { const c = item.getFlag(ID, 'contents'); return Array.isArray(c) ? c : [] }
const setContents = (item, arr) => item.setFlag(ID, 'contents', arr)
const t = (key, data) => (data ? game.i18n.format(`CC.${key}`, data) : game.i18n.localize(`CC.${key}`))
const countLabel = (n) => t(n === 1 || n === 0 ? 'items.one' : 'items.other', { n })
const fmt = (x) => (Math.round(x * 100) / 100).toLocaleString(game.i18n.lang)

/** Poids d'une entrée rangée : poids × quantité, plus tout ce qu'elle contient si c'est un conteneur. */
const entryWeight = (data) => {
  const w = Number(data?.system?.weight) || 0
  const q = Number.isFinite(Number(data?.system?.quantity)) ? Number(data.system.quantity) : 1
  return w * q + contentsWeight(data?.flags?.[ID]?.contents)
}
function contentsWeight (entries) { return Array.isArray(entries) ? entries.reduce((a, e) => a + entryWeight(e.data), 0) : 0 }
const capacityOf = (root, path = []) => {
  if (!path.length) return Number(root.getFlag(ID, 'capacity')) || 0
  return Number(getNode(root, path)?.entry?.data?.flags?.[ID]?.capacity) || 0
}
const nameOf = (root, path = []) => (path.length ? getNode(root, path)?.entry?.data?.name : root.name) ?? root.name

/** Vérifie que `w` tient dans le conteneur désigné et dans tous ses parents ; `skip` = entrée déjà comptée qui va partir. */
function fits (root, path, w, skip = null) {
  for (let i = 0; i <= path.length; i++) {
    const p = path.slice(0, i)
    const cap = capacityOf(root, p); if (!cap) continue
    const node = getNode(root, p); if (!node) continue
    let total = contentsWeight(node.entries)
    if (skip && skip.root.uuid === root.uuid && p.every((id, k) => skip.path[k] === id)) total -= skip.weight
    if (total + w > cap + 1e-9) return { ok: false, box: nameOf(root, p), total: fmt(total + w), cap: fmt(cap) }
  }
  return { ok: true }
}

/** Parcourt les poupées russes : renvoie { entries, entry } du nœud désigné par path (liste d'entryId). */
function getNode (root, path = []) {
  let entries = getContents(root); let entry = null
  for (const id of path) {
    entry = entries.find((e) => e.entryId === id)
    if (!entry) return null
    entries = entry.data?.flags?.[ID]?.contents ?? []
  }
  return { entries, entry }
}

/** Modifie la liste d'un nœud (racine ou imbriqué) puis enregistre le tout sur l'objet racine. */
async function mutate (root, path, fn) {
  const rootEntries = foundry.utils.deepClone(getContents(root))
  let list = rootEntries
  for (const id of path) {
    const e = list.find((x) => x.entryId === id)
    if (!e) return false
    e.data.flags ??= {}; e.data.flags[ID] ??= {}; e.data.flags[ID].contents ??= []
    list = e.data.flags[ID].contents
  }
  fn(list)
  await setContents(root, rootEntries)
  return true
}

/** Range un objet (copie) dans le conteneur désigné ; l'original est supprimé s'il appartient à un acteur. */
async function storeItem (root, path, source) {
  if (source.uuid === root.uuid) { ui.notifications.warn(t('warn.self')); return }
  if (!accepte(source.type)) { ui.notifications.warn(t('warn.type')); return }
  const data = source.toObject()
  delete data._id; delete data.folder; delete data.ownership; delete data.sort
  const fit = fits(root, path, entryWeight(data))
  if (!fit.ok) { ui.notifications.warn(t('warn.capacity', { name: data.name, ...fit })); return }
  const ok = await mutate(root, path, (list) => list.push({ entryId: foundry.utils.randomID(), data }))
  if (ok && source.parent && source.isOwner) await source.delete()
}

/** Sort un objet d'un conteneur vers un acteur (ou en objet du monde si le conteneur n'est pas sur un acteur). */
async function takeOut (root, path, entryId, targetActor = null) {
  const node = getNode(root, path); if (!node) return
  const entry = node.entries.find((e) => e.entryId === entryId); if (!entry) return
  const data = typeSortie(foundry.utils.deepClone(entry.data))
  const actor = targetActor ?? root.parent
  if (actor) await actor.createEmbeddedDocuments('Item', [data])
  else await Item.implementation.create(data)
  await mutate(root, path, (list) => { list.splice(list.findIndex((e) => e.entryId === entryId), 1) })
}

/** Déplace une entrée d'un conteneur (fenêtre) vers un autre conteneur. */
async function moveEntry (src, root, path) {
  const srcRoot = await fromUuid(src.containerUuid); if (!srcRoot) return
  const srcNode = getNode(srcRoot, src.path ?? []); if (!srcNode) return
  const entry = srcNode.entries.find((e) => e.entryId === src.entryId); if (!entry) return
  if (srcRoot.uuid === root.uuid) {
    const mine = [...(src.path ?? []), src.entryId]
    if (mine.every((id, i) => path[i] === id)) { ui.notifications.warn(t('warn.nestSelf')); return }
    if ((src.path ?? []).join('/') === path.join('/')) return
  }
  const data = foundry.utils.deepClone(entry.data)
  const w = entryWeight(data)
  const fit = fits(root, path, w, { root: srcRoot, path: [...(src.path ?? [])], weight: w })
  if (!fit.ok) { ui.notifications.warn(t('warn.capacity', { name: data.name, ...fit })); return }
  await mutate(root, path, (list) => list.push({ entryId: foundry.utils.randomID(), data }))
  await mutate(srcRoot, src.path ?? [], (list) => { list.splice(list.findIndex((e) => e.entryId === src.entryId), 1) })
}

async function dropOnContainer (event, root, path = []) {
  let data
  try { data = JSON.parse(event.dataTransfer.getData('text/plain')) } catch (e) { return }
  try {
    if (data?.type === `${ID}-entry`) return await moveEntry(data, root, path)
    if (data?.type !== 'Item' || !data.uuid) return
    const source = await fromUuid(data.uuid)
    if (source) await storeItem(root, path, source)
  } catch (e) {
    console.error(ID, e); ui.notifications.error(t('err.drop'))
  }
}

const PRESET_KEYS = ['handbag', 'backpack', 'suitcase', 'satchel', 'briefcase', 'pouch', 'case', 'trunk']

/** Boîte de dialogue « Nouveau conteneur » : crée un objet-conteneur vide, dans le monde ou sur un acteur. */
async function createContainer (actor = null) {
  const { DialogV2 } = foundry.applications.api
  const PRESETS = PRESET_KEYS.map((k) => t(`presets.${k}`))
  const content = `<form class="cc-create">
    <div class="form-group"><label>${t('preset')}</label><select name="preset">${PRESETS.map((p) => `<option>${esc(p)}</option>`).join('')}<option value="">${t('other')}</option></select></div>
    <div class="form-group"><label>${t('name')}</label><input type="text" name="name" value="${esc(PRESETS[0])}"></div>
    <div class="form-group"><label>${t('image')}</label><div class="form-fields"><input type="text" name="img" value="icons/svg/item-bag.svg"><button type="button" class="cc-pick" data-tooltip="${t('pickImage')}"><i class="fa-solid fa-file-import"></i></button></div></div>
    <div class="form-group stacked"><label>${t('description')}</label><textarea name="desc" rows="3"></textarea></div>
  </form>`
  const result = await DialogV2.prompt({
    window: { title: t('new'), icon: 'fa-solid fa-suitcase' },
    content,
    rejectClose: false,
    ok: {
      label: t('create'),
      icon: 'fa-solid fa-check',
      callback: (event, button) => {
        const f = button.form
        return { name: f.elements.namedItem('name').value, img: f.elements.namedItem('img').value, desc: f.elements.namedItem('desc').value }
      }
    },
    render: (event, dialog) => {
      const root = dialog.element
      const preset = root.querySelector('[name="preset"]'); const name = root.querySelector('[name="name"]'); const img = root.querySelector('[name="img"]')
      let last = PRESETS[0]
      preset.addEventListener('change', () => { if (!name.value || name.value === last) name.value = preset.value; last = preset.value })
      root.querySelector('.cc-pick')?.addEventListener('click', () => {
        new foundry.applications.apps.FilePicker.implementation({ type: 'image', current: img.value, callback: (path) => { img.value = path } }).render(true)
      })
    }
  })
  if (!result) return
  const data = {
    name: (result.name || t('defaultName')).trim(),
    type: TYPE_SAC(),
    img: result.img || 'icons/svg/item-bag.svg',
    system: { description: { value: result.desc ? `<p>${esc(result.desc)}</p>` : '' } },
    flags: { [ID]: { isContainer: true, contents: [] } }
  }
  try {
    const doc = actor ? (await actor.createEmbeddedDocuments('Item', [data]))[0] : await Item.implementation.create(data)
    ui.notifications.info(t('created', { name: doc.name }))
  } catch (e) { console.error(ID, e); ui.notifications.error(t('err.create')) }
}

class ContainerApp extends foundry.applications.api.ApplicationV2 {
  static DEFAULT_OPTIONS = {
    classes: ['coc7-conteneurs-app'],
    window: { resizable: true, icon: 'fa-solid fa-suitcase' },
    position: { width: 440, height: 520 }
  }

  constructor (item, path = [], options = {}) {
    super(foundry.utils.mergeObject({ id: `${ID}-${item.uuid.replace(/\./g, '-')}-${path.join('-')}` }, options))
    this.item = item
    this.path = path
  }

  get key () { return `${this.item.uuid}|${this.path.join('/')}` }

  get node () { return getNode(this.item, this.path) }

  get title () { return this.path.length ? (this.node?.entry?.data?.name ?? this.item.name) : this.item.name }

  async _renderHTML () {
    const node = this.node
    const entries = node?.entries ?? []
    const n = entries.length
    const headImg = this.path.length ? node?.entry?.data?.img : this.item.img
    const crumbs = this.path.length ? `<span class="cc-crumb">${esc(t('crumb', { name: this.item.name }))}</span>` : ''
    const tiles = entries.map((e) => {
      const q = e.data?.system?.quantity
      const qty = (typeof q === 'number' && q > 1) ? `<span class="cc-qty">${q}</span>` : ''
      const isBox = e.data?.flags?.[ID]?.isContainer === true
      const inner = isBox ? (e.data.flags[ID].contents ?? []).length : 0
      const badge = isBox ? `<span class="cc-nest" data-tooltip="${t('container')}">${inner} <i class="fa-solid fa-suitcase"></i></span>` : ''
      return `<li class="cc-tile${isBox ? ' cc-box' : ''}" data-entry-id="${e.entryId}" draggable="true">
        <div class="cc-frame">
          <img class="cc-img" src="${esc(e.data?.img)}" alt="" draggable="false">
          ${qty}${badge}
          <div class="cc-actions">
            <a class="cc-btn" data-cc="take" data-tooltip="${t('take')}"><i class="fa-solid fa-arrow-right-from-bracket"></i></a>
            ${game.user.isGM ? `<a class="cc-btn cc-danger" data-cc="remove" data-tooltip="${t('destroy')}"><i class="fa-solid fa-trash"></i></a>` : ''}
          </div>
        </div>
        <a class="cc-name" data-cc="${isBox ? 'open' : 'view'}" data-tooltip="${isBox ? t('openThis') : t('viewSheet')}">${esc(e.data?.name)}</a>
      </li>`
    }).join('')
    const used = contentsWeight(entries); const cap = capacityOf(this.item, this.path)
    const pct = cap ? Math.min(100, Math.round((used / cap) * 100)) : 0
    const gm = game.user.isGM
    const gauge = (used > 0 || cap || gm)
      ? `<div class="cc-gauge${cap && used > cap ? ' cc-over' : ''}" ${gm ? `data-cc-head="capacity" data-tooltip="${t('capacityEdit')}"` : ''}>
          <span class="cc-gauge-txt"><i class="fa-solid fa-weight-hanging"></i> ${t('weightLine', { used: fmt(used), cap: cap ? fmt(cap) : t('unlimited') })}</span>
          ${cap ? `<span class="cc-bar"><span style="width:${pct}%"></span></span>` : ''}</div>`
      : ''
    const body = n
      ? `<ul class="cc-grid">${tiles}</ul>`
      : `<div class="cc-empty"><i class="fa-solid fa-suitcase"></i><p>${t('emptyTitle')}</p><small>${t('emptyHint')}</small></div>`
    return `<div class="cc-wrap">
      <header class="cc-head">
        <img class="cc-bag" src="${esc(headImg)}" alt="">
        <div class="cc-titles"><h2>${esc(this.title)}</h2><span>${countLabel(n)}</span>${crumbs}${gauge}</div>
      </header>
      <div class="cc-zone">${body}<div class="cc-drop-hint"><i class="fa-solid fa-hand-holding"></i> ${t('dropHint')}</div></div>
      <footer class="cc-foot">${t('footHint')}</footer>
    </div>`
  }

  _replaceHTML (result, content) { content.innerHTML = result }

  async #editCapacity () {
    const cur = capacityOf(this.item, this.path)
    const val = await foundry.applications.api.DialogV2.prompt({
      window: { title: t('capacity'), icon: 'fa-solid fa-weight-hanging' },
      content: `<div class="form-group"><label>${t('setCapacity')}</label><input type="number" name="cap" min="0" step="any" value="${cur}" autofocus></div>`,
      ok: { label: 'OK', icon: 'fa-solid fa-check', callback: (e, b) => Number(b.form.elements.namedItem('cap').value) },
      rejectClose: false
    })
    if (val === null || val === undefined || Number.isNaN(val)) return
    const v = Math.max(0, val)
    if (!this.path.length) await this.item.setFlag(ID, 'capacity', v)
    else await mutate(this.item, this.path.slice(0, -1), (list) => {
      const e = list.find((x) => x.entryId === this.path.at(-1)); if (!e) return
      e.data.flags ??= {}; e.data.flags[ID] ??= {}; e.data.flags[ID].capacity = v
    })
  }

  _onFirstRender () {
    const el = this.element
    OPEN.set(this.key, this)
    el.addEventListener('click', async (ev) => {
      if (ev.target.closest('[data-cc-head="capacity"]') && game.user.isGM) { await this.#editCapacity(); return }
      const a = ev.target.closest('[data-cc]'); if (!a) return
      const row = a.closest('[data-entry-id]'); if (!row) return
      const entryId = row.dataset.entryId
      try {
        if (a.dataset.cc === 'take') await takeOut(this.item, this.path, entryId)
        else if (a.dataset.cc === 'remove') await mutate(this.item, this.path, (list) => { list.splice(list.findIndex((e) => e.entryId === entryId), 1) })
        else if (a.dataset.cc === 'open') openContainer(this.item, [...this.path, entryId], this)
        else if (a.dataset.cc === 'view') {
          const entry = this.node.entries.find((e) => e.entryId === entryId)
          const d = entry.data
          const html = `<div class="cc-view"><img src="${esc(d.img)}" alt="" style="float:left;width:96px;height:96px;object-fit:cover;margin:0 12px 6px 0;border-radius:6px">${d.system?.description?.value ?? ''}${game.user.isGM && d.system?.description?.keeper ? `<hr>${d.system.description.keeper}` : ''}</div>`
          foundry.applications.api.DialogV2.prompt({ window: { title: d.name, icon: 'fa-solid fa-eye' }, content: html, ok: { label: t('close'), icon: 'fa-solid fa-check' }, position: { width: 460 }, rejectClose: false })
        }
      } catch (e) { console.error(ID, e); ui.notifications.error(t('err.action')) }
    })
    el.addEventListener('dragstart', (ev) => {
      const row = ev.target.closest('[data-entry-id]'); if (!row) return
      el.classList.add('cc-self')
      ev.dataTransfer.setData('text/plain', JSON.stringify({ type: `${ID}-entry`, containerUuid: this.item.uuid, path: this.path, entryId: row.dataset.entryId }))
    })
    let depth = 0
    const setDrop = (on) => el.classList.toggle('cc-dropping', on)
    el.addEventListener('dragenter', () => { if (el.classList.contains('cc-self')) return; depth++; setDrop(true) })
    el.addEventListener('dragleave', () => { depth = Math.max(0, depth - 1); if (!depth) setDrop(false) })
    el.addEventListener('dragover', (ev) => { ev.preventDefault() })
    el.addEventListener('dragend', () => { el.classList.remove('cc-self'); depth = 0; setDrop(false) })
    el.addEventListener('drop', (ev) => {
      ev.preventDefault(); ev.stopPropagation(); depth = 0; setDrop(false)
      const box = ev.target.closest('.cc-tile.cc-box')   // déposé sur un conteneur de la grille : on range dedans
      const path = box ? [...this.path, box.dataset.entryId] : this.path
      dropOnContainer(ev, this.item, path)
    })
  }

  async close (options) { OPEN.delete(this.key); return super.close(options) }
}

function openContainer (item, path = [], from = null) {
  const key = `${item.uuid}|${path.join('/')}`
  const existing = OPEN.get(key)
  if (existing) { existing.render({ force: true }); existing.bringToFront?.(); return }
  const options = {}
  if (from?.position) options.position = { left: (from.position.left ?? 100) + 36, top: (from.position.top ?? 100) + 36 }
  new ContainerApp(item, path, options).render({ force: true })
}

/** Ajoute les boutons et la zone de dépôt sur les lignes d'objets des fiches d'acteurs. */
function decorateActorSheet (app, root) {
  const actor = app.document
  if (!root || actor?.documentName !== 'Actor') return

  if (!root.dataset.ccDrop) {
    root.dataset.ccDrop = '1'
    root.addEventListener('drop', async (ev) => {
      let data
      try { data = JSON.parse(ev.dataTransfer.getData('text/plain')) } catch (e) { return }
      if (data?.type !== `${ID}-entry`) return
      if (ev.target.closest?.('li.cc-container')) return   // déposé sur un conteneur de la fiche : c'est lui qui s'en occupe
      ev.preventDefault(); ev.stopPropagation()
      try {
        const container = await fromUuid(data.containerUuid)
        if (container && app.document.isOwner) await takeOut(container, data.path ?? [], data.entryId, app.document)
      } catch (e) { console.error(ID, e); ui.notifications.error(t('err.take')) }
    }, true)
  }

  if (IO()) return decorerFicheIO(actor, root)
  root.querySelectorAll('.cc-new-sheet').forEach((n) => n.remove())
  const addBtn = root.querySelector('a[data-action="item-add"][data-type="item"]')
  if (addBtn && actor.isOwner) {
    const nb = document.createElement('a')
    nb.className = 'item-control cc-new-sheet'; nb.dataset.tooltip = t('new')
    nb.innerHTML = '<i class="fa-solid fa-suitcase"></i>'
    nb.addEventListener('click', (ev) => { ev.preventDefault(); ev.stopPropagation(); createContainer(actor) })
    addBtn.before(nb)
  }

  root.querySelectorAll('li.item[data-item-uuid]').forEach((li) => {
    const item = fromUuidSync(li.dataset.itemUuid, { strict: false })
    if (!item || item.type !== 'item') return
    const controls = li.querySelector('.item-controls')
    if (!controls) return
    li.querySelectorAll('.cc-ctrl').forEach((n) => n.remove())
    const make = (cc, icon, tip) => {
      const a = document.createElement('a')
      a.className = 'item-control cc-ctrl'; a.dataset.tooltip = tip
      a.innerHTML = `<i class="${icon}"></i>`
      a.addEventListener('click', async (ev) => {
        ev.preventDefault(); ev.stopPropagation()
        try {
          if (cc === 'open') openContainer(item)
          else if (cc === 'make') await item.update({ [`flags.${ID}.isContainer`]: true, [`flags.${ID}.contents`]: getContents(item) })
          else if (cc === 'unmake') {
            if (getContents(item).length) ui.notifications.warn(t('warn.emptyFirst'))
            else await item.unsetFlag(ID, 'isContainer')
          }
        } catch (e) { console.error(ID, e); ui.notifications.error(t('err.action')) }
      })
      return a
    }
    if (isContainer(item)) {
      li.classList.add('cc-container')
      const n = getContents(item).length
      const open = make('open', 'fa-solid fa-suitcase', t('open', { count: countLabel(n) }))
      controls.prepend(open)
      if (game.user.isGM) controls.prepend(make('unmake', 'fa-solid fa-ban', t('unmake')))
      li.addEventListener('dragover', (ev) => { ev.preventDefault(); li.classList.add('cc-over') })
      li.addEventListener('dragleave', () => li.classList.remove('cc-over'))
      li.addEventListener('drop', async (ev) => {
        let d; try { d = JSON.parse(ev.dataTransfer.getData('text/plain')) } catch (e) { return }
        if (d?.type !== 'Item' && d?.type !== `${ID}-entry`) return
        ev.preventDefault(); ev.stopPropagation(); li.classList.remove('cc-over')
        await dropOnContainer(ev, item, [])
      })
    } else if (game.user.isGM) {
      controls.prepend(make('make', 'fa-regular fa-suitcase', t('make')))
    }
  })
}

/** Fiches Investigateurs de l'Ombre : lignes .io-objet[data-item-id] de l'inventaire. */
function decorerFicheIO (actor, root) {
  root.querySelectorAll('.cc-new-sheet').forEach((n) => n.remove())
  const addBtn = root.querySelector('a.io-ajout[data-action="objetCreer"][data-type="equipement"]')
  if (addBtn && actor.isOwner) {
    const nb = document.createElement('a')
    nb.className = 'io-ajout cc-new-sheet'; nb.dataset.tooltip = t('new')
    nb.innerHTML = '<i class="fa-solid fa-suitcase"></i>'
    nb.addEventListener('click', (ev) => { ev.preventDefault(); ev.stopPropagation(); createContainer(actor) })
    addBtn.before(nb)
  }
  root.querySelectorAll('.io-objet[data-item-id]').forEach((li) => {
    const item = actor.items.get(li.dataset.itemId)
    if (!item || item.type !== TYPE_SAC()) return
    li.querySelectorAll('.cc-ctrl').forEach((n) => n.remove())
    const ancre = li.querySelector('[data-action="objetChat"]') ?? li.querySelector('.io-pastille')
    const ajouter = (a) => (ancre ? ancre.before(a) : li.append(a))
    const make = (cc, icon, tip) => {
      const a = document.createElement('a')
      a.className = 'io-pastille cc-ctrl'; a.dataset.tooltip = tip
      a.innerHTML = `<i class="${icon}"></i>`
      a.addEventListener('click', async (ev) => {
        ev.preventDefault(); ev.stopPropagation()
        try {
          if (cc === 'open') openContainer(item)
          else if (cc === 'make') await item.update({ [`flags.${ID}.isContainer`]: true, [`flags.${ID}.contents`]: getContents(item) })
          else if (cc === 'unmake') {
            if (getContents(item).length) ui.notifications.warn(t('warn.emptyFirst'))
            else await item.unsetFlag(ID, 'isContainer')
          }
        } catch (e) { console.error(ID, e); ui.notifications.error(t('err.action')) }
      })
      return a
    }
    if (isContainer(item)) {
      li.classList.add('cc-container')
      const n = getContents(item).length
      if (game.user.isGM) ajouter(make('unmake', 'fa-solid fa-ban', t('unmake')))
      ajouter(make('open', 'fa-solid fa-suitcase', t('open', { count: countLabel(n) })))
      li.addEventListener('dragover', (ev) => { ev.preventDefault(); li.classList.add('cc-over') })
      li.addEventListener('dragleave', () => li.classList.remove('cc-over'))
      li.addEventListener('drop', async (ev) => {
        let d; try { d = JSON.parse(ev.dataTransfer.getData('text/plain')) } catch (e) { return }
        if (d?.type !== 'Item' && d?.type !== `${ID}-entry`) return
        ev.preventDefault(); ev.stopPropagation(); li.classList.remove('cc-over')
        await dropOnContainer(ev, item, [])
      })
    } else if (game.user.isGM) {
      ajouter(make('make', 'fa-regular fa-suitcase', t('make')))
    }
  })
}

Hooks.on('renderApplicationV2', (app, element) => {
  try { decorateActorSheet(app, element) } catch (e) { console.error(ID, e) }
})
Hooks.on('renderItemDirectory', (app, element) => {
  try {
    if (!game.user.isGM) return
    const root = element instanceof HTMLElement ? element : element?.[0]
    if (!root) return
    root.querySelectorAll('.cc-new-dir').forEach((n) => n.remove())
    const host = root.querySelector('.header-actions') ?? root.querySelector('.directory-header')
    if (!host) return
    const b = document.createElement('button')
    b.type = 'button'; b.className = 'cc-new-dir'
    b.innerHTML = `<i class="fa-solid fa-suitcase"></i> ${t('new')}`
    b.addEventListener('click', () => createContainer())
    host.append(b)
  } catch (e) { console.error(ID, e) }
})
// Rafraîchissement groupé : au plus un rendu par fenêtre et par image, et seulement si l'objet touché la concerne.
const PENDING = new Set()
Hooks.on('updateItem', (item, changes) => {
  if (!OPEN.size) return
  if (!changes || !(changes.flags || 'name' in changes || 'img' in changes || changes.system)) return
  for (const app of OPEN.values()) if (app.item.uuid === item.uuid) PENDING.add(app)
  if (!PENDING.size) return
  requestAnimationFrame(() => {
    const apps = [...PENDING]; PENDING.clear()
    for (const app of apps) { try { if (app.node) app.render(); else app.close() } catch (e) { console.error(ID, e) } }
  })
})
Hooks.on('deleteItem', (item) => { if (!OPEN.size) return; for (const app of [...OPEN.values()]) if (app.item.uuid === item.uuid) app.close() })
Hooks.once('ready', () => console.log(`${ID} | ready`))
