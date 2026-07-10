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
    '这里是镇上居民常来的地方。',
    '环境整洁，设施维护得很好。',
    '经常能看到附近居民在这里活动。',
    '这个地方对镇民来说很有意义。',
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
    message: `${interactable.label}，看起来是个温馨的家。`,
    type: 'info',
    data: { homeId: interactable.id }
  };
});

registerHandler('gather', (interactable, _context) => {
  return {
    success: true,
    message: `${interactable.label}是镇民们聚会交流的地方，气氛很热闹。`,
    type: 'info',
    data: { gatherId: interactable.id }
  };
});

registerHandler('field', (interactable, _context) => {
  return {
    success: true,
    message: `${interactable.label}维护得很好，看得出有人在用心打理。`,
    type: 'info',
    data: { fieldId: interactable.id }
  };
});

registerHandler('dock', (interactable, _context) => {
  return {
    success: true,
    message: `${interactable.label}停靠着几艘船，海风带来咸咸的味道。`,
    type: 'info',
    data: { dockId: interactable.id }
  };
});

registerHandler('stall', (interactable, _context) => {
  return {
    success: true,
    message: `${interactable.label}上摆满了商品，摊主热情地招呼着你。`,
    type: 'info',
    data: { stallId: interactable.id }
  };
});

registerHandler('building', (interactable, _context) => {
  const responses: Record<string, string> = {
    '警察局': '警察局里很忙碌，王大明警官正在值班。',
    '镇医院': '医院里很干净，李医生正在接诊病人。',
    '山脚小学': '学校里传来孩子们朗朗的读书声，陈老师正在上课。',
    '超市': '超市里商品琳琅满目，张老板正在整理货架。',
    '邮局': '邮局里很安静，刘大海正在分拣邮件。',
    '消防站': '消防站里设备整齐，消防员们正在训练。',
    '图书馆': '图书馆里很安静，几个居民正在看书。',
    '银行': '银行里秩序井然，柜员正在办理业务。',
    '药店': '药店里药品种类齐全，药剂师正在配药。',
    '养老院': '养老院里老人们正在活动，护工们悉心照料。',
  };
  const response = responses[interactable.label] || `${interactable.label}正常开放中。`;
  return {
    success: true,
    message: response,
    type: 'info',
    data: { buildingId: interactable.id }
  };
});

registerHandler('board', (interactable, _context) => {
  const notices = [
    '镇政府通知：本周六下午召开居民代表大会，欢迎大家参加。',
    '超市周末大促销，全场八折优惠！',
    '警察局提醒：近期注意防盗，出门锁好门窗。',
    '学校通知：下周一举行家长会，请准时参加。',
    '图书馆新到一批图书，欢迎借阅。',
    '社区活动：本周日组织义务清扫，欢迎大家报名。',
    '医院通知：免费体检活动即将开始，详情请咨询前台。',
    '消防站开放日：本周六欢迎参观，学习消防知识。',
    '邮局通知：春节将至，请提前寄送包裹。',
    '招聘启事：超市招聘收银员一名，有意者请联系张老板。',
  ];
  const notice = notices[Math.floor(Math.random() * notices.length)];
  return {
    success: true,
    message: `公告栏上贴着通知：「${notice}」`,
    type: 'info',
    data: { boardId: interactable.id, notice }
  };
});
