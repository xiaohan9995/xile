/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from "react";
import {
  Compass,
  User,
  Users,
  Award,
  Sparkles,
  MapPin,
  CheckCircle,
  HelpCircle,
  Phone,
  Clock,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  RotateCcw,
  BookOpen,
  X,
  FileCheck,
  Star
} from "lucide-react";

import { WeChatFrame } from "./components/WeChatFrame";
import { LoginView } from "./components/LoginView";
import { AdminPortal } from "./components/AdminPortal";
import {
  HomeView,
  InstructorQueryView,
  StudioDiscoveryView,
  InstructorProfileView,
  CertStep1View,
  CertStep2View,
  CertificatePreviewView,
  SubmissionSuccessView
} from "./components/MiniProgramViews";

import { mockInstructors, mockStudios } from "./mockData";
import { CertApplication, Instructor, Studio } from "./types";

export default function App() {
  // Dual-mode console switch: "client" (WeChat sandbox) | "admin" (Backend Console)
  const [systemMode, setSystemMode] = useState<"client" | "admin">("client");

  // 1. WeChat Mini Program Views & Tabs Routing
  // Current tab can be: "home" | "discover" | "my"
  const [activeTab, setActiveTab] = useState<string>("home");
  
  // Current high-fidelity view screen: 
  // "home" | "instructor-query" | "studio-discovery" | "profile" | "cert-step1" | "cert-step2" | "certificate" | "success"
  const [activeView, setActiveView] = useState<string>("home");

  // WeChat login stage simulation state
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);

  // 2. Mock stateful collections
  const [instructorsList, setInstructorsList] = useState<Instructor[]>(mockInstructors);
  const [studiosList, setStudiosList] = useState<Studio[]>(mockStudios);

  // 3. User & Application State
  const [currentUser, setCurrentUser] = useState({
    name: "张伟",
    level: "L2认证导师",
    isCertified: false,
    avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=200&auto=format&fit=crop",
    regDate: "2026年06月16日",
    expiryDate: "2029.12.31",
    days: 1095
  });

  const [application, setApplication] = useState<CertApplication>({
    id: "app_999",
    name: "张伟",
    idNumber: "",
    specialization: "哈他专业",
    status: "none",
    step: 1
  });

  // 4. Selected Items (for full side inspectors on desktop)
  const [selectedInstructor, setSelectedInstructor] = useState<Instructor | null>(null);
  const [selectedStudio, setSelectedStudio] = useState<Studio | null>(mockStudios[0]);

  // Handle Bottom Tab Navigation triggers from simulated WeChat shell
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    if (tab === "home") {
      setActiveView("home");
    } else if (tab === "discover") {
      // By default, open Studio Discovery on discover tab
      setActiveView("studio-discovery");
    } else if (tab === "my") {
      if (currentUser.isCertified) {
        // If certified, show profile Screen 4
        setActiveView("profile");
      } else {
        // If not certified, route to certification flow
        if (application.status === "pending") {
          setActiveView("success");
        } else if (application.status === "approved") {
          setActiveView("certificate");
        } else {
          setActiveView("cert-step1");
        }
      }
    }
  };

  // Direct programmatic routing inside screens
  const handleNavigate = (view: string, targetTab?: string) => {
    setActiveView(view);
    if (targetTab) {
      setActiveTab(targetTab);
    }
  };

  // Reset demo states safely
  const handleResetDemoState = () => {
    setSelectedInstructor(null);
    setSelectedStudio(mockStudios[0]);
    setCurrentUser({
      name: "张伟",
      level: "L2认证导师",
      isCertified: false,
      avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=200&auto=format&fit=crop",
      regDate: "2026年06月16日",
      expiryDate: "2029.12.31",
      days: 1095
    });
    setApplication({
      id: "app_999",
      name: "张伟",
      idNumber: "",
      specialization: "哈他专业",
      status: "none",
      step: 1
    });
    
    // Remove custom added instructors on reset
    setInstructorsList(mockInstructors);
    
    setActiveTab("home");
    setActiveView("home");
    setIsLoggedIn(false); // Reset logs out and shows Login Page
  };

  // Force directly approve application & grant certificate
  const handleApproveApplication = () => {
    setIsLoggedIn(true); // Ensure they are logged in on direct force approve
    
    // 1. Upgrade active user status
    setCurrentUser(prev => ({
      ...prev,
      name: application.name || "张伟",
      level: `${application.specialization || "哈他"}认证导师`,
      isCertified: true
    }));

    // 2. Set application status to approved
    setApplication(prev => ({
      ...prev,
      status: "approved"
    }));

    // 3. Append them dynamically into our instructors searchable system database registry!
    const newInstructor: Instructor = {
      id: `dyn_${Date.now()}`,
      name: application.name || "张伟",
      level: `${application.specialization || "哈他"}认证导师`,
      certNo: `JY${new Date().getFullYear()}0088`,
      expiryDate: "2029.12.31",
      certDate: new Date().toLocaleDateString("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit" }),
      avatar: currentUser.avatar,
      certifiedDays: 1,
      bio: "通过在线通道认证资质注册。持有瑜伽理疗与阴瑜伽培训执照，专注引导呼吸健康。"
    };

    setInstructorsList(prev => [newInstructor, ...prev]);
  };

  // Reject/decline application and return back to step 1
  const handleRejectApplication = () => {
    setApplication(prev => ({
      ...prev,
      status: "none",
      step: 1
    }));
  };

  // Switch demo actor to 张三 directly to test certified screens
  const handleSetCertifiedActor = (actorName: string) => {
    if (actorName === "张三") {
      const zhang3 = mockInstructors[0];
      setCurrentUser({
        name: zhang3.name,
        level: zhang3.level,
        isCertified: true,
        avatar: zhang3.avatar,
        regDate: zhang3.certDate,
        expiryDate: zhang3.expiryDate,
        days: zhang3.certifiedDays || 1095
      });
      setApplication(prev => ({
        ...prev,
        name: zhang3.name,
        status: "approved"
      }));
      // Focus on tab 'my' and view 'profile'
      setActiveTab("my");
      setActiveView("profile");
      setIsLoggedIn(true); // switching to certified actor automatically logs in
    } else {
      // Switch back to guest 张伟
      handleResetDemoState();
    }
  };

  return (
    <div className="min-h-screen bg-[#F0ECE3] text-slate-800 flex flex-col antialiased select-none font-sans overflow-x-hidden">
      
      {/* 🚀 GLOBAL DOCK SWITCHER BAR FOR DUAL MODE FIDELITY */}
      <div id="dual-mode-dock" className="bg-[#1E291F] text-white py-3 px-6 flex flex-col md:flex-row justify-between items-center gap-4 border-b border-white/5 shadow-md">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#FAF8F5] flex items-center justify-center text-[#2C4A3E] font-bold shadow-xs font-serif">
            ☯
          </div>
          <div className="text-left">
            <h1 className="text-xs md:text-sm font-bold tracking-wider text-slate-100 flex items-center gap-1.5 font-serif">
              喜乐瑜伽 · 认定与审核双向模拟器
            </h1>
            <p className="text-[9px] text-[#A68F5E] font-bold uppercase tracking-widest mt-0.5">
              Dual-Channel Client-Admin Sync Simulator
            </p>
          </div>
        </div>

        {/* Dynamic Mode Tabs Matcher */}
        <div className="flex bg-black/40 p-1 rounded-full border border-white/10 gap-1 shrink-0">
          <button
            id="btn-mode-toggle-client"
            onClick={() => setSystemMode("client")}
            className={`px-5 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-2 ${
              systemMode === "client"
                ? "bg-[#5D7261] text-white shadow-md scale-102"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <span>📱 微信小程序仿真</span>
            {application.status === "pending" && (
              <span className="w-2 h-2 rounded-full bg-orange-500 animate-ping"></span>
            )}
          </button>

          <button
            id="btn-mode-toggle-admin"
            onClick={() => setSystemMode("admin")}
            className={`px-5 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-2 ${
              systemMode === "admin"
                ? "bg-[#5D7261] text-white shadow-md scale-102"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <span>💻 喜乐瑜伽后台管理端</span>
            {application.status === "pending" && (
              <span className="w-2 h-2 rounded-full bg-orange-500 animate-ping"></span>
            )}
          </button>
        </div>

        {/* Sync Indicator */}
        <div className="hidden lg:flex items-center gap-2 text-xs text-slate-400">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="font-mono text-[10px] tracking-wide text-emerald-400/80 font-bold">LIVE SYNC CHANNEL ACTIVE</span>
        </div>
      </div>

      {systemMode === "client" ? (
        <div className="flex-1 flex flex-col md:flex-row">
      
      {/* LEFT COLUMN: Premium Interactive Developer & Simulation Console (Static, clean display) */}
      <div className="w-full md:w-[360px] bg-white border-b md:border-b-0 md:border-r border-slate-200/80 p-6 flex flex-col justify-between shrink-0 gap-6">
        <div className="flex flex-col gap-6">
          {/* Logo & Intro block */}
          <div className="pb-5 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-brand-green rounded-xl flex items-center justify-center text-white shadow-md">
                <Award className="w-6 h-6 stroke-[2]" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-800 font-serif leading-none tracking-wide">
                  喜乐瑜伽
                </h1>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-1">
                  WeChat Mini-Program Sandbox
                </p>
              </div>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed mt-4">
              这里是针对<b>瑜伽导师证书认定及验证系统</b>的小程序高保真运行沙盒。点击模拟手机内的图标和表单，进行真实数据流向模拟！
            </p>
          </div>

          {/* Actor Quick Switch */}
          <div className="bg-slate-50 rounded-2xl p-4.5 border border-slate-100">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
              <Users className="w-4.5 h-4.5 text-brand-green" />
              1. 角色与状态切换
            </h3>
            <p className="text-[11px] text-slate-400 mt-1 leading-normal">
              迅速变更当前运行角色的身份，用于测试两种截然不同的小程序链路。
            </p>

            <div className="flex flex-col gap-2 mt-4.5">
              {/* Actor 1: Guest */}
              <button
                id="actor-switch-guest"
                onClick={() => handleSetCertifiedActor("guest")}
                className={`w-full py-2.5 px-3.5 rounded-xl text-xs font-bold flex items-center justify-between transition-all ${
                  !currentUser.isCertified
                    ? "bg-brand-green text-white shadow-md"
                    : "bg-white hover:bg-slate-100 text-slate-600 border border-slate-200"
                }`}
              >
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-orange-400"></div>
                  <span>访客：张伟 (待申请)</span>
                </div>
                <ChevronRight className="w-4 h-4 opacity-50" />
              </button>

              {/* Actor 2: Zhang San Certified */}
              <button
                id="actor-switch-certified"
                onClick={() => handleSetCertifiedActor("张三")}
                className={`w-full py-2.5 px-3.5 rounded-xl text-xs font-bold flex items-center justify-between transition-all ${
                  currentUser.isCertified && currentUser.name === "张三"
                    ? "bg-brand-green text-white shadow-md"
                    : "bg-white hover:bg-slate-100 text-slate-600 border border-slate-200"
                }`}
              >
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>
                  <span>名师：张三 (已认证)</span>
                </div>
                <ChevronRight className="w-4 h-4 opacity-50" />
              </button>
            </div>
          </div>

          {/* Quick Sandbox Actions */}
          <div className="bg-slate-50 rounded-2xl p-4.5 border border-slate-100">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
              <Sparkles className="w-4.5 h-4.5 text-brand-gold" />
              2. 快捷测试指令
            </h3>
            <p className="text-[11px] text-slate-400 mt-1">
              免除繁杂的资料上传，强制干预状态机以验证高画质数字证书。
            </p>

            <div className="flex flex-col gap-2 mt-4">
              <button
                id="sandbox-force-approve"
                disabled={currentUser.isCertified}
                onClick={handleApproveApplication}
                className="w-full bg-white hover:bg-slate-100 text-slate-700 disabled:opacity-50 disabled:cursor-not-allowed border border-slate-200 rounded-xl py-2 px-3 text-xs font-semibold flex items-center gap-2 transition-colors"
              >
                <FileCheck className="w-4.0 h-4.0 text-emerald-600 shrink-0" />
                <span>直接为“张伟”颁发证书</span>
              </button>

              <button
                id="sandbox-reset"
                onClick={handleResetDemoState}
                className="w-full bg-white hover:bg-slate-100 text-[#b54343] border border-[#f3d8d8] rounded-xl py-2 px-3 text-xs font-semibold flex items-center gap-2 transition-colors"
              >
                <RotateCcw className="w-4.0 h-4.0 text-red-600 shrink-0" />
                <span>还原重置沙盒状态</span>
              </button>
            </div>
          </div>
        </div>

        {/* Brand Copyright indicator */}
        <div className="pt-6 border-t border-slate-100 text-[10px] text-slate-400 flex justify-between items-center bg-transparent shrink-0">
          <span>喜乐瑜伽数字产权中心</span>
          <span>© 2026 JoyYoga</span>
        </div>
      </div>

      {/* MIDDLE COLUMN: High-Fidelity WeChat App Container (Mobile viewport Simulator) */}
      <div className="flex-1 flex items-center justify-center p-4 md:p-8 @container max-w-4xl mx-auto">
        <WeChatFrame
          activeTab={activeTab}
          onTabChange={handleTabChange}
          onNavigateHome={() => handleNavigate("home", "home")}
          hideTabs={!isLoggedIn}
        >
          {!isLoggedIn ? (
            <LoginView
              onLoginSuccess={(userInfo) => {
                setIsLoggedIn(true);
                setCurrentUser(prev => ({
                  ...prev,
                  name: userInfo.name,
                  avatar: userInfo.avatar,
                  isCertified: false // New login resets certification track
                }));
                setApplication(prev => ({
                  ...prev,
                  name: userInfo.name,
                  status: "none",
                  step: 1
                }));
                // Navigate cleanly on success
                setActiveTab("home");
                setActiveView("home");
              }}
              onContinueAsGuest={() => {
                setIsLoggedIn(true);
                setCurrentUser(prev => ({
                  ...prev,
                  name: "游侠学员(游客)",
                  avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=200&auto=format&fit=crop",
                  isCertified: false
                }));
                setApplication(prev => ({
                  ...prev,
                  name: "游侠学员(游客)",
                  status: "none",
                  step: 1
                }));
                // Bypasses cleanly as guests
                setActiveTab("home");
                setActiveView("home");
              }}
            />
          ) : (
            <>
              {/* Main Switch router dynamically mounting components based on activeView */}
              {activeView === "home" && (
                <HomeView
                  onNavigate={handleNavigate}
                  instructors={instructorsList}
                  studios={studiosList}
                  application={application}
                  setApplication={setApplication}
                  selectedInstructor={selectedInstructor}
                  setSelectedInstructor={setSelectedInstructor}
                  selectedStudio={selectedStudio}
                  setSelectedStudio={setSelectedStudio}
                  currentUser={currentUser}
                  onApproveApplication={handleApproveApplication}
                />
              )}

              {activeView === "instructor-query" && (
                <InstructorQueryView
                  onNavigate={handleNavigate}
                  instructors={instructorsList}
                  studios={studiosList}
                  application={application}
                  setApplication={setApplication}
                  selectedInstructor={selectedInstructor}
                  setSelectedInstructor={setSelectedInstructor}
                  selectedStudio={selectedStudio}
                  setSelectedStudio={setSelectedStudio}
                  currentUser={currentUser}
                  onApproveApplication={handleApproveApplication}
                />
              )}

              {activeView === "studio-discovery" && (
                <StudioDiscoveryView
                  onNavigate={handleNavigate}
                  instructors={instructorsList}
                  studios={studiosList}
                  application={application}
                  setApplication={setApplication}
                  selectedInstructor={selectedInstructor}
                  setSelectedInstructor={setSelectedInstructor}
                  selectedStudio={selectedStudio}
                  setSelectedStudio={setSelectedStudio}
                  currentUser={currentUser}
                  onApproveApplication={handleApproveApplication}
                />
              )}

              {activeView === "profile" && (
                <InstructorProfileView
                  onNavigate={handleNavigate}
                  instructors={instructorsList}
                  studios={studiosList}
                  application={application}
                  setApplication={setApplication}
                  selectedInstructor={selectedInstructor}
                  setSelectedInstructor={setSelectedInstructor}
                  selectedStudio={selectedStudio}
                  setSelectedStudio={setSelectedStudio}
                  currentUser={currentUser}
                  onApproveApplication={handleApproveApplication}
                  onLogout={() => {
                    setIsLoggedIn(false);
                    setActiveTab("home");
                    setActiveView("home");
                    setSelectedInstructor(null);
                  }}
                />
              )}

              {activeView === "cert-step1" && (
                <CertStep1View
                  onNavigate={handleNavigate}
                  instructors={instructorsList}
                  studios={studiosList}
                  application={application}
                  setApplication={setApplication}
                  selectedInstructor={selectedInstructor}
                  setSelectedInstructor={setSelectedInstructor}
                  selectedStudio={selectedStudio}
                  setSelectedStudio={setSelectedStudio}
                  currentUser={currentUser}
                  onApproveApplication={handleApproveApplication}
                />
              )}

              {activeView === "cert-step2" && (
                <CertStep2View
                  onNavigate={handleNavigate}
                  instructors={instructorsList}
                  studios={studiosList}
                  application={application}
                  setApplication={setApplication}
                  selectedInstructor={selectedInstructor}
                  setSelectedInstructor={setSelectedInstructor}
                  selectedStudio={selectedStudio}
                  setSelectedStudio={setSelectedStudio}
                  currentUser={currentUser}
                  onApproveApplication={handleApproveApplication}
                />
              )}

              {activeView === "certificate" && (
                <CertificatePreviewView
                  onNavigate={handleNavigate}
                  instructors={instructorsList}
                  studios={studiosList}
                  application={application}
                  setApplication={setApplication}
                  selectedInstructor={selectedInstructor}
                  setSelectedInstructor={setSelectedInstructor}
                  selectedStudio={selectedStudio}
                  setSelectedStudio={setSelectedStudio}
                  currentUser={currentUser}
                  onApproveApplication={handleApproveApplication}
                />
              )}

              {activeView === "success" && (
                <SubmissionSuccessView
                  onNavigate={handleNavigate}
                  instructors={instructorsList}
                  studios={studiosList}
                  application={application}
                  setApplication={setApplication}
                  selectedInstructor={selectedInstructor}
                  setSelectedInstructor={setSelectedInstructor}
                  selectedStudio={selectedStudio}
                  setSelectedStudio={setSelectedStudio}
                  currentUser={currentUser}
                  onApproveApplication={handleApproveApplication}
                />
              )}
            </>
          )}
        </WeChatFrame>
      </div>

      {/* RIGHT COLUMN: Highly polished Yoga Studio Desktop Inspector (Responsive companion layout) */}
      <div className="w-full md:w-[380px] bg-white border-t md:border-t-0 md:border-l border-slate-200/80 p-6 flex flex-col justify-between shrink-0 gap-6">
        
        {/* Dynamic header depending on what they tapped within the frame */}
        {selectedStudio ? (
          <div className="flex flex-col h-full justify-between">
            <div>
              {/* Cover Art */}
              <div className="relative h-[200px] w-full rounded-2xl overflow-hidden shadow-sm border border-slate-100">
                <img
                  src={selectedStudio.image}
                  alt={selectedStudio.name}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-3 left-3 bg-brand-green text-white text-[10px] uppercase font-bold py-1 px-2.5 rounded-full tracking-wider shadow-xs">
                  {selectedStudio.city} 精选
                </div>
                <div className="absolute bottom-3 right-3 bg-white/90 backdrop-blur-xs text-slate-800 text-xs py-1 px-2.5 rounded-xl font-bold flex items-center gap-1 shadow-xs">
                  <Star className="w-3.5 h-3.5 fill-amber-400 stroke-amber-400" />
                  <span>{selectedStudio.rating} 评分</span>
                </div>
              </div>

              {/* Text titles */}
              <div className="mt-5">
                <h3 className="text-xl font-bold text-gray-800 font-serif leading-tight">
                  {selectedStudio.name}
                </h3>
                <p className="text-xs text-slate-400 mt-1 flex items-center gap-1 font-medium">
                  <MapPin className="w-4 h-4 text-brand-green/80 shrink-0" />
                  <span>{selectedStudio.city}县舍 · {selectedStudio.district}</span>
                </p>
              </div>

              {/* Tags Cloud */}
              <div className="flex flex-wrap gap-1.5 mt-3">
                {selectedStudio.tags.map((tag, idx) => (
                  <span key={idx} className="bg-brand-green-light text-brand-green border border-brand-green/10 text-[10px] font-bold rounded-lg px-2.5 py-1">
                    {tag}
                  </span>
                ))}
              </div>

              {/* Full studio descriptions */}
              <div className="mt-5 border-t border-slate-100 pt-4">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                  门舍场馆简介：
                </h4>
                <p className="text-xs text-slate-500 leading-relaxed mt-2 p-3 rounded-2xl bg-slate-50 border border-slate-100">
                  {selectedStudio.description}
                </p>
              </div>

              {/* Address details */}
              <div className="mt-5 flex flex-col gap-2.5">
                <div className="text-xs flex items-start gap-2 text-slate-600">
                  <span className="font-bold text-slate-800 shrink-0">详细地址：</span>
                  <span className="leading-normal">{selectedStudio.address}</span>
                </div>
                <div className="text-xs flex items-center gap-2 text-slate-600">
                  <span className="font-bold text-slate-800 shrink-0">预约专线：</span>
                  <span className="font-mono font-bold text-brand-green hover:underline cursor-pointer">{selectedStudio.contact}</span>
                </div>
              </div>
            </div>

            {/* Simulated interactive reservation */}
            <div className="mt-6 pt-5 border-t border-slate-100">
              <button
                id="btn-desktop-book"
                onClick={() => alert(`🎉 预约请求成功发送！\n我们安排了该门店认证资深导师尽快致电您的出网手机，为您免费定制首节 1对1 个人私教呼吸调理课！`)}
                className="w-full bg-brand-green hover:bg-brand-green-hover text-white text-xs font-bold py-3.5 px-6 rounded-2xl shadow-md tracking-wider transition-all transform hover:-translate-y-0.5 active:translate-y-0"
              >
                在线预约免费私教试课
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full py-16 text-center text-slate-400 p-4">
            <BookOpen className="w-12 h-12 text-slate-300 stroke-[1.5] mb-3.5" />
            <h4 className="font-bold text-sm text-slate-600">选择一间馆舍开展练习</h4>
            <p className="text-xs text-slate-400 max-w-[220px] mt-1.5 leading-normal">
              在左侧小程序中点击“瑜伽工作室”，然后点击馆舍的“查看详情”按钮，即可在此查看其超赞的高清全景图、特色项目、详尽地址以及试课约定！
            </p>
          </div>
        )}

      </div>
      
    </div>
      
      ) : (
        /* ======================= RENDER ADMIN CONSOLE WORKSPACE ======================= */
        <div id="admin-whole-layout" className="flex-1 p-4 md:p-8 lg:p-12 flex items-center justify-center bg-[#FAF8F5]">
          <div className="max-w-6xl w-full">
            <AdminPortal
              instructors={instructorsList}
              setInstructors={setInstructorsList}
              studios={studiosList}
              setStudios={setStudiosList}
              application={application}
              setApplication={setApplication}
              onApproveApplication={handleApproveApplication}
              onRejectApplication={handleRejectApplication}
            />
          </div>
        </div>
      )}

    </div>
  );
}
