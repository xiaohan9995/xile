/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import {
  Search,
  FileText,
  MapPin,
  ChevronRight,
  Phone,
  ArrowLeft,
  Filter,
  Upload,
  Download,
  Share2,
  Calendar,
  Clock,
  Check,
  Settings,
  X,
  Compass,
  Star,
  Users
} from "lucide-react";
import { Instructor, Studio, CertApplication } from "../types";
import { mockInstructors, mockStudios } from "../mockData";

// Sub-component props definition
interface ViewProps {
  onNavigate: (view: string, tab?: string) => void;
  instructors: Instructor[];
  studios: Studio[];
  application: CertApplication;
  setApplication: React.Dispatch<React.SetStateAction<CertApplication>>;
  selectedInstructor: Instructor | null;
  setSelectedInstructor: (ins: Instructor | null) => void;
  selectedStudio: Studio | null;
  setSelectedStudio: (std: Studio | null) => void;
  currentUser: { name: string; level: string; isCertified: boolean; avatar: string; regDate: string; days: number; expiryDate: string };
  onApproveApplication: () => void;
  onLogout?: () => void;
}

// 1. SCREEN 1: HOME VIEW
export function HomeView({
  onNavigate,
  application,
  currentUser
}: ViewProps) {
  const [totalCertCount] = useState(1286);
  const [monthCertCount] = useState(326);

  // Determine target for "我的认证" card click
  const handleCertCardClick = () => {
    if (currentUser.isCertified) {
      onNavigate("certificate", "my");
    } else if (application.status === "pending") {
      onNavigate("success", "my");
    } else {
      onNavigate("cert-step1", "my");
    }
  };

  return (
    <div id="home-view" className="flex flex-col min-h-full pb-20 select-none bg-brand-bg transition-all duration-300">
      {/* Hero Banner Background with Forest Yoga Theme */}
      <div 
        className="relative h-[280px] w-full bg-cover bg-center flex flex-col justify-between p-6 text-white"
        style={{
          backgroundImage: `linear-gradient(to bottom, rgba(40,55,44,0.4) 0%, rgba(250,248,245,1) 95%), url('https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?q=80&w=1200&auto=format&fit=crop')`,
        }}
      >
        {/* Decorative Status spacer for safe-area */}
        <div className="h-6"></div>

        {/* Brand Text */}
        <div className="mt-4 animate-fade-in">
          <p className="text-sm font-medium tracking-widest text-[#FFF8E7] drop-shadow-sm uppercase">
            瑜伽导师认证中心
          </p>
          <h1 className="text-3xl font-bold font-serif my-1 text-white bg-gradient-to-r from-white via-[#FFF8E7] to-[#DFD0B8] bg-clip-text text-transparent drop-shadow-sm">
            喜乐瑜伽
          </h1>
          <span className="inline-block mt-1 px-2.5 py-0.5 text-[10px] tracking-wider rounded-full border border-white/30 bg-white/10 backdrop-blur-xs font-mono font-medium">
            微信小程序
          </span>
        </div>

        {/* Dynamic Greeting notification based on role */}
        <div className="mt-8 bg-brand-green/85 backdrop-blur-xs rounded-2xl py-2 px-4 shadow-lg text-xs flex justify-between items-center text-white border border-white/10">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
            <span>
              {currentUser.isCertified 
                ? `欢迎回来，认证讲师 ${currentUser.name}`
                : application.status === "pending"
                  ? "您的证书申请正加速审核中"
                  : "成为专业认证导师，开启教学之旅"
              }
            </span>
          </div>
          <button 
            id="greet-badge"
            onClick={() => onNavigate(currentUser.isCertified ? "profile" : "cert-step1", "my")} 
            className="text-[10px] text-amber-200 hover:text-amber-100 font-semibold flex items-center"
          >
            <span>{currentUser.isCertified ? "管理" : "立即申请"}</span>
            <ChevronRight className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Floating Big Button: Instructor Query (导师查询) */}
      <div className="px-5 -mt-4 z-10">
        <button
          id="btn-instructor-query"
          onClick={() => onNavigate("instructor-query", "search")}
          className="w-full bg-[#5D7261] text-white rounded-3xl p-5 shadow-xl flex items-center gap-4 hover:bg-brand-green-hover transform hover:-translate-y-0.5 active:translate-y-0 active:scale-98 transition-all"
        >
          <div className="w-14 h-14 bg-[#BBA178]/90 rounded-2xl flex items-center justify-center shadow-inner">
            <Search className="w-7 h-7 text-white stroke-[2.5]" />
          </div>
          <div className="text-left flex-1">
            <h3 className="text-lg font-bold tracking-wider">导师查询</h3>
            <p className="text-xs text-white/80 mt-0.5">喜乐瑜伽认证中心 · 官方防伪校验</p>
          </div>
          <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
            <ChevronRight className="w-5 h-5 text-white/90" />
          </div>
        </button>
      </div>

      {/* Grid Menu: My Certification & Studio list */}
      <div className="grid grid-cols-2 gap-4 px-5 mt-5">
        {/* Card 1: 我的认证 */}
        <button
          id="btn-my-certification"
          onClick={handleCertCardClick}
          className="bg-white rounded-3xl p-5 text-left flex flex-col justify-between h-[115px] shadow-sm hover:shadow-md transition-all yoga-card-shadow border border-slate-100 group relative overflow-hidden"
        >
          {/* Subtle decorative circle */}
          <div className="absolute right-0 bottom-0 w-20 h-20 bg-brand-gold-light/40 rounded-full translate-x-4 translate-y-4 group-hover:scale-110 transition-transform"></div>
          
          <div className="z-10">
            <h4 className="font-bold text-gray-800 text-[15px]">我的认证</h4>
            <p className="text-[11px] text-gray-400 mt-1">
              {currentUser.isCertified 
                ? "查看专属数字证书" 
                : application.status === "pending"
                  ? "查看材料审核进度"
                  : "个人认证证书申领"
              }
            </p>
          </div>
          <div className="flex justify-between items-center z-10 w-full mt-2">
            <span className="text-[10px] font-semibold text-brand-gold bg-brand-gold-light px-2 py-0.5 rounded-full border border-brand-gold/10">
              {currentUser.isCertified ? "已激活" : application.status === "pending" ? "审核中" : "去申请"}
            </span>
            <div className="w-8 h-8 bg-brand-gold-light/60 rounded-full flex items-center justify-center text-brand-gold">
              <FileText className="w-4 h-4 stroke-[2]" />
            </div>
          </div>
        </button>

        {/* Card 2: 瑜伽工作室 */}
        <button
          id="btn-studios"
          onClick={() => onNavigate("studio-discovery", "discover")}
          className="bg-white rounded-3xl p-5 text-left flex flex-col justify-between h-[115px] shadow-sm hover:shadow-md transition-all yoga-card-shadow border border-slate-100 group relative overflow-hidden"
        >
          {/* Subtle decorative circle */}
          <div className="absolute right-0 bottom-0 w-20 h-20 bg-brand-green-light/40 rounded-full translate-x-4 translate-y-4 group-hover:scale-110 transition-transform"></div>

          <div className="z-10">
            <h4 className="font-bold text-gray-800 text-[15px]">瑜伽工作室</h4>
            <p className="text-[11px] text-gray-400 mt-1">精选高层空灵馆舍</p>
          </div>
          <div className="flex justify-between items-center z-10 w-full mt-2">
            <span className="text-[10px] font-semibold text-brand-green bg-brand-green-light px-2 py-0.5 rounded-full border border-brand-green/10">
              寻工作室
            </span>
            <div className="w-8 h-8 bg-brand-green-light/60 rounded-full flex items-center justify-center text-brand-green">
              <MapPin className="w-4 h-4 stroke-[2]" />
            </div>
          </div>
        </button>
      </div>

      {/* Section Data Statistics (数据统计) */}
      <div className="px-5 mt-5">
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 yoga-card-shadow">
          <div className="flex justify-between items-center mb-4">
            <h4 className="font-bold text-gray-800 text-[15px] flex items-center gap-1.5">
              <span className="w-1 h-4 bg-[#BBA178] rounded-full inline-block"></span>
              系统数据统计
            </h4>
            <button 
              id="stat-view-more"
              onClick={() => onNavigate("studio-discovery", "discover")} 
              className="text-xs text-brand-gold font-medium flex items-center gap-0.5 hover:opacity-80"
            >
              <span>查看更多</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4 divide-x divide-gray-100">
            <div className="text-center">
              <p className="text-2xl font-bold font-serif text-gray-800">
                {totalCertCount.toLocaleString()}
              </p>
              <p className="text-[11px] text-gray-400 mt-1">系统累计认证导师</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold font-serif text-gray-800">
                {monthCertCount}
              </p>
              <p className="text-[11px] text-gray-400 mt-1">本月新增登记申请</p>
            </div>
          </div>
        </div>
      </div>

      {/* Decorative Brand footer */}
      <div className="mt-8 mb-4 text-center px-6">
        <p className="text-[11px] text-gray-300 tracking-wider">喜乐瑜伽 · 指导老师资质认定唯一入口</p>
        <p className="text-[9px] text-gray-300 font-mono mt-0.5">JoyYoga Certificate Registry v1.4</p>
      </div>
    </div>
  );
}

// 2. SCREEN 2: INSTRUCTOR QUERY VIEW (LIST OF TEACHERS)
export function InstructorQueryView({
  onNavigate,
  instructors,
  setSelectedInstructor
}: ViewProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedLevel, setSelectedLevel] = useState("all");

  const filteredTeachers = instructors.filter((t) => {
    const matchesSearch = t.name.includes(searchTerm) || t.certNo.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesLevel = selectedLevel === "all" || t.level.includes(selectedLevel);
    return matchesSearch && matchesLevel;
  });

  return (
    <div id="instructor-query-view" className="flex flex-col min-h-full pb-20 select-none bg-brand-bg">
      {/* Title Header */}
      <div className="p-4 bg-white flex items-center justify-between border-b border-gray-100 shadow-xs sticky top-0 z-20">
        <button 
          id="btn-back-to-home"
          onClick={() => onNavigate("home", "home")} 
          className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-slate-100 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-700" />
        </button>
        <h2 className="text-[16px] font-bold text-gray-800">名师资质校验</h2>
        <div className="w-8 h-8 flex items-center justify-center">
          <Filter className="w-4 h-4 text-gray-400 cursor-pointer" />
        </div>
      </div>

      {/* Interactive Quick search filter */}
      <div className="p-4 bg-white flex flex-col gap-2">
        <div className="relative">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-gray-400" />
          <input
            id="input-teacher-search"
            type="text"
            placeholder="输入导师姓名或证书编号JY2023..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full text-xs py-2.5 pl-10 pr-4 rounded-xl bg-slate-50 border border-slate-100 focus:outline-none focus:ring-1 focus:ring-brand-green/30 focus:border-brand-green/30"
          />
          {searchTerm && (
            <button 
              id="clear-search"
              onClick={() => setSearchTerm("")} 
              className="absolute right-3.5 top-3 text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Level Filters */}
        <div className="flex gap-2 mt-1">
          {[
            { id: "all", label: "全部级别" },
            { id: "L2", label: "L2级别" },
            { id: "L3", label: "L3级别" }
          ].map((lvl) => (
            <button
              id={`filter-${lvl.id}`}
              key={lvl.id}
              onClick={() => setSelectedLevel(lvl.id)}
              className={`text-[11px] px-3 py-1 rounded-full border transition-all ${
                (selectedLevel === lvl.id)
                  ? "bg-brand-green text-white border-brand-green"
                  : "bg-white text-gray-500 border-gray-200 hover:bg-gray-100"
              }`}
            >
              {lvl.label}
            </button>
          ))}
        </div>
      </div>

      {/* Results Header block */}
      <div className="px-4 py-2 text-xs text-gray-400 flex justify-between items-center">
        <span>系统库已备案及认证导师名单</span>
        <span>共 {filteredTeachers.length} 位导师</span>
      </div>

      {/* List layout mimicking Screen 2 */}
      <div className="px-4 flex flex-col gap-3.5 overflow-y-auto">
        {filteredTeachers.length > 0 ? (
          filteredTeachers.map((teacher) => (
            <div
              id={`teacher-card-${teacher.id}`}
              key={teacher.id}
              onClick={() => {
                setSelectedInstructor(teacher);
                onNavigate("profile", "my");
              }}
              className="bg-white rounded-3xl p-4 flex gap-4 shadow-sm border border-slate-50 relative group cursor-pointer hover:shadow-md hover:border-slate-200 hover:-translate-y-0.5 transition-all duration-300"
            >
              {/* Profile Avatar */}
              <div className="relative shrink-0">
                <img
                  src={teacher.avatar}
                  alt={teacher.name}
                  referrerPolicy="no-referrer"
                  className="w-16 h-16 rounded-full object-cover border border-slate-200 shadow-xs"
                />
                <span className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-white"></span>
              </div>

              {/* Bio block */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-gray-800 text-[16px] truncate">{teacher.name}</h3>
                  <span className="px-2 py-0.5 text-[9px] font-semibold text-brand-gold bg-brand-gold-light rounded-md border border-brand-gold/15 flex items-center gap-0.5">
                    <Check className="w-2.5 h-2.5 stroke-[3]" />
                    {teacher.level}
                  </span>
                </div>
                
                <p className="text-[11px] text-gray-400 mt-1.5 font-mono">
                  认证编号: {teacher.certNo}
                </p>
                <p className="text-[11px] text-gray-400 mt-0.5 font-mono">
                  有效期至: {teacher.expiryDate}
                </p>
              </div>

              {/* Chevron anchor */}
              <div className="self-center flex items-center text-gray-300 group-hover:text-brand-green group-hover:translate-x-0.5 transition-all">
                <ChevronRight className="w-5 h-5 stroke-[1.5]" />
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-12 bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
            <p className="text-sm text-gray-400">没有查找到符合条件的导师</p>
            <button 
              id="btn-reset-filters"
              onClick={() => { setSearchTerm(""); setSelectedLevel("all"); }} 
              className="text-xs text-brand-green font-medium mt-3 hover:underline"
            >
              重置筛选条件
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// 3. SCREEN 3: STUDIO DISCOVERY VIEW (MAPS/STUDIO LIST)
export function StudioDiscoveryView({
  onNavigate,
  studios,
  setSelectedStudio
}: ViewProps) {
  const [selectedCity, setSelectedCity] = useState("上海");
  const [searchStudioStr, setSearchStudioStr] = useState("");

  const cities = ["上海", "北京", "杭州", "广州", "深圳"];

  const filteredStudios = studios.filter((s) => {
    const matchesCity = s.city.includes(selectedCity);
    const matchesQuery = s.name.includes(searchStudioStr) || s.tags.some(t => t.includes(searchStudioStr));
    return matchesCity && matchesQuery;
  });

  return (
    <div id="studio-discovery-view" className="flex flex-col min-h-full pb-20 select-none bg-brand-bg">
      {/* Back navigation header */}
      <div className="p-4 bg-white flex items-center justify-between border-b border-gray-100 sticky top-0 z-20">
        <button 
          id="btn-discover-back"
          onClick={() => onNavigate("home", "home")} 
          className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-slate-100 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-700" />
        </button>
        <h2 className="text-[16px] font-bold text-gray-800">瑜伽工作室发现</h2>
        <div className="w-8 h-8"></div>
      </div>

      {/* Hero Visual Card mimicking upper half of Screen 3 */}
      <div className="p-4">
        <div 
          className="relative h-[160px] w-full rounded-3xl bg-cover bg-center flex flex-col justify-end p-4 text-white overflow-hidden shadow-sm"
          style={{
            backgroundImage: `linear-gradient(to top, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.1) 100%), url('https://images.unsplash.com/photo-1545205597-3d9d02c29597?q=80&w=600&auto=format&fit=crop')`,
          }}
        >
          {/* Studio Search Bar */}
          <div className="relative w-full z-10">
            <Search className="absolute left-3.5 top-3 w-4.5 h-4.5 text-gray-400" />
            <input
              id="input-studio-search"
              type="text"
              placeholder="搜索瑜伽工作室 / 输入特色关键词"
              value={searchStudioStr}
              onChange={(e) => setSearchStudioStr(e.target.value)}
              className="w-full text-xs text-gray-700 py-3 pl-11 pr-4 rounded-full bg-white/95 backdrop-blur-xs shadow-md focus:outline-none focus:ring-2 focus:ring-brand-green/30"
            />
          </div>
        </div>
      </div>

      {/* City Filters row */}
      <div className="px-4 py-1.5 overflow-x-auto no-scrollbar flex gap-2.5">
        {cities.map((city) => (
          <button
            id={`tab-city-${city}`}
            key={city}
            onClick={() => setSelectedCity(city)}
            className={`whitespace-nowrap px-5 py-2.5 rounded-full text-xs font-semibold tracking-wider transition-all shadow-xs ${
              selectedCity === city
                ? "bg-brand-green text-white"
                : "bg-white text-gray-500 border border-slate-100 hover:bg-slate-50"
            }`}
          >
            {city}
          </button>
        ))}
      </div>

      {/* Roster lists mapping to Screen 3 list */}
      <div className="p-4 flex flex-col gap-4">
        {filteredStudios.length > 0 ? (
          filteredStudios.map((studio) => (
            <div
              id={`studio-card-${studio.id}`}
              key={studio.id}
              className="bg-white rounded-3xl p-4 flex gap-4 shadow-sm border border-slate-100 hover:shadow-md transition-all yoga-card-shadow"
            >
              {/* Studio cover art */}
              <img
                src={studio.image}
                alt={studio.name}
                referrerPolicy="no-referrer"
                className="w-20 h-20 rounded-2xl object-cover shrink-0 border border-slate-100 shadow-xs"
              />

              {/* Text metadata */}
              <div className="flex-1 min-w-0 flex flex-col justify-between">
                <div>
                  <h3 className="font-bold text-gray-800 text-[15px] leading-tight truncate">{studio.name}</h3>
                  <p className="text-[11px] text-gray-400 mt-1 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-brand-green shrink-0" />
                    <span className="truncate">{studio.city} · {studio.district}</span>
                  </p>
                </div>

                {/* Tags list */}
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {studio.tags.slice(0, 2).map((tag, idx) => (
                    <span key={idx} className="bg-slate-50 text-slate-400 border border-slate-100 rounded-md px-1.5 py-0.5 text-[9px]">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              {/* CTA trigger button */}
              <div className="self-center shrink-0">
                <button
                  id={`btn-studio-detail-${studio.id}`}
                  onClick={() => {
                    setSelectedStudio(studio);
                  }}
                  className="bg-brand-green-light hover:bg-[#E2E8E4] text-brand-green text-[10px] font-bold px-3 py-2 rounded-xl transition-colors shrink-0"
                >
                  查看详情
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-12 bg-white rounded-3xl p-5 border border-slate-100 shadow-sm">
            <p className="text-sm text-gray-400">该城市暂无合作机构登记</p>
            <button 
              id="btn-reset-city"
              onClick={() => { setSelectedCity("上海"); setSearchStudioStr(""); }} 
              className="text-xs text-brand-gold font-medium mt-3 hover:underline"
            >
              返回核心合作城市
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// 4. SCREEN 4: INSTRUCTOR PROFILE VIEW (讲师简介)
export function InstructorProfileView({
  onNavigate,
  selectedInstructor,
  currentUser,
  setSelectedInstructor,
  onLogout
}: ViewProps) {
  // If viewing themselves vs. another instructor in list
  const isViewingSelf = !selectedInstructor;
  const userToRender = isViewingSelf
    ? {
        name: currentUser.name,
        level: currentUser.level,
        avatar: currentUser.avatar,
        expiryDate: currentUser.expiryDate,
        certifiedDays: currentUser.days,
        bio: "国家级注册哈他瑜伽导师，十小时工作坊长期主理人。具有深厚的呼吸吐纳哲学功底，提倡在习练中感受肌肉的呼吸与心流状态。"
      }
    : {
        name: selectedInstructor.name,
        level: selectedInstructor.level,
        avatar: selectedInstructor.avatar,
        expiryDate: selectedInstructor.expiryDate,
        certifiedDays: selectedInstructor.certifiedDays || 1095,
        bio: selectedInstructor.bio || "资深瑜伽流派导师，深得学员信奉。"
      };

  return (
    <div id="instructor-profile-view" className="flex flex-col min-h-full pb-20 select-none bg-brand-bg transition-all duration-300">
      {/* Styled Header back arrow */}
      <div className="p-4 bg-white flex items-center justify-between border-b border-gray-100 sticky top-0 z-20">
        <button 
          id="btn-profile-back"
          onClick={() => {
            if (!isViewingSelf) {
              setSelectedInstructor(null);
              onNavigate("instructor-query", "search");
            } else {
              onNavigate("home", "home");
            }
          }}
          className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-slate-100 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-700" />
        </button>
        <h2 className="text-[16px] font-bold text-gray-800">讲师简介</h2>
        <div className="w-8 h-8"></div>
      </div>

      {/* Upper Profile Box */}
      <div className="p-5 flex flex-col items-center text-center bg-white border-b border-gray-100/60 shadow-xs relative">
        <div className="relative">
          <img
            src={userToRender.avatar}
            alt={userToRender.name}
            referrerPolicy="no-referrer"
            className="w-24 h-24 rounded-3xl object-cover border-4 border-brand-green-light shadow-md"
          />
          <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-brand-gold rounded-full flex items-center justify-center text-white border-2 border-white shadow-xs">
            <Check className="w-3.5 h-3.5 stroke-[3]" />
          </div>
        </div>

        <h3 className="mt-3.5 text-xl font-bold text-gray-800">{userToRender.name}</h3>
        
        {/* L2/L3 Gold badge label */}
        <div className="mt-2 text-center">
          <span className="inline-flex items-center gap-1 bg-[#D4AF37]/15 text-[#b08d1a] border border-[#D4AF37]/30 px-3.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wider shadow-inner">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
            {userToRender.level}
          </span>
        </div>

        {/* Bio text block */}
        <p className="mt-4 px-4 text-xs text-gray-500 leading-relaxed max-w-md italic">
          "{userToRender.bio}"
        </p>
      </div>

      {/* Grid summary block resembling Screen 4 */}
      <div className="grid grid-cols-2 gap-4 px-5 mt-5">
        <div className="bg-white rounded-3xl p-4 border border-slate-100 yoga-card-shadow text-center">
          <p className="text-xs text-gray-400 font-medium flex items-center justify-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-brand-green" />
            认证到期
          </p>
          <p className="text-xl font-bold font-serif text-gray-800 mt-2">
            {userToRender.expiryDate}
          </p>
        </div>

        <div className="bg-white rounded-3xl p-4 border border-slate-100 yoga-card-shadow text-center">
          <p className="text-xs text-gray-400 font-medium flex items-center justify-center gap-1">
            <Clock className="w-3.5 h-3.5 text-brand-green" />
            认证天数
          </p>
          <p className="text-xl font-bold font-serif text-gray-800 mt-2">
            {userToRender.certifiedDays} 天
          </p>
        </div>
      </div>

      {/* Settings list from Screen 4 */}
      <div className="px-5 mt-5">
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden yoga-card-shadow">
          {[
            { id: "my-files", label: "我的文件", subtitle: "讲师资格及资质证明材料" },
            { id: "annual-records", label: "年度记录", subtitle: "年度再教育学分审核录" },
            { id: "certificate-check", label: "证书查看", subtitle: "数字化权威资质证书预览" },
            { id: "contact-support", label: "联系客服", subtitle: "注册、续签及遗失补办协助" },
            { id: "account-settings", label: "个人设置", subtitle: "更新履历、授课地点或档案" }
          ].map((item, idx) => (
            <button
              id={`profile-menu-${item.id}`}
              key={item.id}
              onClick={() => {
                if (item.id === "certificate-check") {
                  onNavigate("certificate", "my");
                } else if (item.id === "contact-support") {
                  alert("微信在线客服工作时间：周一至周五 09:00 - 18:00\n热线：400-820-8820");
                } else {
                  alert(`您点击了 ${item.label}，该功能作为微信沙盒内容仅供视觉高保真预览。`);
                }
              }}
              className={`w-full flex items-center justify-between p-4.5 text-left border-slate-50 transition-colors hover:bg-slate-50 ${
                idx !== 4 ? "border-b" : ""
              }`}
            >
              <div className="flex flex-col">
                <span className="font-bold text-gray-800 text-sm tracking-wide">{item.label}</span>
                <span className="text-[10px] text-gray-400 mt-0.5">{item.subtitle}</span>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-300" />
            </button>
          ))}
        </div>
      </div>

      {/* Logout Action Button Section */}
      {isViewingSelf && (
        <div className="px-5 mt-5">
          <button
            id="btn-profile-logout"
            onClick={() => {
              if (onLogout) {
                onLogout();
              } else {
                alert("已成功安全退出登录");
              }
            }}
            className="w-full bg-red-50 hover:bg-red-100/70 border border-red-100 text-[#c84a4a] hover:text-[#962e2e] text-xs font-bold py-4 px-6 rounded-2xl tracking-wider transition-all shadow-xs flex items-center justify-center gap-2 transform active:scale-98"
          >
            退出当前微信号
          </button>
        </div>
      )}
    </div>
  );
}

// 5. SCREEN 5: CERTIFICATION APPLICATION STEP 1 (认证申请)
export function CertStep1View({
  onNavigate,
  application,
  setApplication
}: ViewProps) {
  const [userName, setUserName] = useState(application.name);
  const [userIdCard, setUserIdCard] = useState(application.idNumber);
  const [userSpec, setUserSpec] = useState(application.specialization || "哈他专业");
  const [errorText, setErrorText] = useState("");

  const handleNext = () => {
    if (!userName.trim()) {
      setErrorText("如果您未填写名字，将无法通过备案。");
      return;
    }
    if (!userIdCard.trim() || !/^\d{6,18}[0-9xX]?$/.test(userIdCard)) {
      setErrorText("请填写真实字样的合格身份证/考证代码");
      return;
    }
    setErrorText("");
    
    // Save state
    setApplication({
      ...application,
      name: userName,
      idNumber: userIdCard,
      specialization: userSpec,
      step: 2
    });

    onNavigate("cert-step2", "my");
  };

  return (
    <div id="cert-step1-view" className="flex flex-col min-h-full pb-20 select-none bg-brand-bg">
      {/* Title Header */}
      <div className="p-4 bg-white flex items-center justify-between border-b border-gray-100 sticky top-0 z-20">
        <button 
          id="btn-step1-back"
          onClick={() => onNavigate("home", "home")} 
          className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-slate-100 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-700" />
        </button>
        <h2 className="text-[16px] font-bold text-gray-800 font-sans">认证申请</h2>
        <div className="w-8 h-8"></div>
      </div>

      {/* Step progress Indicator mapping Screen 5 */}
      <div className="p-5 flex items-center justify-center gap-2 bg-white border-b border-gray-150/50">
        <div className="flex flex-col items-center">
          <div className="w-8 h-8 rounded-full bg-brand-green text-white flex items-center justify-center text-xs font-bold ring-4 ring-brand-green/20">
            <Check className="w-4 h-4 stroke-[3]" />
          </div>
          <span className="text-[11px] text-brand-green font-bold mt-1">信息填充</span>
        </div>
        
        <div className="h-0.5 w-16 bg-gray-200 -mt-4"></div>

        <div className="flex flex-col items-center">
          <div className="w-8 h-8 rounded-full bg-gray-200 text-gray-400 flex items-center justify-center text-xs font-bold">
            2
          </div>
          <span className="text-[11px] text-gray-400 mt-1">材料上传</span>
        </div>

        <div className="h-0.5 w-16 bg-gray-200 -mt-4"></div>

        <div className="flex flex-col items-center">
          <div className="w-8 h-8 rounded-full bg-gray-200 text-gray-400 flex items-center justify-center text-xs font-bold">
            3
          </div>
          <span className="text-[11px] text-gray-400 mt-1">提交申请</span>
        </div>
      </div>

      {/* Primary form layout matching Screen 5 form fields */}
      <div className="p-5 flex flex-col gap-5">
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex flex-col gap-5">
          {/* Name Field */}
          <div className="flex flex-col">
            <label className="text-sm font-bold text-gray-700 tracking-wide mb-1.5 flex items-center gap-1">
              <span>姓名</span>
              <span className="text-red-500 font-mono">*</span>
            </label>
            <input
              id="input-name"
              type="text"
              placeholder="请输入真实姓名"
              value={userName}
              onChange={(e) => {
                setUserName(e.target.value);
                if (errorText) setErrorText("");
              }}
              className="py-2.5 border-b border-gray-200 text-sm focus:outline-none focus:border-brand-green transition-colors text-gray-800"
            />
          </div>

          {/* ID Number Field */}
          <div className="flex flex-col">
            <label className="text-sm font-bold text-gray-700 tracking-wide mb-1.5 flex items-center gap-1">
              <span>身份证合规代码</span>
              <span className="text-red-500 font-mono">*</span>
            </label>
            <input
              id="input-idcard"
              type="text"
              placeholder="请输入18位身份证号 / 认证证件号"
              value={userIdCard}
              onChange={(e) => {
                setUserIdCard(e.target.value);
                if (errorText) setErrorText("");
              }}
              className="py-2.5 border-b border-gray-200 text-sm focus:outline-none focus:border-brand-green transition-colors text-gray-800 font-mono"
            />
          </div>

          {/* Specialization Selection Row */}
          <div className="flex flex-col">
            <label className="text-sm font-bold text-gray-700 tracking-wide mb-1.5 flex items-center gap-1">
              <span>瑜伽专用流派</span>
              <span className="text-red-500 font-mono">*</span>
            </label>
            <div className="relative">
              <select
                id="select-specialization"
                value={userSpec}
                onChange={(e) => setUserSpec(e.target.value)}
                className="w-full py-2.5 bg-transparent border-b border-gray-200 text-sm font-medium focus:outline-none focus:border-brand-green transition-colors text-gray-800 appearance-none cursor-pointer"
              >
                <option value="哈他专业">哈他经典派 (Hatha)</option>
                <option value="阿斯汤加">阿斯汤加 (Ashtanga)</option>
                <option value="流瑜伽">活力流瑜伽 (Vinyasa Flow)</option>
                <option value="理疗瑜伽">骨骼理疗 (Therapy瑜伽)</option>
                <option value="阴瑜伽">放松阴瑜伽 (Yin Yoga)</option>
              </select>
              <div className="absolute right-2 top-3 text-gray-400 pointer-events-none">
                ▼
              </div>
            </div>
          </div>
        </div>

        {/* Error notification */}
        {errorText && (
          <div className="bg-red-50 border border-red-100 text-red-500 rounded-2xl p-4 text-xs font-semibold">
            {errorText}
          </div>
        )}

        {/* Next step navigation action buttons (下一步) */}
        <div className="mt-4">
          <button
            id="btn-step1-next"
            onClick={handleNext}
            className="w-full bg-[#5D7261] hover:bg-brand-green-hover text-white rounded-full py-3.5 px-6 font-bold tracking-wider shadow-lg transform hover:-translate-y-0.5 hover:shadow-xl transition-all"
          >
            下一步
          </button>
        </div>
      </div>
    </div>
  );
}

// 6. SCREEN 6: CERTIFICATION APPLICATION STEP 2 (材料上传)
export function CertStep2View({
  onNavigate,
  application,
  setApplication
}: ViewProps) {
  const [avatar, setAvatar] = useState<File | null>(null);
  const [cert, setCert] = useState<File | null>(null);
  const [idCard, setIdCard] = useState<File | null>(null);
  const [uploadingState, setUploadingState] = useState(false);

  const [avatarPreview, setAvatarPreview] = useState<string>("");
  const [certUploadedName, setCertUploadedName] = useState<string>("");
  const [idCardUploadedName, setIdCardUploadedName] = useState<string>("");

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setAvatar(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const handleCertChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setCert(file);
      setCertUploadedName(file.name);
    }
  };

  const handleIdCardChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setIdCard(file);
      setIdCardUploadedName(file.name);
    }
  };

  const handleSubmit = () => {
    setUploadingState(true);

    // Simulate database network upload
    setTimeout(() => {
      setUploadingState(false);
      
      setApplication({
        ...application,
        avatarUrl: avatarPreview || "https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=200&auto=format&fit=crop",
        status: "pending",
        step: 3,
        submittedAt: new Date().toLocaleDateString("zh-CN")
      });

      onNavigate("success", "my");
    }, 1500);
  };

  return (
    <div id="cert-step2-view" className="flex flex-col min-h-full pb-20 select-none bg-brand-bg">
      {/* Back navbar header */}
      <div className="p-4 bg-white flex items-center justify-between border-b border-gray-100 sticky top-0 z-20">
        <button 
          id="btn-step2-back"
          onClick={() => onNavigate("cert-step1", "my")} 
          className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-slate-100 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-700" />
        </button>
        <h2 className="text-[16px] font-bold text-gray-800">上传证明材料</h2>
        <div className="w-8 h-8"></div>
      </div>

      {/* Step Indicators mimicking Screen 6 */}
      <div className="p-4 bg-[#FFFBF0] border-b border-[#F7EACD] flex flex-col items-center">
        <div className="flex gap-4 items-center justify-center w-full max-w-[280px]">
          <div className="flex items-center gap-1.5 text-xs text-[#BBA178]">
            <span className="w-5 h-5 bg-[#BBA178] rounded-full text-white font-mono flex items-center justify-center font-bold">✓</span>
            <span>个人信息</span>
          </div>

          <div className="h-0.5 flex-1 bg-[#BBA178]"></div>

          <div className="flex items-center gap-1.5 text-xs text-orange-500 font-bold">
            <span className="w-5 h-5 bg-orange-500 rounded-full text-white font-mono flex items-center justify-center">2</span>
            <span>资料上传</span>
          </div>

          <div className="h-0.5 flex-1 bg-gray-200"></div>

          <div className="flex items-center gap-1.5 text-xs text-gray-400">
            <span className="w-5 h-5 bg-gray-200 rounded-full text-white font-mono flex items-center justify-center">3</span>
            <span>审核中</span>
          </div>
        </div>
      </div>

      {/* Drag & Upload components mapped strictly to Screen 6 list elements */}
      <div className="p-5 flex flex-col gap-4">
        {/* Container */}
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 flex flex-col gap-4">
          
          {/* Tile 1: 头像照片 */}
          <div className="flex items-center gap-4.5 p-3 rounded-2xl border border-dashed border-slate-200/80 bg-slate-50/50 hover:bg-slate-50 transition-colors">
            <label className="relative w-16 h-16 bg-white border border-slate-150 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:border-brand-green/50 transition-colors shadow-xs overflow-hidden shrink-0">
              <input
                id="upload-avatar"
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="hidden"
              />
              {avatarPreview ? (
                <img src={avatarPreview} alt="Preview" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
              ) : (
                <Upload className="w-6 h-6 text-slate-400" />
              )}
            </label>
            <div className="flex-1 min-w-0">
              <h4 className="font-bold text-gray-800 text-sm">专业头像照片</h4>
              <p className="text-[10px] text-gray-400 mt-1">
                {avatarPreview ? "图片已就绪：点击小图更换" : "清晰正面免冠证件照，5MB以内"}
              </p>
            </div>
          </div>

          {/* Tile 2: 培训证书 */}
          <div className="flex items-center gap-4.5 p-3 rounded-2xl border border-dashed border-slate-200/80 bg-slate-50/50 hover:bg-slate-50 transition-colors">
            <label className="w-16 h-16 bg-white border border-slate-150 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:border-brand-green/50 transition-colors shadow-xs shrink-0">
              <input
                id="upload-cert"
                type="file"
                accept="image/*,application/pdf"
                onChange={handleCertChange}
                className="hidden"
              />
              {cert ? (
                <span className="text-[10px] font-mono font-bold text-emerald-600 bg-emerald-50 px-1 py-0.5 rounded text-center truncate max-w-full">PDF/JPG</span>
              ) : (
                <Upload className="w-6 h-6 text-slate-400" />
              )}
            </label>
            <div className="flex-1 min-w-0">
              <h4 className="font-bold text-gray-800 text-sm font-sans">正规机构培训证书</h4>
              <p className="text-[10px] text-gray-400 mt-1 truncate">
                {certUploadedName ? `已检测到: ${certUploadedName}` : "权威学院课程、工时证书, PDF/JPG格式"}
              </p>
            </div>
          </div>

          {/* Tile 3: 身份证件 */}
          <div className="flex items-center gap-4.5 p-3 rounded-2xl border border-dashed border-slate-200/80 bg-slate-50/50 hover:bg-slate-50 transition-colors">
            <label className="w-16 h-16 bg-white border border-slate-150 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:border-brand-green/50 transition-colors shadow-xs shrink-0">
              <input
                id="upload-idcard-img"
                type="file"
                accept="image/*"
                onChange={handleIdCardChange}
                className="hidden"
              />
              {idCard ? (
                <span className="text-[10px] font-mono font-bold text-emerald-600 bg-emerald-50 px-1 py-0.5 rounded text-center truncate max-w-full">ID COPY</span>
              ) : (
                <Upload className="w-6 h-6 text-slate-400" />
              )}
            </label>
            <div className="flex-1 min-w-0">
              <h4 className="font-bold text-gray-800 text-sm">有效身份证复印件</h4>
              <p className="text-[10px] text-gray-400 mt-1 truncate">
                {idCardUploadedName ? `已识别: ${idCardUploadedName}` : "上传清晰的正反两面电子版，不泄露出网"}
              </p>
            </div>
          </div>

        </div>

        {/* Buttons matching design style 6 */}
        <div className="flex gap-4.5 mt-4">
          <button
            id="btn-step2-prev"
            onClick={() => onNavigate("cert-step1", "my")}
            className="flex-1 border border-slate-350 text-slate-500 font-bold py-3 px-4 rounded-full hover:bg-slate-50 active:bg-slate-100 transition-colors"
          >
            上一步
          </button>
          
          <button
            id="btn-step2-submit"
            onClick={handleSubmit}
            disabled={uploadingState}
            className={`flex-1 font-bold py-3 px-4 rounded-full shadow-md text-white transition-all transform hover:-translate-y-0.5 flex items-center justify-center gap-2 ${
              uploadingState 
                ? "bg-slate-400 cursor-not-allowed" 
                : "bg-orange-500 hover:bg-orange-600"
            }`}
          >
            {uploadingState ? (
              <>
                <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <span>服务器审查中</span>
              </>
            ) : (
              <span>提交审核</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// 7. SCREEN 7: DIGITAL CERTIFICATE PREVIEW (数字证书预览)
export function CertificatePreviewView({
  onNavigate,
  currentUser
}: ViewProps) {
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [sharePrompt, setSharePrompt] = useState(false);
  const [orderPaper, setOrderPaper] = useState(false);

  const triggerDownload = () => {
    setDownloadSuccess(true);
    setTimeout(() => setDownloadSuccess(false), 2200);
  };

  const triggerShare = () => {
    setSharePrompt(true);
  };

  const triggerOrderPaper = () => {
    setOrderPaper(true);
  };

  return (
    <div id="certificate-preview-view" className="flex flex-col min-h-full pb-20 select-none bg-brand-green/95 text-white overflow-y-auto relative duration-300">
      
      {/* Header arrow & title navigation */}
      <div className="p-4 flex items-center justify-between border-b border-white/10 sticky top-0 z-20 bg-brand-green">
        <button 
          id="btn-cert-back"
          onClick={() => onNavigate("profile", "my")} 
          className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>
        <h2 className="text-[16px] font-bold tracking-widest text-[#FFF8E7]">数字证书预览</h2>
        <div className="w-8 h-8"></div>
      </div>

      <div className="p-5 flex-1 flex flex-col items-center justify-center">
        
        {/* Certificate borders mapping Screen 7 */}
        <div 
          id="digital-certificate-card"
          className="w-full max-w-[340px] bg-[#FAF7F2] text-slate-800 rounded-3xl p-6 shadow-2xl border-6 border-[#EEDEB9] relative overflow-hidden flex flex-col justify-between aspect-[3/4]"
          style={{
            backgroundImage: `radial-gradient(ellipse at center, rgba(238,222,185,0.06) 0%, rgba(200,180,130,0.04) 100%)`
          }}
        >
          {/* Inner fine lines gold stamp border */}
          <div className="absolute inset-1.5 border border-[#DFCE9B]/60 rounded-2xl pointer-events-none"></div>

          {/* Central seal crest logo */}
          <div className="flex flex-col items-center select-none pt-2 relative z-10">
            {/* Gold Seal Image */}
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#F5E5C0] to-[#CBA551] flex items-center justify-center p-0.5 shadow-md border-2 border-white">
              <div className="w-full h-full rounded-full border border-dashed border-[#FAF7F2]/80 flex items-center justify-center flex-col text-white">
                <span className="text-[7px] font-bold tracking-wider leading-none">ASSOCIATION</span>
                <span className="text-[9px] font-extrabold uppercase mt-0.5 leading-none">YOGA</span>
                <span className="text-[7px] font-bold mt-0.5">喜乐认证</span>
              </div>
            </div>
            
            <p className="text-[10px] text-[#A68F5E] font-serif font-bold tracking-widest uppercase mt-2">
              瑜伽导师资质协会
            </p>
          </div>

          {/* Inner profile layout with fine border */}
          <div className="flex flex-col items-center mt-3 z-10">
            <img
              src={currentUser.avatar}
              alt={currentUser.name}
              referrerPolicy="no-referrer"
              className="w-20 h-24 rounded-lg object-cover border-2 border-[#DCD0AC] shadow-xs bg-slate-50"
            />
            
            <h3 className="text-xl font-bold font-serif text-slate-800 tracking-wider mt-3">
              {currentUser.name}
            </h3>

            {/* Level metadata */}
            <p className="text-xs text-[#8A7142] font-semibold tracking-wider mt-1.5">
              认证等级
            </p>
            <h4 className="text-md font-bold text-brand-green tracking-widest mt-0.5 font-serif">
              {currentUser.level}
            </h4>

            {/* Terms certification sentence written in elegant Chinese */}
            <p className="text-[9px] text-[#86837C] text-center max-w-[240px] leading-relaxed mt-3.5 px-2 border-t border-slate-200/60 pt-3">
              本证书特此证明该导师已通过本协会专业导师资格审查评估，获批瑜伽教练资质，真伪信息扫码一致，终身备案有效。
            </p>
          </div>

          {/* Bottom QR info block */}
          <div className="flex justify-between items-end mt-4 pt-3.5 border-t border-[#E8DFC2]/85 z-10 px-1">
            {/* Verification QR */}
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 bg-white p-1 rounded-md border border-slate-200 shadow-3xs">
                {/* Simulated high-quality modern QR */}
                <svg className="w-full h-full" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M2 2h6v6H2V2zm1 1v4h4V3H3zm-1 13h6v6H2v-6zm1 1v4h4v-4H3zM16 2h6v6h-6V2zm1 1v4h4V3h-4z" fill="#333" />
                  <path d="M11 2h2v4h-2V2zM11 9h2v6h-2V9zM16 11h2v4h-2v-4zM20 11h2v2h-2v-2zM21 16h1v2h-1v-2zM11 18h2v4h-2v-4zM16 19h4v2h-4v-2z" fill="#333" />
                  <path d="M6 6H4V4h2v2zm0 14H4v-2h2v2zm14-14h-2V4h2v2z" fill="#333" />
                </svg>
              </div>
              <p className="text-[7px] text-[#A68F5E] mt-1 font-mono tracking-widest">
                扫证码即可验证
              </p>
            </div>

            {/* Authoritative stamps signature */}
            <div className="text-right text-slate-700 min-w-[120px]">
              <p className="text-[8px] text-gray-400">印备颁发单位：</p>
              <p className="text-[9px] font-bold text-gray-800 font-serif">瑜伽导师资格协会</p>
              
              <div className="relative inline-block mt-1">
                {/* Red round seal overlay */}
                <div className="absolute right-2 -bottom-2.5 w-12 h-12 rounded-full border-2 border-red-500/50 flex items-center justify-center select-none rotate-12 bg-red-500/5 backdrop-blur-3xs text-[7px] font-bold text-red-500 font-mono tracking-widest">
                  SEAL印章
                </div>
                
                <p className="text-[8px] text-gray-400">核准登记日：</p>
                <p className="text-[9px] font-mono text-gray-700">{currentUser.regDate}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Action Button lists mapped from Screen 7 buttons */}
        <div className="w-full max-w-[340px] flex flex-col gap-3 mt-6">
          <div className="flex gap-4">
            <button
              id="btn-cert-download"
              onClick={triggerDownload}
              className="flex-1 bg-amber-500 hover:bg-amber-600 text-white font-bold py-3.5 px-4 rounded-full shadow-lg text-xs tracking-wider flex items-center justify-center gap-2 transform active:scale-95 transition-all"
            >
              <Download className="w-4 h-4" />
              <span>下载证书图片</span>
            </button>
            
            <button
              id="btn-cert-share"
              onClick={triggerShare}
              className="flex-1 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold py-3.5 px-4 rounded-full text-xs tracking-wider flex items-center justify-center gap-2 transform active:scale-95 transition-all"
            >
              <Share2 className="w-4 h-4" />
              <span>分享到朋友圈</span>
            </button>
          </div>

          <button
            id="btn-cert-order"
            onClick={triggerOrderPaper}
            className="w-full bg-[#EEDEB9] hover:bg-[#E5D2A5] text-brand-green-hover font-bold py-3.5 px-6 rounded-full shadow-lg text-xs tracking-wider transform active:scale-98 transition-all"
          >
            申请纸质版实物证书
          </button>
        </div>
      </div>

      {/* Simulated Modals for certificate downloads, sharing states */}
      {downloadSuccess && (
        <div id="modal-download" className="fixed inset-0 bg-black/65 backdrop-blur-xs flex items-center justify-center z-50 animate-fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-xs text-center text-slate-800 scale-95 animate-scale-up">
            <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 mx-auto mb-3">
              <Check className="w-7 h-7 stroke-[3.5]" />
            </div>
            <h4 className="font-bold text-md">证书已保存至相册</h4>
            <p className="text-xs text-gray-500 mt-2">
              高清格式证书已同步渲染并储存入您的系统本地。您可随时打印。
            </p>
          </div>
        </div>
      )}

      {sharePrompt && (
        <div id="modal-share" className="fixed inset-0 bg-black/65 backdrop-blur-xs flex items-center justify-center z-50 animate-fade-in" onClick={() => setSharePrompt(false)}>
          <div className="bg-white rounded-3xl p-6 w-80 text-center text-slate-800 relative" onClick={e => e.stopPropagation()}>
            <button className="absolute right-4 top-4 text-gray-400 hover:text-gray-600" onClick={() => setSharePrompt(false)}>
              <X className="w-5 h-5" />
            </button>
            <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center text-amber-600 mx-auto mb-3.5">
              <Share2 className="w-6 h-6" />
            </div>
            <h4 className="font-bold text-md">生成微信分享专属图</h4>
            <p className="text-xs text-gray-500 mt-2 leading-relaxed">
              因小程序安全规则限制，已为您生成高保真海报快照，长按图片添加分享语，同行可扫右下角二维码为您佐证。
            </p>
            <button 
              id="confirm-share-pop"
              onClick={() => setSharePrompt(false)} 
              className="mt-5 w-full bg-brand-green hover:bg-brand-green-hover text-white py-2.5 rounded-full text-xs font-bold"
            >
              我知道了
            </button>
          </div>
        </div>
      )}

      {orderPaper && (
        <div id="modal-paper" className="fixed inset-0 bg-black/65 backdrop-blur-xs flex items-center justify-center z-50 animate-fade-in" onClick={() => setOrderPaper(false)}>
          <div className="bg-white rounded-3xl p-6 w-[340px] text-center text-slate-800 relative max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <button className="absolute right-4 top-4 text-gray-400 hover:text-gray-600" onClick={() => setOrderPaper(false)}>
              <X className="w-5 h-5" />
            </button>
            <h4 className="font-bold text-md">实物木质挂框证书申领</h4>
            <p className="text-xs text-gray-500 mt-1">
              我们将为您制作激光实木精雕、印章凹凸印刷的防伪纸质证书。
            </p>

            <form className="mt-4 text-left flex flex-col gap-3" onSubmit={e => { e.preventDefault(); alert("申请已提交！我们将通过到付邮寄挂号件送达本处。"); setOrderPaper(false); }}>
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">收货人：</label>
                <input required type="text" placeholder="收货姓名" className="w-full text-xs p-2 rounded-lg border border-slate-200" defaultValue={currentUser.name} />
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">联系电话：</label>
                <input required type="tel" placeholder="11位手机号" className="w-full text-xs p-2 rounded-lg border border-slate-200" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">收件地址：</label>
                <textarea required rows={2} placeholder="详细收件省市区及街道门牌" className="w-full text-xs p-2 rounded-lg border border-slate-200 resize-none"></textarea>
              </div>

              <div className="bg-amber-50 rounded-xl p-3 text-[10px] text-amber-700 leading-normal border border-amber-100 mt-1">
                ⚠️ 本证书由美林学会统一制作并邮费寄往。制作工本费¥0 (免费提供认证奖励)，快递邮资本地顺丰到付。
              </div>

              <div className="flex gap-4.5 mt-2">
                <button type="button" onClick={() => setOrderPaper(false)} className="flex-1 border text-gray-500 border-slate-300 py-2.5 rounded-full text-xs font-bold">
                  取消
                </button>
                <button type="submit" className="flex-1 bg-brand-green text-white py-2.5 rounded-full text-xs font-bold">
                  确认邮寄
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// 8. SCREEN 8: SUBMISSION SUCCESS SCREEN (提交成功)
export function SubmissionSuccessView({
  onNavigate,
  onApproveApplication
}: ViewProps) {
  return (
    <div id="submission-success-view" className="flex flex-col min-h-full pb-20 select-none bg-[#FAF8F5]">
      {/* Title Header */}
      <div className="p-4 bg-white flex items-center justify-between border-b border-gray-100 sticky top-0 z-20">
        <button 
          id="btn-success-back"
          onClick={() => onNavigate("home", "home")} 
          className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-slate-100 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-700" />
        </button>
        <h2 className="text-[16px] font-bold text-gray-800">提交成功</h2>
        <div className="w-8 h-8"></div>
      </div>

      <div className="p-6 flex-1 flex flex-col items-center justify-center text-center">
        {/* Large check stamp */}
        <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center text-amber-600 mb-6 shadow-sm border-2 border-white animate-pulse">
          <Check className="w-12 h-12 stroke-[3]" />
        </div>

        <h3 className="text-xl font-bold text-gray-800 tracking-wider">申请已成功提交</h3>
        
        {/* Sub panel resembling Screen 8 values */}
        <div className="w-full max-w-[320px] bg-white rounded-3xl p-5 shadow-sm border border-slate-100 text-left mt-6 flex flex-col gap-3.5 yoga-card-shadow">
          <div className="flex gap-3 items-start">
            <Clock className="w-4.5 h-4.5 text-brand-gold shrink-0 mt-0.5" />
            <div>
              <p className="text-xs text-gray-400 leading-none">预计审核时间：</p>
              <p className="text-sm font-bold text-gray-800 mt-1">3-5 个工作日</p>
            </div>
          </div>

          <div className="h-px bg-slate-50"></div>

          <div className="flex gap-3 items-start">
            <Phone className="w-4.5 h-4.5 text-brand-gold shrink-0 mt-0.5" />
            <div>
              <p className="text-xs text-gray-400 leading-none">如有疑问，请联系客服：</p>
              <p className="text-sm font-bold text-gray-800 mt-1 hover:underline">400-820-8820</p>
            </div>
          </div>
        </div>

        {/* Action button triggers mapped from Screen 8 */}
        <div className="w-full max-w-[320px] flex flex-col gap-3 mt-8">
          {/* Simulation button in success page directly to accelerate demo testing */}
          <button
            id="btn-trigger-approve"
            onClick={() => {
              onApproveApplication();
              onNavigate("profile", "my");
              alert("模拟审核成功！您在应用中已被提升为 [已认证导师] 资质。可打开证书查看。");
            }}
            className="w-full bg-[#AF9758] hover:bg-[#978147] text-white font-bold py-3.5 px-6 rounded-full shadow-lg text-xs tracking-wider flex items-center justify-center gap-2 animate-bounce"
          >
            <span>⚡️ [演示用] 直接一键审批通过！</span>
          </button>

          <button
            id="btn-success-profile"
            onClick={() => onNavigate("profile", "my")}
            className="w-full bg-[#5D7261] hover:bg-brand-green-hover text-white font-bold py-3.5 px-6 rounded-full shadow-lg text-xs tracking-wider transform active:scale-98 transition-all"
          >
            我的个人中心
          </button>
          
          <button
            id="btn-success-reset"
            onClick={() => onNavigate("home", "home")}
            className="w-full bg-white hover:bg-slate-50 border border-slate-300 text-slate-500 font-bold py-3.5 px-6 rounded-full text-xs tracking-wider transform active:scale-98 transition-all"
          >
            返回首页
          </button>
        </div>
      </div>
    </div>
  );
}
