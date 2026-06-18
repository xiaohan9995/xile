/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Instructor, Studio } from "./types";

export const mockInstructors: Instructor[] = [
  {
    id: "1",
    name: "张三",
    level: "L2认证导师",
    certNo: "JY20230001",
    expiryDate: "2028.12.31",
    certDate: "2023年01月04日",
    avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=200&auto=format&fit=crop",
    phone: "138-8888-0001",
    bio: "专注于哈他瑜伽与呼吸法，十年来帮助上千名学员找到内心的宁静与力量感。",
    certifiedDays: 1095
  },
  {
    id: "2",
    name: "李四",
    level: "L2认证导师",
    certNo: "JY20230002",
    expiryDate: "2028.12.31",
    certDate: "2023年03月15日",
    avatar: "https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?q=80&w=200&auto=format&fit=crop",
    phone: "139-9999-0002",
    bio: "流瑜伽资深教练，注重体式流动的呼吸配合以及能量唤醒。",
    certifiedDays: 980
  },
  {
    id: "3",
    name: "张五",
    level: "L2认证导师",
    certNo: "JY20230003",
    expiryDate: "2028.12.31",
    certDate: "2023年05月22日",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=200&auto=format&fit=crop",
    phone: "136-6666-0003",
    bio: "理疗瑜伽导师。擅长通过瑜伽体式舒缓都市人群的脊椎、腰椎及精神压力。",
    certifiedDays: 840
  },
  {
    id: "4",
    name: "海六",
    level: "L3认证导师",
    certNo: "JY20230004",
    expiryDate: "2028.12.31",
    certDate: "2023年08月10日",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=200&auto=format&fit=crop",
    phone: "135-5555-0004",
    bio: "阴瑜伽及冥想导师，提倡极致慢活。深度融合中医学说与骨骼生理解剖学。",
    certifiedDays: 1250
  },
  {
    id: "5",
    name: "张六",
    level: "L3认证导师",
    certNo: "JY20230005",
    expiryDate: "2028.12.31",
    certDate: "2023年11月01日",
    avatar: "https://images.unsplash.com/photo-1517841905240-472988babdf9?q=80&w=200&auto=format&fit=crop",
    phone: "137-7777-0005",
    bio: "阿斯汤加瑜伽狂热者，力量与柔韧平衡大师。严谨、纯粹、传承阿斯经典序列。",
    certifiedDays: 1100
  },
  {
    id: "6",
    name: "畅琦",
    level: "L3认证导师",
    certNo: "JY20230006",
    expiryDate: "2028.12.31",
    certDate: "2024年02月18日",
    avatar: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?q=80&w=200&auto=format&fit=crop",
    phone: "186-6666-8888",
    bio: "音钵疗愈与颂钵阴瑜伽先行者。用声音、震动、呼吸带领学员开展舒眠、减重和减压课程。",
    certifiedDays: 730
  }
];

export const mockStudios: Studio[] = [
  {
    id: "s1",
    name: "静心瑜伽空间",
    city: "上海市",
    district: "徐汇区",
    address: "上海市徐汇区复兴中路1199号A栋302室",
    image: "https://images.unsplash.com/photo-1545205597-3d9d02c29597?q=80&w=600&auto=format&fit=crop",
    rating: 4.9,
    contact: "021-64332211",
    tags: ["静心冥想", "小班授课", "哈他瑜伽", "舒缓拉伸"],
    description: "静谧典雅的都市绿洲，配置顶级天然原木木地板和全套活性炭空气循环系统。这里只有呼吸的声音，为您彻底洗涤一天的喧嚣。"
  },
  {
    id: "s2",
    name: "清悦身心练习室",
    city: "北京市",
    district: "朝阳区",
    address: "北京市朝阳区建国路88号SOHO现代城5号楼",
    image: "https://images.unsplash.com/photo-1506126613408-eca07ce68773?q=80&w=600&auto=format&fit=crop",
    rating: 4.8,
    contact: "010-85889900",
    tags: ["露台瑜伽", "空中瑜伽", "活力流瑜伽", "日落冥想"],
    description: "拥有270度超大视野室外露台，主打日落微光冥想与流瑜伽，让温润的晚霞和清新的空气滋养您的每一次舒张。"
  },
  {
    id: "s3",
    name: "自在瑜伽小院",
    city: "杭州市",
    district: "西湖区",
    address: "杭州市西湖区满觉陇路下满觉陇88号",
    image: "https://images.unsplash.com/photo-1599447421416-3414500d18a5?q=80&w=600&auto=format&fit=crop",
    rating: 5.0,
    contact: "0571-88997766",
    tags: ["中式庭院", "茶道瑜伽", "疗愈颂钵", "自然采光"],
    description: "坐落在满陇桂雨山脚下的江南庭院式雅室，伴随着鸟鸣声与潺潺溪流，将古老东方的茶禅智慧融入瑜伽体式练习。"
  },
  {
    id: "s4",
    name: "梵雅流瑜伽坊",
    city: "广州市",
    district: "天河区",
    address: "广州市天河区珠江新城花城大道66号",
    image: "https://images.unsplash.com/photo-1518611012118-696072aa579a?q=80&w=600&auto=format&fit=crop",
    rating: 4.7,
    contact: "020-38002233",
    tags: ["阿斯汤加", "高温热瑜伽", "力量塑形"],
    description: "主打现代力量型流瑜伽，导师均持证多年，热衷挑战柔韧肌肉极限，适合有基础的进阶瑜伽修习者。"
  },
  {
    id: "s5",
    name: "悦心空灵阁",
    city: "深圳市",
    district: "南山区",
    address: "深圳市南山区后海滨路云际大厦18楼",
    image: "https://images.unsplash.com/photo-1575052814086-f385e2e2ad1b?q=80&w=600&auto=format&fit=crop",
    rating: 4.9,
    contact: "0755-86663322",
    tags: ["音疗冥想", "孕妇理疗", "全息环绕"],
    description: "引入全息立体环境声疗愈仪，提供绝对释压的深度催眠阴瑜伽体验。让您在大牌床寝般的安谧怀抱中，进入深层呼吸空间。"
  }
];
