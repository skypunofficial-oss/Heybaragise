// =========================================================
// HEYBARAGISE APP
// Supabase + Admin + Products + Packages + Combo
// Social Links + Background/Theme + Recommended
// =========================================================

const SUPABASE_URL = "https://amrdtfwlmkkgtsozhupi.supabase.co";
const SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_oLIc9gwzec-BwJgSwhJncw_8yucB6Wu";

const sb = supabase.createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  }
);

const state = {
  products: [],
  promotions: [],
  combos: [],
  recommended: [],
  socialLinks: [],
  settings: null,
  adminProducts: [],
  adminPromotions: [],
  adminCombos: [],
  adminRecommended: [],
  adminSocialLinks: [],
  selectedProduct: null,
  isAdmin: false
};

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

const DEFAULT_THEME = {
  background_image: null,
  accent_color: "#9ed8f5",
  secondary_color: "#f6b6d1"
};

$("#year") && ($("#year").textContent = new Date().getFullYear());

function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  }[char]));
}

/*
  Dynamic text helper:
  Thai stays LKKaohom.
  Latin / English / numbers use OngleipYuntaeng.
  This avoids forcing one font on every script.
*/
function mixedText(value = "") {
  const safe = escapeHtml(value);
  return safe.replace(
    /([A-Za-zÀ-ÿ0-9가-힣ㄱ-ㅎㅏ-ㅣ][A-Za-zÀ-ÿ0-9가-힣ㄱ-ㅎㅏ-ㅣ\s.,!?'"&+\-_/:%#()]*[A-Za-zÀ-ÿ0-9가-힣ㄱ-ㅎㅏ-ㅣ])/g,
    '<span class="font-en">$1</span>'
  );
}

function money(value) {
  return Number(value || 0).toLocaleString("th-TH", {
    maximumFractionDigits: 2
  });
}

function toast(message) {
  const target = $("#toast");
  if (!target) return;

  target.textContent = message;
  target.classList.add("show");

  clearTimeout(window.__toastTimer);
  window.__toastTimer = setTimeout(() => {
    target.classList.remove("show");
  }, 2600);
}

function showView(id) {
  const target = $("#" + id + "View");
  if (!target) return;

  $$(".view").forEach((view) => {
    view.classList.remove("active");
    view.hidden = true;
  });

  target.hidden = false;
  target.classList.add("active");

  const footer = $("#siteFooter");
  if (footer) footer.hidden = id === "admin";

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}

function openDialog(id) {
  const dialog = $("#" + id);
  if (!dialog) return;

  if (typeof dialog.showModal === "function") {
    dialog.showModal();
  }
}

function closeDialog(id) {
  const dialog = $("#" + id);
  if (!dialog) return;

  if (dialog.open) dialog.close();
}

function isValidExternalUrl(url) {
  if (!url) return true;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

// =========================================================
// CUSTOMER DATA
// =========================================================

async function loadAll() {
  const [productsResult, promotionsResult, combosResult] =
    await Promise.all([
      sb
        .from("products")
        .select("*, packages(*)")
        .eq("active", true)
        .order("sort_order"),

      sb
        .from("promotions")
        .select("*, products(name,icon)")
        .eq("active", true)
        .order("created_at", { ascending: false }),

      sb
        .from("combos")
        .select("*, combo_items(product_id, products(id,name,icon))")
        .eq("active", true)
        .order("created_at", { ascending: false })
    ]);

  if (productsResult.error) console.error("Products:", productsResult.error);
  if (promotionsResult.error) console.error("Promotions:", promotionsResult.error);
  if (combosResult.error) console.error("Combos:", combosResult.error);

  state.products = productsResult.data || [];
  state.promotions = promotionsResult.data || [];
  state.combos = combosResult.data || [];

  renderProducts();
  renderPromotions();
}

function renderProducts(list = state.products) {
  const grid = $("#productGrid");
  if (!grid) return;

  if (!list.length) {
    grid.innerHTML = `<div class="empty">ยังไม่มีสินค้า</div>`;
    return;
  }

  grid.innerHTML = list.map((product) => `
    <article class="product-card glass" data-id="${escapeHtml(product.id)}">
      ${
        product.image_url
          ? `<img class="product-image"
                   src="${escapeHtml(product.image_url)}"
                   alt="${escapeHtml(product.name)}"
                   loading="lazy">`
          : ""
      }

      <div class="card-body">
        <div class="product-icon">${escapeHtml(product.icon || "📱")}</div>
        <h3>${mixedText(product.name)}</h3>
        <p>${mixedText(product.short_description || "")}</p>
        <span class="arrow">→</span>
      </div>
    </article>
  `).join("");

  $$("#productGrid .product-card").forEach((card) => {
    card.addEventListener("click", () => openProduct(card.dataset.id));
  });
}

function renderPromotions() {
  const grid = $("#promotionGrid");
  if (!grid) return;

  const promotions = state.promotions.filter(
    (item) => (item.category || "promotion") === "promotion"
  );

  const promoHtml = promotions.map((item) => `
    <article class="promo-card glass">
      ${
        item.image_url
          ? `<img class="promo-image"
                   src="${escapeHtml(item.image_url)}"
                   alt="${escapeHtml(item.title)}"
                   loading="lazy">`
          : ""
      }
      <div class="card-body">
        <span class="badge">
          ${escapeHtml(item.products?.icon || "🎁")}
          ${mixedText(item.products?.name || "โปรโมชั่น")}
        </span>
        <h3>${mixedText(item.title)}</h3>
        <p>${mixedText(item.description || "")}</p>
        ${
          item.external_url
            ? `<a class="external-link"
                  href="${escapeHtml(item.external_url)}"
                  target="_blank"
                  rel="noopener noreferrer">ดูเพิ่มเติม ↗</a>`
            : ""
        }
      </div>
    </article>
  `).join("");

  const comboHtml = state.combos.map((combo) => `
    <article class="promo-card glass">
      <div class="card-body">
        <span class="badge">🤝 Combo Deal</span>
        <h3>${mixedText(combo.name)}</h3>
        <p>${mixedText(combo.description || "")}</p>
        <p>
          ${(combo.combo_items || []).map((item) =>
            `${escapeHtml(item.products?.icon || "📱")} ${mixedText(item.products?.name || "")}`
          ).join(" + ")}
        </p>
        ${
          combo.original_price
            ? `<span class="price-old">฿${money(combo.original_price)}</span>`
            : ""
        }
        <div class="price-sale">฿${money(combo.sale_price)}</div>
        ${
          combo.external_url
            ? `<a class="external-link"
                  href="${escapeHtml(combo.external_url)}"
                  target="_blank"
                  rel="noopener noreferrer">รับโปรโมชั่น ↗</a>`
            : ""
        }
      </div>
    </article>
  `).join("");

  grid.innerHTML =
    (promoHtml + comboHtml) ||
    `<div class="empty">ยังไม่มีโปรโมชั่น</div>`;
}

function openProduct(id) {
  const product = state.products.find((item) => item.id === id);
  if (!product) return;

  state.selectedProduct = product;

  const packages = (product.packages || []).map((item) => `
    <div class="package">
      <span>${mixedText(item.name)}</span>
      <b>฿${money(item.price)}</b>
    </div>
  `).join("") || "<p>สอบถามราคาเพิ่มเติมได้</p>";

  const relatedPromotions = state.promotions.filter(
    (item) =>
      item.product_id === product.id &&
      (item.category || "promotion") === "promotion"
  );

  const relatedRecommended = state.recommended.filter(
    (item) => item.product_id === product.id
  );

  $("#productDetail").innerHTML = `
    <div class="detail-hero glass">
      <div class="detail-top">
        ${
          product.image_url
            ? `<img class="detail-image"
                    src="${escapeHtml(product.image_url)}"
                    alt="${escapeHtml(product.name)}">`
            : `<div class="detail-icon">${escapeHtml(product.icon || "📱")}</div>`
        }

        <div>
          <span class="badge">Premium App</span>
          <h1>${mixedText(product.name)}</h1>
          <p class="detail-description">
            ${mixedText(product.description || product.short_description || "")}
          </p>
        </div>
      </div>
    </div>

    <div class="detail-grid">
      <section class="info-card glass">
        <h2>💳 ราคาแพ็กเกจ</h2>
        ${packages}
      </section>

      <section class="info-card glass">
        <h2>🎁 โปรโมชั่น</h2>
        ${
          relatedPromotions.length
            ? relatedPromotions.map((item) => `
                <div class="package">
                  <span>${mixedText(item.title)}</span>
                </div>
              `).join("")
            : "<p>ยังไม่มีโปรโมชั่น</p>"
        }
      </section>

      <section class="info-card glass">
        <h2>🎬 น่าดู / แนะนำ</h2>
        ${
          relatedRecommended.length
            ? relatedRecommended.map((item) => `
                <div class="package">
                  <span>${mixedText(item.title)}</span>
                </div>
              `).join("")
            : "<p>ยังไม่มีรายการแนะนำ</p>"
        }
      </section>
    </div>

    ${
      product.external_url
        ? `<p style="margin-top:18px">
             <a class="external-link"
                href="${escapeHtml(product.external_url)}"
                target="_blank"
                rel="noopener noreferrer">
               ไปยังลิงก์ภายนอก / สั่งซื้อ ↗
             </a>
           </p>`
        : ""
    }
  `;

  showView("detail");
}

// =========================================================
// RECOMMENDED
// =========================================================

async function loadRecommended() {
  const result = await sb
    .from("promotions")
    .select("*, products(name,icon)")
    .eq("active", true)
    .eq("category", "recommended")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  if (result.error) {
    console.error("Recommended:", result.error);
    state.recommended = [];
  } else {
    state.recommended = result.data || [];
  }

  renderRecommended();
}

function renderRecommended() {
  const section = $("#recommendedSection");
  const grid = $("#recommendedGrid");

  if (!section || !grid) return;

  if (!state.recommended.length) {
    section.hidden = true;
    grid.innerHTML = "";
    return;
  }

  section.hidden = false;

  grid.innerHTML = state.recommended.map((item) => `
    <article class="recommendation-card glass">
      ${
        item.image_url
          ? `<img class="recommendation-image"
                  src="${escapeHtml(item.image_url)}"
                  alt="${escapeHtml(item.title)}"
                  loading="lazy">`
          : ""
      }

      <div class="card-body">
        <span class="badge">
          🎬 ${mixedText(item.products?.name || item.platform || "แนะนำ")}
        </span>
        <h3>${mixedText(item.title)}</h3>
        <p>${mixedText(item.description || "")}</p>

        ${
          item.external_url
            ? `<a class="external-link"
                  href="${escapeHtml(item.external_url)}"
                  target="_blank"
                  rel="noopener noreferrer">
                ดูเพิ่มเติม ↗
              </a>`
            : ""
        }
      </div>
    </article>
  `).join("");
}

// =========================================================
// SOCIAL LINKS
// =========================================================

async function loadSocialLinks() {
  const result = await sb
    .from("social_links")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (result.error) {
    console.error("Social links:", result.error);
    state.socialLinks = [];
    renderSocialLinks([]);
    return;
  }

  state.socialLinks = result.data || [];
  renderSocialLinks(state.socialLinks);
}

function renderSocialLinks(items) {
  const container = $("#socialLinks");
  const contactGrid = $("#contactGrid");

  if (container) {
    container.innerHTML = items.map((item) => `
      <a
        class="social-link"
        href="${escapeHtml(item.external_url)}"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="${escapeHtml(item.name)}"
        title="${escapeHtml(item.name)}"
      >
        ${
          item.icon_url
            ? `<img src="${escapeHtml(item.icon_url)}"
                    alt="${escapeHtml(item.name)}">`
            : `<span>${escapeHtml(item.name.slice(0, 1))}</span>`
        }
      </a>
    `).join("");
  }

  if (contactGrid) {
    contactGrid.innerHTML = items.map((item) => `
      <a
        class="contact-link"
        href="${escapeHtml(item.external_url)}"
        target="_blank"
        rel="noopener noreferrer"
      >
        ${
          item.icon_url
            ? `<img src="${escapeHtml(item.icon_url)}"
                    alt="${escapeHtml(item.name)}">`
            : ""
        }
        <span>${mixedText(item.name)}</span>
      </a>
    `).join("") || `<div class="empty">ยังไม่มีช่องทางติดต่อ</div>`;
  }
}

// =========================================================
// SITE SETTINGS / BACKGROUND
// =========================================================

async function loadSiteSettings() {
  const result = await sb
    .from("site_settings")
    .select("*")
    .eq("id", 1)
    .maybeSingle();

  if (result.error) {
    console.error("Site settings:", result.error);
    applySiteTheme(DEFAULT_THEME);
    return;
  }

  state.settings = result.data || DEFAULT_THEME;
  applySiteTheme(state.settings);
}

function applySiteTheme(settings = DEFAULT_THEME) {
  const root = document.documentElement;

  const accent = settings.accent_color || DEFAULT_THEME.accent_color;
  const secondary =
    settings.secondary_color || DEFAULT_THEME.secondary_color;

  root.style.setProperty("--accent-color", accent);
  root.style.setProperty("--secondary-color", secondary);

  if (settings.background_image) {
    document.body.style.backgroundImage =
      `url("${settings.background_image}")`;
  } else {
    document.body.style.backgroundImage = "";
  }

  const preview = $("#backgroundPreview");
  if (preview) {
    if (settings.background_image) {
      preview.style.backgroundImage =
        `url("${settings.background_image}")`;
      preview.innerHTML = "";
    } else {
      preview.style.backgroundImage =
        "linear-gradient(135deg,#dff6ff,#f2e5ff,#ffe5f1)";
      preview.innerHTML = "<span>ยังไม่มีรูปพื้นหลัง</span>";
    }
  }

  const accentInput = $("#accentColor");
  const secondaryInput = $("#secondaryColor");

  if (accentInput) accentInput.value = accent;
  if (secondaryInput) secondaryInput.value = secondary;
}

async function saveTheme() {
  const file = $("#backgroundFile")?.files?.[0];
  const accent = $("#accentColor")?.value || DEFAULT_THEME.accent_color;
  const secondary =
    $("#secondaryColor")?.value || DEFAULT_THEME.secondary_color;

  try {
    let backgroundUrl = state.settings?.background_image || null;

    if (file) {
      backgroundUrl = await uploadImage(file, "background");
    }

    const payload = {
      id: 1,
      background_image: backgroundUrl,
      accent_color: accent,
      secondary_color: secondary,
      updated_at: new Date().toISOString()
    };

    const result = await sb
      .from("site_settings")
      .upsert(payload, { onConflict: "id" });

    if (result.error) throw result.error;

    state.settings = payload;
    applySiteTheme(payload);

    $("#backgroundFile").value = "";
    toast("บันทึกพื้นหลังและธีมแล้ว");
  } catch (error) {
    console.error(error);
    toast(error.message || "บันทึกธีมไม่สำเร็จ");
  }
}

async function removeBackground() {
  if (!confirm("ลบรูปพื้นหลังและกลับธีมเริ่มต้นหรือไม่?")) return;

  const payload = {
    id: 1,
    background_image: null,
    accent_color: DEFAULT_THEME.accent_color,
    secondary_color: DEFAULT_THEME.secondary_color,
    updated_at: new Date().toISOString()
  };

  const result = await sb
    .from("site_settings")
    .upsert(payload, { onConflict: "id" });

  if (result.error) {
    toast(result.error.message);
    return;
  }

  state.settings = payload;
  applySiteTheme(payload);
  toast("กลับสู่ธีมเริ่มต้นแล้ว");
}

// =========================================================
// NAVIGATION / SEARCH / HIDDEN ADMIN
// =========================================================

const searchInput = $("#search");

if (searchInput) {
  searchInput.addEventListener("input", (event) => {
    const query = event.target.value.toLowerCase().trim();

    renderProducts(
      state.products.filter((product) =>
        `${product.name || ""} ${product.short_description || ""}`
          .toLowerCase()
          .includes(query)
      )
    );
  });
}

$$("[data-view]").forEach((button) => {
  button.addEventListener("click", () => {
    showView(button.dataset.view);
  });
});

$$(".close").forEach((button) => {
  button.addEventListener("click", () => {
    closeDialog(button.dataset.close);
  });
});

let brandClicks = 0;
let brandTimer = null;

const brandButton = $("#brand");

if (brandButton) {
  brandButton.addEventListener("click", async () => {
    brandClicks += 1;

    clearTimeout(brandTimer);
    brandTimer = setTimeout(() => {
      brandClicks = 0;
    }, 1800);

    if (brandClicks < 5) return;

    brandClicks = 0;

    const { data } = await sb.auth.getSession();

    if (data?.session) {
      await enterAdmin();
    } else {
      openDialog("authDialog");
    }
  });
}

// =========================================================
// AUTH / ADMIN
// =========================================================

const loginForm = $("#loginForm");

if (loginForm) {
  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = $("#loginEmail")?.value?.trim();
    const password = $("#loginPassword")?.value || "";

    const result = await sb.auth.signInWithPassword({
      email,
      password
    });

    if (result.error) {
      toast(result.error.message);
      return;
    }

    closeDialog("authDialog");
    await enterAdmin();
  });
}

async function enterAdmin() {
  const { data: sessionData } = await sb.auth.getSession();
  const session = sessionData?.session;

  if (!session) {
    openDialog("authDialog");
    return;
  }

  const result = await sb
    .from("admin_users")
    .select("user_id")
    .eq("user_id", session.user.id)
    .maybeSingle();

  if (result.error || !result.data) {
    await sb.auth.signOut();
    toast("บัญชีนี้ไม่มีสิทธิ์ Admin");
    return;
  }

  state.isAdmin = true;
  await loadAdminData();
  showView("admin");
}

const logoutButton = $("#logoutBtn");

if (logoutButton) {
  logoutButton.addEventListener("click", async () => {
    await sb.auth.signOut();
    state.isAdmin = false;
    showView("home");
    toast("ออกจากระบบแล้ว");
  });
}

const previewButton = $("#previewStoreBtn");

if (previewButton) {
  previewButton.addEventListener("click", () => {
    showView("home");
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
}

// =========================================================
// ADMIN TABS
// =========================================================

$$(".tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    $$(".tab").forEach((item) => item.classList.remove("active"));
    tab.classList.add("active");

    $$(".admin-panel").forEach((panel) => panel.classList.remove("active"));

    const panelId =
      "admin" +
      tab.dataset.adminTab.charAt(0).toUpperCase() +
      tab.dataset.adminTab.slice(1);

    const panel = $("#" + panelId);
    if (panel) panel.classList.add("active");
  });
});

// =========================================================
// ADMIN DATA
// =========================================================

async function loadAdminData() {
  const [products, promotions, combos, recommended, social] =
    await Promise.all([
      sb.from("products")
        .select("*, packages(*)")
        .order("sort_order"),

      sb.from("promotions")
        .select("*")
        .order("created_at", { ascending: false }),

      sb.from("combos")
        .select("*, combo_items(product_id)")
        .order("created_at", { ascending: false }),

      sb.from("promotions")
        .select("*")
        .eq("category", "recommended")
        .order("sort_order", { ascending: true }),

      sb.from("social_links")
        .select("*")
        .order("sort_order", { ascending: true })
    ]);

  if (products.error) console.error(products.error);
  if (promotions.error) console.error(promotions.error);
  if (combos.error) console.error(combos.error);
  if (recommended.error) console.error(recommended.error);
  if (social.error) console.error(social.error);

  state.adminProducts = products.data || [];
  state.adminPromotions = (promotions.data || []).filter(
    (item) => (item.category || "promotion") === "promotion"
  );
  state.adminCombos = combos.data || [];
  state.adminRecommended = recommended.data || [];
  state.adminSocialLinks = social.data || [];

  renderAdmin();
  renderAdminRecommended();
  renderAdminSocial();
  applySiteTheme(state.settings || DEFAULT_THEME);
}

function adminRow(title, active, editAction, deleteAction, extra = "") {
  return `
    <div class="admin-row glass">
      <div>
        <b>${title}</b>
        <p>${active ? "🟢 แสดง" : "⚪ ซ่อน"} ${extra}</p>
      </div>

      <div class="admin-actions">
        <button type="button" class="small"
                onclick="${editAction}">
          ✏️ แก้ไข
        </button>

        <button type="button" class="small danger"
                onclick="${deleteAction}">
          🗑️ ลบ
        </button>
      </div>
    </div>
  `;
}

function renderAdmin() {
  const productList = $("#adminProductList");
  const promoList = $("#adminPromoList");
  const comboList = $("#adminComboList");

  if (productList) {
    const sortedProducts = [...state.adminProducts].sort((a, b) => {
      const ao = Number(a.sort_order ?? 0);
      const bo = Number(b.sort_order ?? 0);
      if (ao !== bo) return ao - bo;
      return String(a.name || "").localeCompare(String(b.name || ""), "th");
    });

    productList.innerHTML =
      sortedProducts.map((product, index) =>
        adminRow(
          `${escapeHtml(product.icon || "📱")} ${mixedText(product.name)}`,
          product.active,
          `editProduct('${product.id}')`,
          `deleteProduct('${product.id}')`,
          `• ลำดับ ${index + 1}`
        )
      ).join("") || `<div class="empty">ไม่มีสินค้า</div>`;
  }

  if (promoList) {
    promoList.innerHTML =
      state.adminPromotions.map((promo) =>
        adminRow(
          `🎁 ${mixedText(promo.title)}`,
          promo.active,
          `editPromo('${promo.id}')`,
          `deletePromo('${promo.id}')`
        )
      ).join("") || `<div class="empty">ไม่มีโปรโมชั่น</div>`;
  }

  if (comboList) {
    comboList.innerHTML =
      state.adminCombos.map((combo) =>
        adminRow(
          `🤝 ${mixedText(combo.name)} — ฿${money(combo.sale_price)}`,
          combo.active,
          `editCombo('${combo.id}')`,
          `deleteCombo('${combo.id}')`
        )
      ).join("") || `<div class="empty">ไม่มี Combo</div>`;
  }
}

// =========================================================
// STORAGE
// =========================================================

async function uploadImage(file, folder = "images") {
  if (!file) return null;

  const extension =
    file.name.split(".").pop()?.toLowerCase() || "jpg";

  const path =
    `${folder}/${crypto.randomUUID()}.${extension}`;

  const result = await sb.storage
    .from("media")
    .upload(path, file, {
      upsert: false,
      contentType: file.type || undefined
    });

  if (result.error) throw result.error;

  return sb.storage
    .from("media")
    .getPublicUrl(path)
    .data
    .publicUrl;
}

// =========================================================
// PRODUCT CRUD
// =========================================================

const addProductButton = $("#addProductBtn");

if (addProductButton) {
  addProductButton.addEventListener("click", () => {
    resetProductForm();
    openDialog("productDialog");
  });
}

function packageRow(data = { name: "", price: "" }) {
  const wrapper = document.createElement("div");
  wrapper.className = "package-row";

  wrapper.innerHTML = `
    <input class="pkg-name"
           placeholder="ชื่อแพ็กเกจ"
           value="${escapeHtml(data.name || "")}">

    <input class="pkg-price"
           type="number"
           min="0"
           step="0.01"
           placeholder="ราคา"
           value="${escapeHtml(data.price ?? "")}">

    <button type="button" class="small danger">×</button>
  `;

  wrapper.querySelector("button").addEventListener("click", () => {
    wrapper.remove();
  });

  $("#packageRows")?.appendChild(wrapper);
}

$("#addPackageRow")?.addEventListener("click", () => packageRow());

function resetProductForm() {
  $("#productForm")?.reset();

  if ($("#productId")) $("#productId").value = "";
  if ($("#packageRows")) $("#packageRows").innerHTML = "";
  if ($("#pCurrentImage")) $("#pCurrentImage").hidden = true;

  const nextOrder = state.adminProducts.length + 1;
  if ($("#pSortOrder")) $("#pSortOrder").value = nextOrder;

  packageRow();
  if ($("#productFormTitle")) $("#productFormTitle").textContent = "เพิ่มสินค้า";
}

window.editProduct = (id) => {
  const product = state.adminProducts.find((item) => item.id === id);
  if (!product) return;

  resetProductForm();

  $("#productId").value = product.id;
  $("#pName").value = product.name || "";
  $("#pIcon").value = product.icon || "";
  $("#pShort").value = product.short_description || "";
  $("#pDescription").value = product.description || "";
  $("#pLink").value = product.external_url || "";
  $("#pActive").checked = !!product.active;

  const sortedForPosition = [...state.adminProducts].sort((a, b) => {
    const ao = Number(a.sort_order ?? 0);
    const bo = Number(b.sort_order ?? 0);
    if (ao !== bo) return ao - bo;
    return String(a.name || "").localeCompare(String(b.name || ""), "th");
  });
  const currentPosition = sortedForPosition.findIndex((item) => item.id === product.id) + 1;
  $("#pSortOrder").value = currentPosition > 0 ? currentPosition : 1;

  if ($("#pCurrentImage")) {
    $("#pCurrentImage").hidden = !product.image_url;
  }

  $("#packageRows").innerHTML = "";
  (product.packages || []).forEach(packageRow);

  $("#productFormTitle").textContent = "แก้ไขสินค้า";
  openDialog("productDialog");
};

$("#productForm")?.addEventListener("submit", async (event) => {
  event.preventDefault();

  try {
    const id = $("#productId").value;
    const file = $("#pImage").files[0];
    const currentProduct = id
      ? state.adminProducts.find((item) => item.id === id)
      : null;

    let imageUrl = null;

    if (file) {
      imageUrl = await uploadImage(file, "products");
    }

    const requestedOrder = Math.max(
      1,
      Number($("#pSortOrder").value || state.adminProducts.length + 1)
    );

    const payload = {
      name: $("#pName").value.trim(),
      icon: $("#pIcon").value.trim(),
      short_description: $("#pShort").value.trim(),
      description: $("#pDescription").value,
      external_url: $("#pLink").value.trim() || null,
      active: $("#pActive").checked
    };

    if (!isValidExternalUrl(payload.external_url)) {
      throw new Error("ลิงก์สินค้าต้องเป็น http:// หรือ https://");
    }

    // If no new image is selected while editing, image_url is intentionally
    // omitted so Supabase keeps the existing image URL.
    if (imageUrl) payload.image_url = imageUrl;

    let productId = id;

    if (id) {
      const result = await sb
        .from("products")
        .update(payload)
        .eq("id", id);

      if (result.error) throw result.error;

      await sb.from("packages").delete().eq("product_id", id);
    } else {
      // Insert at a temporary order first. This avoids collisions with existing
      // sort_order values before we normalize the final positions.
      const maxExistingOrder = Math.max(
        0,
        ...state.adminProducts.map((item) => Number(item.sort_order || 0))
      );
      const temporaryOrder = maxExistingOrder + state.adminProducts.length + 1000;

      const result = await sb
        .from("products")
        .insert({ ...payload, sort_order: temporaryOrder })
        .select()
        .single();

      if (result.error) throw result.error;

      productId = result.data.id;
    }

    await setProductOrder(productId, requestedOrder);

    const packages = $$(".package-row")
      .map((row) => ({
        product_id: productId,
        name: row.querySelector(".pkg-name").value.trim(),
        price: Number(row.querySelector(".pkg-price").value || 0)
      }))
      .filter((item) => item.name);

    if (packages.length) {
      const result = await sb.from("packages").insert(packages);
      if (result.error) throw result.error;
    }

    closeDialog("productDialog");
    await refreshAll();
    toast("บันทึกสินค้าแล้ว");
  } catch (error) {
    console.error(error);
    toast(error.message || "บันทึกสินค้าไม่สำเร็จ");
  }
});

async function setProductOrder(productId, requestedPosition) {
  const result = await sb
    .from("products")
    .select("id, sort_order, created_at")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (result.error) throw result.error;

  const items = [...(result.data || [])];
  const currentIndex = items.findIndex((item) => item.id === productId);
  if (currentIndex < 0) return;

  const [current] = items.splice(currentIndex, 1);
  const targetIndex = Math.min(
    Math.max(Number(requestedPosition || 1) - 1, 0),
    items.length
  );
  items.splice(targetIndex, 0, current);

  // Phase 1: move every row to unique temporary values above the current max.
  // This works even when sort_order has a UNIQUE constraint and prevents
  // duplicate-key errors while swapping positions.
  const maxOrder = Math.max(0, ...items.map((item) => Number(item.sort_order || 0)));
  const tempBase = maxOrder + items.length + 1000;

  for (let index = 0; index < items.length; index += 1) {
    const tempResult = await sb
      .from("products")
      .update({ sort_order: tempBase + index })
      .eq("id", items[index].id);
    if (tempResult.error) throw tempResult.error;
  }

  // Phase 2: normalize to 1,2,3,...
  for (let index = 0; index < items.length; index += 1) {
    const finalResult = await sb
      .from("products")
      .update({ sort_order: index + 1 })
      .eq("id", items[index].id);
    if (finalResult.error) throw finalResult.error;
  }
}

window.deleteProduct = async (id) => {
  if (!confirm("ลบสินค้านี้?")) return;

  const result = await sb
    .from("products")
    .delete()
    .eq("id", id);

  if (result.error) {
    toast(result.error.message);
    return;
  }

  // Close gaps so the remaining products keep a clean 1,2,3... order.
  const remaining = await sb
    .from("products")
    .select("id")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (!remaining.error) {
    for (let index = 0; index < (remaining.data || []).length; index += 1) {
      await sb.from("products").update({ sort_order: index + 1 }).eq("id", remaining.data[index].id);
    }
  }

  await refreshAll();
  toast("ลบสินค้าแล้ว");
};

// =========================================================
// PROMOTION CRUD
// =========================================================

$("#addPromoBtn")?.addEventListener("click", () => {
  resetPromoForm();
  openDialog("promoDialog");
});

function fillProductSelects() {
  const options = state.adminProducts.map((product) => `
    <option value="${escapeHtml(product.id)}">
      ${escapeHtml(product.icon || "📱")} ${escapeHtml(product.name)}
    </option>
  `).join("");

  if ($("#promoProduct")) $("#promoProduct").innerHTML = options;
  if ($("#comboProducts")) $("#comboProducts").innerHTML = options;
}

function resetPromoForm() {
  $("#promoForm")?.reset();
  $("#promoId").value = "";
  fillProductSelects();
  $("#promoFormTitle").textContent = "เพิ่มโปรโมชั่น";
}

window.editPromo = (id) => {
  const promo = state.adminPromotions.find((item) => item.id === id);
  if (!promo) return;

  resetPromoForm();

  $("#promoId").value = promo.id;
  $("#promoProduct").value = promo.product_id || "";
  $("#promoTitle").value = promo.title || "";
  $("#promoDescription").value = promo.description || "";
  $("#promoLink").value = promo.external_url || "";
  $("#promoActive").checked = !!promo.active;

  $("#promoFormTitle").textContent = "แก้ไขโปรโมชั่น";
  openDialog("promoDialog");
};

$("#promoForm")?.addEventListener("submit", async (event) => {
  event.preventDefault();

  try {
    const id = $("#promoId").value;
    const file = $("#promoImage").files[0];

    let imageUrl = null;

    if (file) imageUrl = await uploadImage(file, "posters");

    const payload = {
      product_id: $("#promoProduct").value || null,
      title: $("#promoTitle").value.trim(),
      description: $("#promoDescription").value,
      external_url: $("#promoLink").value.trim() || null,
      active: $("#promoActive").checked,
      category: "promotion"
    };

    if (!isValidExternalUrl(payload.external_url)) {
      throw new Error("ลิงก์โปรโมชั่นต้องเป็น http:// หรือ https://");
    }

    if (imageUrl) payload.image_url = imageUrl;

    const result = id
      ? await sb.from("promotions").update(payload).eq("id", id)
      : await sb.from("promotions").insert(payload);

    if (result.error) throw result.error;

    closeDialog("promoDialog");
    await refreshAll();
    toast("บันทึกโปรโมชั่นแล้ว");
  } catch (error) {
    console.error(error);
    toast(error.message || "บันทึกโปรโมชั่นไม่สำเร็จ");
  }
});

window.deletePromo = async (id) => {
  if (!confirm("ลบโปรโมชั่น?")) return;

  const result = await sb
    .from("promotions")
    .delete()
    .eq("id", id);

  if (result.error) {
    toast(result.error.message);
    return;
  }

  await refreshAll();
  toast("ลบโปรโมชั่นแล้ว");
};

// =========================================================
// COMBO CRUD
// =========================================================

$("#addComboBtn")?.addEventListener("click", () => {
  resetComboForm();
  openDialog("comboDialog");
});

function resetComboForm() {
  $("#comboForm")?.reset();
  $("#comboId").value = "";
  fillProductSelects();
  $("#comboFormTitle").textContent = "สร้าง Combo ลดราคา";
}

window.editCombo = (id) => {
  const combo = state.adminCombos.find((item) => item.id === id);
  if (!combo) return;

  resetComboForm();

  $("#comboId").value = combo.id;
  $("#comboName").value = combo.name || "";
  $("#comboDescription").value = combo.description || "";
  $("#comboOriginalPrice").value = combo.original_price || "";
  $("#comboSalePrice").value = combo.sale_price || "";
  $("#comboLink").value = combo.external_url || "";
  $("#comboActive").checked = !!combo.active;

  (combo.combo_items || []).forEach((item) => {
    const option = [...$("#comboProducts").options]
      .find((opt) => opt.value === item.product_id);

    if (option) option.selected = true;
  });

  $("#comboFormTitle").textContent = "แก้ไข Combo";
  openDialog("comboDialog");
};

$("#comboForm")?.addEventListener("submit", async (event) => {
  event.preventDefault();

  try {
    const id = $("#comboId").value;

    const selected = [
      ...$("#comboProducts").selectedOptions
    ].map((option) => option.value);

    if (selected.length < 2) {
      throw new Error("เลือกสินค้าอย่างน้อย 2 รายการ");
    }

    const payload = {
      name: $("#comboName").value.trim(),
      description: $("#comboDescription").value,
      original_price: Number($("#comboOriginalPrice").value || 0),
      sale_price: Number($("#comboSalePrice").value || 0),
      external_url: $("#comboLink").value.trim() || null,
      active: $("#comboActive").checked
    };

    if (!isValidExternalUrl(payload.external_url)) {
      throw new Error("ลิงก์ Combo ต้องเป็น http:// หรือ https://");
    }

    let comboId = id;

    if (id) {
      const result = await sb
        .from("combos")
        .update(payload)
        .eq("id", id);

      if (result.error) throw result.error;

      await sb.from("combo_items").delete().eq("combo_id", id);
    } else {
      const result = await sb
        .from("combos")
        .insert(payload)
        .select()
        .single();

      if (result.error) throw result.error;

      comboId = result.data.id;
    }

    const result = await sb.from("combo_items").insert(
      selected.map((productId) => ({
        combo_id: comboId,
        product_id: productId
      }))
    );

    if (result.error) throw result.error;

    closeDialog("comboDialog");
    await refreshAll();
    toast("บันทึก Combo แล้ว");
  } catch (error) {
    console.error(error);
    toast(error.message || "บันทึก Combo ไม่สำเร็จ");
  }
});

window.deleteCombo = async (id) => {
  if (!confirm("ลบ Combo?")) return;

  const result = await sb
    .from("combos")
    .delete()
    .eq("id", id);

  if (result.error) {
    toast(result.error.message);
    return;
  }

  await refreshAll();
  toast("ลบ Combo แล้ว");
};

// =========================================================
// RECOMMENDED CRUD
// =========================================================

$("#addRecommendedBtn")?.addEventListener("click", () => {
  resetRecommendedForm();
  openDialog("recommendedDialog");
});

function resetRecommendedForm() {
  $("#recommendedForm")?.reset();
  $("#recommendedId").value = "";
  $("#recommendedSort").value = 0;
  $("#recommendedActive").checked = true;
  $("#recommendedFormTitle").textContent = "เพิ่มเรื่องแนะนำ";
}

function renderAdminRecommended() {
  const list = $("#adminRecommendedList");
  if (!list) return;

  list.innerHTML =
    state.adminRecommended.map((item) =>
      adminRow(
        `🎬 ${mixedText(item.title)}`,
        item.active,
        `editRecommended('${item.id}')`,
        `deleteRecommended('${item.id}')`,
        item.platform ? `• ${escapeHtml(item.platform)}` : ""
      )
    ).join("") ||
    `<div class="empty">ยังไม่มีเรื่องแนะนำ</div>`;
}

window.editRecommended = (id) => {
  const item = state.adminRecommended.find((entry) => entry.id === id);
  if (!item) return;

  resetRecommendedForm();

  $("#recommendedId").value = item.id;
  $("#recommendedTitle").value = item.title || "";
  $("#recommendedDescription").value = item.description || "";
  $("#recommendedPlatform").value = item.platform || "";
  $("#recommendedLink").value = item.external_url || "";
  $("#recommendedSort").value = item.sort_order || 0;
  $("#recommendedActive").checked = !!item.active;

  $("#recommendedFormTitle").textContent = "แก้ไขเรื่องแนะนำ";
  openDialog("recommendedDialog");
};

$("#recommendedForm")?.addEventListener("submit", async (event) => {
  event.preventDefault();

  try {
    const id = $("#recommendedId").value;
    const file = $("#recommendedImage").files[0];

    let imageUrl = null;

    if (file) imageUrl = await uploadImage(file, "recommendations");

    const payload = {
      product_id: null,
      title: $("#recommendedTitle").value.trim(),
      description: $("#recommendedDescription").value,
      platform: $("#recommendedPlatform").value.trim() || null,
      external_url: $("#recommendedLink").value.trim() || null,
      sort_order: Number($("#recommendedSort").value || 0),
      category: "recommended",
      active: $("#recommendedActive").checked
    };

    if (!isValidExternalUrl(payload.external_url)) {
      throw new Error("ลิงก์เรื่องแนะนำต้องเป็น http:// หรือ https://");
    }

    if (imageUrl) payload.image_url = imageUrl;

    const result = id
      ? await sb.from("promotions").update(payload).eq("id", id)
      : await sb.from("promotions").insert(payload);

    if (result.error) throw result.error;

    closeDialog("recommendedDialog");
    await refreshAll();
    toast("บันทึกเรื่องแนะนำแล้ว");
  } catch (error) {
    console.error(error);
    toast(error.message || "บันทึกเรื่องแนะนำไม่สำเร็จ");
  }
});

window.deleteRecommended = async (id) => {
  if (!confirm("ลบเรื่องแนะนำ?")) return;

  const result = await sb
    .from("promotions")
    .delete()
    .eq("id", id);

  if (result.error) {
    toast(result.error.message);
    return;
  }

  await refreshAll();
  toast("ลบเรื่องแนะนำแล้ว");
};

// =========================================================
// SOCIAL CRUD
// =========================================================

$("#addSocialBtn")?.addEventListener("click", () => {
  resetSocialForm();
  openDialog("socialDialog");
});

function resetSocialForm() {
  $("#socialForm")?.reset();
  $("#socialId").value = "";
  $("#socialSort").value = 0;
  $("#socialActive").checked = true;
  $("#socialFormTitle").textContent = "เพิ่มช่องทางติดต่อ";
}

function renderAdminSocial() {
  const list = $("#adminSocialList");
  if (!list) return;

  list.innerHTML =
    state.adminSocialLinks.map((item) =>
      adminRow(
        `${item.icon_url ? "🖼️" : "🔗"} ${mixedText(item.name)}`,
        item.is_active,
        `editSocial('${item.id}')`,
        `deleteSocial('${item.id}')`
      )
    ).join("") ||
    `<div class="empty">ยังไม่มีช่องทางติดต่อ</div>`;
}

window.editSocial = (id) => {
  const item = state.adminSocialLinks.find((entry) => entry.id === id);
  if (!item) return;

  resetSocialForm();

  $("#socialId").value = item.id;
  $("#socialName").value = item.name || "";
  $("#socialUrl").value = item.external_url || "";
  $("#socialSort").value = item.sort_order || 0;
  $("#socialActive").checked = !!item.is_active;

  $("#socialFormTitle").textContent = "แก้ไขช่องทางติดต่อ";
  openDialog("socialDialog");
};

$("#socialForm")?.addEventListener("submit", async (event) => {
  event.preventDefault();

  try {
    const id = $("#socialId").value;
    const file = $("#socialImage").files[0];

    let imageUrl = null;

    if (file) imageUrl = await uploadImage(file, "social");

    const payload = {
      name: $("#socialName").value.trim(),
      external_url: $("#socialUrl").value.trim(),
      sort_order: Number($("#socialSort").value || 0),
      is_active: $("#socialActive").checked
    };

    if (!isValidExternalUrl(payload.external_url)) {
      throw new Error("ลิงก์ติดต่อ ต้องเป็น http:// หรือ https://");
    }

    if (imageUrl) payload.icon_url = imageUrl;

    if (!id && !payload.icon_url) {
      throw new Error("กรุณาแนบรูปโลโก้ช่องทางติดต่อ");
    }

    const result = id
      ? await sb.from("social_links").update(payload).eq("id", id)
      : await sb.from("social_links").insert(payload);

    if (result.error) throw result.error;

    closeDialog("socialDialog");
    await refreshSocial();
    toast("บันทึกช่องทางติดต่อแล้ว");
  } catch (error) {
    console.error(error);
    toast(error.message || "บันทึกช่องทางติดต่อไม่สำเร็จ");
  }
});

window.deleteSocial = async (id) => {
  if (!confirm("ลบช่องทางติดต่อนี้?")) return;

  const result = await sb
    .from("social_links")
    .delete()
    .eq("id", id);

  if (result.error) {
    toast(result.error.message);
    return;
  }

  await refreshSocial();
  toast("ลบช่องทางติดต่อแล้ว");
};

async function refreshSocial() {
  await loadSocialLinks();

  if (state.isAdmin) {
    const result = await sb
      .from("social_links")
      .select("*")
      .order("sort_order", { ascending: true });

    state.adminSocialLinks = result.data || [];
    renderAdminSocial();
  }
}

// =========================================================
// REFRESH
// =========================================================

async function refreshAll() {
  await Promise.all([
    loadAll(),
    loadRecommended(),
    loadSocialLinks(),
    loadSiteSettings()
  ]);

  if (state.isAdmin) {
    await loadAdminData();
  }
}

// =========================================================
// START
// =========================================================

async function init() {
  // Always start in the customer storefront. Admin is opened only after
  // the hidden 5-click brand gesture and successful admin authorization.
  showView("home");

  try {
    await Promise.all([
      loadSiteSettings(),
      loadSocialLinks(),
      loadRecommended(),
      loadAll()
    ]);
  } catch (error) {
    console.error("Initial load:", error);
    toast("โหลดข้อมูลบางส่วนไม่สำเร็จ กรุณารีเฟรช");
  }
}

init();

