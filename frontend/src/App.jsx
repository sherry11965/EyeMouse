import { useEffect, useRef, useState } from 'react'

function socketURL() {
  const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:'

  // In development, bypass Vite's proxy so HMR and the game socket have
  // independent lifecycles. Production can provide VITE_WS_URL explicitly.
  if (import.meta.env.VITE_WS_URL) return import.meta.env.VITE_WS_URL
  if (import.meta.env.DEV) return `${protocol}//${location.hostname}:8080/ws`
  return `${protocol}//${location.host}/ws`
}

function closeSocket(ws, reason) {
  if (!ws || ws.readyState === WebSocket.CLOSED || ws.readyState === WebSocket.CLOSING) return
  if (ws.readyState === WebSocket.OPEN) ws.close(1000, reason)
  else ws.close()
}

function EntryPage({ onEnter }) {
  const [name, setName] = useState('')
  const [mode, setMode] = useState('offline')
  const [baseUrl, setBaseUrl] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [model, setModel] = useState('')
  const [generationTimeout, setGenerationTimeout] = useState(300)
  const [dialogueTimeout, setDialogueTimeout] = useState(120)
  return (
    <main className="entry-screen">
      <div className="entry-landscape" aria-hidden="true">
        <i className="mountain mountain-one" /><i className="mountain mountain-two" />
        <div className="entry-house house-one"><b /></div><div className="entry-house house-two"><b /></div>
        <div className="entry-road" /><div className="entry-bus">城乡公交</div>
      </div>
      <section className="entry-card pixel-panel">
        <p className="seal">ATOWN</p>
        <h1>来镇上<br />住几天</h1>
        <p>一座有学校、医院、小区、派出所、公园和日常生活的完整小镇。街坊、老人、家长和孩子都在这里过自己的日子。</p>
        <div className="mode-tabs"><button className={mode === 'offline' ? 'active' : ''} onClick={() => setMode('offline')}>离线模式<span>固定模板，直接进入</span></button><button className={mode === 'ai' ? 'active' : ''} onClick={() => setMode('ai')}>AI 模式<span>现场生成地图与剧情</span></button></div>
        <form onSubmit={(event) => { event.preventDefault(); onEnter({ name: name.trim() || '新居民', mode, ai: { baseUrl: baseUrl.trim(), apiKey: apiKey.trim(), model: model.trim(), generationTimeout: Number(generationTimeout), dialogueTimeout: Number(dialogueTimeout) } }) }}>
          <label htmlFor="name">大家怎么称呼你？</label>
          <div><input id="name" value={name} maxLength={10} onChange={(event) => setName(event.target.value)} placeholder="新邻居" /><button>下车进镇</button></div>
          {mode === 'ai' && <section className="ai-config"><label>OpenAI 兼容 API Base URL<input value={baseUrl} onChange={(event) => setBaseUrl(event.target.value)} placeholder="https://api.example.com/v1" /></label><label>模型名称<input value={model} onChange={(event) => setModel(event.target.value)} placeholder="gpt-4o-mini" /></label><label>API Key<input type="password" value={apiKey} onChange={(event) => setApiKey(event.target.value)} placeholder="sk-..." required /></label><div className="timeout-fields"><label>城镇生成超时（秒）<input type="number" min="60" max="900" value={generationTimeout} onChange={(event) => setGenerationTimeout(event.target.value)} /></label><label>NPC 对话超时（秒）<input type="number" min="30" max="300" value={dialogueTimeout} onChange={(event) => setDialogueTimeout(event.target.value)} /></label></div><p>必须填写 API 地址而不是网关首页，通常以 /v1 结尾；也支持直接填写完整的 /chat/completions 地址。大型城镇生成建议设置 300 至 600 秒。</p></section>}
        </form>
        <small>方向键 / WASD 移动　E 键交谈　F 键生活互动</small>
      </section>
    </main>
  )
}

function LoadingPage({ progress }) {
  const total = progress.total || 4
  const percent = Math.min(100, ((progress.step || 1) / total) * 100)
  return (
    <main className="loading-screen">
      <div className="loading-town">
        <div className="sun" /><div className="ridge" />
        <div className="loading-roofs">⌂　⌂　⌂　⌂</div>
      </div>
      <div className="loading-text"><header><span>{progress.phase || '生成世界'}</span><b>{progress.step || 1}/{total}</b></header><p>{progress.message}</p><i><b style={{ width: `${percent}%` }} /></i></div>
    </main>
  )
}

const directions = {
  ArrowUp: [0, -1], w: [0, -1], W: [0, -1],
  ArrowDown: [0, 1], s: [0, 1], S: [0, 1],
  ArrowLeft: [-1, 0], a: [-1, 0], A: [-1, 0],
  ArrowRight: [1, 0], d: [1, 0], D: [1, 0],
}

function TownGame({ state, send, messages, thinking, dialogueError, clearDialogueError, hotelOptions, closeHotel }) {
  const [dialogueNPC, setDialogueNPC] = useState(null)
  const [text, setText] = useState('')
  const [target, setTarget] = useState(null)
  const [guideOpen, setGuideOpen] = useState(true)
  const [showSkipConfirm, setShowSkipConfirm] = useState(false)
  const scene = state.scenes.find((item) => item.id === state.player.sceneId)
  const presentNPCs = state.npcs.filter((npc) => npc.sceneId === scene.id)
  const presentObjects = state.objects.filter((object) => object.sceneId === scene.id)
  const interactiveObjects = presentObjects.filter((object) => object.action)
  const activeNPC = state.npcs.find((npc) => npc.id === dialogueNPC)
  const nearby = presentNPCs.find((npc) => npc.canDialogue && Math.abs(npc.x - state.player.x) + Math.abs(npc.y - state.player.y) <= 2)
  const nearbyObject = interactiveObjects.find((object) => Math.abs(object.x - state.player.x) + Math.abs(object.y - state.player.y) <= 2)
  const playerRef = useRef(null)
  const previousScene = useRef(scene.id)

  useEffect(() => {
    playerRef.current?.scrollIntoView({ block: 'center', inline: 'center', behavior: 'auto' })
  }, [scene.id])

  // 使用ref跟踪是否正在等待服务器响应
  const waitingForMove = useRef(false)
  
  useEffect(() => {
    if (previousScene.current !== scene.id) {
      previousScene.current = scene.id
      setTarget(null)
      setDialogueNPC(null)
      waitingForMove.current = false
      return
    }
    if (!target || dialogueNPC || state.gameOver) return
    if (state.player.x === target.x && state.player.y === target.y) {
      setTarget(null)
      waitingForMove.current = false
      return
    }
    // 如果正在等待服务器响应，不发送新请求
    if (waitingForMove.current) return
    
    waitingForMove.current = true
    // 使用较短的延迟，但等待服务器响应
    const timer = window.setTimeout(() => {
      send({ type: 'move_to', targetX: target.x, targetY: target.y })
      // 服务器响应后会更新player位置，触发下一次effect
    }, 50)
    return () => {
      window.clearTimeout(timer)
      // 注意：不要在这里设置waitingForMove.current = false
      // 因为服务器响应后会更新位置，触发新的effect
    }
  }, [state.player.x, state.player.y, scene.id, state.gameOver, target, dialogueNPC, send])
  
  // 当位置更新后，重置等待标志
  useEffect(() => {
    waitingForMove.current = false
  }, [state.player.x, state.player.y])

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.target.matches('input, textarea') || guideOpen || dialogueNPC || state.gameOver) return
      if (directions[event.key]) {
        event.preventDefault()
        setTarget(null)
        send({ type: 'step', dx: directions[event.key][0], dy: directions[event.key][1] })
      }
      if ((event.key === 'e' || event.key === 'E' || event.key === 'Enter') && nearby) {
        event.preventDefault()
        setDialogueNPC(nearby.id)
      }
      if ((event.key === 'f' || event.key === 'F') && nearbyObject) {
        event.preventDefault()
        send({ type: 'interact', objectId: nearbyObject.id })
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [dialogueNPC, guideOpen, nearby, nearbyObject, send, state.gameOver])

  const clickTile = (x, y) => {
    if (guideOpen || dialogueNPC || state.gameOver) return
    setTarget({ x, y })
    send({ type: 'move_to', targetX: x, targetY: y })
  }

  const clickNPC = (npc) => {
    if (!npc.canDialogue) return
    const distance = Math.abs(npc.x - state.player.x) + Math.abs(npc.y - state.player.y)
    if (distance <= 2) {
      setDialogueNPC(npc.id)
      return
    }
    const spots = [[npc.x, npc.y + 1], [npc.x - 1, npc.y], [npc.x + 1, npc.y], [npc.x, npc.y - 1]]
    const spot = spots.find(([x, y]) => x >= 0 && y >= 0 && x < scene.width && y < scene.height)
    if (spot) clickTile(spot[0], spot[1])
  }

  const clickObject = (object) => {
    if (!object.action) return
    const distance = Math.abs(object.x - state.player.x) + Math.abs(object.y - state.player.y)
    if (distance <= 2) {
      send({ type: 'interact', objectId: object.id })
      return
    }
    const spots = [[object.x, object.y + 1], [object.x - 1, object.y], [object.x + 1, object.y], [object.x, object.y - 1]]
    const spot = spots.find(([x, y]) => x >= 0 && y >= 0 && x < scene.width && y < scene.height)
    if (spot) clickTile(spot[0], spot[1])
  }

  const enterBuilding = (building) => {
    if (guideOpen || dialogueNPC || state.gameOver) return
    setTarget({ x: building.doorX, y: building.doorY })
    send({ type: 'move_to', targetX: building.doorX, targetY: building.doorY })
  }

  const submit = (event) => {
    event.preventDefault()
    if (!text.trim() || thinking) return
    send({ type: 'dialogue', npcId: activeNPC.id, text: text.trim() })
    setText('')
  }

  return (
    <main className={`game-screen ${scene.id === 'town' ? 'outdoor' : 'indoor'}`}>
      <header className="game-header pixel-panel">
        <div><b>{state.name}</b><span>{state.theme}</span></div>
        <div className="place-name">{scene.name}</div>
        <div className="clock"><span>第 {state.day} 天 · {state.season} · {state.weather}</span><b>{state.time}</b></div>
      </header>

      <LifeHUD player={state.player} />
      {state.story && <StorySidebar story={state.story} mode={state.mode} onSkipProject={() => setShowSkipConfirm(true)} projectResolved={state.projectResolved} />}

      <section className="map-viewport">
        <div className="map-stage">
          <div className="pixel-map" style={{ '--columns': scene.width, '--rows': scene.height, '--tile-x': `${100 / scene.width}vw`, '--tile-y': `${100 / scene.height}dvh` }}>
            {scene.tiles.map((tile, index) => {
              const x = index % scene.width
              const y = Math.floor(index / scene.width)
              const verticalRoad = (x >= 7 && x <= 9) || (x >= 15 && x <= 17) || (x >= 23 && x <= 25) || (x >= 31 && x <= 33)
              const roadAxis = tile === 'road' ? (verticalRoad ? 'road-vertical' : 'road-horizontal') : ''
              const intersection = tile === 'road' && verticalRoad && ((y >= 6 && y <= 9) || (y >= 16 && y <= 19) || (y >= 22 && y <= 23)) ? 'road-intersection' : ''
              return <button aria-label={`${x},${y}`} className={`tile ${tile.replace(':', '-')} ${roadAxis} ${intersection}`} key={`${x}-${y}`} onClick={() => clickTile(x, y)} />
            })}
            {scene.id === 'town' && state.buildings.map((building) => <Building key={building.id} building={building} onEnter={() => enterBuilding(building)} />)}
            {presentObjects.map((object) => <WorldObject key={object.id} object={object} onClick={object.action ? () => clickObject(object) : undefined} />)}
            {presentNPCs.map((npc) => <PixelPerson key={npc.id} npc={npc} onClick={() => clickNPC(npc)} />)}
            <div ref={playerRef} className={`person player facing-${state.player.facing}`} style={{ '--x': state.player.x, '--y': state.player.y }}><i /><b /><span>{state.player.name}</span></div>
            {nearby && !dialogueNPC && <button className="talk-prompt" style={{ '--x': nearby.x, '--y': nearby.y }} onClick={() => setDialogueNPC(nearby.id)}>E　和{nearby.name}聊聊</button>}
            {nearbyObject && !dialogueNPC && <button className="object-prompt" style={{ '--x': nearbyObject.x, '--y': nearbyObject.y }} onClick={() => send({ type: 'interact', objectId: nearbyObject.id })}>F　{nearbyObject.prompt}</button>}
          </div>
        </div>
      </section>

      <div className="ambient-box pixel-panel"><span>{scene.id === 'town' ? '街上' : '屋里'}</span><p>{state.ambient}</p></div>
      <div className="controls"><span>移动</span><kbd>WASD</kbd><span>交谈</span><kbd>E</kbd><span>生活</span><kbd>F</kbd></div>
      <button className="guide-button" onClick={() => setGuideOpen(true)}>新手引导</button>
      <MobileControls onMove={(dx, dy) => { setTarget(null); send({ type: 'step', dx, dy }) }} onTalk={() => nearby && setDialogueNPC(nearby.id)} onInteract={() => nearbyObject && send({ type: 'interact', objectId: nearbyObject.id })} />

      {guideOpen && <BeginnerGuide mode={state.mode} onClose={() => setGuideOpen(false)} />}
      {activeNPC && <Dialogue npc={activeNPC} messages={messages[activeNPC.id] || []} thinking={thinking} error={dialogueError?.npcId === activeNPC.id ? dialogueError.message : ''} value={text} onChange={(value) => { clearDialogueError(); setText(value) }} onSubmit={submit} onClose={() => { clearDialogueError(); setDialogueNPC(null) }} />}
      {hotelOptions && <HotelModal hotelName={scene.name} rooms={hotelOptions.rooms} coins={state.player.coins} lodging={state.player.lodging} time={state.time} onBook={(roomType) => { send({ type: 'book_room', roomType }); closeHotel() }} onCheckIn={() => { send({ type: 'check_in' }); closeHotel() }} onClose={closeHotel} />}
      {state.notice && <TownNotice text={state.notice.text} onClose={() => send({ type: 'dismiss_notice' })} />}
      {state.gameOver && !state.notice && <GameOver reason={state.gameOverReason} />}
      {showSkipConfirm && <SkipConfirm onConfirm={() => { send({ type: 'skip_project' }); setShowSkipConfirm(false) }} onCancel={() => setShowSkipConfirm(false)} />}
    </main>
  )
}

function BeginnerGuide({ mode, onClose }) {
  return (
    <div className="guide-layer">
      <section className="beginner-guide pixel-panel" role="dialog" aria-modal="true" aria-labelledby="guide-title">
        <span>{mode === 'ai' ? 'AI 模式' : '离线模式'} · 第一次来镇上</span>
        <h2 id="guide-title">先认识这座小镇</h2>
        <p>这里没有固定选项。四处走走、和居民聊天、使用身边的设施，你的行动会推动时间和主线。</p>
        <div className="guide-steps">
          <article><b>1</b><div><strong>移动与进入</strong><p>使用方向键或 WASD，也可以点击地图。点击建筑入口即可自动走过去。</p></div></article>
          <article><b>2</b><div><strong>认识居民</strong><p>靠近带“对话”标记的人，按 E、回车或直接点击，问问他们正在关心什么。</p></div></article>
          <article><b>3</b><div><strong>体验生活</strong><p>靠近可用物品后按 F 或点击提示。留意饱腹、精力、心情和住宿安排。</p></div></article>
          <article><b>4</b><div><strong>推进主线</strong><p>右侧“主线”记录已公开的信息。多去不同机构，和关键人物交谈。</p></div></article>
        </div>
        <button onClick={onClose}>开始逛逛</button>
      </section>
    </div>
  )
}

function StorySidebar({ story, mode, onSkipProject, projectResolved }) {
  const [open, setOpen] = useState(true)
  return <aside className={`story-sidebar pixel-panel ${open ? 'open' : 'closed'}`}><button className="story-toggle" onClick={() => setOpen((value) => !value)}>{open ? '收起' : '主线'}</button>{open && <><span className="story-label">{mode === 'ai' ? 'AI 生成主线' : '本局主线'}</span><h2>{story.title}</h2><p>{story.premise}</p><div className="story-stage"><small>当前局面</small><b>{story.stage}</b></div><section><small>你已经谈到的人</small>{story.knownPeople.length > 0 ? story.knownPeople.map((person) => <div className="story-person" key={person.id}><b>{person.name}</b><span>{person.role}</span><em>{person.building}</em></div>) : <p className="story-empty">先去各个机构走走。只有真正谈过的人才会记录在这里。</p>}</section>{!projectResolved && <button className="skip-project-button" onClick={onSkipProject}>跳过任务</button>}<footer>这里只记录已经公开的主线信息，不显示隐藏立场、答案或支持度。</footer></>}</aside>
}

function LifeHUD({ player }) {
  const pips = (value, icon) => <span>{Array.from({ length: 10 }, (_, index) => <i className={index < Math.ceil(value / 10) ? 'full' : ''} key={index}>{icon}</i>)}</span>
  return <aside className="life-hud pixel-panel"><div><b>饱</b>{pips(player.hunger, '◆')}</div><div><b>力</b>{pips(player.energy, '▰')}</div><div><b>心</b>{pips(player.mood, '♥')}</div><em>{player.coins} 元</em>{player.lodging && <small>今晚：{player.lodging.name}</small>}</aside>
}

function Building({ building, onEnter }) {
  const entranceSide = building.doorY < building.y ? 'entrance-top' : 'entrance-bottom'
  return <div className={`map-building ${building.kind} ${entranceSide}`} style={{ '--x': building.x, '--y': building.y, '--w': building.width, '--h': building.height, '--door-x': building.doorX - building.x + 0.5 }}><div className="roof-surface"><i /><i /><i /></div><span className="building-name">{building.name}</span><button className="entrance" onClick={onEnter} aria-label={`进入${building.name}`}><b>进入</b></button></div>
}

function PixelPerson({ npc, onClick }) {
  const ageClass = /小学生|初中生|高中生/.test(npc.role) ? 'young-npc' : /退休|老人/.test(npc.role) ? 'senior-npc' : 'adult-npc'
  return <button aria-label={npc.canDialogue ? '对话' : '路过的群众'} className={`person npc ${ageClass} ${npc.canDialogue ? 'story-npc' : 'crowd-npc'}`} style={{ '--x': npc.x, '--y': npc.y, '--coat': npc.color }} onClick={onClick}><i /><b />{npc.canDialogue && <span>对话</span>}</button>
}

function WorldObject({ object, onClick }) {
  return <div aria-label={object.name} title={object.prompt || undefined} className={`world-object object-${object.kind}`} style={{ '--x': object.x, '--y': object.y }} onClick={onClick} role={onClick ? 'button' : undefined}><i /><span>{object.name}</span></div>
}

function Dialogue({ npc, messages, thinking, error, value, onChange, onSubmit, onClose }) {
  return (
    <div className="dialogue-layer">
      <section className="dialogue-box pixel-panel">
        <button className="dialogue-close" onClick={onClose}>×</button>
        <div className="portrait" style={{ '--coat': npc.color }}><i /><b /></div>
        <header><span>{npc.role}</span><h2>{npc.name}</h2><p>{npc.mood} · {npc.activity}</p></header>
        <div className="conversation">
          {messages.length === 0 && <p className="opening">“{npc.opening}”</p>}
          {messages.map((message, index) => <p key={index} className={message.role}>{message.text}</p>)}
          {thinking && <p className="thinking">{npc.name}想了一会儿……</p>}
          {error && <p className="agent-error">Agent 调用失败：{error}</p>}
        </div>
        <form onSubmit={onSubmit}>
          <textarea autoFocus value={value} onChange={(event) => onChange(event.target.value)} placeholder="不用选答案。问问对方为什么、担心什么，或者说说你的办法……" />
          <button disabled={thinking}>说</button>
        </form>
      </section>
    </div>
  )
}

function TownNotice({ text, onClose }) {
  return <div className="notice-layer"><section className="town-notice pixel-panel"><span>镇上的新动静</span><p>{text}</p><button onClick={onClose}>知道了</button></section></div>
}

function GameOver({ reason }) {
  return <div className="notice-layer"><section className="town-notice game-over pixel-panel"><span>游戏失败</span><h2>这段小镇生活结束了</h2><p>{reason}</p><button onClick={() => location.reload()}>重新开始</button></section></div>
}

function SkipConfirm({ onConfirm, onCancel }) {
  return <div className="notice-layer"><section className="town-notice pixel-panel"><span>跳过任务</span><h2>确定要跳过当前任务吗？</h2><p>跳过后将直接视为任务完成，但不会获得完整的剧情体验。</p><div className="skip-buttons"><button className="skip-confirm" onClick={onConfirm}>确定跳过</button><button className="skip-cancel" onClick={onCancel}>继续任务</button></div></section></div>
}

function HotelModal({ hotelName, rooms, coins, lodging, time, onBook, onCheckIn, onClose }) {
  const canCheckIn = lodging && time >= '18:00' && time < '21:50'
  return <div className="notice-layer"><section className="hotel-modal pixel-panel"><button className="dialogue-close" onClick={onClose}>×</button><span>{hotelName} · 今晚入住</span><h2>18:00 后可提前入住</h2><p>先办理住所，18:00 后回到前台入住。第二天 07:00 自动退房。</p>{lodging ? <div><button className="check-in-button" disabled={!canCheckIn} onClick={onCheckIn}><b>{lodging.name}</b><span>已支付 {lodging.price} 元</span><em>{canCheckIn ? '现在入住' : '18:00 后可入住'}</em></button></div> : <div>{rooms.map((room) => <button key={room.id} disabled={coins < room.price} onClick={() => onBook(room.id)}><b>{room.name}</b><span>{room.price} 元 / 晚</span><em>{coins < room.price ? '余额不足' : '办理住所'}</em></button>)}</div>}<footer>21:50 前没有入住者会流落街头，精力和心情会受到明显影响。</footer></section></div>
}

function MobileControls({ onMove, onTalk, onInteract }) {
  return <div className="mobile-controls"><button onClick={() => onMove(0, -1)}>▲</button><button onClick={() => onMove(-1, 0)}>◀</button><button onClick={() => onMove(0, 1)}>▼</button><button onClick={() => onMove(1, 0)}>▶</button><button className="mobile-talk" onClick={onTalk}>聊</button><button className="mobile-use" onClick={onInteract}>用</button></div>
}

export default function App() {
  const [screen, setScreen] = useState('entry')
  const [progress, setProgress] = useState({ step: 1, total: 4, phase: '准备出发', message: '班车沿着河谷慢慢往前开。' })
  const [cityState, setCityState] = useState(null)
  const [messages, setMessages] = useState({})
  const [thinking, setThinking] = useState(false)
  const [generationError, setGenerationError] = useState('')
  const [dialogueError, setDialogueError] = useState(null)
  const [hotelOptions, setHotelOptions] = useState(null)
  const socket = useRef(null)

  useEffect(() => () => closeSocket(socket.current, 'frontend reload'), [])

  const enter = (config) => {
    closeSocket(socket.current, 'new session')
    setGenerationError('')
    setScreen('loading')
    const ws = new WebSocket(socketURL())
    socket.current = ws
    ws.onopen = () => ws.send(JSON.stringify({ type: 'enter', mode: config.mode, ai: config.ai, profile: { name: config.name } }))
    ws.onmessage = (event) => {
      const message = JSON.parse(event.data)
      if (message.type === 'generation_progress') setProgress(message.payload)
      if (message.type === 'city_state') { setCityState(message.payload); setScreen('game') }
      if (message.type === 'clock_tick') setCityState((current) => current ? { ...current, time: message.payload.time, day: message.payload.day } : current)
      if (message.type === 'npc_positions') {
        // 轻量级NPC位置更新，只更新位置不触发完整重渲染
        setCityState((current) => {
          if (!current) return current
          const updatedNPCs = current.npcs.map((npc) => {
            const pos = message.payload.find((p) => p.id === npc.id)
            return pos ? { ...npc, x: pos.x, y: pos.y } : npc
          })
          return { ...current, npcs: updatedNPCs }
        })
      }
      if (message.type === 'hotel_options') setHotelOptions(message.payload)
      if (message.type === 'dialogue_thinking') setThinking(true)
      if (message.type === 'dialogue_reply') {
        setThinking(false)
        setMessages((all) => ({ ...all, [message.payload.npcId]: [...(all[message.payload.npcId] || []), { role: 'npc', text: message.payload.text }] }))
      }
      if (message.type === 'dialogue_error') {
        setThinking(false)
        setDialogueError(message.payload)
      }
      if (message.type === 'generation_error') {
        setGenerationError(message.payload.message)
        closeSocket(ws, 'generation failed')
      }
    }
    ws.onerror = () => setProgress({ step: 1, message: '班车暂时停了。请确认后端已在 8080 端口启动。' })
  }

  const send = (message) => {
    if (message.type === 'dialogue') {
      setDialogueError(null)
      setMessages((all) => ({ ...all, [message.npcId]: [...(all[message.npcId] || []), { role: 'player', text: message.text }] }))
    }
    if (socket.current?.readyState === WebSocket.OPEN) socket.current.send(JSON.stringify(message))
  }

  if (screen === 'entry') return <EntryPage onEnter={enter} />
  if (screen === 'loading' || !cityState) return <><LoadingPage progress={progress} />{generationError && <div className="generation-error pixel-panel"><b>AI 城镇生成失败</b><p>{generationError}</p><button onClick={() => { setScreen('entry'); setGenerationError('') }}>返回修改配置</button></div>}</>
  return <TownGame state={cityState} send={send} messages={messages} thinking={thinking} dialogueError={dialogueError} clearDialogueError={() => setDialogueError(null)} hotelOptions={hotelOptions} closeHotel={() => setHotelOptions(null)} />
}
