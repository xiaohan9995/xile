/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import {
  MessageSquare,
  Smartphone,
  ShieldCheck,
  Check,
  ArrowRight,
  Smile,
  Info
} from "lucide-react";

interface LoginViewProps {
  onLoginSuccess: (userInfo: { name: string; avatar: string }) => void;
  onContinueAsGuest: () => void;
}

export function LoginView({ onLoginSuccess, onContinueAsGuest }: LoginViewProps) {
  const [loginMethod, setLoginMethod] = useState<"wechat" | "phone">("wechat");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [verifyCode, setVerifyCode] = useState("");
  const [agreed, setAgreed] = useState(false);
  
  // Timer for sending SMS verification code
  const [countdown, setCountdown] = useState(0);
  const [isSending, setIsSending] = useState(false);
  const [smsError, setSmsError] = useState("");
  const [inputError, setInputError] = useState("");

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setIsSending(false);
    }
  }, [countdown]);

  const handleSendCode = () => {
    if (!phoneNumber) {
      setSmsError("请先填写手机号码");
      return;
    }
    if (!/^\d{11}$/.test(phoneNumber)) {
      setSmsError("手机号必须为11位数字");
      return;
    }
    setSmsError("");
    setIsSending(true);
    setCountdown(60);
    // Mimic code detection alert for high UX sandbox standard
    alert(`[喜乐瑜伽] 模拟短信验证码已发送至 ${phoneNumber}：123456 (沙盒通用格式)`);
  };

  const handlePhoneSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreed) {
      setInputError("请阅读并同意《用户服务协议与隐私政策》");
      return;
    }
    if (!phoneNumber || !/^\d{11}$/.test(phoneNumber)) {
      setInputError("请输入正确的11位电话号码");
      return;
    }
    if (!verifyCode || verifyCode !== "123456") {
      setInputError("请输入正确的短信验证码：123456");
      return;
    }
    
    setInputError("");
    onLoginSuccess({
      name: `瑜伽学员_${phoneNumber.substring(7)}`,
      avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=200&auto=format&fit=crop"
    });
  };

  const handleWeChatLogin = () => {
    if (!agreed) {
      setInputError("请阅读并同意《用户服务协议与隐私政策》");
      return;
    }
    setInputError("");
    
    // Auto login as default WeChat Profile avatar
    onLoginSuccess({
      name: "微信用户_101",
      avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=200&auto=format&fit=crop"
    });
  };

  return (
    <div id="login-screen-view" className="flex flex-col min-h-full bg-[#FAF8F5] pb-24 p-6 select-none animate-fade-in justify-between">
      {/* Decorative Top header spacing */}
      <div className="h-6"></div>

      {/* Brand Visual Logo Section */}
      <div className="flex flex-col items-center text-center my-8">
        <div className="w-20 h-20 bg-brand-green rounded-3xl flex items-center justify-center text-white shadow-lg border-4 border-white transform hover:rotate-12 transition-transform duration-300">
          <Smile className="w-12 h-12 stroke-[1.5]" />
        </div>
        <h2 className="text-2xl font-serif font-bold text-gray-800 mt-4 tracking-wide">
          喜乐瑜伽
        </h2>
        <p className="text-xs text-gray-400 mt-1.5 tracking-wider uppercase font-mono">
          JOY YOGA REGISTRY
        </p>
        <p className="text-[11px] text-brand-green bg-brand-green-light font-medium px-2.5 py-0.5 rounded-full mt-2 inline-block">
          专业瑜伽认可及导师验证平台
        </p>
      </div>

      {/* Tabs list for login methods */}
      <div className="bg-slate-100/80 p-1.5 rounded-2xl flex gap-1 mb-6">
        <button
          id="btn-login-tab-wechat"
          onClick={() => {
            setLoginMethod("wechat");
            setInputError("");
          }}
          className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
            loginMethod === "wechat"
              ? "bg-white text-brand-green shadow-xs"
              : "text-gray-400 hover:text-gray-600"
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          <span>微信授权登录</span>
        </button>

        <button
          id="btn-login-tab-phone"
          onClick={() => {
            setLoginMethod("phone");
            setInputError("");
          }}
          className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
            loginMethod === "phone"
              ? "bg-white text-brand-green shadow-xs"
              : "text-gray-400 hover:text-gray-600"
          }`}
        >
          <Smartphone className="w-4 h-4" />
          <span>手机验证登录</span>
        </button>
      </div>

      {/* Central Login Content Form */}
      <div className="flex-1 flex flex-col justify-center">
        {loginMethod === "wechat" ? (
          /* WeChat One-Click Action button container layout */
          <div className="flex flex-col gap-4 animate-fade-in">
            <button
              id="btn-wechat-direct-login"
              onClick={handleWeChatLogin}
              className="w-full bg-[#07C160] hover:bg-[#06ad56] text-white rounded-full py-4 px-6 text-sm font-bold shadow-lg flex items-center justify-center gap-2.5 transform active:scale-98 transition-all"
            >
              <MessageSquare className="w-5 h-5 fill-current" />
              <span>微信个人信息一键授权</span>
            </button>
            <p className="text-[10px] text-gray-400 text-center leading-normal">
              授权后将自动备案您的微信昵称、个人头像以生成专属数智报告。
            </p>
          </div>
        ) : (
          /* Phone OTP Input Form Layout */
          <form onSubmit={handlePhoneSubmit} className="flex flex-col gap-4 animate-fade-in text-left">
            {/* Phone input field */}
            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-3 flex flex-col">
              <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">
                中国大陆手机号
              </label>
              <input
                id="login-phonenumber"
                type="tel"
                placeholder="请输入11位手机号码"
                maxLength={11}
                value={phoneNumber}
                onChange={(e) => {
                  setPhoneNumber(e.target.value.replace(/\D/g, ""));
                  setInputError("");
                  setSmsError("");
                }}
                className="bg-transparent text-sm font-semibold text-gray-800 placeholder-slate-350 focus:outline-none py-1"
              />
            </div>

            {/* Code request OTP field */}
            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-3 flex items-center justify-between">
              <div className="flex flex-col flex-1 pl-1">
                <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">
                  短信验证码
                </label>
                <input
                  id="login-verifycode"
                  type="text"
                  placeholder="请输入123456"
                  maxLength={6}
                  value={verifyCode}
                  onChange={(e) => {
                    setVerifyCode(e.target.value);
                    setInputError("");
                  }}
                  className="bg-transparent text-sm font-semibold text-gray-800 placeholder-slate-350 focus:outline-none py-1 font-mono tracking-widest"
                />
              </div>

              <button
                id="btn-login-sendcode"
                type="button"
                disabled={isSending}
                onClick={handleSendCode}
                className={`text-xs font-bold px-4 py-2 rounded-xl transition-all ${
                  isSending
                    ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                    : "bg-brand-green-light text-brand-green hover:bg-[#E2E8E4]"
                }`}
              >
                {isSending ? `${countdown}s 后重新发送` : "获取验证码"}
              </button>
            </div>

            {smsError && (
              <p className="text-[10.5px] text-red-500 font-medium px-2 flex items-center gap-1">
                <Info className="w-3.5 h-3.5 inline" /> {smsError}
              </p>
            )}

            {/* Complete submit button */}
            <button
              id="btn-phone-login-submit"
              type="submit"
              className="w-full bg-brand-green hover:bg-brand-green-hover text-white rounded-full py-3.5 mt-2 font-bold text-xs tracking-wider shadow-md transform active:scale-[0.98] transition-all flex items-center justify-center gap-1"
            >
              <span>安全验证并登录</span>
              <ArrowRight className="w-4 h-4 ml-1" />
            </button>
          </form>
        )}
      </div>

      {/* Error Output block */}
      {inputError && (
        <div className="bg-red-50 border border-red-100 text-red-500 rounded-2xl p-3 text-xs font-semibold text-center my-2 select-none animate-bounce">
          {inputError}
        </div>
      )}

      {/* Agreement Footer T&Cs */}
      <div className="mt-6 flex flex-col gap-4">
        {/* Consent box layout */}
        <label className="flex items-start gap-2.5 cursor-pointer text-left px-1">
          <input
            id="checkbox-login-agree"
            type="checkbox"
            checked={agreed}
            onChange={(e) => {
              setAgreed(e.target.checked);
              if (inputError) setInputError("");
            }}
            className="hidden"
          />
          <div className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 mt-0.5 transition-all ${
            agreed 
              ? "bg-brand-green border-brand-green text-white" 
              : "border-slate-300 hover:border-brand-green"
          }`}>
            {agreed && <Check className="w-3 h-3 stroke-[3]" />}
          </div>
          <span className="text-[10.5px] text-gray-400 select-none leading-normal">
            我已阅读并完全同意由喜乐瑜伽认定的{" "}
            <span 
              onClick={(e) => {
                e.stopPropagation();
                alert("根据微信小程序个人信息监管法规，您必须同意《用户使用许可协议》与《隐私合规条例》方可注册为瑜伽持证教员。");
              }} 
              className="text-brand-green underline cursor-pointer"
            >
              《服务协议》
            </span>{" "}
            及{" "}
            <span 
              onClick={(e) => {
                e.stopPropagation();
                alert("保护您的数据：所有上传的资质照片与身份证件图片均仅保存在您本人的浏览器端沙盒，绝不泄露。");
              }} 
              className="text-brand-green underline cursor-pointer"
            >
              《隐私条款》
            </span>
          </span>
        </label>

        {/* Temporary Guest option button */}
        <button
          id="btn-continue-as-guest"
          onClick={onContinueAsGuest}
          className="text-xs text-slate-500 hover:text-slate-800 underline font-semibold flex items-center justify-center gap-1 py-1"
        >
          <span>暂不登录，以游侠身份探索名师及瑜伽馆</span>
          <ArrowRight className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}
