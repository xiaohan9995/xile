const teachers = [
  {
    id: "JY20230001",
    name: "张三",
    xile: "喜悦",
    level: "L3",
    city: "上海市",
    status: "认证有效",
    expires: "2028.12.31",
    photo: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=180&q=80"
  },
  {
    id: "JY20230002",
    name: "李四",
    xile: "清心",
    level: "L2",
    city: "北京市",
    status: "认证有效",
    expires: "2026.06.30",
    photo: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=180&q=80"
  },
  {
    id: "JY20230003",
    name: "王五",
    xile: "自在",
    level: "L1",
    city: "杭州市",
    status: "认证有效",
    expires: "2025.12.31",
    photo: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=180&q=80"
  },
  {
    id: "JY20230004",
    name: "陈六",
    xile: "安然",
    level: "L4",
    city: "深圳市",
    status: "即将到期",
    expires: "2024.08.15",
    photo: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=180&q=80"
  }
];

const studios = [
  {
    name: "静心瑜伽空间",
    city: "上海市",
    district: "徐汇区",
    owner: "张三",
    level: "L3",
    status: "开放中",
    updated: "2026.06.10",
    image: "https://images.unsplash.com/photo-1593810450967-f9c42742e326?auto=format&fit=crop&w=420&q=86"
  },
  {
    name: "清悦身心练习室",
    city: "北京市",
    district: "朝阳区",
    owner: "李四",
    level: "L2",
    status: "开放中",
    updated: "2026.06.08",
    image: "https://images.unsplash.com/photo-1588286840104-8957b019727f?auto=format&fit=crop&w=420&q=86"
  },
  {
    name: "自在瑜伽小院",
    city: "杭州市",
    district: "西湖区",
    owner: "王五",
    level: "L1",
    status: "资料待完善",
    updated: "2026.06.02",
    image: "https://images.unsplash.com/photo-1599901860904-17e6ed7083a0?auto=format&fit=crop&w=420&q=86"
  }
];

const teacherList = document.querySelector("#teacherList");
const emptyTip = document.querySelector("#emptyTip");
const searchInput = document.querySelector("#teacherSearch");
const studioList = document.querySelector("#studioList");
const studioSearchInput = document.querySelector("#studioSearch");

function renderTeachers(list = teachers) {
  teacherList.innerHTML = list
    .map((teacher) => {
      const statusClass = teacher.status === "即将到期" ? "status-warn" : "status-good";
      return `
        <button class="teacher-card" data-jump="detail" aria-label="查看${teacher.name}详情">
          <img src="${teacher.photo}" alt="${teacher.name}头像" />
          <span>
            <h3>${teacher.name}</h3>
            <p>喜乐名：${teacher.xile}</p>
            <em class="cert-status ${statusClass}"><i class="ri-shield-check-line"></i>${teacher.status}</em>
            <small>认证编号 ${teacher.id}<br />有效期至 ${teacher.expires}</small>
          </span>
          <span class="level-badge">${teacher.level}</span>
        </button>
      `;
    })
    .join("");
  emptyTip.textContent = list.length ? "没有更多数据了" : "未找到匹配教师";
}

function renderStudios(list = studios) {
  studioList.innerHTML = list
    .map((studio) => `
      <button class="studio-card" data-jump="studio-detail" aria-label="查看${studio.name}">
        <img src="${studio.image}" alt="${studio.name}" />
        <span>
          <strong>${studio.name}</strong>
          <small>${studio.city} · ${studio.district}</small>
          <em><i class="ri-user-star-line"></i>${studio.owner} · ${studio.level} 认证导师</em>
        </span>
        <b>${studio.status}</b>
      </button>
    `)
    .join("");
}

function filterStudios() {
  const keyword = studioSearchInput.value.trim().toLowerCase();
  const filtered = studios.filter((studio) => {
    const haystack = `${studio.name}${studio.city}${studio.district}${studio.owner}${studio.status}`.toLowerCase();
    return haystack.includes(keyword);
  });
  renderStudios(filtered);
}

function filterTeachers() {
  const keyword = searchInput.value.trim().toLowerCase();
  const filtered = teachers.filter((teacher) => {
    const haystack = `${teacher.name}${teacher.xile}${teacher.id}${teacher.city}${teacher.level}`.toLowerCase();
    return haystack.includes(keyword);
  });
  renderTeachers(filtered);
}

function jumpToScreen(screenName) {
  const target = document.querySelector(`[data-screen="${screenName}"]`);
  if (!target) return;
  target.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  target.animate(
    [
      { transform: "translateY(0)" },
      { transform: "translateY(-8px)" },
      { transform: "translateY(0)" }
    ],
    { duration: 360, easing: "ease-out" }
  );
}

function activateAdminPanel(panelName) {
  document.querySelectorAll("[data-admin-panel]").forEach((panel) => {
    panel.classList.toggle("hidden", panel.dataset.adminPanel !== panelName);
  });
  document.querySelectorAll("[data-admin-tab]").forEach((button) => {
    button.classList.toggle("active", button.dataset.adminTab === panelName);
  });
  if (panelName === "dashboard") drawTrendChart();
}

function renderTeacherRows() {
  const rows = teachers
    .map((teacher) => {
      const statusClass = teacher.status === "即将到期" ? "status-warn" : "status-good";
      return `
        <tr>
          <td>${teacher.id}</td>
          <td>${teacher.name}</td>
          <td>${teacher.xile}</td>
          <td>${teacher.level}</td>
          <td>${teacher.city}</td>
          <td class="${statusClass}">${teacher.status}</td>
          <td>${teacher.expires}</td>
          <td><button data-admin-tab="review-detail">查看</button><button>编辑</button></td>
        </tr>
      `;
    })
    .join("");
  document.querySelector("#teacherRows").innerHTML = rows;
}

function renderStudioRows() {
  const rows = studios
    .map((studio) => {
      const statusClass = studio.status === "开放中" ? "status-good" : "status-warn";
      return `
        <tr>
          <td><img src="${studio.image}" alt="" />${studio.name}</td>
          <td>${studio.city} · ${studio.district}</td>
          <td>${studio.owner} / ${studio.level}</td>
          <td class="status-good">已认证</td>
          <td class="${statusClass}">${studio.status}</td>
          <td>${studio.updated}</td>
          <td><button>查看</button><button>编辑</button></td>
        </tr>
      `;
    })
    .join("");
  document.querySelector("#studioRows").innerHTML = rows;
}

function drawTrendChart() {
  const canvas = document.querySelector("#trendChart");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const width = canvas.width;
  const height = canvas.height;
  ctx.clearRect(0, 0, width, height);

  ctx.strokeStyle = "#E8ECE9";
  ctx.lineWidth = 1;
  for (let i = 0; i < 5; i += 1) {
    const y = 22 + i * 38;
    ctx.beginPath();
    ctx.moveTo(32, y);
    ctx.lineTo(width - 24, y);
    ctx.stroke();
  }

  const points = [84, 96, 112, 92, 78, 88, 101, 83, 98, 126, 106, 136];
  const xStep = (width - 78) / (points.length - 1);
  const yBase = height - 36;

  const gradient = ctx.createLinearGradient(0, 60, 0, height);
  gradient.addColorStop(0, "rgba(120,136,122,0.24)");
  gradient.addColorStop(1, "rgba(120,136,122,0)");

  ctx.beginPath();
  points.forEach((value, index) => {
    const x = 38 + index * xStep;
    const y = yBase - value * 0.86;
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.lineTo(width - 40, yBase);
  ctx.lineTo(38, yBase);
  ctx.closePath();
  ctx.fillStyle = gradient;
  ctx.fill();

  ctx.beginPath();
  points.forEach((value, index) => {
    const x = 38 + index * xStep;
    const y = yBase - value * 0.86;
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.strokeStyle = "#78887A";
  ctx.lineWidth = 3;
  ctx.lineJoin = "round";
  ctx.stroke();

  ctx.fillStyle = "#7E857E";
  ctx.font = "12px Outfit";
  ["1月", "2月", "3月", "4月", "5月", "6月", "7月", "8月", "9月", "10月", "11月", "12月"].forEach((month, index) => {
    ctx.fillText(month, 28 + index * xStep, height - 10);
  });
}

function bindEvents() {
  document.addEventListener("click", (event) => {
    const jump = event.target.closest("[data-jump]");
    if (jump) {
      jumpToScreen(jump.dataset.jump);
      return;
    }

    const adminTab = event.target.closest("[data-admin-tab]");
    if (adminTab) {
      activateAdminPanel(adminTab.dataset.adminTab);
      return;
    }

    if (event.target.closest("[data-open-review]")) {
      document.querySelector("#reviewModal").classList.remove("hidden");
      return;
    }

    if (event.target.closest(".close-modal")) {
      document.querySelector("#reviewModal").classList.add("hidden");
    }
  });

  document.querySelector("#searchButton").addEventListener("click", filterTeachers);
  searchInput.addEventListener("input", filterTeachers);
  document.querySelector("#studioSearchButton").addEventListener("click", filterStudios);
  studioSearchInput.addEventListener("input", filterStudios);

  document.querySelectorAll(".filter").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll(".filter").forEach((item) => item.classList.remove("active"));
      button.classList.add("active");
      const filter = button.dataset.filter;
      if (filter === "all") renderTeachers();
      else renderTeachers(teachers.filter((teacher) => `${teacher.city}${teacher.status}`.includes(filter)));
    });
  });

  document.querySelectorAll(".studio-filter").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll(".studio-filter").forEach((item) => item.classList.remove("active"));
      button.classList.add("active");
      const filter = button.dataset.studioFilter;
      if (filter === "all") renderStudios();
      else renderStudios(studios.filter((studio) => `${studio.city}${studio.status}`.includes(filter)));
    });
  });

  window.addEventListener("resize", drawTrendChart);
}

renderTeachers();
renderStudios();
renderTeacherRows();
renderStudioRows();
bindEvents();
drawTrendChart();
