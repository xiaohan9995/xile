/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import {
  Home,
  Compass,
  User,
  MoreHorizontal,
  Wifi,
  Battery,
  Search,
  BookOpen
} from "lucide-react";

interface WeChatFrameProps {
  children: React.ReactNode;
  activeTab: string;
  onTabChange: (tab: string) => void;
  onNavigateHome: () => void;
  hideTabs?: boolean;
}

export function WeChatFrame({
  children,
  activeTab,
  onTabChange,
  onNavigateHome,
  hideTabs = false
}: WeChatFrameProps) {
  const [time, setTime] = useState("9:41 AM");

  // Keep simulated time updated realistically
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      let hours = now.getHours();
      const minutes = now.getMinutes().toString().padStart(2, "0");
      const ampm = hours >= 12 ? "PM" : "AM";
      hours = hours % 12;
      hours = hours ? hours : 12; // first hour should be 12, not 0
      setTime(`${hours}:${minutes} ${ampm}`);
    };
    
    updateTime();
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative mx-auto w-full max-w-[390px] h-[820px] bg-[#FAF8F5] text-slate-800 rounded-[48px] shadow-[0_25px_60px_-15px_rgba(93,114,97,0.22)] border-[12px] border-slate-900 overflow-hidden flex flex-col font-sans select-none scale-100 transition-all duration-300">
      
      {/* Top Simulated Notch & Speaker Frame */}
      <div className="absolute top-0 inset-x-0 h-7 bg-transparent flex justify-center z-50 pointer-events-none">
        <div className="w-36 h-4.5 bg-slate-900 rounded-b-2xl"></div>
      </div>

      {/* Simulated Phone Upper Status Bar standard iOS style */}
      <div className="shrink-0 h-10 bg-transparent flex justify-between items-end px-6 pb-1 text-slate-700 text-[11px] font-semibold select-none z-40 pointer-events-none">
        {/* Left indicators: Carrier & Time */}
        <div className="flex items-center gap-1.5">
          <span>OII</span>
          <span className="font-mono">{time}</span>
        </div>

        {/* Right indicators: Wifi, signal, battery */}
        <div className="flex items-center gap-1.5">
          {/* Signal Indicator lines */}
          <div className="flex items-end gap-0.5 h-2.5">
            <span className="w-0.5 h-1 bg-slate-700 rounded-2xs"></span>
            <span className="w-0.5 h-1.5 bg-slate-700 rounded-2xs"></span>
            <span className="w-0.5 h-2 bg-slate-700 rounded-2xs"></span>
            <span className="w-0.5 h-2.5 bg-slate-700 rounded-2xs"></span>
          </div>
          <Wifi className="w-3 h-3 text-slate-700 stroke-[2.5]" />
          <div className="flex items-center gap-0.5 ml-0.5">
            <span className="text-[9px] font-mono leading-none">100%</span>
            <Battery className="w-4 h-3 text-slate-700 stroke-[2]" fill="currentColor" />
          </div>
        </div>
      </div>

      {/* High-Fidelity WeChat Capsules buttons in upper right */}
      <div className="absolute top-[42px] right-5 z-40 flex items-center bg-white/70 backdrop-blur-md rounded-full px-3 py-1.5 border border-slate-200/80 shadow-3xs hover:bg-white transition-colors cursor-pointer select-none">
        {/* Three dots button */}
        <button 
          id="wechat-menu-dots"
          onClick={() => alert("微信小程序菜单：\n1. 添加至我的人之小程序\n2. 重新登记\n3. 发送给导师圈个人认证助手")} 
          className="pr-2 border-r border-slate-250 hover:text-slate-900 text-slate-700 flex items-center justify-center transition-colors"
        >
          <MoreHorizontal className="w-4.5 h-4.5 stroke-[2.5]" />
        </button>
        {/* Circular Exit action */}
        <button 
          id="wechat-menu-exit"
          onClick={() => {
            onNavigateHome();
            alert("已返回小程序首屏默认状态。");
          }} 
          className="pl-2 hover:text-slate-900 text-slate-700 flex items-center justify-center transition-colors"
        >
          <div className="w-3.5 h-3.5 rounded-full border-2 border-slate-700 hover:border-slate-900 flex items-center justify-center">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-700 hover:bg-slate-900"></span>
          </div>
        </button>
      </div>

      {/* Core Screen View Port (Scrollable) */}
      <div className="flex-1 overflow-y-auto no-scrollbar relative">
        {children}
      </div>

      {/* WeChat Style Bottom Navigation Menu bar mapped from images */}
      {!hideTabs && (
        <div className="absolute bottom-0 inset-x-0 bg-white/95 backdrop-blur-lg border-t border-slate-100 shadow-xl py-2 px-6 flex justify-around items-center z-40 select-none pb-5">
          
          {/* Tab 1: 首页 */}
          <button
            id="tab-btn-home"
            onClick={() => onTabChange("home")}
            className={`flex flex-col items-center flex-1 transition-all group ${
              activeTab === "home" ? "text-brand-green scale-102" : "text-gray-400 hover:text-gray-600"
            }`}
          >
            <Home className={`w-[22px] h-[22px] transition-transform ${activeTab === "home" ? "stroke-[2.5]" : "stroke-[2] group-hover:scale-105"}`} />
            <span className="text-[10px] font-bold mt-1 tracking-wider">首页</span>
          </button>

          {/* Tab 2: 发现/查询 */}
          <button
            id="tab-btn-search"
            onClick={() => onTabChange("discover")}
            className={`flex flex-col items-center flex-1 transition-all group ${
              activeTab === "discover" ? "text-brand-green scale-102" : "text-gray-400 hover:text-gray-600"
            }`}
          >
            <Compass className={`w-[22px] h-[22px] transition-transform ${activeTab === "discover" ? "stroke-[2.5]" : "stroke-[2] group-hover:scale-105"}`} />
            <span className="text-[10px] font-bold mt-1 tracking-wider">发现</span>
          </button>

          {/* Tab 3: 我的 */}
          <button
            id="tab-btn-profile"
            onClick={() => onTabChange("my")}
            className={`flex flex-col items-center flex-1 transition-all group ${
              activeTab === "my" ? "text-brand-green scale-102" : "text-gray-400 hover:text-gray-600"
            }`}
          >
            <User className={`w-[22px] h-[22px] transition-transform ${activeTab === "my" ? "stroke-[2.5]" : "stroke-[2] group-hover:scale-105"}`} />
            <span className="text-[10px] font-bold mt-1 tracking-wider">我的</span>
          </button>

        </div>
      )}

      {/* Apple style Home Screen Swipe back thin line */}
      <div className="absolute bottom-1 inset-x-0 h-1 flex justify-center z-50 pointer-events-none">
        <div className="w-32 h-1 bg-slate-900 rounded-full"></div>
      </div>

    </div>
  );
}
