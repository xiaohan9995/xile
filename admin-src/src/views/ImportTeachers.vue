<template>
  <div>
    <div class="page-head">
      <div>
        <h1>教师批量导入</h1>
        <p>上传 Excel 后进行字段预检、重复编号校验和导入批次记录。</p>
      </div>
      <button class="primary-btn">上传 Excel</button>
    </div>

    <div class="dashboard-grid">
      <section class="panel">
        <div class="panel-title">
          <h2>导入预检</h2>
          <small>等待文件上传</small>
        </div>
        <div class="import-drop">
          <strong>将教师资料 Excel 拖拽到这里</strong>
          <span>支持 .xlsx / .xls，字段以客户年审表为准</span>
        </div>
      </section>

      <section class="panel">
        <div class="panel-title">
          <h2>最近导入批次</h2>
        </div>
        <div class="task-card">
          <div>
            <strong>2026 年审教师表</strong>
            <span>预检 1286 条，待确认提交</span>
          </div>
          <button class="primary-btn">查看</button>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.import-drop {
  min-height: 260px;
  border: 1px dashed rgba(93, 114, 97, 0.35);
  border-radius: 24px;
  display: grid;
  place-items: center;
  align-content: center;
  gap: 10px;
  background: #fafcfb;
  color: #5d7261;
}

.import-drop span {
  color: #9aa1a8;
  font-size: 13px;
}
</style>
