<template>
  <div class="guide-page">
    <div class="page-head">
      <div><h1>系统操作指引</h1><p>按当前身份整理本期年审的必要操作；每一步完成后，系统会自动推进下一位处理人。</p></div>
    </div>

    <section class="guide-hero panel">
      <span>当前身份 · {{ roleLabel }}</span>
      <h2>{{ headline }}</h2>
      <p>{{ intro }}</p>
      <RouterLink class="guide-hero__action" to="/review-workflow"><span>进入{{ workspaceLabel }}</span><b aria-hidden="true">→</b></RouterLink>
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
        <li>未正式发布的审核意见仅供获授权人员处理，不能对教师承诺结果。</li>
        <li>需要修订时使用“退回审核组”，不要通过新建重复记录解决。</li>
        <li>正式发布后，教师端会同步展示结论、等级与新的有效期。</li>
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
const roleLabel = computed(() => ({ reviewer: '审核成员', group_leader: '审核组长', admin: '年审管理员', super_admin: '系统管理员' }[role.value] || '审核成员'))
const workspaceLabel = computed(() => role.value === 'reviewer' ? '我的审核' : role.value === 'group_leader' ? '审核小组' : '年审工作台')
const copy = computed(() => ({
  reviewer: {
    headline: '先完成分配给你的核验意见', intro: '你只需要处理“我的审核”中的教师；提交后等待其他成员与组长继续推进。',
    steps: [['查看材料', '核对教师档案、本期材料和引用的教学记录。', '仅处理已分配记录。'], ['提交个人意见', '选择建议结论，写清核验依据或待补充事项。', '提交后可在组内查看已提交意见。'], ['等待发布', '组长形成集体决议，管理员正式发布后教师才会看到结果。', '发布前请勿向教师确认最终结果。']],
  },
  group_leader: {
    headline: '汇总成员意见，形成可发布的集体决议', intro: '成员意见全部提交后，系统才会开放组长决议，避免遗漏核验。',
    steps: [['关注完成度', '在审核小组中查看“成员意见 x/y 已提交”。', '未齐前无需催促重复提交。'], ['形成集体决议', '综合材料和成员意见，选择建议结论并说明理由。', '提交后成员意见将锁定。'], ['处理退回', '管理员退回时查看原因，修订决议后再次提交。', '既有意见会保留，便于追溯。']],
  },
  admin: {
    headline: '安排审核人并完成正式发布', intro: '管理员负责批次、分配、退回和发布，不替代小组成员填写意见。',
    steps: [['安排本期审核人', '创建本期批次并明确组长、审核成员。', '一个教师在同一批次只分配一个审核组。'], ['核对待发布结果', '确认成员意见、组长决议、最终等级与有效期。', '信息不足时退回审核组并写明原因。'], ['正式发布', '二次确认后发布，系统同步更新教师端结果。', '发布后结果生效并保留操作留痕。']],
  },
  super_admin: {
    headline: '维护规则与权限，保障年审有序流转', intro: '除年审管理外，你还可以维护账号、导入教师资料和系统规则。',
    steps: [['设置账号与权限', '为审核成员、组长和管理员分配正确身份。', '角色决定其可见数据与操作入口。'], ['建立本期工作流', '创建批次、审核组并安排待审教师。', '避免同一教师被并行分配。'], ['核对并发布', '按管理员流程核对决议，必要时退回审核组。', '仅正式发布会更新教师资质。']],
  },
}[role.value] || {}))
const headline = computed(() => copy.value.headline)
const intro = computed(() => copy.value.intro)
const steps = computed(() => (copy.value.steps || []).map(([title, description, tip]) => ({ title, description, tip })))
</script>

<style scoped>
.guide-page { max-width:1080px; }
.guide-hero { padding:32px; border-color:rgba(93,114,97,.35); background:linear-gradient(125deg,#eff5ee,#fffaf0); }
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
