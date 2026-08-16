<template>
  <div>
    <div class="page-head">
      <div><h1>年审工作台</h1><p>先安排本期审核人，再推进成员意见、组长决议与正式发布。</p></div>
    </div>

    <div class="workflow-stepper" aria-label="协作年审流程">
      <div class="workflow-step workflow-step--current"><b>01 / 安排</b><span>确定本期审核人</span></div>
      <div class="workflow-step"><b>02 / 审核</b><span>成员意见与组长决议</span></div>
      <div class="workflow-step"><b>03 / 发布</b><span>管理员确认并同步结果</span></div>
    </div>

    <section class="panel workflow-panel workflow-plan">
      <div class="workflow-plan__head"><div><h2>01 · 本期审核安排</h2><p>一个批次默认使用一组审核人；成员分别提交意见，组长汇总决议。</p></div><button class="sync-btn" @click="showSetup = !showSetup">{{ showSetup ? '收起设置' : '调整审核安排' }}</button></div>
      <div class="workflow-plan__summary"><span>年审批次 <strong>{{ cycles[0]?.name || '尚未创建' }}</strong></span><span>审核组 <strong>{{ groups[0]?.name || '尚未设置' }}</strong></span><span>组长 <strong>{{ groups[0]?.leaderName || '—' }}</strong></span></div>
      <div v-if="showSetup || setupNeeded" class="workflow-setup">
        <div class="workflow-setup__section"><h3>年审批次</h3><div class="inline-form"><input v-model="cycleForm.name" placeholder="例如：2026 年度年审" /><input v-model="cycleForm.startDate" type="date" /><input v-model="cycleForm.submissionDeadline" type="date" /><button class="primary-btn" @click="saveCycle">保存批次</button></div></div>
        <div class="workflow-setup__section"><h3>本期审核人</h3><div class="inline-form"><input v-model="groupForm.name" placeholder="例如：2026 年度审核组" /><select v-model.number="groupForm.leaderId"><option :value="null">选择组长</option><option v-for="admin in admins" :key="admin.id" :value="admin.id">{{ admin.username }}</option></select><select v-model="groupForm.memberIds" multiple aria-label="审核成员"><option v-for="admin in admins" :key="admin.id" :value="admin.id">{{ admin.username }}</option></select><button class="primary-btn" @click="saveGroup">保存审核人</button></div><p class="form-hint">按住 Ctrl/⌘ 可多选成员；等级范围等高级授权不在 MVP 主流程中配置。</p></div>
      </div>
    </section>

    <section class="panel workflow-panel workflow-panel--muted">
      <div class="workflow-queue__meta"><h2>02 · {{ queueTitle }}</h2><span>共 {{ reviews.length }} 份年审记录</span></div>
      <div class="data-table-wrap"><table class="data-table"><thead><tr><th>教师</th><th>状态</th><th>审核组</th><th>操作</th></tr></thead><tbody>
        <tr v-for="review in reviews" :key="review.id"><td>{{ review.name }}<small>{{ review.certNo }}</small></td><td>{{ label(review.status) }}</td><td>{{ review.groupName || '未分配' }}</td><td><button class="table-action" @click="openReview(review)">处理</button></td></tr>
      </tbody></table></div>
    </section>

    <section v-if="selected" class="panel workflow-panel">
      <h2>03 · {{ selected.name }} 的审核协作</h2>
      <div class="assignment-block" v-if="!workflow?.group"><h3>安排本次审核</h3><p>选择本期审核人后，成员即可分别提交意见。</p><div class="inline-form"><select v-model.number="assignment.groupId"><option :value="null">选择审核组</option><option v-for="group in groups" :key="group.id" :value="group.id">{{ group.name }}</option></select><select v-model.number="assignment.cycleId"><option :value="null">选择年审批次</option><option v-for="cycle in cycles" :key="cycle.id" :value="cycle.id">{{ cycle.name }}</option></select><button class="primary-btn" @click="assign">确认安排</button></div></div>
      <template v-else>
        <div class="review-summary">
          <div><span>审核组</span><strong>{{ workflow.group.name }}</strong></div>
          <div><span>成员意见</span><strong>{{ workflow.opinionProgress?.submitted || 0 }} / {{ workflow.opinionProgress?.required || 0 }} 已提交</strong></div>
          <p>{{ nextStepText }}</p>
        </div>

        <div class="opinion-list" v-if="workflow.opinions.length">
          <article v-for="item in workflow.opinions" :key="item.id"><strong>{{ item.author }}</strong> · {{ item.conclusion === 'approved' ? '建议通过' : '建议不通过' }}<p>{{ item.comment }}</p></article>
        </div>

        <section v-if="reviewStage === 'review' && canSubmitOpinion" class="review-action-block">
          <h3>提交个人意见</h3>
          <textarea v-model="opinion.comment" placeholder="说明核验结果、需补充项或通过依据"></textarea>
          <div class="inline-form"><select v-model="opinion.conclusion"><option value="approved">建议通过</option><option value="rejected">建议不通过</option></select><button class="sync-btn" @click="submitOpinion">提交个人意见</button></div>
        </section>

        <section v-if="reviewStage === 'review' && canSubmitDecision" class="review-action-block review-action-block--decision">
          <h3>形成集体决议</h3>
          <p v-if="!decisionReady" class="form-hint">请等待全部审核成员提交个人意见后再形成决议。</p>
          <textarea v-model="decision.text" placeholder="概括审核结论与后续处理意见"></textarea>
          <div class="inline-form"><select v-model="decision.conclusion"><option value="approved">建议通过</option><option value="rejected">建议不通过</option></select><button class="primary-btn" :disabled="!decisionReady" @click="submitDecision">{{ workflow.status === 'returned_to_group' ? '修订并再次提交' : '提交组长决议' }}</button></div>
        </section>

        <section v-if="reviewStage === 'publication' && canPublish" class="review-action-block review-action-block--publish">
          <h3>确认正式发布</h3>
          <p>组长决议：{{ workflow.groupDecision || '未填写' }}</p>
          <div class="inline-form"><button :class="workflow.status === 'pending_publication' ? 'approve' : 'reject'" @click="publish(workflow.status === 'pending_publication' ? 'approved' : 'rejected')">{{ workflow.status === 'pending_publication' ? '正式发布通过' : '正式发布未通过' }}</button><button class="sync-btn" @click="requestReturn">退回审核组</button></div>
        </section>

        <section v-if="reviewStage === 'published'" class="review-result">
          <span class="review-result__eyebrow">已完成</span>
          <h3>{{ workflow.status === 'published_approved' ? '本期年审已正式通过' : '本期年审已正式发布为未通过' }}</h3>
          <p>{{ workflow.groupDecision || '结果已同步至教师端。' }}</p>
          <small>发布于 {{ selected.publishedAt || '刚刚' }}</small>
        </section>
      </template>
      <button class="back-to-queue" @click="clearSelected">返回审核队列</button>
    </section>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { assignReview, createReviewCycle, createReviewGroup, fetchPermissions, fetchReviewCycles, fetchReviewGroups, fetchReviewWorkflow, fetchAdminReviews, publishReview, returnReviewToGroup, submitGroupDecision, submitReviewOpinion } from '../api/adminData'
import { useToast } from '../composables/useToast'
const { show: toast } = useToast()
const cycles = ref([]); const groups = ref([]); const admins = ref([]); const reviews = ref([]); const selected = ref(null); const workflow = ref(null); const showSetup = ref(false)
const cycleForm = ref({ name: '', startDate: '', submissionDeadline: '' }); const groupForm = ref({ name: '', leaderId: null, memberIds: [] }); const assignment = ref({ groupId: null, cycleId: null }); const opinion = ref({ conclusion: 'approved', comment: '' }); const decision = ref({ conclusion: 'approved', text: '' })
const label = (status) => ({ pending: '已提交', submitted: '已提交', in_review: '审核中', pending_publication: '待发布', pending_publication_rejected: '待发布', approved: '已通过', rejected: '未通过', published_approved: '已发布（通过）', published_rejected: '已发布（未通过）' }[status] || status)
const reviewStage = computed(() => {
  const status = workflow.value?.status
  if (status === 'published_approved' || status === 'published_rejected') return 'published'
  if (status === 'pending_publication' || status === 'pending_publication_rejected') return 'publication'
  return 'review'
})
const currentRole = computed(() => workflow.value?.currentAdmin?.role)
const isAdmin = computed(() => ['admin', 'super_admin'].includes(currentRole.value))
const canSubmitOpinion = computed(() => workflow.value?.status === 'in_review')
const canSubmitDecision = computed(() => reviewStage.value === 'review' && (isAdmin.value || workflow.value?.group?.leaderId === workflow.value?.currentAdmin?.id))
const canPublish = computed(() => reviewStage.value === 'publication' && isAdmin.value)
const decisionReady = computed(() => (workflow.value?.opinionProgress?.required || 0) > 0 && workflow.value.opinionProgress.submitted >= workflow.value.opinionProgress.required)
const queueTitle = computed(() => currentRole.value === 'reviewer' ? '我的审核' : currentRole.value === 'group_leader' ? '审核小组' : '审核队列')
const nextStepText = computed(() => ({ review: decisionReady.value ? '成员意见已齐全，组长可以形成集体决议。' : '下一步：成员完成核验意见后，由组长提交集体决议。', publication: '下一步：管理员确认后正式发布，教师端将同步结果。', published: '结果已同步至教师端，本条记录仅供查看。' }[reviewStage.value]))
const setupNeeded = computed(() => cycles.value.length === 0 || groups.value.length === 0)
async function load() { [cycles.value, groups.value, admins.value, reviews.value] = await Promise.all([fetchReviewCycles(), fetchReviewGroups(), fetchPermissions(), fetchAdminReviews()]) }
async function saveCycle() { try { await createReviewCycle(cycleForm.value); cycleForm.value = { name: '', startDate: '', submissionDeadline: '' }; await load(); toast('年审批次已创建') } catch (e) { toast('创建批次失败', 'error') } }
async function saveGroup() { try { await createReviewGroup({ name: groupForm.value.name, leaderId: groupForm.value.leaderId, memberIds: groupForm.value.memberIds, tierScope: [] }); groupForm.value = { name: '', leaderId: null, memberIds: [] }; await load(); toast('本期审核人已保存') } catch (e) { toast('保存审核人失败', 'error') } }
async function openReview(review) { selected.value = review; workflow.value = await fetchReviewWorkflow(review.id).catch(() => null) }
function clearSelected() { selected.value = null; workflow.value = null; opinion.value.comment = ''; decision.value.text = '' }
async function refreshSelected() { await load(); if (selected.value) { selected.value = reviews.value.find(item => item.id === selected.value.id); workflow.value = await fetchReviewWorkflow(selected.value.id).catch(() => null) } }
async function assign() { try { await assignReview(selected.value.id, assignment.value); await refreshSelected(); toast('已分配审核组') } catch (e) { toast('分配失败', 'error') } }
async function submitOpinion() { try { await submitReviewOpinion(selected.value.id, opinion.value); opinion.value.comment = ''; await refreshSelected(); toast('个人意见已提交') } catch (e) { toast('提交失败', 'error') } }
async function submitDecision() { try { await submitGroupDecision(selected.value.id, { decision: decision.value.text, conclusion: decision.value.conclusion }); await refreshSelected(); toast('集体决议已提交') } catch (e) { toast('提交失败', 'error') } }
async function publish(outcome) { try { await publishReview(selected.value.id, outcome); await refreshSelected(); toast('年审结果已正式发布') } catch (e) { toast('发布失败', 'error') } }
async function requestReturn() { const reason = window.prompt('请输入退回审核组的原因'); if (!reason?.trim()) return; try { await returnReviewToGroup(selected.value.id, reason.trim()); await refreshSelected(); toast('已退回审核组修订') } catch (e) { toast('退回失败', 'error') } }
onMounted(() => load().catch(() => toast('协作年审数据加载失败', 'error')))
</script>

<style scoped>
.workflow-panel { margin-bottom:18px; padding:22px; }
.workflow-panel h2 { margin-top:0; }
.inline-form { display:flex; gap:10px; flex-wrap:wrap; align-items:center; }
.inline-form input,.inline-form select,.workflow-panel textarea { min-height:38px; padding:8px 10px; border:1px solid #d9ded9; border-radius:8px; }
.workflow-panel textarea { width:100%; min-height:80px; margin:14px 0; box-sizing:border-box; }
.chip-list { display:flex; gap:8px; flex-wrap:wrap; margin-top:14px; }
td small { display:block; color:#738073; margin-top:4px; }
.form-hint { color:#65706a; font-size:13px; }
.workflow-plan__head { display:flex; align-items:flex-start; justify-content:space-between; gap:16px; }
.workflow-plan__head p { margin:6px 0 0; color:var(--muted); font-size:13px; }
.workflow-plan__summary { display:grid; grid-template-columns:repeat(3,1fr); gap:10px; margin-top:18px; }
.workflow-plan__summary span { padding:12px; border:1px solid var(--line-strong); border-radius:12px; color:var(--muted); font-size:11px; }
.workflow-plan__summary strong { display:block; margin-top:5px; color:var(--ink); font-size:13px; }
.workflow-setup { display:grid; gap:14px; margin-top:18px; padding-top:18px; border-top:1px dashed var(--line-strong); }
.workflow-setup__section h3,.assignment-block h3 { margin:0 0 10px; font-size:14px; }
.assignment-block { padding:18px; border:1px solid rgba(93,114,97,.35); border-radius:16px; background:var(--surface-soft); }
.assignment-block p { margin:0 0 14px; color:var(--muted); font-size:13px; }
.review-summary { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:12px; margin:16px 0; padding:16px; border:1px solid var(--line-strong); border-radius:16px; background:var(--surface-soft); }
.review-summary span,.review-summary strong { display:block; }
.review-summary span { color:var(--muted); font-size:11px; font-weight:700; }
.review-summary strong { margin-top:4px; color:var(--ink); font-size:14px; }
.review-summary p { grid-column:1 / -1; margin:5px 0 0; color:var(--brand-green); font-size:12px; font-weight:700; }
.opinion-list { display:grid; gap:8px; margin:16px 0; }
.opinion-list article { border-left:3px solid var(--brand-green); padding:10px 12px; background:#f7faf7; }
.opinion-list p { margin:5px 0 0; color:var(--muted); }
.review-action-block { margin-top:16px; padding:18px; border:1px solid var(--line-strong); border-radius:16px; background:#fff; }
.review-action-block h3,.review-result h3 { margin:0; font-size:15px; }
.review-action-block--decision { border-color:rgba(170,137,82,.35); background:#fffdf8; }
.review-action-block--publish { border-color:rgba(93,114,97,.38); background:#f3f7f2; }
.review-action-block--publish p { margin:10px 0 14px; color:var(--muted); }
.review-result { margin-top:16px; padding:22px; border:1px solid rgba(93,114,97,.3); border-radius:16px; background:linear-gradient(135deg,#f1f6f0,#fffdf8); }
.review-result__eyebrow { color:var(--brand-gold); font:700 10px "JetBrains Mono", monospace; letter-spacing:.1em; }
.review-result h3 { margin-top:8px; color:var(--brand-green); font-family:"Noto Serif SC",serif; font-size:18px; }
.review-result p { margin:9px 0; color:var(--muted); }
.review-result small { color:var(--muted-light); }
.back-to-queue { margin-top:18px; border:0; background:transparent; color:var(--muted); font-size:12px; font-weight:700; }
@media (max-width:900px) { .workflow-plan__summary { grid-template-columns:1fr; } }
</style>
