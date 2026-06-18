<template>
  <div>
    <div class="page-head">
      <div>
        <h1>系统设置</h1>
        <p>维护小程序首期上线所需的认证规则、年审周期和有赞学堂外链。</p>
      </div>
      <button class="primary-btn">保存配置</button>
    </div>

    <section class="settings-grid">
      <div class="panel">
        <div class="panel-title">
          <h2>年审规则</h2>
        </div>
        <div class="settings-list">
          <label>L0-L3 审核周期 <input value="两年一审" /></label>
          <label>L4 审核周期 <input value="三年一审" /></label>
          <label>L5 审核周期 <input value="无需年审" /></label>
        </div>
      </div>

      <div class="panel">
        <div class="panel-title">
          <h2>外链配置</h2>
        </div>
        <div class="settings-list">
          <label>有赞学堂地址 <input value="https://youzan.example.com/joy-yoga" /></label>
          <label>客服电话 <input value="400-820-8820" /></label>
          <label>认证中心名称 <input value="喜乐瑜伽教师认证中心" /></label>
        </div>
      </div>
    </section>
  </div>
</template>
