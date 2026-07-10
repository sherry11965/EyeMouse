import type { Interactable, InteractableType, WorldMap, Region, Vec2 } from '../map/types';
import { getInteractableAt, getNearbyInteractables } from '../map/interactables';
import { getBuildingAt } from '../map/buildings';

export interface InteractionResult {
  success: boolean;
  message: string;
  type: 'info' | 'action' | 'dialogue' | 'error';
  data?: Record<string, unknown>;
}

export interface InteractionContext {
  playerId: string;
  playerPos: Vec2;
  world: WorldMap;
  time: { minutes: number; day: number };
}

export type InteractionHandler = (
  interactable: Interactable,
  context: InteractionContext
) => InteractionResult;

const handlers: Map<InteractableType, InteractionHandler> = new Map();

export function registerHandler(type: InteractableType, handler: InteractionHandler): void {
  handlers.set(type, handler);
}

export function handleInteraction(
  interactable: Interactable,
  context: InteractionContext
): InteractionResult {
  const handler = handlers.get(interactable.type);
  if (handler) {
    return handler(interactable, context);
  }
  return {
    success: false,
    message: '无法交互',
    type: 'error'
  };
}

export function tryInteractAt(
  pos: Vec2,
  context: InteractionContext
): InteractionResult | null {
  const region = getRegionAt(context.world, pos);
  if (!region) return null;

  const localPos = {
    x: pos.x - region.pos.x,
    y: pos.y - region.pos.y
  };

  const interactable = getInteractableAt(region.interactables, localPos.x, localPos.y);
  if (!interactable) return null;

  return handleInteraction(interactable, context);
}

export function getInteractableNearby(
  pos: Vec2,
  context: InteractionContext,
  radius: number = 2
): Interactable[] {
  const region = getRegionAt(context.world, pos);
  if (!region) return [];

  const localPos = {
    x: pos.x - region.pos.x,
    y: pos.y - region.pos.y
  };

  return getNearbyInteractables(region.interactables, localPos.x, localPos.y, radius);
}

function getRegionAt(world: WorldMap, worldPos: Vec2): Region | null {
  for (const region of world.regions) {
    const rx = worldPos.x - region.pos.x;
    const ry = worldPos.y - region.pos.y;
    if (rx >= 0 && rx < region.size.w && ry >= 0 && ry < region.size.h) {
      return region;
    }
  }
  return null;
}

registerHandler('door', (interactable, context) => {
  const region = getRegionAt(context.world, {
    x: interactable.pos.x + (getRegionAt(context.world, context.playerPos)?.pos.x || 0),
    y: interactable.pos.y + (getRegionAt(context.world, context.playerPos)?.pos.y || 0)
  });

  if (!region) {
    return { success: false, message: '找不到建筑', type: 'error' };
  }

  const building = getBuildingAt(region.buildings, interactable.pos.x, interactable.pos.y);
  if (!building) {
    return { success: false, message: '找不到建筑', type: 'error' };
  }

  return {
    success: true,
    message: `进入了 ${building.name}`,
    type: 'action',
    data: { buildingId: building.id, buildingName: building.name }
  };
});

registerHandler('bed', (_interactable, context) => {
  const hour = Math.floor(context.time.minutes / 60);
  if (hour >= 6 && hour < 20) {
    return {
      success: false,
      message: '现在还不是睡觉的时间',
      type: 'info'
    };
  }

  return {
    success: true,
    message: '你休息了一会儿，恢复了体力',
    type: 'action',
    data: { energyRestore: 30, moodRestore: 10 }
  };
});

registerHandler('chest', (_interactable, _context) => {
  const items = ['金币', '药水', '卷轴', '宝石', '钥匙'];
  const item = items[Math.floor(Math.random() * items.length)];
  const quantity = Math.floor(Math.random() * 3) + 1;

  return {
    success: true,
    message: `发现了 ${item} x${quantity}`,
    type: 'action',
    data: { item, quantity }
  };
});

registerHandler('npc', (interactable, _context) => {
  const greetings = [
    '你好，旅行者！',
    '欢迎来到这里！',
    '有什么可以帮你的吗？',
    '今天天气不错啊！',
    '最近镇上发生了些有趣的事...'
  ];
  const greeting = greetings[Math.floor(Math.random() * greetings.length)];

  return {
    success: true,
    message: `${interactable.label}: "${greeting}"`,
    type: 'dialogue',
    data: { npcName: interactable.label }
  };
});

registerHandler('quest', (interactable, _context) => {
  const quests = [
    { title: '寻找丢失的猫咪', description: '镇上的老奶奶丢失了她的猫咪，帮忙找到它' },
    { title: '采集药草', description: '医生需要一些新鲜的药草来制作药水' },
    { title: '送信任务', description: '帮商人把信送到另一个区域' },
    { title: '清理怪物', description: '附近的洞穴里出现了怪物，需要勇士去清理' }
  ];
  const quest = quests[Math.floor(Math.random() * quests.length)];

  return {
    success: true,
    message: `新任务: ${quest.title}`,
    type: 'action',
    data: { questTitle: quest.title, questDescription: quest.description }
  };
});

registerHandler('shop', (interactable, _context) => {
  return {
    success: true,
    message: `打开了 ${interactable.label}`,
    type: 'action',
    data: { shopId: interactable.id, action: 'open_shop' }
  };
});

registerHandler('portal', (_interactable, _context) => {
  return {
    success: true,
    message: '传送门激活了！要传送到哪里？',
    type: 'action',
    data: { action: 'open_portal_menu' }
  };
});

registerHandler('item', (_interactable, _context) => {
  const items = ['草药', '矿石', '木材', '食物', '材料'];
  const item = items[Math.floor(Math.random() * items.length)];

  return {
    success: true,
    message: `拾取了 ${item}`,
    type: 'action',
    data: { item, quantity: 1 }
  };
});

registerHandler('crafting', (_interactable, _context) => {
  return {
    success: true,
    message: '打开了制作界面',
    type: 'action',
    data: { action: 'open_crafting' }
  };
});

registerHandler('storage', (_interactable, _context) => {
  return {
    success: true,
    message: '打开了储物空间',
    type: 'action',
    data: { action: 'open_storage' }
  };
});

registerHandler('landmark', (interactable, _context) => {
  const descriptions = [
    '这里似乎隐藏着什么秘密...',
    '你能感受到一股微弱的能量波动。',
    '这个地方有着悠久的历史。',
    '周围的空气似乎变得不同了。',
    '这里曾经发生过什么重要的事。',
  ];
  const desc = descriptions[Math.floor(Math.random() * descriptions.length)];
  return {
    success: true,
    message: `你来到了${interactable.label}。${desc}`,
    type: 'info',
    data: { landmarkId: interactable.id }
  };
});

registerHandler('home', (interactable, _context) => {
  return {
    success: true,
    message: `这是${interactable.label}，门紧闭着。也许改天可以来拜访。`,
    type: 'info',
    data: { homeId: interactable.id }
  };
});

registerHandler('gather', (interactable, _context) => {
  return {
    success: true,
    message: `${interactable.label}是个热闹的地方，人们喜欢在这里聚会交流。`,
    type: 'info',
    data: { gatherId: interactable.id }
  };
});

registerHandler('field', (interactable, _context) => {
  return {
    success: true,
    message: `这片${interactable.label}长势不错，丰收在望。`,
    type: 'info',
    data: { fieldId: interactable.id }
  };
});

registerHandler('dock', (interactable, _context) => {
  return {
    success: true,
    message: `${interactable.label}停靠着几艘小船，海风带来咸咸的味道。`,
    type: 'info',
    data: { dockId: interactable.id }
  };
});

registerHandler('stall', (interactable, _context) => {
  return {
    success: true,
    message: `${interactable.label}上摆满了各种商品，摊主热情地招呼着你。`,
    type: 'info',
    data: { stallId: interactable.id }
  };
});

registerHandler('building', (interactable, _context) => {
  return {
    success: true,
    message: `你来到了${interactable.label}。建筑看起来有些年头了。`,
    type: 'info',
    data: { buildingId: interactable.id }
  };
});

registerHandler('board', (interactable, _context) => {
  const notices = [
    '招募冒险者探索未知区域',
    '丢失了一只橘猫，请联系猎人小屋',
    '今晚在广场举办篝火晚会',
    '收购各种矿石，价格公道',
    '警告：近期森林深处出现异常，请勿深入',
    '新到货物，欢迎光临',
    '寻找失踪的旅人，提供线索者有赏',
  ];
  const notice = notices[Math.floor(Math.random() * notices.length)];
  return {
    success: true,
    message: `${interactable.label}上贴着一张告示：「${notice}」`,
    type: 'info',
    data: { boardId: interactable.id, notice }
  };
});
