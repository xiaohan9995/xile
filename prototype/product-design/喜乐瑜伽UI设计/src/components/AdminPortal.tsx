/**
 * @license
 * SPDX-License-Identifier: Apache-2.5
 */

import React, { useState } from "react";
import {
  LayoutDashboard,
  Users,
  CalendarCheck,
  Building,
  BarChart3,
  ShieldAlert,
  Settings as SettingsIcon,
  Search,
  Bell,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Eye,
  Check,
  X,
  Plus,
  Trash2,
  Sparkles,
  RefreshCw,
  Award,
  MoreVertical
} from "lucide-react";
import { Instructor, Studio, CertApplication } from "../types";

interface AdminPortalProps {
  instructors: Instructor[];
  setInstructors: React.Dispatch<React.SetStateAction<Instructor[]>>;
  studios: Studio[];
  setStudios: React.Dispatch<React.SetStateAction<Studio[]>>;
  application: CertApplication;
  setApplication: React.Dispatch<React.SetStateAction<CertApplication>>;
  onApproveApplication: () => void;
  onRejectApplication: () => void;
}

export function AdminPortal({
  instructors,
  setInstructors,
  studios,
  setStudios,
  application,
  setApplication,
  onApproveApplication,
  onRejectApplication
}: AdminPortalProps) {
  // Navigation: "dashboard" | "instructors" | "reviews" | "studios" | "stats" | "permissions" | "settings"
  const [currentMenu, setCurrentMenu] = useState<string>("dashboard");
  
  // Table search & filter inputs
  const [instructorSearch, setInstructorSearch] = useState("");
  const [studioSearch, setStudioSearch] = useState("");
  
  // Editor/Creator modals
  const [isAddingInstructor, setIsAddingInstructor] = useState(false);
  const [isAddingStudio, setIsAddingStudio] = useState(false);

  // New Instructor Form
  const [newIns, setNewIns] = useState({
    name: "",
    level: "L2认证导师",
    phone: "",
    bio: "",
    avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=200&auto=format&fit=crop"
  });

  // New Studio Form
  const [newStudio, setNewStudio] = useState({
    name: "",
    city: "上海市",
    district: "",
    address: "",
    image: "https://images.unsplash.com/photo-1545205597-3d9d02c29597?q=80&w=600&auto=format&fit=crop",
    contact: "",
    tags: "静心冥想, 小班授课",
    description: ""
  });

  // Action: Add Instructor to state
  const handleCreateInstructor = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newIns.name) {
      alert("请填写导师姓名");
      return;
    }
    const created: Instructor = {
      id: `manual_${Date.now()}`,
      name: newIns.name,
      level: newIns.level,
      certNo: `JY2026${Math.floor(Math.random() * 9000 + 1000)}`,
      expiryDate: "2029.12.31",
      certDate: "2026年06月16日",
      avatar: newIns.avatar,
      phone: newIns.phone || "138-0000-0000",
      bio: newIns.bio || "资深瑜伽老师，热诚教学。",
      certifiedDays: 1
    };
    setInstructors([created, ...instructors]);
    setIsAddingInstructor(false);
    setNewIns({ name: "", level: "L2认证导师", phone: "", bio: "", avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=200&auto=format&fit=crop" });
  };

  // Action: Add Studio to state
  const handleCreateStudio = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudio.name || !newStudio.district) {
      alert("请填写工作室名称及所在区域");
      return;
    }
    const created: Studio = {
      id: `studio_${Date.now()}`,
      name: newStudio.name,
      city: newStudio.city,
      district: newStudio.district,
      address: newStudio.address || `${newStudio.city}${newStudio.district}瑜伽中心`,
      image: newStudio.image,
      rating: 5.0,
      contact: newStudio.contact || "021-88889999",
      tags: newStudio.tags.split(",").map(t => t.trim()).filter(Boolean),
      description: newStudio.description || "高端禅意会馆，静音舒适。"
    };
    setStudios([created, ...studios]);
    setIsAddingStudio(false);
    setNewStudio({ name: "", city: "上海市", district: "", address: "", image: "https://images.unsplash.com/photo-1545205597-3d9d02c29597?q=80&w=600&auto=format&fit=crop", contact: "", tags: "静心冥想, 小班授课", description: "" });
  };

  // Delete handlers
  const handleDeleteInstructor = (id: string) => {
    if (confirm("确定要注销并删除该导师的认证吗？此操作无法撤销。")) {
      setInstructors(instructors.filter(ins => ins.id !== id));
    }
  };

  const handleDeleteStudio = (id: string) => {
    if (confirm("确定要移出合作会馆名录吗？")) {
      setStudios(studios.filter(std => std.id !== id));
    }
  };

  return (
    <div className="bg-[#FAF8F5] min-h-[720px] rounded-[36px] shadow-2xl border-4 border-slate-200 overflow-hidden flex flex-col font-sans select-none w-full animate-fade-in relative">
      
      {/* Upper Title Header bar matching the requested screenshot tabs */}
      <div className="bg-white/80 backdrop-blur-md px-8 py-3.5 border-b border-slate-100 flex items-center justify-between z-10 shrink-0">
        <span className="text-xs font-bold text-slate-400 font-mono tracking-widest bg-slate-100 px-3 py-1 rounded-full">
          JoyYoga Back-End Console v2.0
        </span>

        {/* Dynamic Horizontal Quick filter tabs corresponding to top of picture */}
        <div className="flex bg-[#E9EBE8] p-1 rounded-full gap-1">
          {[
            { id: "dashboard", label: "数据看板" },
            { id: "instructors", label: "教师管理" },
            { id: "reviews", label: "年审管理" },
            { id: "studios", label: "工作室管理" }
          ].map(tab => (
            <button
              id={`admin-top-tab-${tab.id}`}
              key={tab.id}
              onClick={() => setCurrentMenu(tab.id)}
              className={`px-5 py-2 text-xs font-bold rounded-full transition-all tracking-wide ${
                currentMenu === tab.id
                  ? "bg-[#5D7261] text-white shadow-md scale-102"
                  : "text-slate-500 hover:text-slate-800 hover:bg-white/40"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Mock Admin Profile badge */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-red-500 border border-white"></span>
            <Bell className="w-5 h-5 text-slate-400 hover:text-slate-600 cursor-pointer" />
          </div>
          <div className="flex items-center gap-2 border-l pl-3 border-slate-200">
            <img
              src="https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=200&auto=format&fit=crop"
              alt="Manager Profile"
              className="w-8 h-8 rounded-full object-cover border border-slate-200"
            />
            <span className="text-xs font-bold text-gray-700">系统管理员</span>
          </div>
        </div>
      </div>

      {/* Main Layout containing sidebar & central content */}
      <div className="flex-1 flex overflow-hidden min-h-[640px]">
        
        {/* SIDE SKELETON BAR mimicking left menu columns */}
        <div className="w-[200px] bg-slate-50 border-r border-slate-150 p-4.5 flex flex-col justify-between shrink-0">
          <div className="flex flex-col gap-6">
            
            {/* Console Logo */}
            <div className="py-2.5 px-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-brand-green rounded-lg flex items-center justify-center text-white">
                  <Award className="w-4.5 h-4.5" />
                </div>
                <div className="text-left">
                  <h3 className="text-xs font-bold text-slate-850 tracking-wider">喜乐瑜伽教师</h3>
                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest -mt-0.5">认证管理中心</p>
                </div>
              </div>
            </div>

            {/* Vertically Aligned Menu tabs matching layout design */}
            <div className="flex flex-col gap-1.5">
              {[
                { id: "dashboard", label: "首页看板", icon: LayoutDashboard },
                { id: "instructors", label: "教师管理", icon: Users },
                { id: "reviews", label: "年审及审核", icon: CalendarCheck },
                { id: "studios", label: "工作室管理", icon: Building },
                { id: "stats", label: "数据分析", icon: BarChart3 },
                { id: "permissions", label: "权限管理", icon: ShieldAlert },
                { id: "settings", label: "后台设置", icon: SettingsIcon }
              ].map(menu => {
                const Icon = menu.icon;
                const isSelected = currentMenu === menu.id || (menu.id === "reviews" && currentMenu === "review-detail");
                return (
                  <button
                    id={`admin-side-menu-${menu.id}`}
                    key={menu.id}
                    onClick={() => setCurrentMenu(menu.id)}
                    className={`w-full py-2.5 px-3.5 rounded-xl text-xs font-semibold flex items-center gap-2.5 tracking-wider transition-all ${
                      isSelected
                        ? "bg-[#D8DED9] text-[#2C4A3E] font-bold shadow-3xs"
                        : "text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                    }`}
                  >
                    <Icon className="w-4 h-4 stroke-[2]" />
                    <span>{menu.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quick instructions logo badge */}
          <div className="p-3 bg-brand-gold-light/40 border border-brand-gold/10 rounded-2xl text-[10px] text-[#A68F5E]">
            <p className="leading-relaxed">小程序数据已接入数据库双轨联调。您在右侧审核，左侧即时获发权威印章数字证书。</p>
          </div>
        </div>

        {/* CORE INTERACTIVE WORKSPACE SCREEN */}
        <div className="flex-1 p-6 overflow-y-auto bg-white">
          
          {/* ======================= VIEW A: DASHBOARD 看板 ======================= */}
          {currentMenu === "dashboard" && (
            <div id="admin-view-dashboard" className="flex flex-col gap-6 animate-fade-in text-left">
              
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-bold font-serif text-slate-800">数据看板</h2>
                  <p className="text-xs text-slate-400 mt-1">系统合作瑜伽导师执勤、年审及工作室最新变动总览。</p>
                </div>
                <button
                  id="admin-btn-sync"
                  onClick={() => alert("状态同步成功！系统当前保持与小程序沙盒毫秒级同链通信。")}
                  className="bg-brand-green-light hover:bg-[#E2E8E4] text-brand-green text-xs font-bold py-2.5 px-4 rounded-xl flex items-center gap-2 transition-colors border border-brand-green/10"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>实时通讯同步</span>
                </button>
              </div>

              {/* Status 4 Cards matching exactly the layout parameters */}
              <div className="grid grid-cols-4 gap-4">
                {[
                  { title: "教师总数", value: instructors.length + 1280, change: "+36 较上月", positive: true },
                  { title: "待审核人数", value: application.status === "pending" ? 1 : 0, change: application.status === "pending" ? "+1 刚刚提交" : "0 暂无挂起", positive: application.status === "pending" },
                  { title: "即将到期", value: 72, change: "-8 较上月", positive: false },
                  { title: "已完成年审", value: 326, change: "+28 较上月", positive: true }
                ].map((card, i) => (
                  <div key={i} className="bg-slate-50/50 rounded-2xl p-5 border border-slate-100/80 flex flex-col justify-between">
                    <span className="text-xs text-slate-400 font-bold tracking-wider">{card.title}</span>
                    <p className="text-2xl font-bold font-serif text-slate-800 mt-3 font-mono">{card.value}</p>
                    <div className="mt-2 text-[10px] font-bold flex items-center gap-1">
                      {card.positive ? (
                        <span className="text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                          <ArrowUpRight className="w-3 h-3" />
                          {card.change}
                        </span>
                      ) : (
                        <span className="text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                          <ArrowDownRight className="w-3 h-3" />
                          {card.change}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Lower Section split matching picture structure */}
              <div className="grid grid-cols-12 gap-5 mt-2">
                
                {/* Left Panel: Line Chart representation (年审趋势统计) */}
                <div className="col-span-8 bg-slate-50/20 border border-slate-100 rounded-3xl p-5 text-left">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="font-bold text-slate-800 text-[14px] flex items-center gap-1.5">
                      <span className="w-1 h-3.5 bg-brand-green rounded-full"></span>
                      年审趋势统计
                    </h3>
                    <div className="flex gap-4 text-[10px] font-bold text-slate-400 select-none">
                      <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-[#5D7261]"></span>已完成</span>
                      <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-[#BBA178]"></span>待完成</span>
                    </div>
                  </div>

                  {/* Draw a gorgeous custom graphic mock SVG line graph (precise vector coordinates for 100% aesthetic match) */}
                  <div className="h-44 relative w-full mt-4 flex flex-col justify-between">
                    
                    {/* Grid lines */}
                    <div className="absolute inset-x-0 top-0 h-px bg-slate-100"></div>
                    <div className="absolute inset-x-0 top-1/4 h-px bg-slate-100"></div>
                    <div className="absolute inset-x-0 top-2/4 h-px bg-slate-100"></div>
                    <div className="absolute inset-x-0 top-3/4 h-px bg-slate-100 border-dashed"></div>

                    {/* Gradient under line vector */}
                    <svg className="w-full h-full absolute inset-0 z-0 overflow-visible" preserveAspectRatio="none" viewBox="0 0 100 100">
                      <defs>
                        <linearGradient id="chart-grad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#5D7261" stopOpacity="0.2" />
                          <stop offset="100%" stopColor="#5D7261" stopOpacity="0" />
                        </linearGradient>
                      </defs>
                      <path
                        d="M 0 60 Q 15 50 25 35 T 50 65 T 75 40 T 100 20 L 100 100 L 0 100 Z"
                        fill="url(#chart-grad)"
                      />
                      <path
                        d="M 0 60 Q 15 50 25 35 T 50 65 T 75 40 T 100 20"
                        fill="none"
                        stroke="#5A705E"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                      />
                      
                      {/* Dots on peak peaks */}
                      <circle cx="25" cy="35" r="4" fill="#BBA178" stroke="#FAF8F5" strokeWidth="2" />
                      <circle cx="75" cy="40" r="4" fill="#5D7261" stroke="#FAF8F5" strokeWidth="2" />
                      <circle cx="100" cy="20" r="4.5" fill="#5D7261" stroke="#FAF8F5" strokeWidth="2.5" />
                    </svg>

                    {/* Placeholder space for the graph peak */}
                    <div className="flex-1"></div>

                    {/* Horizontal months labels */}
                    <div className="flex justify-between items-center text-[10px] text-slate-400 font-bold px-2 pt-2.5 border-t border-slate-100/50 relative z-10 font-mono">
                      <span>1月</span>
                      <span>2月</span>
                      <span>3月</span>
                      <span>4月</span>
                      <span>5月</span>
                      <span>6月</span>
                      <span>7月</span>
                      <span>8月</span>
                      <span>9月</span>
                      <span>10月</span>
                      <span>11月</span>
                      <span>12月</span>
                    </div>

                  </div>
                </div>

                {/* Right Panel: Pending Tasks List (待处理事项) & Live Approvals */}
                <div className="col-span-4 flex flex-col gap-4">
                  
                  {/* Task list card */}
                  <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-xs">
                    <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-50">
                      <h4 className="font-bold text-slate-800 text-[13px] tracking-wide flex items-center gap-1.5">
                        <Clock className="w-4 h-4 text-orange-500" />
                        待处理事项
                      </h4>
                      <span className="text-[10px] text-brand-green bg-brand-green-light px-2 py-0.5 rounded-full font-bold">
                        实时更新
                      </span>
                    </div>

                    <div className="flex flex-col gap-3">
                      
                      {/* Pending row 1: Dynamic application form hook */}
                      {application.status === "pending" ? (
                        <div className="bg-orange-50/50 border border-orange-100 rounded-2xl p-3 flex justify-between items-center">
                          <div className="flex flex-col text-left">
                            <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-ping"></span>
                              有 1 位新导师申请待审
                            </span>
                            <span className="text-[10px] text-slate-400 mt-0.5">申请人：{application.name} ({application.specialization})</span>
                          </div>
                          <button
                            id="admin-btn-go-review"
                            onClick={() => setCurrentMenu("review-detail")}
                            className="bg-orange-500 hover:bg-orange-600 text-white text-[10px] font-bold px-3 py-1.5 rounded-xl block shadow-sm transition-all"
                          >
                            去审核
                          </button>
                        </div>
                      ) : (
                        <div className="border border-slate-50 rounded-2xl p-3 flex justify-between items-center">
                          <div className="flex flex-col text-left">
                            <span className="text-xs font-bold text-slate-700">没有待审核注册导师</span>
                            <span className="text-[10px] text-slate-400 mt-0.5">可在左侧模拟注册后提交</span>
                          </div>
                          <span className="text-[10px] text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-xl font-bold">已清零</span>
                        </div>
                      )}

                      {/* Mock reminders from mockup */}
                      <div className="border border-slate-50 rounded-2xl p-3 flex justify-between items-center">
                        <div className="flex flex-col text-left">
                          <span className="text-xs font-bold text-slate-700">有 7 位名师即将到期</span>
                          <span className="text-[10px] text-slate-400 mt-0.5">证书效力低于30天</span>
                        </div>
                        <button
                          id="btn-alert-inspect"
                          onClick={() => { alert("已为相关 7 位导师通知推送了微信一键自动年审提醒。"); }}
                          className="bg-slate-100 hover:bg-slate-200 text-slate-600 text-[10px] font-bold px-3 py-1.5 rounded-xl shrink-0 transition-all"
                        >
                          催审
                        </button>
                      </div>

                    </div>
                  </div>

                  {/* Recently certified panel matching picture footer */}
                  <div className="bg-[#FAF9F5]/40 border border-slate-100/80 rounded-3xl p-5 text-left">
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-[11px] font-bold text-slate-400 tracking-wider">最近上榜认证导师</span>
                      <button onClick={() => setCurrentMenu("instructors")} className="text-[10px] text-brand-gold hover:underline font-bold">查看更多</button>
                    </div>

                    <div className="flex flex-col gap-2 font-mono text-[11px]">
                      {instructors.slice(0, 3).map((ins, index) => (
                        <div key={index} className="flex justify-between items-center py-1.5 border-b border-slate-50/50">
                          <div className="flex items-center gap-2">
                            <span className="w-4 h-4 rounded-full bg-brand-gold-light text-brand-gold font-bold flex items-center justify-center text-[8px]">{index + 1}</span>
                            <span className="font-bold text-slate-700">{ins.name}</span>
                          </div>
                          <span className="text-slate-400">{ins.certDate || "2026.06.16"}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>

              </div>

            </div>
          )}

          {/* ======================= VIEW B: INSTRUCTOR LIST 教师管理 ======================= */}
          {currentMenu === "instructors" && (
            <div id="admin-view-instructors" className="flex flex-col gap-5 animate-fade-in text-left">
              
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-lg font-bold text-gray-800">教师管理 roster</h2>
                  <p className="text-xs text-slate-400 mt-1">系统已签发电子证书名录。支持创建新导师及强制吊销其电子章权。</p>
                </div>
                
                <button
                  id="admin-btn-add-instructor"
                  onClick={() => setIsAddingInstructor(true)}
                  className="bg-brand-green hover:bg-brand-green-hover text-white text-xs font-bold py-2.5 px-4 rounded-xl flex items-center gap-1.5 shadow-sm transition-all"
                >
                  <Plus className="w-4 h-4" />
                  <span>添加新登记导师</span>
                </button>
              </div>

              {/* Search filter row */}
              <div className="relative">
                <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                <input
                  id="admin-search-instructor"
                  type="text"
                  placeholder="搜索系统中认证的教师名字、证书编号..."
                  value={instructorSearch}
                  onChange={(e) => setInstructorSearch(e.target.value)}
                  className="w-full text-xs py-2.5 pl-10 pr-4 rounded-2xl bg-slate-50 border border-slate-100 focus:outline-none focus:ring-1 focus:ring-brand-green/30"
                />
              </div>

              {/* Instructor Roster Table */}
              <div className="bg-white border border-slate-100 rounded-3xl overflow-hidden shadow-xs">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 text-slate-400 uppercase tracking-wider font-bold border-b border-slate-100">
                      <th className="p-4 pl-6">名师头像 & 姓名</th>
                      <th className="p-4">认证等级</th>
                      <th className="p-4">防伪证书编号</th>
                      <th className="p-4">有效期限</th>
                      <th className="p-4 text-right pr-6">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {instructors
                      .filter(ins => ins.name.includes(instructorSearch) || ins.certNo.includes(instructorSearch))
                      .map((ins) => (
                        <tr key={ins.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="p-4 pl-6 flex items-center gap-3">
                            <img
                              src={ins.avatar}
                              alt={ins.name}
                              className="w-9 h-9 rounded-full object-cover border border-slate-100"
                            />
                            <div>
                              <p className="font-bold text-slate-800">{ins.name}</p>
                              <p className="text-[10px] text-slate-400 mt-0.5">{ins.phone || "---"}</p>
                            </div>
                          </td>
                          <td className="p-4 font-semibold text-brand-gold">{ins.level}</td>
                          <td className="p-4 font-mono text-slate-500 font-bold">{ins.certNo}</td>
                          <td className="p-4 text-slate-500 font-mono">{ins.expiryDate}</td>
                          <td className="p-4 text-right pr-6">
                            <div className="flex gap-2 justify-end">
                              <button
                                id={`admin-btn-delete-teacher-${ins.id}`}
                                onClick={() => handleDeleteInstructor(ins.id)}
                                className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                                title="吊销证书"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>

              {/* Modal block to Add Instructor */}
              {isAddingInstructor && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 animate-fade-in p-4">
                  <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100">
                    <div className="flex justify-between items-center mb-4 pb-2 border-b">
                      <h3 className="font-bold text-slate-800 text-sm">登记新增导师 (后端注册)</h3>
                      <button onClick={() => setIsAddingInstructor(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
                    </div>

                    <form onSubmit={handleCreateInstructor} className="flex flex-col gap-4">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-gray-500">老师姓名</label>
                        <input
                          id="new-ins-name"
                          type="text"
                          required
                          placeholder="例如: 王晓芳"
                          value={newIns.name}
                          onChange={e => setNewIns({ ...newIns, name: e.target.value })}
                          className="p-2 rounded-xl bg-slate-50 border text-xs focus:outline-none focus:ring-1 focus:ring-brand-green"
                        />
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-gray-500">认证序列</label>
                        <select
                          id="new-ins-level"
                          value={newIns.level}
                          onChange={e => setNewIns({ ...newIns, level: e.target.value })}
                          className="p-2 rounded-xl bg-slate-50 border text-xs focus:outline-none focus:ring-1 focus:ring-brand-green"
                        >
                          <option value="L2认证导师">L2认证导师</option>
                          <option value="L3认证导师">L3认证导师</option>
                          <option value="高级瑜伽导师">高级瑜伽导师</option>
                        </select>
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-gray-500">联系电话 (选填)</label>
                        <input
                          id="new-ins-phone"
                          type="text"
                          placeholder="例如: 139-1111-2222"
                          value={newIns.phone}
                          onChange={e => setNewIns({ ...newIns, phone: e.target.value })}
                          className="p-2 rounded-xl bg-slate-50 border text-xs focus:outline-none focus:ring-1 focus:ring-brand-green"
                        />
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-gray-500">简短说明</label>
                        <textarea
                          id="new-ins-bio"
                          placeholder="老师的学术专业特长"
                          rows={2}
                          value={newIns.bio}
                          onChange={e => setNewIns({ ...newIns, bio: e.target.value })}
                          className="p-2 rounded-xl bg-slate-50 border text-xs focus:outline-none focus:ring-1 focus:ring-brand-green resize-none"
                        />
                      </div>

                      <div className="flex gap-3 justify-end mt-2">
                        <button
                          type="button"
                          onClick={() => setIsAddingInstructor(false)}
                          className="px-4 py-2 border rounded-xl text-xs text-slate-500 hover:bg-slate-50"
                        >
                          取消
                        </button>
                        <button
                          id="btn-confirm-add-ins"
                          type="submit"
                          className="px-4 py-2 bg-brand-green hover:bg-brand-green-hover text-white rounded-xl text-xs font-bold"
                        >
                          完成并签发
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

            </div>
          )}

          {/* ======================= VIEW C: REVIEWS (年审及审核) ======================= */}
          {(currentMenu === "reviews" || currentMenu === "review-detail") && (
            <div id="admin-view-reviews" className="flex flex-col gap-5 animate-fade-in text-left">
              
              <div>
                <h2 className="text-lg font-bold text-gray-800">未入驻材料审查 (审查队列)</h2>
                <p className="text-xs text-slate-400 mt-1">
                  接收并核验从小程序在线提交的瑜伽认证材料。批准入册后，全链无缝将资质电子证书推送回其微信。
                </p>
              </div>

              {application.status === "pending" ? (
                <div className="bg-slate-50 rounded-3xl p-6 border border-slate-100 flex flex-col md:flex-row gap-6 justify-between items-start">
                  
                  {/* Left: User materials */}
                  <div className="flex-1 flex flex-col gap-4">
                    <span className="text-[10px] text-orange-500 font-bold bg-orange-50 border border-orange-200/50 rounded-md px-2.5 py-1 inline-block w-fit">
                      PENDING 待审查
                    </span>
                    
                    <h3 className="text-lg font-bold text-gray-800">{application.name} 的资质申请函</h3>
                    <p className="text-xs text-slate-500">
                      申请身份证号: <span className="font-mono text-slate-800 font-bold">{application.idNumber || "310115********1021"}</span>
                    </p>
                    <p className="text-xs text-slate-500">
                      申报流派主专长: <span className="text-brand-green font-bold bg-brand-green-light px-2 py-0.5 rounded-md">{application.specialization}</span>
                    </p>

                    {/* Previews structure resembling material layout screen 6 */}
                    <div className="grid grid-cols-3 gap-2 mt-2">
                      <div className="p-2 border bg-white rounded-xl text-center">
                        <span className="text-[9px] text-slate-400 uppercase font-mono block">头像预览</span>
                        <img src={application.avatarUrl} alt="Avatar" className="w-12 h-12 object-cover rounded-full mx-auto mt-2 shadow-xs border" />
                      </div>
                      <div className="p-2 border bg-white rounded-xl text-center flex flex-col justify-between">
                        <span className="text-[9px] text-slate-400 uppercase font-mono block">结业及培训证</span>
                        <span className="text-[10px] text-emerald-600 font-mono font-bold mt-2">1个JPG已就绪</span>
                      </div>
                      <div className="p-2 border bg-white rounded-xl text-center flex flex-col justify-between">
                        <span className="text-[9px] text-slate-400 uppercase font-mono block">身份证影印</span>
                        <span className="text-[10px] text-emerald-600 font-mono font-bold mt-2">1个PDF保护中</span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="shrink-0 w-full md:w-60 flex flex-col gap-3.5 pt-4 md:pt-0">
                    <p className="text-xs text-slate-400 leading-normal">
                      作为管理者，请仔细查验其上传正反照片。批准通过并符合《喜乐学员规》后自动录入其防伪证书档案。
                    </p>
                    
                    <div className="flex flex-col gap-2">
                      <button
                        id="admin-auth-approve"
                        onClick={() => {
                          onApproveApplication();
                          alert(`🎉 恭喜！您已批准其学员证书。\n证书状态已联动实时更新至小程序端的“我的/数字证书查看”中！`);
                        }}
                        className="w-full bg-[#5D7261] hover:bg-brand-green-hover text-white text-xs font-bold py-3.5 px-6 rounded-2xl shadow-md tracking-wider flex items-center justify-center gap-1.5 transition-all"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>同意审核并颁发证书</span>
                      </button>

                      <button
                        id="admin-auth-reject"
                        onClick={() => {
                          onRejectApplication();
                          alert("您拒绝了本次考核提交，已经反馈其修改个人头像重传。");
                        }}
                        className="w-full bg-red-50 hover:bg-red-100 text-[#b54c4c] text-xs font-bold py-3.5 px-1 rounded-2xl border border-red-100 flex items-center justify-center gap-1.5 transition-all"
                      >
                        <XCircle className="w-4 h-4" />
                        <span>拒绝退回重新核对</span>
                      </button>
                    </div>
                  </div>

                </div>
              ) : (
                <div className="text-center py-16 bg-slate-50 rounded-3xl p-6 border border-slate-100">
                  <Check className="w-12 h-12 text-emerald-600 bg-emerald-50 rounded-full p-2 mx-auto mb-3" />
                  <p className="text-slate-600 font-bold text-sm">当前无任何挂起的导师审核申请</p>
                  <p className="text-xs text-slate-400 max-w-[340px] mx-auto mt-2 leading-relaxed">
                    您可以登录左边的小程序虚拟机。用“张伟”的游客账号进行“我的认证”，输入有效资料点击“提交审核”后，该申请表格将动态在此地显露！
                  </p>
                </div>
              )}

            </div>
          )}

          {/* ======================= VIEW D: STUDIOS (工作室管理) ======================= */}
          {currentMenu === "studios" && (
            <div id="admin-view-studios" className="flex flex-col gap-5 animate-fade-in text-left">
              
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-lg font-bold text-gray-800">工作室入驻（馆舍推荐）</h2>
                  <p className="text-xs text-slate-400 mt-1">管理展陈合作的高空雅室会馆，支持添加新店面和删除下线。</p>
                </div>

                <button
                  id="admin-btn-add-studio"
                  onClick={() => setIsAddingStudio(true)}
                  className="bg-brand-green hover:bg-brand-green-hover text-white text-xs font-bold py-2.5 px-4 rounded-xl flex items-center gap-1.5 shadow-sm transition-all"
                >
                  <Plus className="w-4 h-4" />
                  <span>添加合伙工作室</span>
                </button>
              </div>

              {/* Roster Table of studios */}
              <div className="bg-white border border-slate-100 rounded-3xl overflow-hidden shadow-xs">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 text-slate-400 uppercase tracking-wider font-bold border-b border-slate-100">
                      <th className="p-4 pl-6">馆舍面貌 & 名称</th>
                      <th className="p-4">合伙城市</th>
                      <th className="p-4">精确地址</th>
                      <th className="p-4">预约专线</th>
                      <th className="p-4 text-right pr-6">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {studios.map((std) => (
                      <tr key={std.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="p-4 pl-6 flex items-center gap-3">
                          <img
                            src={std.image}
                            alt={std.name}
                            className="w-12 h-9 rounded-lg object-cover border border-slate-100"
                          />
                          <div>
                            <p className="font-bold text-slate-800">{std.name}</p>
                            <p className="text-[10px] text-[#A68F5E] mt-0.5">{std.tags.slice(0, 2).join(" · ")}</p>
                          </div>
                        </td>
                        <td className="p-4 text-slate-600 font-medium">{std.city}</td>
                        <td className="p-4 text-slate-400 truncate max-w-[180px]">{std.address}</td>
                        <td className="p-4 font-mono text-slate-500">{std.contact}</td>
                        <td className="p-4 text-right pr-6">
                          <button
                            id={`admin-btn-delete-studio-${std.id}`}
                            onClick={() => handleDeleteStudio(std.id)}
                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                            title="撤销挂牌"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Modal block to Add Studio */}
              {isAddingStudio && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 animate-fade-in p-4">
                  <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100">
                    <div className="flex justify-between items-center mb-4 pb-2 border-b">
                      <h3 className="font-bold text-slate-800 text-sm">加盟入驻一所新瑜伽馆</h3>
                      <button onClick={() => setIsAddingStudio(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
                    </div>

                    <form onSubmit={handleCreateStudio} className="flex flex-col gap-4">
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs font-bold text-gray-500">会馆名称</label>
                          <input
                            id="new-std-name"
                            type="text"
                            required
                            placeholder="如: 清心苑"
                            value={newStudio.name}
                            onChange={e => setNewStudio({ ...newStudio, name: e.target.value })}
                            className="p-2 rounded-xl bg-slate-50 border text-xs focus:outline-none focus:ring-1 focus:ring-brand-green"
                          />
                        </div>

                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs font-bold text-gray-500">行政市区(如：徐汇区)</label>
                          <input
                            id="new-std-district"
                            type="text"
                            required
                            placeholder="朝阳区"
                            value={newStudio.district}
                            onChange={e => setNewStudio({ ...newStudio, district: e.target.value })}
                            className="p-2 rounded-xl bg-slate-50 border text-xs focus:outline-none focus:ring-1 focus:ring-brand-green"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs font-bold text-gray-500">主选合伙城市</label>
                          <select
                            id="new-std-city"
                            value={newStudio.city}
                            onChange={e => setNewStudio({ ...newStudio, city: e.target.value })}
                            className="p-2 rounded-xl bg-slate-50 border text-xs focus:outline-none focus:ring-1 focus:ring-brand-green"
                          >
                            <option value="上海市">上海市</option>
                            <option value="北京市">北京市</option>
                            <option value="杭州市">杭州市</option>
                            <option value="广州市">广州市</option>
                            <option value="深圳市">深圳市</option>
                          </select>
                        </div>

                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs font-bold text-gray-500">联系电话</label>
                          <input
                            id="new-std-contact"
                            type="text"
                            placeholder="021-33221144"
                            value={newStudio.contact}
                            onChange={e => setNewStudio({ ...newStudio, contact: e.target.value })}
                            className="p-2 rounded-xl bg-slate-50 border text-xs focus:outline-none focus:ring-1 focus:ring-brand-green"
                          />
                        </div>
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-gray-500">详细落脚地址</label>
                        <input
                          id="new-std-address"
                          type="text"
                          placeholder="例如：朝阳区建国路88号5号楼202"
                          value={newStudio.address}
                          onChange={e => setNewStudio({ ...newStudio, address: e.target.value })}
                          className="p-2 rounded-xl bg-slate-50 border text-xs focus:outline-none focus:ring-1 focus:ring-brand-green"
                        />
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-gray-500">会馆特色标识 (逗号分隔)</label>
                        <input
                          id="new-std-tags"
                          type="text"
                          placeholder="静心冥想, 颂钵疗愈, 露台美学"
                          value={newStudio.tags}
                          onChange={e => setNewStudio({ ...newStudio, tags: e.target.value })}
                          className="p-2 rounded-xl bg-slate-50 border text-xs focus:outline-none focus:ring-1 focus:ring-brand-green"
                        />
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-gray-500">场馆简介</label>
                        <textarea
                          id="new-std-desc"
                          placeholder="详细描述场馆的核心环境及特选私教"
                          rows={2}
                          value={newStudio.description}
                          onChange={e => setNewStudio({ ...newStudio, description: e.target.value })}
                          className="p-2 rounded-xl bg-slate-50 border text-xs focus:outline-none focus:ring-1 focus:ring-brand-green resize-none"
                        />
                      </div>

                      <div className="flex gap-3 justify-end mt-2">
                        <button
                          type="button"
                          onClick={() => setIsAddingStudio(false)}
                          className="px-4 py-2 border rounded-xl text-xs text-slate-500 hover:bg-slate-50"
                        >
                          取消
                        </button>
                        <button
                          id="btn-confirm-add-std"
                          type="submit"
                          className="px-4 py-2 bg-brand-green hover:bg-brand-green-hover text-white rounded-xl text-xs font-bold"
                        >
                          确认上线
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

            </div>
          )}

          {/* ======================= VIEW E: STATS 数据分析 ======================= */}
          {currentMenu === "stats" && (
            <div id="admin-view-stats" className="flex flex-col gap-5 animate-fade-in text-left">
              <div>
                <h2 className="text-lg font-bold text-gray-800 font-serif">数据分析 📊</h2>
                <p className="text-xs text-slate-400 mt-1">系统签发大数据流合规比对与老师资质安全稽核。</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-5 rounded-3xl border bg-slate-50/50">
                  <h3 className="font-bold text-xs text-slate-400 uppercase">最受欢迎流派分类：</h3>
                  <div className="flex flex-col gap-3 mt-4 text-xs font-mono">
                    <div className="flex justify-between"><span>哈他经典派 Hatha (58%)</span><span className="font-bold">745位</span></div>
                    <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden"><div className="bg-brand-green h-full rounded-full" style={{ width: "58%" }}></div></div>
                    
                    <div className="flex justify-between mt-1"><span>流瑜伽 Vinyasa (24%)</span><span className="font-bold">308位</span></div>
                    <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden"><div className="bg-brand-gold h-full rounded-full" style={{ width: "24%" }}></div></div>

                    <div className="flex justify-between mt-1"><span>静心阴瑜伽 Yin Yoga (18%)</span><span className="font-bold">233位</span></div>
                    <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden"><div className="bg-[#8FA292] h-full rounded-full" style={{ width: "18%" }}></div></div>
                  </div>
                </div>

                <div className="p-5 rounded-3xl border bg-slate-50/50">
                  <h3 className="font-bold text-xs text-slate-400 uppercase">讲师地域分布占比：</h3>
                  <div className="flex flex-col gap-3 mt-4 text-xs font-mono">
                    <div className="flex justify-between"><span>上海市 (42%)</span><span className="font-bold">540位</span></div>
                    <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden"><div className="bg-brand-green h-full rounded-full" style={{ width: "42%" }}></div></div>
                    
                    <div className="flex justify-between mt-1"><span>北京市 (28%)</span><span className="font-bold">360位</span></div>
                    <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden"><div className="bg-brand-green h-full rounded-full" style={{ width: "28%" }}></div></div>

                    <div className="flex justify-between mt-1"><span>杭州市等其他地区 (30%)</span><span className="font-bold">386位</span></div>
                    <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden"><div className="bg-brand-green h-full rounded-full" style={{ width: "30%" }}></div></div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ======================= VIEW F: PERMISSIONS 权限管理 ======================= */}
          {currentMenu === "permissions" && (
            <div id="admin-view-permissions" className="flex flex-col gap-5 animate-fade-in text-left">
              <div>
                <h2 className="text-lg font-bold text-gray-800">系统权限管理 🛡️</h2>
                <p className="text-xs text-slate-400 mt-1">控制有权登录及审章数字证书签注的人员名单。</p>
              </div>

              <div className="bg-slate-50 p-5 rounded-3xl border">
                <div className="flex justify-between items-center py-2 border-b">
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">超级管理员 (Admin Super)</span>
                    <span className="text-[10px] text-slate-400">xiaohan9995@gmail.com</span>
                  </div>
                  <span className="bg-amber-100/60 text-amber-700 border border-amber-200 px-2.5 py-0.5 rounded-full text-[10px] font-bold">根特权</span>
                </div>

                <div className="flex justify-between items-center py-2 mt-2">
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">合作考点专员 (Auditor)</span>
                    <span className="text-[10px] text-slate-400">joyyoga_auditing@china.com</span>
                  </div>
                  <span className="bg-brand-green-light text-brand-green border border-brand-green/10 px-2.5 py-0.5 rounded-full text-[10px] font-bold">审核专员</span>
                </div>
              </div>
            </div>
          )}

          {/* ======================= VIEW G: SETTINGS 设置 ======================= */}
          {currentMenu === "settings" && (
            <div id="admin-view-settings" className="flex flex-col gap-5 animate-fade-in text-left">
              <div>
                <h2 className="text-lg font-bold text-gray-800">后台机制配置 ⚙️</h2>
                <p className="text-xs text-slate-400 mt-1">调整防伪戳章加密规则。密钥和微信号双重通道保护。</p>
              </div>

              <div className="p-4 rounded-3xl border bg-slate-50 flex flex-col gap-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-700">启用防伪二维码联动实时检验：</span>
                  <div className="w-10 h-6 bg-brand-green rounded-full p-0.5 cursor-pointer relative"><div className="w-5 h-5 bg-white rounded-full shadow-md float-right"></div></div>
                </div>
                
                <div className="flex justify-between items-center border-t pt-2">
                  <span className="text-xs font-bold text-slate-700">资质证书到期前自动微信消息提醒：</span>
                  <div className="w-10 h-6 bg-brand-green rounded-full p-0.5 cursor-pointer relative"><div className="w-5 h-5 bg-white rounded-full shadow-md float-right"></div></div>
                </div>
              </div>
            </div>
          )}

        </div>

      </div>

    </div>
  );
}
