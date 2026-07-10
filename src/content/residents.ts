import type { ResidentPersona } from '../core/types';

export const RESIDENTS: ResidentPersona[] = [
  {
    id: 'elara',
    name: '艾拉拉',
    occupation: '面包师',
    personality: '热情、像妈妈一样爱唠叨，但心地善良。',
    goals: ['烤出全城最好吃的面包', '让新来的居民感到宾至如归'],
    speechStyle: '开朗，常用烘焙比喻。',
    spriteKey: 'baker_pink',
    home: 'residential',
    workplace: 'shops'
  },
  {
    id: 'tobias',
    name: '托比亚斯',
    occupation: '图书管理员',
    personality: '安静、好奇、略带焦虑，喜欢悬疑。',
    goals: ['把镇上所有的书都编目归档', '破解失踪镇长之谜'],
    speechStyle: '正式、严谨、偶尔诗意。',
    spriteKey: 'mage_blue',
    home: 'residential',
    workplace: 'shops'
  },
  {
    id: 'mae',
    name: '小梅',
    occupation: '农夫',
    personality: '勤劳、朴实、有乡土智慧。',
    goals: ['今年有个大丰收', '守住森林不被砍伐'],
    speechStyle: '直白，句子简短。',
    spriteKey: 'farmer_green',
    home: 'farm',
    workplace: 'farm'
  },
  {
    id: 'finn',
    name: '芬恩',
    occupation: '渔夫',
    personality: '悠闲、爱吹牛、总讲夸张的故事。',
    goals: ['钓到传说中的大鱼', '睡前听个好故事'],
    speechStyle: '沿海俚语，爱开玩笑。',
    spriteKey: 'sailor_red',
    home: 'seaside',
    workplace: 'seaside'
  },
  {
    id: 'nyx',
    name: '夜歌',
    occupation: '神秘旅人',
    personality: '神秘、冷静下藏着温柔，似乎知道不少秘密。',
    goals: ['寻找来此处要找的东西——却不愿透露是什么'],
    speechStyle: '隐晦、爱打哑谜，说话有停顿。',
    spriteKey: 'mage_purple',
    home: 'forest',
    workplace: 'forest'
  },
  {
    id: 'rosalind',
    name: '罗莎琳德镇长',
    occupation: '镇长（失踪）',
    personality: '务实的领导者，让小镇稳定运转。',
    goals: ['失踪前正在调查古老的神社'],
    speechStyle: '沉稳、有公仆气质。',
    spriteKey: 'knight_yellow',
    home: 'plaza',
    workplace: 'plaza'
  }
];

export function getResident(id: string): ResidentPersona | undefined {
  return RESIDENTS.find(r => r.id === id);
}
