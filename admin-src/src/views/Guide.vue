<template>
  <div class="guide-page">
    <div class="page-head">
      <div><h1>系统操作指引</h1><p>按当前身份整理本期年审的必要操作；每一步完成后，系统会自动推进下一位处理人。</p></div>
    </div>

    <section class="guide-hero panel">
      <span>操作指引 · 年审管理</span>
      <h2>{{ headline }}</h2>
      <p>{{ intro }}</p>
      <RouterLink v-if="canManage" class="guide-hero__action" to="/reviews"><span>进入年审管理</span><b aria-hidden="true">→</b></RouterLink>
    </section>

    <section class="guide-grid" aria-label="操作步骤">
      <article v-for="(step, index) in steps" :key="step.title" class="guide-step panel">
        <span class="guide-step__number">0{{ index + 1 }}</span>
        <h2>{{ step.title }}</h2>
        <p>{{ step.description }}</p>
        <small>{{ step.tip }}</small>
      </article>
    </section>

    <section class="guide-notes panel">
      <h2>请牢记</h2>
      <ul>
        <li>处理结果会同步到教师端，请在核对材料后再确认。</li>
        <li>「通过」会为教师续期；「驳回」或「退回补充」需填写原因，便于教师补充材料重新提交。</li>
        <li>驳回 / 退回补充后，教师可重新提交，审核记录会保留历史版本。</li>
      </ul>
    </section>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const auth = useAuthStore()
const role = computed(() => auth.admin?.role || 'super_admin')
const canManage = computed(() => ['admin', 'super_admin'].includes(role.value))
const headline = computed(() => canManage.value ? '核对材料并一键处理年审' : '当前账号暂无年审处理权限')
const intro = computed(() => canManage.value ? '在「年审管理」中查看教师本期提交的材料与引用的教学 / 服务记录，核对后选择通过、驳回或退回补充。' : '你的身份不参与年审处理；如需处理权限，请联系系统管理员调整角色。')
const steps = computed(() => canManage.value ? [
  { title: '查看材料', description: '核对教师档案、本期材料和引用的教学记录。', tip: '从待处理队列进入详情查看。' },
  { title: '选择结论', description: '根据材料选择「通过」「驳回」或「退回补充」。', tip: '驳回与退回补充需填写原因。' },
  { title: '同步结果', description: '处理后教师端同步展示结论，通过即完成续期。', tip: '驳回后教师可重新提交。' },
] : [])
</script>

<style scoped>
.guide-page { max-width:1080px; }
.guide-hero { padding:32px; border-color:rgba(66,109,88,.35); background:linear-gradient(125deg,#eff5ee,#fffaf0); }
.guide-hero span,.guide-step__number { color:var(--brand-gold); font:700 11px "JetBrains Mono",monospace; letter-spacing:.1em; }
.guide-hero h2 { margin:10px 0; font:700 27px "Noto Serif SC",serif; color:var(--ink); }
.guide-hero p { max-width:650px; margin:0 0 20px; color:var(--muted); line-height:1.7; }
.guide-hero__action { display:inline-flex; align-items:center; gap:18px; min-height:48px; box-sizing:border-box; padding:0 18px 0 20px; border-radius:14px; color:#fff; background:var(--brand-green); box-shadow:0 8px 18px rgba(58,82,62,.18); font-size:13px; font-weight:800; line-height:1; text-decoration:none; transition:transform .18s ease, box-shadow .18s ease, background .18s ease; }
.guide-hero__action b { display:grid; width:22px; height:22px; place-items:center; border-radius:50%; color:var(--brand-green); background:rgba(255,255,255,.92); font-size:15px; line-height:1; }
.guide-hero__action:hover,.guide-hero__action:focus-visible { color:#fff; background:#506c55; box-shadow:0 11px 22px rgba(58,82,62,.24); outline:none; transform:translateY(-1px); }
.guide-grid { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:16px; margin:18px 0; }
.guide-step { min-height:185px; padding:24px; }
.guide-step h2 { margin:16px 0 8px; font-size:17px; }
.guide-step p { min-height:48px; margin:0; color:var(--muted); line-height:1.65; font-size:13px; }
.guide-step small { display:block; margin-top:16px; color:var(--brand-green); font-weight:700; }
.guide-notes { padding:24px; }
.guide-notes h2 { margin-top:0; font-size:17px; }
.guide-notes ul { margin:0; padding-left:20px; color:var(--muted); line-height:2; font-size:13px; }
@media (max-width:900px) { .guide-grid { grid-template-columns:1fr; } .guide-step p { min-height:0; } }
</style>
