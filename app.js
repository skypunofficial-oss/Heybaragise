// ============================================================
// HEYBARAGISE PREMIUM STORE
// Supabase + Admin + Products + Promotions + Combo
// Social Links + Background/Theme + Admin Preview
// ============================================================
const SUPABASE_URL = "https://amrdtfwlmkkgtsozhupi.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_oLIc9gwzec-BwJgSwhJncw_8yucB6Wu";
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
});

const DEFAULT_THEME = { background_image: null, accent_color: "#9ed8f5", secondary_color: "#f6b6d1" };
const state = {
  products: [], promotions: [], combos: [], socialLinks: [], siteSettings: { ...DEFAULT_THEME },
  adminProducts: [], adminPromotions: [], adminCombos: [], adminSocialLinks: [],
  selectedProduct: null, isAdmin: false
};
const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];

function escapeHtml(v = "") { return String(v).replace(/[&<>"']/g, m => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m])); }
function money(v) { return Number(v || 0).toLocaleString("th-TH", { maximumFractionDigits: 2 }); }
function toast(msg) { const t = $("#toast"); if (!t) return; t.textContent = msg; t.classList.add("show"); clearTimeout(window.__toastTimer); window.__toastTimer = setTimeout(() => t.classList.remove("show"), 2600); }
function showView(id) {
  $$(".view").forEach(x => x.classList.remove("active"));
  const target = $("#" + id + "View"); if (!target) return;
  target.classList.add("active");
  const bar = $("#adminPreviewBar"); if (bar) bar.hidden = !(state.isAdmin && id !== "admin");
  window.scrollTo({ top: 0, behavior: "smooth" });
}
function openDialog(id) { const d = $("#" + id); if (d?.showModal) d.showModal(); }
function closeDialog(id) { const d = $("#" + id); if (d) d.close(); }
function missingTable(error) { return error && (error.code === "42P01" || /relation .* does not exist/i.test(error.message || "")); }

function applyTheme(settings = DEFAULT_THEME) {
  const root = document.documentElement;
  root.style.setProperty("--accent-color", settings.accent_color || DEFAULT_THEME.accent_color);
  root.style.setProperty("--secondary-color", settings.secondary_color || DEFAULT_THEME.secondary_color);
  document.body.style.backgroundImage = settings.background_image ? `url("${settings.background_image}")` : "";
  document.body.classList.toggle("has-custom-background", Boolean(settings.background_image));
  const meta = document.querySelector('meta[name="theme-color"]'); if (meta) meta.content = settings.accent_color || DEFAULT_THEME.accent_color;
}

async function loadSiteSettings() {
  try {
    const { data, error } = await sb.from("site_settings").select("*").eq("id", 1).maybeSingle();
    if (error) { if (!missingTable(error)) console.error(error); applyTheme(DEFAULT_THEME); return; }
    state.siteSettings = { ...DEFAULT_THEME, ...(data || {}) }; applyTheme(state.siteSettings); updateThemePreview();
  } catch (e) { console.error(e); applyTheme(DEFAULT_THEME); }
}

function socialFallback(name = "") {
  const n = name.toLowerCase();
  if (n.includes("instagram")) return "◎";
  if (n === "x" || n.includes("twitter")) return "𝕏";
  if (n.includes("line")) return "LINE";
  if (n.includes("facebook")) return "f";
  if (n.includes("tiktok")) return "♪";
  return "↗";
}
function socialMarkup(item) {
  const visual = item.icon_url ? `<img src="${escapeHtml(item.icon_url)}" alt="${escapeHtml(item.name)}" loading="lazy">` : `<span class="social-fallback">${escapeHtml(socialFallback(item.name))}</span>`;
  return `<a class="social-link" href="${escapeHtml(item.external_url)}" target="_blank" rel="noopener noreferrer" aria-label="${escapeHtml(item.name)}" title="${escapeHtml(item.name)}">${visual}</a>`;
}
async function loadSocialLinks() {
  try {
    const { data, error } = await sb.from("social_links").select("*").order("sort_order", { ascending: true });
    if (error) { if (!missingTable(error)) console.error("Social links:", error); state.socialLinks = []; }
    else state.socialLinks = data || [];
    renderSocialLinks(state.socialLinks);
  } catch (e) { console.error(e); state.socialLinks = []; renderSocialLinks([]); }
}
function renderSocialLinks(items = []) {
  const markup = items.filter(x => x.is_active !== false).map(socialMarkup).join("");
  const top = $("#socialLinks"); const contact = $("#contactSocialLinks");
  if (top) top.innerHTML = markup;
  if (contact) contact.innerHTML = markup || `<div class="empty">ยังไม่มีช่องทางติดต่อ</div>`;
}

async function loadAll() {
  const [p, pr, c] = await Promise.all([
    sb.from("products").select("*, packages(*)").eq("active", true).order("sort_order", { ascending: true }),
    sb.from("promotions").select("*, products(name,icon)").eq("active", true).order("created_at", { ascending: false }),
    sb.from("combos").select("*, combo_items(product_id, products(id,name,icon))").eq("active", true).order("created_at", { ascending: false })
  ]);
  if (p.error) console.error(p.error); if (pr.error) console.error(pr.error); if (c.error) console.error(c.error);
  state.products = p.data || []; state.promotions = pr.data || []; state.combos = c.data || [];
  renderProducts(); renderPromotions(); renderRecommendations();
}
function renderProducts(list = state.products) {
  const grid = $("#productGrid"); if (!grid) return;
  grid.innerHTML = list.length ? list.map(p => `<article class="product-card glass" data-id="${escapeHtml(p.id)}">
    ${p.image_url ? `<img class="product-image" src="${escapeHtml(p.image_url)}" alt="${escapeHtml(p.name)}" loading="lazy">` : `<div class="product-image-placeholder">${escapeHtml(p.icon || "📱")}</div>`}
    <div class="card-body"><div class="product-icon">${escapeHtml(p.icon || "📱")}</div><h3>${escapeHtml(p.name)}</h3><p>${escapeHtml(p.short_description || "")}</p><span class="arrow">→</span></div>
  </article>`).join("") : `<div class="empty">ยังไม่มีสินค้า</div>`;
  $$("#productGrid .product-card").forEach(card => card.addEventListener("click", () => openProduct(card.dataset.id)));
}
function renderRecommendations() {
  const grid = $("#recommendationGrid"), section = $("#recommendationSection"); if (!grid) return;
  const items = state.promotions.filter(x => x.category === "recommended");
  if (section) section.hidden = !items.length;
  grid.innerHTML = items.map(x => `<article class="recommendation-card glass">
    ${x.image_url ? `<img class="recommendation-image" src="${escapeHtml(x.image_url)}" alt="${escapeHtml(x.title)}" loading="lazy">` : `<div class="recommendation-placeholder">🎬</div>`}
    <div class="recommendation-body"><span class="badge">🎬 น่าดู</span><h3>${escapeHtml(x.title)}</h3><p>${escapeHtml(x.description || "")}</p>${x.external_url ? `<a class="external-link" href="${escapeHtml(x.external_url)}" target="_blank" rel="noopener noreferrer">ดูเพิ่มเติม ↗</a>` : ""}</div>
  </article>`).join("");
}
function renderPromotions() {
  const grid = $("#promotionGrid"); if (!grid) return;
  const promos = state.promotions.filter(x => x.category !== "recommended").map(p => `<article class="promo-card glass">
    ${p.image_url ? `<img class="promo-image" src="${escapeHtml(p.image_url)}" alt="${escapeHtml(p.title)}" loading="lazy">` : ""}
    <div class="card-body"><span class="badge">${escapeHtml(p.products?.icon || "🎁")} ${escapeHtml(p.products?.name || "โปรโมชั่น")}</span><h3>${escapeHtml(p.title)}</h3><p>${escapeHtml(p.description || "")}</p>${p.external_url ? `<a class="external-link" href="${escapeHtml(p.external_url)}" target="_blank" rel="noopener noreferrer">ดูเพิ่มเติม ↗</a>` : ""}</div>
  </article>`).join("");
  const combos = state.combos.map(c => `<article class="promo-card glass"><div class="card-body"><span class="badge">🤝 Combo Deal</span><h3>${escapeHtml(c.name)}</h3><p>${escapeHtml(c.description || "")}</p><p>${(c.combo_items || []).map(i => `${escapeHtml(i.products?.icon || "📱")} ${escapeHtml(i.products?.name || "")}`).join(" + ")}</p>${c.original_price ? `<span class="price-old">฿${money(c.original_price)}</span>` : ""}<div class="price-sale">฿${money(c.sale_price)}</div>${c.external_url ? `<a class="external-link" href="${escapeHtml(c.external_url)}" target="_blank" rel="noopener noreferrer">รับโปรโมชั่น ↗</a>` : ""}</div></article>`).join("");
  grid.innerHTML = (promos + combos) || `<div class="empty">ยังไม่มีโปรโมชั่น</div>`;
}
function openProduct(id) {
  const p = state.products.find(x => x.id === id); if (!p) return; state.selectedProduct = p;
  const packages = (p.packages || []).map(x => `<div class="package"><span>${escapeHtml(x.name)}</span><b>฿${money(x.price)}</b></div>`).join("") || "<p>สอบถามราคาเพิ่มเติมได้</p>";
  const promos = state.promotions.filter(x => x.product_id === p.id && x.category !== "recommended");
  const recs = state.promotions.filter(x => x.product_id === p.id && x.category === "recommended");
  $("#productDetail").innerHTML = `<div class="detail-hero glass"><div class="detail-top">${p.image_url ? `<img class="detail-image" src="${escapeHtml(p.image_url)}" alt="${escapeHtml(p.name)}">` : `<div class="detail-icon">${escapeHtml(p.icon || "📱")}</div>`}<div><span class="badge">Premium App</span><h1>${escapeHtml(p.name)}</h1><p>${escapeHtml(p.description || p.short_description || "")}</p></div></div></div>
  <div class="detail-grid"><section class="info-card glass"><h2>💳 ราคาแพ็กเกจ</h2>${packages}</section><section class="info-card glass"><h2>🎁 โปรโมชั่น</h2>${promos.length ? promos.map(x => `<div class="package"><span>${escapeHtml(x.title)}</span>${x.external_url ? `<a href="${escapeHtml(x.external_url)}" target="_blank" rel="noopener">↗</a>` : ""}</div>`).join("") : "<p>ยังไม่มีโปรโมชั่น</p>"}</section><section class="info-card glass"><h2>🎬 น่าดู / แนะนำ</h2>${recs.length ? recs.map(x => `<div class="mini-recommendation">${x.image_url ? `<img src="${escapeHtml(x.image_url)}" alt="">` : `<span>🎬</span>`}<div><b>${escapeHtml(x.title)}</b><p>${escapeHtml(x.description || "")}</p>${x.external_url ? `<a href="${escapeHtml(x.external_url)}" target="_blank" rel="noopener">ดูเพิ่มเติม ↗</a>` : ""}</div></div>`).join("") : "<p>ยังไม่มีรายการแนะนำสำหรับแอปนี้</p>"}</section></div>${p.external_url ? `<p class="detail-link"><a class="external-link" href="${escapeHtml(p.external_url)}" target="_blank" rel="noopener noreferrer">ไปยังลิงก์ภายนอก / สั่งซื้อ ↗</a></p>` : ""}`;
  showView("detail");
}

// ---------------- Navigation ----------------
const searchInput = $("#search");
if (searchInput) searchInput.addEventListener("input", e => { const q = e.target.value.toLowerCase().trim(); renderProducts(state.products.filter(p => `${p.name} ${p.short_description || ""}`.toLowerCase().includes(q))); });
$$('[data-view]').forEach(b => b.addEventListener("click", () => showView(b.dataset.view)));
$$('.close').forEach(b => b.addEventListener("click", () => closeDialog(b.dataset.close)));

let brandClicks = 0, brandTimer;
const brandButton = $("#brand");
if (brandButton) brandButton.addEventListener("click", async () => {
  if (!state.isAdmin) showView("home");
  brandClicks++; clearTimeout(brandTimer); brandTimer = setTimeout(() => brandClicks = 0, 1800);
  if (brandClicks >= 5) { brandClicks = 0; const { data: { session } } = await sb.auth.getSession(); if (session) await enterAdmin(); else openDialog("authDialog"); }
});
const loginForm = $("#loginForm");
if (loginForm) loginForm.addEventListener("submit", async e => { e.preventDefault(); try { const { error } = await sb.auth.signInWithPassword({ email: $("#loginEmail").value.trim(), password: $("#loginPassword").value }); if (error) return toast(error.message); closeDialog("authDialog"); await enterAdmin(); } catch (err) { toast(err.message || "เข้าสู่ระบบไม่สำเร็จ"); } });
const logoutBtn = $("#logoutBtn");
if (logoutBtn) logoutBtn.addEventListener("click", async () => { await sb.auth.signOut(); state.isAdmin = false; showView("home"); toast("ออกจากระบบแล้ว"); });
const previewStoreBtn = $("#previewStoreBtn"); if (previewStoreBtn) previewStoreBtn.addEventListener("click", () => showView("home"));
const backToAdminBtn = $("#backToAdminBtn"); if (backToAdminBtn) backToAdminBtn.addEventListener("click", () => showView("admin"));

async function enterAdmin() {
  try {
    const { data: { session } } = await sb.auth.getSession(); if (!session) return openDialog("authDialog");
    const { data, error } = await sb.from("admin_users").select("user_id").eq("user_id", session.user.id).maybeSingle();
    if (error || !data) { await sb.auth.signOut(); return toast("บัญชีนี้ไม่มีสิทธิ์ Admin"); }
    state.isAdmin = true; await loadAdminData(); showView("admin");
  } catch (e) { console.error(e); toast(e.message || "เปิด Admin ไม่สำเร็จ"); }
}
$$('.tab').forEach(tab => tab.addEventListener("click", () => { $$('.tab').forEach(x => x.classList.remove("active")); tab.classList.add("active"); $$('.admin-panel').forEach(x => x.classList.remove("active")); const panel = $("#admin" + tab.dataset.adminTab[0].toUpperCase() + tab.dataset.adminTab.slice(1)); if (panel) panel.classList.add("active"); }));

async function loadAdminData() {
  const [p, pr, c, s] = await Promise.all([
    sb.from("products").select("*, packages(*)").order("sort_order", { ascending: true }),
    sb.from("promotions").select("*").order("created_at", { ascending: false }),
    sb.from("combos").select("*, combo_items(product_id)").order("created_at", { ascending: false }),
    sb.from("social_links").select("*").order("sort_order", { ascending: true })
  ]);
  if (p.error) console.error(p.error); if (pr.error) console.error(pr.error); if (c.error) console.error(c.error); if (s.error && !missingTable(s.error)) console.error(s.error);
  state.adminProducts = p.data || []; state.adminPromotions = pr.data || []; state.adminCombos = c.data || []; state.adminSocialLinks = s.data || [];
  renderAdmin(); updateThemePreview();
}
function adminRow(title, active, edit, del) { return `<div class="admin-row glass"><div><b>${escapeHtml(title)}</b><p>${active ? "🟢 แสดง" : "⚪ ซ่อน"}</p></div><div class="admin-actions"><button class="small" onclick="${edit}">✏️ แก้ไข</button><button class="small danger" onclick="${del}">🗑 ลบ</button></div></div>`; }
function renderAdmin() {
  const a = $("#adminProductList"), b = $("#adminPromoList"), c = $("#adminComboList"), d = $("#adminSocialList");
  if (a) a.innerHTML = state.adminProducts.map(p => adminRow(`${p.icon || "📱"} ${p.name}`, p.active, `editProduct('${p.id}')`, `deleteProduct('${p.id}')`)).join("") || `<div class="empty">ไม่มีสินค้า</div>`;
  if (b) b.innerHTML = state.adminPromotions.map(p => adminRow(`${p.category === "recommended" ? "🎬" : "🎁"} ${p.title}`, p.active, `editPromo('${p.id}')`, `deletePromo('${p.id}')`)).join("") || `<div class="empty">ไม่มีรายการ</div>`;
  if (c) c.innerHTML = state.adminCombos.map(x => adminRow(`🤝 ${x.name} — ฿${money(x.sale_price)}`, x.active, `editCombo('${x.id}')`, `deleteCombo('${x.id}')`)).join("") || `<div class="empty">ไม่มี Combo</div>`;
  if (d) d.innerHTML = state.adminSocialLinks.map(x => `<div class="admin-row glass social-admin-row"><div class="admin-social-main"><div class="admin-social-icon">${x.icon_url ? `<img src="${escapeHtml(x.icon_url)}" alt="">` : escapeHtml(socialFallback(x.name))}</div><div><b>${escapeHtml(x.name)}</b><p>${x.is_active ? "🟢 แสดง" : "⚪ ซ่อน"} · ${escapeHtml(x.external_url)}</p></div></div><div class="admin-actions"><button class="small" onclick="editSocial('${x.id}')">✏️ แก้ไข</button><button class="small danger" onclick="deleteSocial('${x.id}')">🗑 ลบ</button></div></div>`).join("") || `<div class="empty">ยังไม่มีช่องทางติดต่อ</div>`;
}

async function uploadImage(file, folder = "images") {
  if (!file) return null; if (!file.type.startsWith("image/")) throw new Error("กรุณาเลือกไฟล์รูปภาพ");
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
  const path = `${folder}/${crypto.randomUUID()}.${ext}`;
  const { error } = await sb.storage.from("media").upload(path, file, { upsert: false, contentType: file.type }); if (error) throw error;
  return sb.storage.from("media").getPublicUrl(path).data.publicUrl;
}
$("#previewStoreBtn")?.addEventListener("click", () => {

    showView("home");

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });

});

// ---------------- Product ----------------
const addProductBtn = $("#addProductBtn"); if (addProductBtn) addProductBtn.onclick = () => { resetProductForm(); openDialog("productDialog"); };
function packageRow(data = { name: "", price: "" }) { const row = document.createElement("div"); row.className = "package-row"; row.innerHTML = `<input class="pkg-name" placeholder="ชื่อแพ็กเกจ"><input class="pkg-price" type="number" min="0" placeholder="ราคา"><button type="button" class="small danger">×</button>`; row.querySelector(".pkg-name").value = data.name || ""; row.querySelector(".pkg-price").value = data.price ?? ""; row.querySelector("button").onclick = () => row.remove(); $("#packageRows").appendChild(row); }
const addPackageRowBtn = $("#addPackageRow"); if (addPackageRowBtn) addPackageRowBtn.onclick = () => packageRow();
function resetProductForm() { $("#productForm").reset(); $("#productId").value = ""; $("#packageRows").innerHTML = ""; packageRow(); $("#productFormTitle").textContent = "เพิ่มสินค้า"; }
window.editProduct = id => { const p = state.adminProducts.find(x => x.id === id); if (!p) return; resetProductForm(); $("#productId").value=p.id; $("#pName").value=p.name||""; $("#pIcon").value=p.icon||""; $("#pShort").value=p.short_description||""; $("#pDescription").value=p.description||""; $("#pLink").value=p.external_url||""; $("#pActive").checked=!!p.active; $("#packageRows").innerHTML=""; (p.packages||[]).forEach(packageRow); if (!(p.packages||[]).length) packageRow(); $("#productFormTitle").textContent="แก้ไขสินค้า"; openDialog("productDialog"); };
const productForm = $("#productForm");
if (productForm) productForm.addEventListener("submit", async e => { e.preventDefault(); try { const id=$("#productId").value, file=$("#pImage").files[0], imageUrl=file?await uploadImage(file,"products"):null; const payload={name:$("#pName").value.trim(),icon:$("#pIcon").value.trim()||"📱",short_description:$("#pShort").value.trim(),description:$("#pDescription").value.trim(),external_url:$("#pLink").value.trim()||null,active:$("#pActive").checked}; if(imageUrl) payload.image_url=imageUrl; let productId=id; if(id){let r=await sb.from("products").update(payload).eq("id",id); if(r.error)throw r.error; let d=await sb.from("packages").delete().eq("product_id",id); if(d.error)throw d.error;} else {let r=await sb.from("products").insert(payload).select().single(); if(r.error)throw r.error; productId=r.data.id;} const pkgs=$$(".package-row").map(r=>({product_id:productId,name:r.querySelector(".pkg-name").value.trim(),price:Number(r.querySelector(".pkg-price").value||0)})).filter(x=>x.name); if(pkgs.length){let r=await sb.from("packages").insert(pkgs);if(r.error)throw r.error;} closeDialog("productDialog"); await loadAll(); await loadAdminData(); toast("บันทึกสินค้าแล้ว"); } catch(err){console.error(err);toast(err.message||"บันทึกสินค้าไม่สำเร็จ");} });
window.deleteProduct=async id=>{if(!confirm("ลบสินค้านี้?"))return;const{error}=await sb.from("products").delete().eq("id",id);if(error)return toast(error.message);await loadAll();await loadAdminData();toast("ลบสินค้าแล้ว");};

// ---------------- Promotion / Recommendation ----------------
const addPromoBtn=$("#addPromoBtn");if(addPromoBtn)addPromoBtn.onclick=()=>{resetPromoForm();openDialog("promoDialog");};
function fillProductSelects(){const opts=state.adminProducts.map(p=>`<option value="${escapeHtml(p.id)}">${escapeHtml(p.icon||"📱")} ${escapeHtml(p.name)}</option>`).join("");if($("#promoProduct"))$("#promoProduct").innerHTML=`<option value="">ไม่ระบุสินค้า</option>${opts}`;if($("#comboProducts"))$("#comboProducts").innerHTML=opts;}
function resetPromoForm(){$("#promoForm").reset();$("#promoId").value="";fillProductSelects();$("#promoCategory").value="promotion";$("#promoFormTitle").textContent="เพิ่มโปรโมชั่น / ซีรีส์แนะนำ";}
window.editPromo=id=>{const p=state.adminPromotions.find(x=>x.id===id);if(!p)return;resetPromoForm();$("#promoId").value=p.id;$("#promoCategory").value=p.category||"promotion";$("#promoProduct").value=p.product_id||"";$("#promoTitle").value=p.title||"";$("#promoDescription").value=p.description||"";$("#promoLink").value=p.external_url||"";$("#promoActive").checked=!!p.active;$("#promoFormTitle").textContent=p.category==="recommended"?"แก้ไขรายการน่าดู / แนะนำ":"แก้ไขโปรโมชั่น";openDialog("promoDialog");};
const promoForm=$("#promoForm");if(promoForm)promoForm.addEventListener("submit",async e=>{e.preventDefault();try{const id=$("#promoId").value,file=$("#promoImage").files[0],imageUrl=file?await uploadImage(file,"posters"):null;const payload={product_id:$("#promoProduct").value||null,category:$("#promoCategory").value,title:$("#promoTitle").value.trim(),description:$("#promoDescription").value.trim(),external_url:$("#promoLink").value.trim()||null,active:$("#promoActive").checked};if(imageUrl)payload.image_url=imageUrl;const r=id?await sb.from("promotions").update(payload).eq("id",id):await sb.from("promotions").insert(payload);if(r.error)throw r.error;closeDialog("promoDialog");await loadAll();await loadAdminData();toast("บันทึกรายการแล้ว");}catch(err){console.error(err);toast(err.message||"บันทึกไม่สำเร็จ");}});
window.deletePromo=async id=>{if(!confirm("ลบรายการนี้?"))return;const{error}=await sb.from("promotions").delete().eq("id",id);if(error)return toast(error.message);await loadAll();await loadAdminData();toast("ลบรายการแล้ว");};

// ---------------- Combo ----------------
const addComboBtn=$("#addComboBtn");if(addComboBtn)addComboBtn.onclick=()=>{resetComboForm();openDialog("comboDialog");};
function resetComboForm(){$("#comboForm").reset();$("#comboId").value="";fillProductSelects();$("#comboFormTitle").textContent="สร้าง Combo ลดราคา";}
window.editCombo=id=>{const c=state.adminCombos.find(x=>x.id===id);if(!c)return;resetComboForm();$("#comboId").value=c.id;$("#comboName").value=c.name||"";$("#comboDescription").value=c.description||"";$("#comboOriginalPrice").value=c.original_price||"";$("#comboSalePrice").value=c.sale_price||"";$("#comboLink").value=c.external_url||"";$("#comboActive").checked=!!c.active;(c.combo_items||[]).forEach(i=>{const o=[...$("#comboProducts").options].find(x=>x.value===i.product_id);if(o)o.selected=true;});$("#comboFormTitle").textContent="แก้ไข Combo";openDialog("comboDialog");};
const comboForm=$("#comboForm");if(comboForm)comboForm.addEventListener("submit",async e=>{e.preventDefault();try{const id=$("#comboId").value,selected=[...$("#comboProducts").selectedOptions].map(o=>o.value);if(selected.length<2)throw new Error("เลือกสินค้าอย่างน้อย 2 รายการ");const payload={name:$("#comboName").value.trim(),description:$("#comboDescription").value.trim(),original_price:Number($("#comboOriginalPrice").value||0),sale_price:Number($("#comboSalePrice").value||0),external_url:$("#comboLink").value.trim()||null,active:$("#comboActive").checked};let comboId=id;if(id){let r=await sb.from("combos").update(payload).eq("id",id);if(r.error)throw r.error;let d=await sb.from("combo_items").delete().eq("combo_id",id);if(d.error)throw d.error;}else{let r=await sb.from("combos").insert(payload).select().single();if(r.error)throw r.error;comboId=r.data.id;}let r=await sb.from("combo_items").insert(selected.map(product_id=>({combo_id:comboId,product_id})));if(r.error)throw r.error;closeDialog("comboDialog");await loadAll();await loadAdminData();toast("บันทึก Combo แล้ว");}catch(err){console.error(err);toast(err.message||"บันทึก Combo ไม่สำเร็จ");}});
window.deleteCombo=async id=>{if(!confirm("ลบ Combo?"))return;const{error}=await sb.from("combos").delete().eq("id",id);if(error)return toast(error.message);await loadAll();await loadAdminData();toast("ลบ Combo แล้ว");};

// ---------------- Social CRUD ----------------
const addSocialBtn=$("#addSocialBtn");if(addSocialBtn)addSocialBtn.onclick=()=>{resetSocialForm();openDialog("socialDialog");};
function resetSocialForm(){$("#socialForm").reset();$("#socialId").value="";$("#socialOrder").value="0";$("#socialActive").checked=true;$("#socialImagePreview").innerHTML="ยังไม่มีรูป";$("#socialFormTitle").textContent="เพิ่มช่องทางติดต่อ";}
const socialImageInput=$("#socialImage");if(socialImageInput)socialImageInput.addEventListener("change",()=>{const f=socialImageInput.files[0],p=$("#socialImagePreview");if(!f||!p)return;const u=URL.createObjectURL(f);p.innerHTML=`<img src="${u}" alt="ตัวอย่างโลโก้">`;});
window.editSocial=id=>{const s=state.adminSocialLinks.find(x=>x.id===id);if(!s)return;resetSocialForm();$("#socialId").value=s.id;$("#socialName").value=s.name||"";$("#socialUrl").value=s.external_url||"";$("#socialOrder").value=s.sort_order??0;$("#socialActive").checked=s.is_active!==false;$("#socialImagePreview").innerHTML=s.icon_url?`<img src="${escapeHtml(s.icon_url)}" alt="">`:`<span>${escapeHtml(socialFallback(s.name))}</span>`;$("#socialFormTitle").textContent="แก้ไขช่องทางติดต่อ";openDialog("socialDialog");};
const socialForm=$("#socialForm");if(socialForm)socialForm.addEventListener("submit",async e=>{e.preventDefault();try{const id=$("#socialId").value,file=$("#socialImage").files[0],url=file?await uploadImage(file,"social"):null,current=id?state.adminSocialLinks.find(x=>x.id===id):null;const payload={name:$("#socialName").value.trim(),icon_url:url||current?.icon_url||null,external_url:$("#socialUrl").value.trim(),sort_order:Number($("#socialOrder").value||0),is_active:$("#socialActive").checked};const r=id?await sb.from("social_links").update(payload).eq("id",id):await sb.from("social_links").insert(payload);if(r.error)throw r.error;closeDialog("socialDialog");await loadSocialLinks();await loadAdminData();toast("บันทึกช่องทางติดต่อแล้ว");}catch(err){console.error(err);toast(err.message||"บันทึกช่องทางไม่สำเร็จ");}});
window.deleteSocial=async id=>{if(!confirm("ลบช่องทางติดต่อ?"))return;const{error}=await sb.from("social_links").delete().eq("id",id);if(error)return toast(error.message);await loadSocialLinks();await loadAdminData();toast("ลบช่องทางแล้ว");};

// ---------------- Background / Theme ----------------
function rgbToHex(r,g,b){return "#"+[r,g,b].map(n=>Math.max(0,Math.min(255,Math.round(n))).toString(16).padStart(2,"0")).join("");}
function pastel(rgb){return rgbToHex(rgb.r*.45+255*.55,rgb.g*.45+255*.55,rgb.b*.45+255*.55);}
function extractThemeColors(file){return new Promise(resolve=>{const img=new Image(),url=URL.createObjectURL(file);img.onload=()=>{const c=document.createElement("canvas"),s=36;c.width=s;c.height=s;const ctx=c.getContext("2d",{willReadFrequently:true});ctx.drawImage(img,0,0,s,s);const d=ctx.getImageData(0,0,s,s).data,samples=[];for(let i=0;i<d.length;i+=20){const a=d[i+3];if(a<180)continue;const r=d[i],g=d[i+1],b=d[i+2],mx=Math.max(r,g,b),mn=Math.min(r,g,b);if(mx-mn<18||mx<35)continue;samples.push({r,g,b});}URL.revokeObjectURL(url);if(!samples.length)return resolve(DEFAULT_THEME);const first=samples[Math.floor(samples.length/3)],second=samples[Math.floor(samples.length*2/3)]||first;resolve({accent_color:pastel(first),secondary_color:pastel(second)});};img.onerror=()=>{URL.revokeObjectURL(url);resolve(DEFAULT_THEME);};img.src=url;});}
function updateThemePreview(){const p=$("#themePreview"),a=$("#themeAccent"),s=$("#themeSecondary");if(!p)return;const x=state.siteSettings||DEFAULT_THEME;if(a)a.value=x.accent_color||DEFAULT_THEME.accent_color;if(s)s.value=x.secondary_color||DEFAULT_THEME.secondary_color;p.innerHTML=x.background_image?`<img src="${escapeHtml(x.background_image)}" alt="พื้นหลังปัจจุบัน">`:`<div class="theme-empty"><span>🫧</span><b>ใช้พื้นหลังพาสเทลเริ่มต้น</b></div>`;}
const backgroundImageInput=$("#backgroundImage");if(backgroundImageInput)backgroundImageInput.addEventListener("change",async()=>{const f=backgroundImageInput.files[0];if(!f)return;$("#themePreview").innerHTML=`<img src="${URL.createObjectURL(f)}" alt="ตัวอย่างพื้นหลัง">`;if($("#autoTheme")?.checked){const x=await extractThemeColors(f);$("#themeAccent").value=x.accent_color||DEFAULT_THEME.accent_color;$("#themeSecondary").value=x.secondary_color||DEFAULT_THEME.secondary_color;}});
const themeForm=$("#themeForm");if(themeForm)themeForm.addEventListener("submit",async e=>{e.preventDefault();try{const f=$("#backgroundImage").files[0];let bg=state.siteSettings.background_image||null;if(f)bg=await uploadImage(f,"background");const payload={id:1,background_image:bg,accent_color:$("#themeAccent").value||DEFAULT_THEME.accent_color,secondary_color:$("#themeSecondary").value||DEFAULT_THEME.secondary_color,updated_at:new Date().toISOString()};const r=await sb.from("site_settings").upsert(payload,{onConflict:"id"});if(r.error)throw r.error;state.siteSettings={...state.siteSettings,...payload};applyTheme(state.siteSettings);updateThemePreview();$("#backgroundImage").value="";toast("บันทึกพื้นหลังและธีมแล้ว");}catch(err){console.error(err);toast(err.message||"บันทึกธีมไม่สำเร็จ");}});
const removeBackgroundBtn=$("#removeBackgroundBtn");if(removeBackgroundBtn)removeBackgroundBtn.addEventListener("click",async()=>{if(!confirm("ลบรูปพื้นหลังและกลับธีมฟ้า–ชมพูเริ่มต้นหรือไม่?"))return;try{const payload={id:1,background_image:null,accent_color:DEFAULT_THEME.accent_color,secondary_color:DEFAULT_THEME.secondary_color,updated_at:new Date().toISOString()};const r=await sb.from("site_settings").upsert(payload,{onConflict:"id"});if(r.error)throw r.error;state.siteSettings={...DEFAULT_THEME};applyTheme(state.siteSettings);updateThemePreview();$("#backgroundImage").value="";toast("กลับสู่ธีมเริ่มต้นแล้ว");}catch(err){console.error(err);toast(err.message||"ลบพื้นหลังไม่สำเร็จ");}});
const autoTheme=$("#autoTheme");if(autoTheme)autoTheme.addEventListener("change",async()=>{const f=$("#backgroundImage").files[0];if(autoTheme.checked&&f){const x=await extractThemeColors(f);$("#themeAccent").value=x.accent_color||DEFAULT_THEME.accent_color;$("#themeSecondary").value=x.secondary_color||DEFAULT_THEME.secondary_color;}});

async function init(){const y=$("#year");if(y)y.textContent=new Date().getFullYear();applyTheme(DEFAULT_THEME);await Promise.all([loadSiteSettings(),loadSocialLinks(),loadAll()]);}
init();
